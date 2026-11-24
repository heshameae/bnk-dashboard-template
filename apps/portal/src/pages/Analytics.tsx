/* Analytics: how one dashboard is used. One page about one dashboard, with no page to choose from first.
   Quiet figures on top, a line of people per day running edge to edge with the days that explain it marked,
   then two cards: who opens it (by role) and when (weekday by hour). The title is the dashboard switcher.

   Every figure is counted by scripts/usage.mjs from usage/opens.csv (contract: docs/contracts/usage.md).
   The portal records no usage yet, so outside the sample that file does not exist and the page says so.

   Reading a value never needs a tooltip: point at the chart or the heatmap, tap it, or focus it and use the arrow keys.
   A day is a calendar day as written in the file; nothing is converted to the viewer's time zone. */
import { Fragment, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Badge, Card, EmptyState, Field, Icon, LinkButton, Menu, MenuItem, Segmented } from '../ds';
import { dashboardsFor } from '../shell/access';
import { humanize, roles as policyRoles, usage, type Dashboard, type DashboardUsage, type UsageDays, type UsageRange } from '../shell/data';
import { go, href } from '../shell/router';
import { useSession } from '../shell/session';

/* ------------------------------------------------------------------ words */
const MS = 86_400_000;
/** YYYY-MM-DD as a whole number of days. Dates are read as UTC, so the viewer's time zone never moves a day. */
const dayOf = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / MS;
const dateFormat = (o: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'UTC' });
  return (day: number) => f.format(day * MS);
};
const weekdayOf = dateFormat({ weekday: 'short' }), dateOf = dateFormat({ day: 'numeric' }), monthOf = dateFormat({ month: 'short' });
/** 24 Nov */
const dayMonth = (day: number) => `${dateOf(day)} ${monthOf(day)}`;
/** Tue 24 Nov */
const shortDay = (day: number) => `${weekdayOf(day)} ${dayMonth(day)}`;
/** 24 November 2026 */
const fullDate = dateFormat({ day: 'numeric', month: 'long', year: 'numeric' });
/** 07:00. Hour 24 reads 00:00. */
const clock = (hour: number) => `${String(hour % 24).padStart(2, '0')}:00`;

const num = (n: number) => n.toLocaleString('en-US');
const people = (n: number) => (n === 0 ? 'nobody' : `${num(n)} ${n === 1 ? 'person' : 'people'}`);
const opens = (n: number) => (n === 0 ? 'no opens' : `${num(n)} ${n === 1 ? 'open' : 'opens'}`);
const WEEKDAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

const RANGES: UsageDays[] = [7, 30, 90];
/** The series in usage.json covers this many days. */
const SHOWN = 90;

/* --------------------------------------------------------------- the page */
/** The dashboard Analytics is about: the one in the address, else the last one this viewer opened, else the first. */
function useShown(id?: string): Dashboard | null {
  const { viewer, recent } = useSession();
  const mine = dashboardsFor(viewer);
  if (id) return mine.find((d) => d.id === id) ?? null;
  return recent.map((r) => mine.find((d) => d.id === r)).find((d) => d !== undefined) ?? mine[0] ?? null;
}

/** The topbar's link from a dashboard's usage to the dashboard itself. */
export function AnalyticsOpen({ id }: { id?: string }) {
  const d = useShown(id);
  if (!d || !usage.asOf) return null;
  return <LinkButton variant="tertiary" href={href.dashboard(d.id)}>Open dashboard<Icon.ArrowUpRight size={14} /></LinkButton>;
}

export function Analytics({ id }: { id?: string }) {
  const d = useShown(id);
  // The period outlives a change of dashboard: someone comparing dashboards keeps looking at the same 30 days.
  const [range, setRange] = useState<UsageDays>(30);

  if (!d) {
    return (
      <div className="shell-page" data-narrow>
        <Card>
          <EmptyState icon={<Icon.LayoutDashboard size={18} />} title="No dashboards published yet">
            A dashboard shows here once its spec is ready and it has passed verify.
          </EmptyState>
        </Card>
      </div>
    );
  }
  const u = usage.dashboards[d.id];
  if (!usage.asOf || !u) {
    return (
      <div className="shell-page" data-narrow>
        <Card>
          <EmptyState icon={<Icon.Activity size={18} />} title="Usage is not recorded yet">
            Once the portal logs who opens a dashboard, this page shows how many people opened it day by day, their roles, and the time of day they open it.
          </EmptyState>
        </Card>
      </div>
    );
  }
  return <Usage key={d.id} d={d} u={u} asOf={dayOf(usage.asOf)} range={range} setRange={setRange} />;
}

type Point = { x: number; people: number; opens: number; name: string };
type Mark = { x: number; kind: 'monthEnd' | 'verified'; label: string };

function Usage({ d, u, asOf, range, setRange }: { d: Dashboard; u: DashboardUsage; asOf: number; range: UsageDays; setRange: (r: UsageDays) => void }) {
  // One line to start with. Opens rises and falls with people, so two lines mostly repeat each other; it is a click away.
  const [show, setShow] = useState({ people: true, opens: false });
  // A line is switched from its figure. One always stays on: hiding the last one shows the other.
  const toggle = (k: 'people' | 'opens') =>
    setShow((v) => { const next = { ...v, [k]: !v[k] }; return next.people || next.opens ? next : { people: k !== 'people', opens: k !== 'opens' }; });

  const r = u.ranges[range];
  const start = dayOf(u.days.from);
  const first = SHOWN - range;
  /** The middle of a span of the 90 days, as a percentage of the chart's width. */
  const mid = (from: number, to: number) => (((from + to + 1) / 2 - first) / range) * 100;

  // A point per day reads well for a week or a month. Over 90 days it turns into a comb, so there it is a point per week.
  const weeks = u.weeks.people.length;
  const points: Point[] = range < SHOWN
    ? u.days.people.slice(first).map((n, k) => ({ x: mid(first + k, first + k), people: n, opens: u.days.opens[first + k]!, name: shortDay(start + first + k) }))
    : u.weeks.people.map((n, k) => {
        // Weeks are counted back from the newest day, so the oldest one is short.
        const from = Math.max(0, SHOWN - (weeks - k) * 7), to = SHOWN - 1 - (weeks - 1 - k) * 7;
        return { x: mid(from, to), people: n, opens: u.weeks.opens[k]!, name: `Week of ${dayMonth(start + from)}` };
      });

  // What happened on a day and explains the line: the last day of a month, and the day the dashboard was last verified.
  const marks: Mark[] = [];
  for (let i = first; i < SHOWN; i++) if (dateOf(start + i + 1) === '1') marks.push({ x: mid(i, i), kind: 'monthEnd', label: 'Month end' });
  const verified = d.verified ? dayOf(d.verified) - start : -1;
  if (verified >= first && verified < SHOWN) marks.push({ x: mid(verified, verified), kind: 'verified', label: 'Verified' });
  marks.sort((a, b) => a.x - b.x);

  // Every role in the policy file, so a role that never opens it shows as 0, plus any role on record that the file no longer has.
  const counted = new Map(r.roles.map((x) => [x.id, x.people]));
  const roleRows = [...policyRoles.map((p) => p.id), ...r.roles.map((x) => x.id).filter((id) => !policyRoles.some((p) => p.id === id))]
    .map((id) => ({ id, name: id ? humanize(id) : 'Role not given', people: counted.get(id) ?? 0 }))
    .sort((a, b) => b.people - a.people);
  const used = roleRows.filter((x) => x.people > 0);
  const most = used[0]?.people ?? 1;

  return (
    <div className="shell-page an-page">
      <div className="an-head">
        <TitleSwitch d={d} range={range} />
        <Segmented label="Period" value={String(range)} onChange={(k) => setRange(Number(k) as UsageDays)} items={RANGES.map((n) => ({ key: String(n), label: `${n} days` }))} />
      </div>

      {r.people === 0 ? (
        <Card>
          <EmptyState icon={<Icon.MoonStar size={18} />} title={`Nobody opened it in the last ${range} days`}>
            {u.last ? `It was last opened on ${fullDate(dayOf(u.last))}.` : 'It has never been opened.'}
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="an-stats">
            <Stat label="People" tone="data" pressed={show.people} onToggle={() => toggle('people')} value={num(r.people)}><Change now={r.people} prev={r.prevPeople} /></Stat>
            <Stat label="Opens" tone="quiet" pressed={show.opens} onToggle={() => toggle('opens')} value={num(r.opens)}><Change now={r.opens} prev={r.prevOpens} /></Stat>
            <Stat label="Came back" value={num(r.cameBack)}>of {num(r.people)}</Stat>
            {r.busiest && <Stat label="Busiest day" value={shortDay(dayOf(r.busiest.date))}>{people(r.busiest.people)}</Stat>}
          </div>

          <Lines key={range} points={points} marks={marks} show={show} start={dayMonth(start + first)} end={dayMonth(asOf)} label={`People ${range === SHOWN ? 'per week' : 'per day'}, last ${range} days`} />

          <div className="an-cards">
            {used.length > 0 && (
              <Card className="an-card">
                <h2 className="an-card__title">
                  {used.length === 1 ? <>Only <b>{used[0]!.name}</b> opens it</>
                    : used[0]!.people === used[1]!.people ? <><b>{used[0]!.name}</b> and <b>{used[1]!.name}</b> open it most</>
                    : <><b>{used[0]!.name}</b> opens it most</>}
                </h2>
                {/* Each row sits on a bar as long as its share of the largest role. */}
                <ul className="an-rows">
                  {roleRows.map((x) => (
                    <li key={x.id} data-none={x.people === 0 || undefined}>
                      <i style={{ width: `${(x.people / most) * 100}%` }} aria-hidden="true" />
                      <span className="ds-truncate">{x.name}</span>
                      <span className="ds-num">{num(x.people)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Heat r={r} />
          </div>
        </>
      )}

      <p className="an-note ds-small ds-faint">Usage recorded up to {fullDate(asOf)}.</p>
    </div>
  );
}

/* ----------------------------------------------------------- title switch */
/** The page title, and the way to another dashboard. Each row carries its people count, so the menu doubles as a ranking. */
function TitleSwitch({ d, range }: { d: Dashboard; range: UsageDays }) {
  const { viewer } = useSession();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = dashboardsFor(viewer);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter((o) => !s || o.title.toLowerCase().includes(s));
  }, [list, q]);
  const pick = (o: Dashboard) => { setOpen(false); setQ(''); go(href.analytics(o.id)); };

  return (
    <div className="an-switch">
      <h1 className="ds-h2 an-title">
        <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span>{d.title}</span>
          <Icon.ChevronsUpDown size={16} aria-hidden="true" />
        </button>
      </h1>
      <Menu open={open} onClose={() => setOpen(false)} className="an-switch__menu">
        {/* A short list needs no search. A long one opens with the cursor in it. */}
        {list.length > 8 && (
          <Field
            fieldSize="md"
            icon={<Icon.Search size={16} />}
            placeholder="Find dashboard…"
            aria-label="Find dashboard"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && shown[0]) pick(shown[0]); }}
            autoFocus
          />
        )}
        <div className="ds-menu__label an-switch__cap"><span>Dashboard</span><span>People, {range} days</span></div>
        <div className="an-switch__list">
          {shown.length === 0 && <div className="ds-menu__label">Nothing matches “{q}”.</div>}
          {shown.map((o) => (
            <MenuItem key={o.id} active={o.id === d.id} onClick={() => pick(o)}>
              <span className="ds-truncate" style={{ flex: 1 }}>{o.title}</span>
              <span className="ds-num ds-faint">{num(usage.dashboards[o.id]?.ranges[range].people ?? 0)}</span>
            </MenuItem>
          ))}
        </div>
      </Menu>
    </div>
  );
}

/* ---------------------------------------------------------------- figures */
/** A small figure with a line under it. Given onToggle it is the switch for its line on the chart. */
function Stat({ label, value, tone, pressed, onToggle, children }: {
  label: string;
  value: string;
  tone?: 'data' | 'quiet';
  pressed?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
}) {
  const body = (
    <>
      <span className="an-stat__label">{label}{tone && <i className="an-stat__dot" data-tone={tone} aria-hidden="true" />}</span>
      <span className="an-stat__value ds-num">{value}</span>
      <span className="an-stat__sub">{children}</span>
    </>
  );
  return onToggle
    ? <button className="an-stat" aria-pressed={pressed} title={`${pressed ? 'Hide' : 'Show'} ${label.toLowerCase()} on the chart`} onClick={onToggle}>{body}</button>
    : <div className="an-stat">{body}</div>;
}

/** Up or down against the range before. The sign is in the text, so the colour is never the only signal. */
function Change({ now, prev }: { now: number; prev: number }) {
  if (prev === 0) return now === 0 ? null : <Badge tone="green" title="Against the same number of days before, when there were none">+{num(now)}</Badge>;
  const p = Math.round(((now - prev) / prev) * 100);
  return <Badge tone={p > 0 ? 'green' : p < 0 ? 'red' : 'gray'} title="Against the same number of days before">{p > 0 ? '+' : p < 0 ? '−' : ''}{Math.abs(p)}%</Badge>;
}

/* ------------------------------------------------------------------ chart */
/** Where an arrow, Home, End or Escape moves a reading along a row of `last + 1` points. undefined: not a key the chart handles. */
const step = (key: string, active: number | null, last: number): number | null | undefined =>
  key === 'ArrowLeft' ? (active === null ? last : Math.max(0, active - 1))
  : key === 'ArrowRight' ? (active === null ? last : Math.min(last, active + 1))
  : key === 'Home' ? 0
  : key === 'End' ? last
  : key === 'Escape' ? null
  : undefined;

/** A smooth curve through the points that never overshoots them (monotone cubic), so a quiet weekend cannot dip below zero. */
function smooth(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n < 2) return n ? `M${xs[0]},${ys[0]}` : '';
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx.push(xs[i + 1]! - xs[i]!); m.push((ys[i + 1]! - ys[i]!) / dx[i]!); }
  const t: number[] = [m[0]!];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2);
  t.push(m[n - 2]!);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i]! / m[i]!, b = t[i + 1]! / m[i]!, h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]!; t[i + 1] = k * b * m[i]!; }
  }
  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]! / 3;
    d += `C${xs[i]! + h},${ys[i]! + t[i]! * h} ${xs[i + 1]! - h},${ys[i + 1]! - t[i + 1]! * h} ${xs[i + 1]},${ys[i + 1]}`;
  }
  return d;
}

/** The chart: one or two lines, no axis and no grid. Marks sit on the days they explain. The point being read is named on the axis. */
function Lines({ points, marks, show, start, end, label }: { points: Point[]; marks: Mark[]; show: { people: boolean; opens: boolean }; start: string; end: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const fill = `an-fill-${useId().replace(/[^a-z0-9]/gi, '')}`;
  const [active, setActive] = useState<number | null>(null);
  const last = points.length - 1;
  const ceil = Math.max(1, ...points.map((p) => Math.max(show.people ? p.people : 0, show.opens ? p.opens : 0))) * 1.08;
  const y = (v: number) => 100 - (v / ceil) * 100;
  // The curve runs to both edges of the page: it holds the first and the last level across the part outside them.
  const path = (get: (p: Point) => number) =>
    smooth([0, ...points.map((p) => p.x), 100], [y(get(points[0]!)), ...points.map((p) => y(get(p))), y(get(points[last]!))]);
  const peoplePath = path((p) => p.people), opensPath = path((p) => p.opens);
  // A chip or a reading near an edge hangs inwards, so it is never cut off by the page.
  const edge = (x: number) => (x < 12 ? 'start' : x > 88 ? 'end' : undefined);
  const nearest = (clientX: number) => {
    const box = ref.current!.getBoundingClientRect(), x = ((clientX - box.left) / box.width) * 100;
    return points.reduce((best, p, i) => (Math.abs(p.x - x) < Math.abs(points[best]!.x - x) ? i : best), 0);
  };
  const key = (e: KeyboardEvent) => {
    const to = step(e.key, active, last);
    if (to === undefined) return;
    e.preventDefault();
    setActive(to);
  };
  const on = active === null ? null : points[active]!;
  const reading = on ? `${on.name} · ${people(on.people)} · ${opens(on.opens)}` : '';

  return (
    <div
      ref={ref}
      className="an-chart"
      tabIndex={0}
      role="group"
      aria-label={`${label}. Use the left and right arrow keys to read each one.`}
      onPointerMove={(e) => setActive(nearest(e.clientX))}
      onPointerDown={(e) => setActive(nearest(e.clientX))}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }}
      onBlur={() => setActive(null)}
      onKeyDown={key}
    >
      <div className="an-chart__plot">
        {marks.map((m, k) => (
          <span key={`${m.kind}${m.x}`} className="an-mark" style={{ left: `${m.x}%` }} data-row={k % 2} data-edge={edge(m.x)}>
            <span className="an-mark__chip">{m.kind === 'monthEnd' ? <Icon.CalendarDays size={12} /> : <Icon.BadgeCheck size={12} />}{m.label}</span>
          </span>
        ))}
        <div className="an-chart__area">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {/* Three stops, steep then shallow: a straight fade to nothing shows as a band. */}
              <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopOpacity="0.16" />
                <stop offset="0.5" stopOpacity="0.05" />
                <stop offset="1" stopOpacity="0" />
              </linearGradient>
            </defs>
            {show.opens && <path d={opensPath} className="an-chart__opens" />}
            {show.people && <path d={`${peoplePath}L100,100L0,100Z`} fill={`url(#${fill})`} />}
            {show.people && <path d={peoplePath} className="an-chart__people" />}
          </svg>
          {on && (
            <span className="an-chart__guide" style={{ left: `${on.x}%` }}>
              {show.opens && <i data-tone="quiet" style={{ top: `${y(on.opens)}%` }} />}
              {show.people && <i style={{ top: `${y(on.people)}%` }} />}
            </span>
          )}
        </div>
      </div>
      {/* The axis is a dot per point. Only its two ends are named; the point being read is named in a pill. */}
      <div className="an-axis" aria-hidden="true">
        {points.map((p, i) => <i key={i} style={{ left: `${p.x}%` }} />)}
        <span className="an-axis__end" data-side="start">{start}</span>
        <span className="an-axis__end" data-side="end">{end}</span>
        {on && <span className="an-axis__pill ds-num" style={{ left: `${on.x}%` }} data-edge={edge(on.x)}>{reading}</span>}
      </div>
      <span className="ds-sr" aria-live="polite">{reading}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- heatmap */
/** When it is opened: seven rows, Monday to Sunday, and a square for every hour of the day, stronger when busier.
    The title says the busiest time in words; pointing at a square (or the arrow keys) swaps it for that hour's count. */
function Heat({ r }: { r: UsageRange }) {
  const [at, setAt] = useState<[number, number] | null>(null);
  const max = Math.max(1, ...r.hours.flat());
  const count = at ? r.hours[at[0]]![at[1]]! : 0;

  const point = (e: PointerEvent) => {
    const el = e.target as HTMLElement;
    if (el.dataset.h !== undefined) setAt([Number(el.dataset.d), Number(el.dataset.h)]);
  };
  const key = (e: KeyboardEvent) => {
    const move: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const by = move[e.key];
    if (!by && e.key !== 'Escape') return;
    e.preventDefault(); // the arrows read the squares; they must not also scroll the page
    if (!by) return setAt(null);
    // The first press lands on the busiest hour, the one most worth reading.
    if (!at) { const d = Math.max(0, r.hours.findIndex((row) => row.includes(max))); return setAt([d, Math.max(0, r.hours[d]!.indexOf(max))]); }
    setAt([Math.min(6, Math.max(0, at[0] + by[0])), Math.min(23, Math.max(0, at[1] + by[1]))]);
  };

  return (
    <Card className="an-card">
      <h2 className="an-card__title ds-truncate" aria-live="polite">
        {at ? <><b>{WEEKDAYS[at[0]]}, {clock(at[1])} to {clock(at[1] + 1)}</b>: {opens(count)}</>
          : r.when ? <>Busiest on <b>{WEEKDAYS[r.when.weekday]}</b>, <b>{clock(r.when.hour)} to {clock(r.when.hour + 2)}</b></>
          : <>No opens in this period</>}
      </h2>
      <div
        className="an-heat"
        tabIndex={0}
        role="group"
        aria-label="Opens by weekday and hour of the day. Use the arrow keys to read each hour."
        onPointerMove={point}
        onPointerDown={point}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setAt(null); }}
        onBlur={() => setAt(null)}
        onKeyDown={key}
      >
        {r.hours.map((row, d) => (
          <Fragment key={d}>
            <span className="an-heat__day" aria-hidden="true">{'MTWTFSS'[d]}</span>
            {row.map((n, h) => <i key={h} data-d={d} data-h={h} data-l={n ? Math.ceil((n / max) * 4) : 0} data-on={(at && at[0] === d && at[1] === h) || undefined} />)}
          </Fragment>
        ))}
        <span aria-hidden="true" />
        {[0, 6, 12, 18].map((h) => <span key={h} className="an-heat__hour" aria-hidden="true">{clock(h)}</span>)}
      </div>
    </Card>
  );
}
