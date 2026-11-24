// Throwaway riff on Focus: Today. Focus, with a "Today" period in front of the others: who has it open this morning,
// hour by hour, against the time the data was refreshed, and the latest people to open it.
// From visitors.now's "Today" view and its "28 people in the last 30m". Needs opens logged as they happen.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Icon, SectionTitle } from '../../src/ds';
import type { Dashboard } from '../../src/shell/data';
import { Focus } from './Focus';
import { DayColumns, NotRecorded, Period, TitleSwitch, TodayCtx, useProto } from './parts';
import { clock, fmt, people, times, todayName } from './usage';

const noun = (n: number) => (n === 1 ? 'person' : 'people');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Today({ d }: { d: Dashboard }) {
  const [live, setLive] = useState(true);
  const ctx = useMemo(() => ({ live, setLive }), [live]);
  // The other periods are Focus itself; this variant only adds the first one.
  return <TodayCtx.Provider value={ctx}>{live ? <Now d={d} /> : <Focus d={d} />}</TodayCtx.Provider>;
}

function Now({ d }: { d: Dashboard }) {
  const { today, recorded } = useProto();
  const [active, setActive] = useState<number | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  // The pulse is the only looping motion on the page: it stops when scrolled out of view.
  useEffect(() => {
    const el = liveRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute('data-paused', !e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [recorded]);

  if (!recorded) {
    return (
      <div className="shell-page pa-narrow">
        <NotRecorded>Once the portal logs who opens a dashboard, this page shows who has opened it today, hour by hour, and the last 7, 30 and 90 days.</NotRecorded>
      </div>
    );
  }

  const t = today(d.id);
  const nowHour = Math.floor(t.nowMinute / 60);
  const hour = active === null ? null : t.hours[active]!;
  const diff = t.people - t.lastWeek;
  const versus =
    t.lastWeek === 0 ? (t.people === 0 ? `Nobody had opened it by this time last ${todayName()} either` : `Nobody had opened it by this time last ${todayName()}`)
    : diff === 0 ? `The same as last ${todayName()} by this time`
    : `${fmt(Math.abs(diff))} ${diff > 0 ? 'more' : 'fewer'} than last ${todayName()} by this time`;
  // The refresh time is read out of the data team's own sentence, when it holds one ("daily after CBS load, ~02:30").
  const at = /(\d{1,2})[:.](\d{2})/.exec(d.refresh ?? '');
  const refreshed = at ? Number(at[1]) * 60 + Number(at[2]) : null;
  const left = (minute: number) => `${(minute / 1440) * 100}%`;

  return (
    <div className="shell-page pa-narrow pa-focus">
      <div className="pa-head">
        <TitleSwitch d={d} />
        <Period />
      </div>

      <section className="pa-focus__main">
        <div className="pa-hero" aria-live="polite">
          <div ref={liveRef} className="pa-live" data-on={t.recent > 0 || undefined}>
            <span className="pa-live__dot" aria-hidden="true" />
            {t.recent > 0 ? <span><b>{cap(people(t.recent))}</b> in the last 30 minutes</span> : <span>Nobody in the last 30 minutes</span>}
          </div>
          <div className="pa-hero__figure ds-num">{fmt(hour ? hour.people : t.people)}</div>
          <div className="pa-hero__line ds-truncate">
            {hour ? `${noun(hour.people)} opened it between ${clock(active! * 60)} and ${clock(Math.min(active! + 1, 24) * 60 - (active === 23 ? 1 : 0))}` : `${noun(t.people)} opened it today`}
          </div>
          <div className="pa-hero__sub ds-truncate">{hour ? (hour.opens ? `Opened ${times(hour.opens)}` : '') : versus}</div>
        </div>

        <div className="pa-hours">
          {refreshed !== null && refreshed <= t.nowMinute && (
            <span className="pa-mark" style={{ left: left(refreshed) }} data-row="1" data-edge={refreshed < 180 ? 'start' : undefined}>
              <span className="pa-mark__chip"><Icon.RefreshCw size={12} />Data refreshed {clock(refreshed)}</span>
            </span>
          )}
          <span className="pa-mark" data-now style={{ left: left(t.nowMinute) }} data-row="0" data-edge={t.nowMinute > 1260 ? 'end' : t.nowMinute < 180 ? 'start' : undefined}>
            <span className="pa-mark__chip">Now {clock(t.nowMinute)}</span>
          </span>
          {/* Hours still to come cannot be read: the reading stops at the current hour. */}
          <DayColumns days={t.hours} height={160} active={active} onActive={(i) => setActive(i === null ? null : Math.min(i, nowHour))} label="People per hour, today" />
          <div className="pa-x ds-caption ds-faint" aria-hidden="true"><span>00:00</span><span>12:00</span><span>23:59</span></div>
        </div>
      </section>

      <section>
        <SectionTitle>Latest</SectionTitle>
        {t.feed.length === 0 ? (
          <p className="pa-feed__none ds-muted">Nobody has opened it yet today.</p>
        ) : (
          <ol className="pa-feed">
            {t.feed.map((o) => (
              <li key={o.key}>
                <time className="ds-num ds-small ds-muted">{clock(o.minute)}</time>
                <Avatar name={o.name} />
                <span className="ds-label ds-truncate">{o.name}</span>
                <span className="ds-small ds-muted ds-truncate">{o.role}</span>
              </li>
            ))}
          </ol>
        )}
        {t.more > 0 && <p className="pa-feed__more ds-small ds-muted">And {fmt(t.more)} more {t.more === 1 ? 'open' : 'opens'} earlier today.</p>}
      </section>
    </div>
  );
}
