// Throwaway variant 5: Brief. Usage written out in plain sentences, the way the rest of this repo writes.
// The landing is a short note about all dashboards; each dashboard has a note of its own. Almost no charts.
import { useMemo, useState, type ReactNode } from 'react';
import { Button, Icon, SectionTitle } from '../../src/ds';
import type { Dashboard } from '../../src/shell/data';
import { href } from '../../src/shell/router';
import { NoDashboards, NotRecorded, OpenLink, Period, useProto } from './parts';
import { busiestWeekday, fmt, people, rhythm, sinceIn, times, type Stats } from './usage';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const FIRST = 5;

/* ----------------------------------------------------------- every dashboard */
export function BriefAll() {
  const { list, stat, range, recorded } = useProto();
  const [all, setAll] = useState(false);
  const rows = useMemo(
    () => list.map((d) => ({ d, s: stat(d.id) })).sort((a, b) => b.s.people - a.s.people || a.d.title.localeCompare(b.d.title)),
    [list, stat],
  );

  if (!recorded) {
    return (
      <div className="shell-page pa-narrow">
        <NotRecorded>Once the portal logs who opens a dashboard, this page says in plain words which dashboards are used, by how many people, and which are not.</NotRecorded>
      </div>
    );
  }
  if (list.length === 0) return <div className="shell-page pa-narrow"><NoDashboards /></div>;

  const used = rows.filter((r) => r.s.people > 0);
  const unused = rows.filter((r) => r.s.people === 0);
  const top = used[0];

  return (
    <div className="shell-page pa-narrow">
      <div className="pa-brief">
        <div className="pa-head">
          <p className="pa-lead">
            {top ? (
              <>
                In the last {range} days, <b>{used.length === list.length ? `all ${list.length}` : `${used.length} of your ${list.length}`} dashboards</b> were opened.{' '}
                <b>{top.d.title}</b> was opened the most, by <b>{people(top.s.people)}</b>.
                {unused.length > 0 && <> <b>{unused.length}</b> {unused.length === 1 ? 'was' : 'were'} not opened at all.</>}
              </>
            ) : (
              <>Nobody opened a dashboard in the last {range} days.</>
            )}
          </p>
          <Period />
        </div>

        {used.length > 0 && (
          <section>
            <SectionTitle>Opened the most</SectionTitle>
            <ol className="pa-lines">
              {(all ? used : used.slice(0, FIRST)).map(({ d, s }, i) => (
                <Line key={d.id} d={d} rank={i + 1}><span className="ds-num">{people(s.people)}</span>, {rhythm(s)}</Line>
              ))}
            </ol>
            {used.length > FIRST && (
              <Button variant="tertiary" className="pa-more" aria-expanded={all} onClick={() => setAll((v) => !v)}>
                {all ? `Show the first ${FIRST}` : `Show all ${used.length}`}
              </Button>
            )}
          </section>
        )}

        {unused.length > 0 && (
          <section>
            <SectionTitle>Not opened</SectionTitle>
            <ul className="pa-lines">
              {unused.map(({ d, s }) => (
                <Line key={d.id} d={d}>{s.last === null ? 'Never opened' : `Last opened ${sinceIn(s.last)}`}</Line>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Line({ d, rank, children }: { d: Dashboard; rank?: number; children: ReactNode }) {
  return (
    <li>
      <a className="pa-line" href={href.analytics(d.id)} data-ranked={rank !== undefined || undefined}>
        {rank !== undefined && <span className="pa-line__rank ds-num ds-faint" aria-hidden="true">{rank}</span>}
        <span className="pa-line__title ds-label ds-truncate">{d.title}</span>
        <span className="pa-line__what ds-muted">{children}</span>
        <Icon.ChevronRight size={16} className="ds-faint" aria-hidden="true" />
      </a>
    </li>
  );
}

/* -------------------------------------------------------------- one dashboard */
export function BriefOne({ d }: { d: Dashboard }) {
  const { stat, range, recorded } = useProto();
  if (!recorded) {
    return (
      <div className="shell-page pa-narrow">
        <NotRecorded>Once the portal logs who opens a dashboard, this page says in plain words who opened it, when and how often.</NotRecorded>
      </div>
    );
  }
  const s = stat(d.id);
  const diff = s.people - s.prev;
  const busy = busiestWeekday(s);

  return (
    <div className="shell-page pa-narrow">
      <article className="pa-brief">
        {/* The shell hides the topbar's back link on a phone, so the note carries its own there. */}
        <a className="pa-link pa-back" href={href.analytics()}><Icon.ArrowLeft size={14} />All dashboards</a>
        <div className="pa-head">
          <h1 className="ds-h1 pa-brief__title">{d.title}</h1>
          <Period />
        </div>

        <p className="pa-lead">
          {s.people === 0 ? (
            <>Nobody opened it in the last {range} days. {s.last === null ? 'It has never been opened.' : <>It was last opened <b>{sinceIn(s.last)}</b>.</>}</>
          ) : (
            <>
              <b>{cap(people(s.people))}</b> opened it in the last {range} days, <b>{times(s.opens)}</b>{s.opens > 1 && ' in all'}.{' '}
              {s.prev === 0 ? `Nobody opened it in the ${range} days before.`
                : diff === 0 ? `The same number as in the ${range} days before.`
                : <>That is <b>{fmt(Math.abs(diff))} {diff > 0 ? 'more' : 'fewer'}</b> than in the {range} days before.</>}
            </>
          )}
        </p>

        {s.people > 0 && (
          <dl className="pa-notes">
            {s.roles.some((r) => r.value > 0) && <div><dt>Who</dt><dd>{who(s)}</dd></div>}
            <div>
              <dt>When</dt>
              <dd>
                {cap(rhythm(s))}.{busy && ` ${busy} are the busiest.`}
                <Week s={s} />
              </dd>
            </div>
            <div><dt>How often</dt><dd>{howOften(s)}</dd></div>
          </dl>
        )}

        <OpenLink d={d} />
      </article>
    </div>
  );
}

/** "Mostly Branch manager: 588 of the 640. Then Region head with 44 and Head office with 8." */
function who(s: Stats): string {
  const [a, ...rest] = s.roles.filter((r) => r.value > 0);
  if (!a) return '';
  if (rest.length === 0) return s.people === 1 ? `One person, with the role ${a.name}.` : `All of them have the role ${a.name}.`;
  const head = a.value / s.people >= 0.5 ? `Mostly ${a.name}: ${fmt(a.value)} of the ${fmt(s.people)}.` : `${a.name} leads, with ${fmt(a.value)} of the ${fmt(s.people)}.`;
  const names = rest.map((r) => `${r.name} with ${fmt(r.value)}`);
  const tail = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${head} Then ${tail}.`;
}

function howOften(s: Stats): string {
  const once = s.people - s.returning;
  if (s.people === 1) return s.returning ? 'They came back on other days.' : 'They opened it on one day only.';
  if (s.returning === 0) return 'Nobody came back on another day.';
  if (once === 0) return 'All of them came back on another day.';
  return `${fmt(s.returning)} of them came back on another day. ${fmt(once)} opened it on one day only.`;
}

/** Seven small columns, Monday to Sunday. The sentence beside it carries the meaning; this only shows the shape. */
function Week({ s }: { s: Stats }) {
  const max = Math.max(1, ...s.weekdays);
  return (
    <span className="pa-week" aria-hidden="true">
      {s.weekdays.map((v, i) => (
        <span key={i} data-top={v === max || undefined}>
          <i style={{ height: v ? `max(2px, ${(v / max) * 100}%)` : 0 }} />
          <b>{'MTWTFSS'[i]}</b>
        </span>
      ))}
    </span>
  );
}
