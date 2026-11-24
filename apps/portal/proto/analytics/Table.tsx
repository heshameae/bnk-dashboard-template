// Throwaway variant 3: Table. Every dashboard in one table of figures, sorted by any column.
// No charts until a row is opened; then its days and roles show in place. Answers "which are used, which are not".
import { useMemo, useState } from 'react';
import { Card, Icon } from '../../src/ds';
import type { Dashboard } from '../../src/shell/data';
import { go, href } from '../../src/shell/router';
import { DayColumns, NoDashboards, NotRecorded, OpenLink, Period, RoleRows, useNarrow, useProto } from './parts';
import { dayMonth, fmt, people, shortDay, since, sinceIn, times, type Stats } from './usage';

type Key = 'name' | 'people' | 'change' | 'opens' | 'last';
type Sort = { key: Key; desc: boolean };
const figure: Record<Exclude<Key, 'name'>, (s: Stats) => number> = {
  people: (s) => s.people,
  change: (s) => s.people - s.prev,
  opens: (s) => s.opens,
  last: (s) => (s.last === null ? -Infinity : -s.last),
};
const cmp = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);

export function Table({ openId }: { openId?: string }) {
  const { list, stat, range, recorded } = useProto();
  const [sort, setSort] = useState<Sort>({ key: 'people', desc: true });
  // A phone keeps the name and the people; the other three figures move into the opened row.
  const narrow = useNarrow();

  const rows = useMemo(() => {
    const k = sort.key;
    return list
      .map((d) => ({ d, s: stat(d.id) }))
      .sort((a, b) => {
        const by = k === 'name' ? a.d.title.localeCompare(b.d.title) : cmp(figure[k](a.s), figure[k](b.s));
        return (sort.desc ? -by : by) || a.d.title.localeCompare(b.d.title);
      });
  }, [list, stat, sort]);

  if (!recorded) {
    return (
      <div className="shell-page">
        <NotRecorded>Once the portal logs who opens a dashboard, this page lists every dashboard with how many people opened it and when it was last opened.</NotRecorded>
      </div>
    );
  }
  if (list.length === 0) return <div className="shell-page"><NoDashboards /></div>;

  const opened = rows.filter((r) => r.s.people > 0).length;
  // A plain function, not a component: a component made here would be new on every render and drop keyboard focus after each sort.
  const th = (k: Key, label: string, num?: boolean) => {
    const on = sort.key === k;
    return (
      <th aria-sort={on ? (sort.desc ? 'descending' : 'ascending') : 'none'} className={num ? 'pa-num pa-c-num' : undefined}>
        <button className="pa-sort" data-on={on || undefined} onClick={() => setSort({ key: k, desc: on ? !sort.desc : k !== 'name' })}>
          {label}
          <span className="pa-sort__icon" aria-hidden="true">{on && (sort.desc ? <Icon.ArrowDown size={14} /> : <Icon.ArrowUp size={14} />)}</span>
        </button>
      </th>
    );
  };

  return (
    <div className="shell-page">
      <div className="pa-top">
        <p className="pa-top__text">
          {opened === list.length && list.length > 1 ? `All ${list.length}` : `${opened} of ${list.length}`} {list.length === 1 ? 'dashboard was' : 'dashboards were'} opened in the last {range} days.
        </p>
        <Period />
      </div>
      <Card>
        <table className="ds-table pa-table">
          <thead>
            <tr>
              {th('name', 'Dashboard')}
              {th('people', 'People', true)}
              {!narrow && th('change', 'Change', true)}
              {!narrow && th('opens', 'Opens', true)}
              {!narrow && th('last', 'Last opened', true)}
              <th className="pa-c-chev" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ d, s }) => <Row key={d.id} d={d} s={s} open={d.id === openId} narrow={narrow} />)}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Row({ d, s, open, narrow }: { d: Dashboard; s: Stats; open: boolean; narrow: boolean }) {
  const toggle = () => go(open ? href.analytics() : href.analytics(d.id));
  const panel = `pa-panel-${d.id}`;
  const diff = s.people - s.prev;
  return (
    <>
      <tr className="pa-row" data-open={open || undefined} data-quiet={s.people === 0 || undefined} onClick={toggle}>
        <td>
          {/* The button is what the keyboard and a screen reader use; the whole row is the pointer's target. */}
          <button className="pa-row__name" aria-expanded={open} aria-controls={open ? panel : undefined} onClick={(e) => { e.stopPropagation(); toggle(); }}>
            <span className="ds-label ds-truncate">{d.title}</span>
            <span className="ds-small ds-muted ds-truncate">{d.owner ?? 'Owner not given'}</span>
          </button>
        </td>
        <td className="pa-num ds-num pa-main">{fmt(s.people)}</td>
        {!narrow && (
          <>
            <td className="pa-num ds-num pa-soft">{s.people === 0 && s.prev === 0 ? '–' : diff > 0 ? `+${fmt(diff)}` : diff < 0 ? `−${fmt(-diff)}` : '0'}</td>
            <td className="pa-num ds-num">{fmt(s.opens)}</td>
            <td className="pa-num ds-num pa-soft">{since(s.last)}</td>
          </>
        )}
        <td className="pa-c-chev" aria-hidden="true"><Icon.ChevronRight size={16} /></td>
      </tr>
      {open && (
        <tr className="pa-panel" id={panel}>
          <td colSpan={narrow ? 3 : 6}><Panel d={d} s={s} narrow={narrow} /></td>
        </tr>
      )}
    </>
  );
}

function Panel({ d, s, narrow }: { d: Dashboard; s: Stats; narrow: boolean }) {
  const { range } = useProto();
  const [active, setActive] = useState<number | null>(null);
  if (s.people === 0) {
    return (
      <div className="pa-panel__in" data-empty>
        <p className="ds-muted">Nobody opened it in the last {range} days. {s.last === null ? 'It has never been opened.' : `It was last opened ${sinceIn(s.last)}.`}</p>
        <OpenLink d={d} />
      </div>
    );
  }
  const day = active === null ? null : s.days[active]!;
  const diff = s.people - s.prev;
  return (
    <div className="pa-panel__in">
      {narrow && (
        <p className="ds-small ds-muted">
          Opened {times(s.opens)}. {diff === 0 ? 'The same number of people as' : `${fmt(Math.abs(diff))} ${diff > 0 ? 'more' : 'fewer'} people than`} the {range} days before.
        </p>
      )}
      <div>
        <div className="pa-panel__read ds-small" aria-live="polite">
          {day ? <>{shortDay(day.date)}<span className="ds-muted">, {people(day.people)}</span></> : <span className="ds-muted">People per day</span>}
        </div>
        <DayColumns days={s.days} height={96} active={active} onActive={setActive} label={`${d.title}: people per day, last ${range} days`} />
        <div className="pa-x ds-caption ds-faint" aria-hidden="true"><span>{dayMonth(s.days[0]!.date)}</span><span>Today</span></div>
      </div>
      <div className="pa-panel__side">
        {s.roles.length > 0 && (
          <>
            <div className="ds-small ds-muted">By role</div>
            <RoleRows roles={s.roles} compact />
          </>
        )}
        <OpenLink d={d} />
      </div>
    </div>
  );
}
