// Throwaway variant 2: Focus. Analytics opens straight on one dashboard, with no page to choose from first.
// One column: how many people, the days, the roles. The title is the switcher, so the name shows once.
import { useState } from 'react';
import { SectionTitle } from '../../src/ds';
import type { Dashboard } from '../../src/shell/data';
import { DayColumns, NotRecorded, Period, RoleRows, TitleSwitch, useProto } from './parts';
import { dayMonth, fmt, longDay, people, shortDay, sinceIn, times } from './usage';

const noun = (n: number) => (n === 1 ? 'person' : 'people');

export function Focus({ d }: { d: Dashboard }) {
  const { stat, range, recorded } = useProto();
  const [active, setActive] = useState<number | null>(null);

  if (!recorded) {
    return (
      <div className="shell-page pa-narrow">
        <NotRecorded>Once the portal logs who opens a dashboard, this page shows how many people opened it, on which days and from which roles.</NotRecorded>
      </div>
    );
  }

  const s = stat(d.id);
  const day = active === null ? null : s.days[active]!;
  const diff = s.people - s.prev;
  const versus =
    s.prev === 0 ? `Nobody opened it in the ${range} days before`
    : diff === 0 ? `The same as the ${range} days before`
    : `${fmt(Math.abs(diff))} ${diff > 0 ? 'more' : 'fewer'} than the ${range} days before`;

  return (
    <div className="shell-page pa-narrow pa-focus">
      <div className="pa-head">
        <TitleSwitch d={d} />
        <Period />
      </div>

      {s.people === 0 ? (
        <div className="pa-hero">
          <div className="pa-hero__figure ds-num">0</div>
          <div className="pa-hero__line">people opened it in the last {range} days</div>
          <div className="pa-hero__sub">{s.last === null ? 'It has never been opened' : `It was last opened ${sinceIn(s.last)}`}</div>
        </div>
      ) : (
        <>
          <section className="pa-focus__main">
            {/* The reading follows the day you point at, so the chart needs no tooltip and no axis. */}
            <div className="pa-hero" aria-live="polite">
              <div className="pa-hero__figure ds-num">{fmt(day ? day.people : s.people)}</div>
              <div className="pa-hero__line ds-truncate">
                {day ? `${noun(day.people)} opened it on ${longDay(day.date)}` : `${noun(s.people)} opened it in the last ${range} days`}
              </div>
              <div className="pa-hero__sub ds-truncate">{day ? (day.opens ? `Opened ${times(day.opens)}` : '') : versus}</div>
            </div>
            <div>
              <DayColumns days={s.days} height={160} active={active} onActive={setActive} label={`People per day, last ${range} days`} />
              <div className="pa-x ds-caption ds-faint" aria-hidden="true"><span>{dayMonth(s.days[0]!.date)}</span><span>Today</span></div>
            </div>
          </section>

          <dl className="pa-facts">
            <div><dt>Opens</dt><dd className="ds-num">{fmt(s.opens)}</dd></div>
            <div><dt>Came back on another day</dt><dd className="ds-num">{fmt(s.returning)} of {fmt(s.people)}</dd></div>
            {s.busiest && <div><dt>Busiest day</dt><dd>{shortDay(s.busiest.date)}<span className="pa-facts__more">, {people(s.busiest.people)}</span></dd></div>}
          </dl>

          {s.roles.length > 0 && (
            <section>
              <SectionTitle>By role</SectionTitle>
              <RoleRows roles={s.roles} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
