// Throwaway: the pieces more than one variant uses. Imported by nothing outside proto/analytics.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Card, EmptyState, Field, Icon, Menu, MenuItem } from '../../src/ds';
import type { Dashboard } from '../../src/shell/data';
import { go, href } from '../../src/shell/router';
import { RANGES, dayMonth, fmt, longDay, sinceIn, times, type Day, type Mark, type Person, type Range, type Stats, type TodayStats } from './usage';

/* ------------------------------------------------------------ proto state */
export type Proto = {
  list: Dashboard[];
  stat: (id: string) => Stats;
  persons: (id: string) => Person[];
  today: (id: string) => TodayStats;
  marks: (id: string) => Mark[];
  range: Range;
  setRange: (r: Range) => void;
  /** false shows today's truth: the portal records no usage yet. */
  recorded: boolean;
};
export const ProtoCtx = createContext<Proto | null>(null);
export const useProto = () => useContext(ProtoCtx)!;

/** True on a phone-width screen. The table drops columns there; a cell hidden with CSS alone would leave a ghost column behind. */
export function useNarrow() {
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 640px)').matches);
  useEffect(() => {
    const mq = matchMedia('(max-width: 640px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

/* ---------------------------------------------------------------- period */
/** A variant that has a "Today" view provides this; the period control then offers Today first. */
export const TodayCtx = createContext<{ live: boolean; setLive: (on: boolean) => void } | null>(null);

/** 7, 30 or 90 days (and Today, where a variant has it). A time range is what a segmented control is for. */
export function Period() {
  const { range, setRange } = useProto();
  const t = useContext(TodayCtx);
  return (
    <div className="pa-period" role="group" aria-label="Period">
      {t && <button aria-pressed={t.live} onClick={() => t.setLive(true)}>Today</button>}
      {RANGES.map((r) => (
        <button key={r} aria-pressed={r === range && !t?.live} onClick={() => { t?.setLive(false); setRange(r); }}>{r} days</button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- nothing recorded */
/** Today's truth, said once per page instead of once per panel. */
export function NotRecorded({ children }: { children: ReactNode }) {
  return (
    <Card>
      <EmptyState icon={<Icon.Activity size={18} />} title="Usage is not recorded yet">{children}</EmptyState>
    </Card>
  );
}

export function NoDashboards() {
  return (
    <Card>
      <EmptyState icon={<Icon.LayoutDashboard size={18} />} title="No dashboards published yet">
        A dashboard shows here once its spec is ready and it has passed verify.
      </EmptyState>
    </Card>
  );
}

export function OpenLink({ d }: { d: Dashboard }) {
  return <a className="pa-link" href={href.dashboard(d.id)}>Open dashboard<Icon.ArrowUpRight size={14} /></a>;
}

/* ----------------------------------------------------------- title switch */
/** The page title, and the way to another dashboard. Each row carries its people count, so the menu doubles as a ranking. */
export function TitleSwitch({ d }: { d: Dashboard }) {
  const { list, stat, range } = useProto();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter((o) => !s || o.title.toLowerCase().includes(s));
  }, [list, q]);
  const pick = (o: Dashboard) => { setOpen(false); setQ(''); go(href.analytics(o.id)); };

  return (
    <div className="pa-switch">
      <h1 className="ds-h2 pa-title">
        <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span>{d.title}</span>
          <Icon.ChevronsUpDown size={16} aria-hidden="true" />
        </button>
      </h1>
      <Menu open={open} onClose={() => setOpen(false)} style={{ top: 'calc(100% + 8px)', left: -8, width: 'min(380px, calc(100vw - 32px))' }}>
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
        <div className="ds-menu__label pa-switch__cap"><span>Dashboard</span><span>People, {range} days</span></div>
        <div className="pa-switch__list">
          {shown.length === 0 && <div className="ds-menu__label">Nothing matches “{q}”.</div>}
          {shown.map((o) => (
            <MenuItem key={o.id} active={o.id === d.id} onClick={() => pick(o)}>
              <span className="ds-truncate" style={{ flex: 1 }}>{o.title}</span>
              <span className="ds-num ds-faint">{fmt(stat(o.id).people)}</span>
            </MenuItem>
          ))}
        </div>
      </Menu>
    </div>
  );
}

/* ------------------------------------------------------------ day columns */
/** One column per day. Point at a day, tap it, or focus the chart and use the arrow keys; the parent shows the reading. */
export function DayColumns({ days, height, active, onActive, label }: {
  days: Day[];
  height: number;
  active: number | null;
  onActive: (i: number | null) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...days.map((d) => d.people));
  const last = days.length - 1;
  const at = (x: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(last, Math.max(0, Math.floor(((x - r.left) / r.width) * days.length)));
  };
  const key = (e: KeyboardEvent) => {
    const to = step(e.key, active, last);
    if (to === undefined) return;
    // The arrows read the chart here; they must not also flip the prototype picker.
    e.preventDefault();
    e.stopPropagation();
    onActive(to);
  };
  return (
    <div
      ref={ref}
      className="pa-cols"
      style={{ height }}
      data-n={days.length}
      data-active={active !== null || undefined}
      tabIndex={0}
      role="group"
      aria-label={`${label}. Use the left and right arrow keys to read each one.`}
      onPointerMove={(e) => onActive(at(e.clientX))}
      onPointerDown={(e) => onActive(at(e.clientX))}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') onActive(null); }}
      onBlur={() => onActive(null)}
      onKeyDown={key}
    >
      {days.map((d, i) => (
        <span key={i} className="pa-col" data-on={i === active || undefined}>
          <span className="pa-bar" style={{ height: d.people ? `max(2px, ${(d.people / max) * 100}%)` : 0 }} />
        </span>
      ))}
    </div>
  );
}

/** Where an arrow, Home, End or Escape moves the reading. undefined: not a key the chart handles. */
export function step(key: string, active: number | null, last: number): number | null | undefined {
  return key === 'ArrowLeft' ? (active === null ? last : Math.max(0, active - 1))
    : key === 'ArrowRight' ? (active === null ? last : Math.min(last, active + 1))
    : key === 'Home' ? 0
    : key === 'End' ? last
    : key === 'Escape' ? null
    : undefined;
}

/* ------------------------------------------------------------------ hero */
const noun = (n: number) => (n === 1 ? 'person' : 'people');

/** Focus's opening: one number in a sentence, then the days. The number follows the day you point at. */
export function DaysHero({ s, range, height = 160 }: { s: Stats; range: Range; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const day = active === null ? null : s.days[active]!;
  const diff = s.people - s.prev;
  const versus =
    s.prev === 0 ? `Nobody opened it in the ${range} days before`
    : diff === 0 ? `The same as the ${range} days before`
    : `${fmt(Math.abs(diff))} ${diff > 0 ? 'more' : 'fewer'} than the ${range} days before`;
  return (
    <section className="pa-focus__main">
      <div className="pa-hero" aria-live="polite">
        <div className="pa-hero__figure ds-num">{fmt(day ? day.people : s.people)}</div>
        <div className="pa-hero__line ds-truncate">
          {day ? `${noun(day.people)} opened it on ${longDay(day.date)}` : `${noun(s.people)} opened it in the last ${range} days`}
        </div>
        <div className="pa-hero__sub ds-truncate">{day ? (day.opens ? `Opened ${times(day.opens)}` : '') : versus}</div>
      </div>
      <div>
        <DayColumns days={s.days} height={height} active={active} onActive={setActive} label={`People per day, last ${range} days`} />
        <div className="pa-x ds-caption ds-faint" aria-hidden="true"><span>{dayMonth(s.days[0]!.date)}</span><span>Today</span></div>
      </div>
    </section>
  );
}

/** Nobody opened it in the range: the one thing left to say is when somebody last did. */
export function Zero({ s, range }: { s: Stats; range: Range }) {
  return (
    <div className="pa-hero">
      <div className="pa-hero__figure ds-num">0</div>
      <div className="pa-hero__line">people opened it in the last {range} days</div>
      <div className="pa-hero__sub">{s.last === null ? 'It has never been opened' : `It was last opened ${sinceIn(s.last)}`}</div>
    </div>
  );
}

/* --------------------------------------------------------------- by role */
export function RoleRows({ roles, compact }: { roles: Stats['roles']; compact?: boolean }) {
  const max = Math.max(1, ...roles.map((r) => r.value));
  return (
    <ul className="pa-roles" data-compact={compact || undefined}>
      {roles.map((r) => (
        <li key={r.id} data-none={r.value === 0 || undefined}>
          <span className="ds-truncate">{r.name}</span>
          {!compact && <span className="pa-roles__track" aria-hidden="true"><span style={{ width: `${(r.value / max) * 100}%` }} /></span>}
          <span className="ds-num pa-num">{fmt(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- weekdays */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Seven columns, Monday to Sunday: which days of the week it is opened on. The busiest is inked. */
export function WeekBars({ s }: { s: Stats }) {
  const max = Math.max(1, ...s.weekdays);
  return (
    <div className="pa-weekbars" role="img" aria-label={`Opens by weekday: ${s.weekdays.map((v, i) => `${DAYS[i]} ${v}`).join(', ')}`}>
      {s.weekdays.map((v, i) => (
        <span key={i} data-top={v === max || undefined}>
          <i style={{ height: v ? `max(2px, ${(v / max) * 100}%)` : 0 }} />
          <b>{DAYS[i]}</b>
        </span>
      ))}
    </div>
  );
}
