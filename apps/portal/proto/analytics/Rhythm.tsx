// Throwaway variant 4: Rhythm. One strip of days per dashboard: a square per day, stronger when busier.
// Shows at a glance which dashboards are a daily habit, which are month-end, and which nobody opens.
import { memo, useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Card } from '../../src/ds';
import type { Dashboard } from '../../src/shell/data';
import { go, href } from '../../src/shell/router';
import { NoDashboards, NotRecorded, OpenLink, Period, useProto } from './parts';
import { dayMonth, fmt, monthShort, people, shortDay, sinceIn, weekdayShort, type Range, type Stats } from './usage';

/** Where the dates go above the strips: every day for a week, Mondays for a month, month starts for a quarter. */
function ticks(dates: Date[], range: Range): { i: number; text: string }[] {
  if (range === 7) return dates.map((d, i) => ({ i, text: weekdayShort(d) }));
  const out = dates.flatMap((d, i) => ((range === 30 ? d.getDay() === 1 : d.getDate() === 1) ? [{ i, text: range === 30 ? dayMonth(d) : monthShort(d) }] : []));
  if (range === 90 && dates[0] && (out[0]?.i ?? 99) >= 10) out.unshift({ i: 0, text: monthShort(dates[0]) });
  return out;
}

export function Rhythm({ openId }: { openId?: string }) {
  const { list, stat, range, recorded } = useProto();
  const [read, setRead] = useState<string | null>(null);
  const rows = useMemo(
    () => list.map((d) => ({ d, s: stat(d.id) })).sort((a, b) => b.s.people - a.s.people || a.d.title.localeCompare(b.d.title)),
    [list, stat],
  );
  const marks = useMemo(() => ticks(rows[0]?.s.days.map((x) => x.date) ?? [], range), [rows, range]);

  if (!recorded) {
    return (
      <div className="shell-page">
        <NotRecorded>Once the portal logs who opens a dashboard, this page shows which days each dashboard was opened, one row per dashboard.</NotRecorded>
      </div>
    );
  }
  if (list.length === 0) return <div className="shell-page"><NoDashboards /></div>;

  return (
    <div className="shell-page">
      <div className="pa-top">
        {/* The legend is a sentence. Pointing at a square swaps it for that day's reading, in the same place. */}
        <p className="pa-top__text ds-truncate" data-reading={read ? '' : undefined}>{read ?? 'Each square is a day. A stronger square means a busier day for that dashboard.'}</p>
        <Period />
      </div>
      <Card className="pa-rh" data-n={range} style={{ '--n': range } as CSSProperties}>
        <div className="pa-rh__axis ds-caption ds-faint" aria-hidden="true">
          <span />
          <span className="pa-rh__cells">{marks.map((m) => <b key={m.i} style={{ gridColumnStart: m.i + 1 }}>{m.text}</b>)}</span>
          <span className="pa-num">People</span>
        </div>
        {rows.map(({ d, s }) => <Group key={d.id} d={d} s={s} open={d.id === openId} range={range} onRead={setRead} />)}
      </Card>
    </div>
  );
}

const Group = memo(function Group({ d, s, open, range, onRead }: { d: Dashboard; s: Stats; open: boolean; range: Range; onRead: (text: string | null) => void }) {
  // Every strip in a group shares one scale, the dashboard's busiest day, so its roles compare with each other.
  const max = Math.max(1, ...s.days.map((x) => x.people));
  const read = useCallback(
    (i: number | null, n?: number, role?: string) =>
      onRead(i === null ? null : `${shortDay(s.days[i]!.date)}: ${people(n ?? 0)}${role ? ` with the role ${role}` : ''} opened ${d.title}.`),
    [d, s, onRead],
  );
  return (
    <div className="pa-rh__group" data-open={open || undefined}>
      <button className="pa-rh__row" aria-expanded={open} onClick={() => go(open ? href.analytics() : href.analytics(d.id))}>
        <span className="pa-rh__name ds-label ds-truncate">{d.title}</span>
        <Strip values={s.days.map((x) => x.people)} max={max} label={`opened on ${s.activeDays} of the last ${range} days`} onRead={(i, n) => read(i, n)} />
        <span className="pa-rh__total pa-num ds-num" data-none={s.people === 0 || undefined}>{fmt(s.people)}</span>
      </button>
      {open && (
        <div className="pa-rh__sub">
          {s.people === 0 ? (
            <p className="pa-rh__note ds-small ds-muted">{s.last === null ? 'It has never been opened.' : `It was last opened ${sinceIn(s.last)}.`}</p>
          ) : (
            s.roles.map((r) => (
              <div key={r.id} className="pa-rh__row" data-sub>
                <span className="pa-rh__name ds-small ds-muted ds-truncate">{r.name}</span>
                <Strip values={r.days} max={max} label={`${r.name}: ${people(r.value)}`} onRead={(i, n) => read(i, n, r.name)} />
                <span className="pa-rh__total pa-num ds-num ds-small ds-muted">{fmt(r.value)}</span>
              </div>
            ))
          )}
          <div className="pa-rh__foot"><OpenLink d={d} /></div>
        </div>
      )}
    </div>
  );
});

function Strip({ values, max, label, onRead }: { values: number[]; max: number; label: string; onRead: (i: number | null, n?: number) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState<number | null>(null);
  const set = (i: number | null) => { setOn(i); onRead(i, i === null ? undefined : values[i]); };
  const at = (x: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(values.length - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * values.length)));
  };
  return (
    <span
      ref={ref}
      className="pa-rh__cells"
      role="img"
      aria-label={label}
      // A reading on hover is extra. Totals and the pattern never depend on it, so touch loses nothing it needs.
      onPointerMove={(e) => { if (e.pointerType === 'mouse') set(at(e.clientX)); }}
      onPointerLeave={() => set(null)}
    >
      {values.map((v, i) => <i key={i} data-l={v ? Math.ceil((v / max) * 4) : 0} data-on={i === on || undefined} />)}
    </span>
  );
}
