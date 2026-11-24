// Throwaway riff on Focus: Wide. The same answers, laid out the way visitors.now lays out a site's traffic:
// quiet figures on top, the chart running edge to edge, the events that explain it marked on the timeline,
// and two cards below. The text keeps Focus's narrow column; only the chart breaks out of it.
// The second card says when it is opened: as a weekday-by-hour heatmap, or (to compare) as seven weekday bars.
import { Fragment, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Badge, Card, Icon } from '../../src/ds';
import type { Dashboard } from '../../src/shell/data';
import { NotRecorded, Period, TitleSwitch, WeekBars, Zero, step, useProto } from './parts';
import { busiestWeekday, clock, dayMonth, fmt, people, rhythm, shortDay, type Stats } from './usage';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Wide({ d, when = 'heat' }: { d: Dashboard; when?: 'heat' | 'bars' }) {
  const { stat, marks, range, recorded } = useProto();
  // One line to start with. Two lines that both drop to nothing every weekend read as noise; opens is a click away.
  const [show, setShow] = useState({ people: true, opens: false });

  if (!recorded) {
    return (
      <div className="shell-page pa-narrow">
        <NotRecorded>Once the portal logs who opens a dashboard, this page shows how many people opened it, day by day, with month ends and new versions marked.</NotRecorded>
      </div>
    );
  }

  const s = stat(d.id);
  // A line can be switched off from its figure. One always stays on: hiding the last one shows the other.
  const toggle = (k: 'people' | 'opens') =>
    setShow((v) => { const next = { ...v, [k]: !v[k] }; return next.people || next.opens ? next : { people: k !== 'people', opens: k !== 'opens' }; });
  // A point per day reads well for a week or a month. Over 90 days it turns into a comb, so there it is a point per week.
  const n = s.days.length;
  const mid = (from: number, to: number) => ((from + to + 1) / 2 / n) * 100;
  const points: Point[] = range === 90
    ? s.weeks.map((w) => ({ x: mid(w.from, w.to), people: w.people, opens: w.opens, name: `Week of ${dayMonth(w.date)}`, rest: false }))
    : s.days.map((day, i) => ({ x: mid(i, i), people: day.people, opens: day.opens, name: shortDay(day.date), rest: day.date.getDay() === 0 || day.date.getDay() === 6 }));
  const pins: Pin[] = marks(d.id).map((m) => ({ x: mid(m.i, m.i), kind: m.kind, label: m.label }));
  const used = s.roles.filter((r) => r.value > 0);
  const top = Math.max(1, ...used.map((r) => r.value));
  const busy = busiestWeekday(s);

  return (
    <div className="shell-page pa-wide">
      <div className="pa-head">
        <TitleSwitch d={d} />
        <Period />
      </div>

      {s.people === 0 ? <Zero s={s} range={range} /> : (
        <>
          <div className="pa-stats">
            <Stat label="People" dot="accent" pressed={show.people} onToggle={() => toggle('people')} value={fmt(s.people)}><Change now={s.people} prev={s.prev} /></Stat>
            <Stat label="Opens" dot="gray" pressed={show.opens} onToggle={() => toggle('opens')} value={fmt(s.opens)}><Change now={s.opens} prev={s.prevOpens} /></Stat>
            <Stat label="Came back" value={fmt(s.returning)}>of {fmt(s.people)}</Stat>
            {s.busiest && <Stat label="Busiest day" value={shortDay(s.busiest.date)}>{people(s.busiest.people)}</Stat>}
          </div>

          <Lines points={points} pins={pins} show={show} start={dayMonth(s.days[0]!.date)} label={`People ${range === 90 ? 'per week' : 'per day'}, last ${range} days`} />

          <div className="pa-cards">
            {used.length > 0 && (
              <Card className="pa-card">
                <h2 className="pa-card__title">{used.length === 1 ? <>Only <b>{used[0]!.name}</b> opens it</> : <><b>{used[0]!.name}</b> opens it most</>}</h2>
                <ul className="pa-rows">
                  {s.roles.map((r) => (
                    <li key={r.id} data-none={r.value === 0 || undefined}>
                      <i style={{ width: `${(r.value / top) * 100}%` }} aria-hidden="true" />
                      <span className="ds-truncate">{r.name}</span>
                      <span className="ds-num">{fmt(r.value)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {when === 'heat' ? <Heat s={s} /> : (
              <Card className="pa-card">
                <h2 className="pa-card__title"><b>{cap(rhythm(s))}</b>{busy && `, ${busy} the busiest`}</h2>
                <WeekBars s={s} />
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const WEEKDAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
const hour = (h: number) => clock((h % 24) * 60);

/** When it is opened: seven rows, Monday to Sunday, and a square for every hour of the day, stronger when busier.
    The title says it in words; pointing at a square (or the arrow keys) swaps the title for that hour's count. */
function Heat({ s }: { s: Stats }) {
  const [at, setAt] = useState<[number, number] | null>(null);
  const max = Math.max(1, ...s.grid.flat());
  const phrase = rhythm(s);
  const span = s.peak && `${hour(s.peak.hour)} to ${hour(s.peak.hour + 2)}`;
  const v = at ? s.grid[at[0]]![at[1]]! : 0;

  const point = (e: PointerEvent) => {
    const el = e.target as HTMLElement;
    if (el.dataset.h !== undefined) setAt([Number(el.dataset.d), Number(el.dataset.h)]);
  };
  const key = (e: KeyboardEvent) => {
    const move: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const by = move[e.key];
    if (!by && e.key !== 'Escape') return;
    // The arrows read the squares; they must not also scroll the page or flip the prototype picker.
    e.preventDefault();
    e.stopPropagation();
    if (!by) return setAt(null);
    // The first press lands on the busiest hour, the one most worth reading.
    if (!at) { const d = s.grid.findIndex((row) => row.includes(max)); return setAt([Math.max(0, d), Math.max(0, s.grid[Math.max(0, d)]!.indexOf(max))]); }
    setAt([Math.min(6, Math.max(0, at[0] + by[0])), Math.min(23, Math.max(0, at[1] + by[1]))]);
  };

  return (
    <Card className="pa-card">
      <h2 className="pa-card__title ds-truncate" aria-live="polite">
        {at
          ? <><b>{WEEKDAYS[at[0]]} {hour(at[1])} to {hour(at[1] + 1)}</b>, {v === 0 ? 'no opens' : `${fmt(v)} ${v === 1 ? 'open' : 'opens'}`}</>
          : <><b>{cap(phrase)}</b>{span && (phrase.startsWith('mostly') || s.peak!.share < 0.5 ? `, busiest ${span}` : `, mostly ${span}`)}</>}
      </h2>
      <div
        className="pa-heat"
        tabIndex={0}
        role="group"
        aria-label="Opens by weekday and hour of the day. Use the arrow keys to read each hour."
        onPointerMove={point}
        onPointerDown={point}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setAt(null); }}
        onBlur={() => setAt(null)}
        onKeyDown={key}
      >
        {s.grid.map((row, d) => (
          <Fragment key={d}>
            <span className="pa-heat__day" aria-hidden="true">{'MTWTFSS'[d]}</span>
            {row.map((n, h) => <i key={h} data-d={d} data-h={h} data-l={n ? Math.ceil((n / max) * 4) : 0} data-on={(at && at[0] === d && at[1] === h) || undefined} />)}
          </Fragment>
        ))}
        <span aria-hidden="true" />
        {[0, 6, 12, 18].map((h) => <span key={h} className="pa-heat__hour" aria-hidden="true">{hour(h)}</span>)}
      </div>
    </Card>
  );
}

/** A small figure with a line under it. Given onToggle it is a switch for its line on the chart. */
function Stat({ label, value, dot, pressed, onToggle, children }: {
  label: string;
  value: string;
  dot?: 'accent' | 'gray';
  pressed?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
}) {
  const body = (
    <>
      <span className="pa-stat__label">{label}{dot && <i className="pa-stat__dot" data-tone={dot} aria-hidden="true" />}</span>
      <span className="pa-stat__value ds-num">{value}</span>
      <span className="pa-stat__sub">{children}</span>
    </>
  );
  return onToggle
    ? <button className="pa-stat" aria-pressed={pressed} title={pressed ? `Hide ${label.toLowerCase()} on the chart` : `Show ${label.toLowerCase()} on the chart`} onClick={onToggle}>{body}</button>
    : <div className="pa-stat">{body}</div>;
}

/** Up or down against the period before. The sign is in the text, so the colour is never the only signal. */
function Change({ now, prev }: { now: number; prev: number }) {
  if (prev === 0) return now === 0 ? null : <Badge tone="green">+{fmt(now)}</Badge>;
  const p = Math.round(((now - prev) / prev) * 100);
  return <Badge tone={p > 0 ? 'green' : p < 0 ? 'red' : 'gray'}>{p > 0 ? '+' : p < 0 ? '−' : ''}{Math.abs(p)}%</Badge>;
}

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

type Point = { x: number; people: number; opens: number; name: string; rest: boolean };
type Pin = { x: number; kind: 'monthEnd' | 'version'; label: string };

/** The chart: one or two lines, no axis and no grid. Pins sit on the days they explain. The point you are on is read out on the axis. */
function Lines({ points, pins, show, start, label }: { points: Point[]; pins: Pin[]; show: { people: boolean; opens: boolean }; start: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const gid = `pa-fill-${useId().replace(/[^a-z0-9]/gi, '')}`;
  const [active, setActive] = useState<number | null>(null);
  const last = points.length - 1;
  const ceil = Math.max(1, ...points.map((p) => Math.max(show.people ? p.people : 0, show.opens ? p.opens : 0))) * 1.08;
  const y = (v: number) => 100 - (v / ceil) * 100;
  // The curve runs to both edges of the page: it holds the first and the last level across the part outside them.
  const path = (get: (p: Point) => number) =>
    smooth([0, ...points.map((p) => p.x), 100], [y(get(points[0]!)), ...points.map((p) => y(get(p))), y(get(points[last]!))]);
  const pp = path((p) => p.people), po = path((p) => p.opens);
  const edge = (x: number) => (x < 12 ? 'start' : x > 88 ? 'end' : undefined);
  const at = (cx: number) => {
    const r = ref.current!.getBoundingClientRect(), x = ((cx - r.left) / r.width) * 100;
    return points.reduce((best, p, i) => (Math.abs(p.x - x) < Math.abs(points[best]!.x - x) ? i : best), 0);
  };
  const key = (e: KeyboardEvent) => {
    const to = step(e.key, active, last);
    if (to === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(to);
  };
  const on = active === null ? null : points[active]!;
  const reading = on ? `${on.name} · ${people(on.people)} · ${fmt(on.opens)} ${on.opens === 1 ? 'open' : 'opens'}` : '';

  return (
    <div
      ref={ref}
      className="pa-lines pa-bleed"
      tabIndex={0}
      role="group"
      aria-label={`${label}. Use the left and right arrow keys to read each one.`}
      onPointerMove={(e) => setActive(at(e.clientX))}
      onPointerDown={(e) => setActive(at(e.clientX))}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }}
      onBlur={() => setActive(null)}
      onKeyDown={key}
    >
      <div className="pa-lines__plot">
        {pins.map((m, k) => (
          <span key={`${m.kind}${m.x}`} className="pa-mark" style={{ left: `${m.x}%` }} data-row={k % 2} data-edge={edge(m.x)}>
            <span className="pa-mark__chip">{m.kind === 'monthEnd' ? <Icon.CalendarDays size={12} /> : <Icon.Sparkles size={12} />}{m.label}</span>
          </span>
        ))}
        <div className="pa-lines__area">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {/* Three stops, steep then shallow: a straight fade to nothing shows as a band. */}
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopOpacity="0.16" />
                <stop offset="0.5" stopOpacity="0.05" />
                <stop offset="1" stopOpacity="0" />
              </linearGradient>
            </defs>
            {show.opens && <path d={po} className="pa-lines__opens" />}
            {show.people && <path d={`${pp}L100,100L0,100Z`} fill={`url(#${gid})`} />}
            {show.people && <path d={pp} className="pa-lines__people" />}
          </svg>
          {on && (
            <span className="pa-lines__guide" style={{ left: `${on.x}%` }}>
              {show.opens && <i data-opens style={{ top: `${y(on.opens)}%` }} />}
              {show.people && <i style={{ top: `${y(on.people)}%` }} />}
            </span>
          )}
        </div>
      </div>
      <div className="pa-axis" aria-hidden="true">
        {points.map((p, i) => <i key={i} className="pa-axis__dot" style={{ left: `${p.x}%` }} data-rest={p.rest || undefined} />)}
        <span className="pa-axis__end" data-side="start">{start}</span>
        <span className="pa-axis__end" data-side="end">Today</span>
        {on && <span className="pa-axis__pill ds-num" style={{ left: `${on.x}%` }} data-edge={edge(on.x)}>{reading}</span>}
      </div>
      <span className="pa-sr" aria-live="polite">{reading}</span>
    </div>
  );
}
