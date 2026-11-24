// Throwaway riff on Focus: People. Focus's number and days, then the people behind the number, one row each,
// with a dot for every day they opened it. From visitors.now's visitor profiles: who, not only how many.
// Needs sign-in, so the portal knows who opened what. The names here are made up.
import { useState, type CSSProperties } from 'react';
import { Avatar, Button, SectionTitle } from '../../src/ds';
import type { Dashboard } from '../../src/shell/data';
import { DaysHero, NotRecorded, Period, TitleSwitch, Zero, useNarrow, useProto } from './parts';
import { fmt, since } from './usage';

const FIRST = 8;
const MORE = 20;

export function People({ d }: { d: Dashboard }) {
  const { stat, persons, range, recorded } = useProto();
  const [role, setRole] = useState<string | null>(null);
  const [shown, setShown] = useState(FIRST);
  const narrow = useNarrow();

  if (!recorded) {
    return (
      <div className="shell-page pa-narrow">
        <NotRecorded>Once the portal logs who opens a dashboard, this page shows how many people opened it and lists them, with the days each one opened it.</NotRecorded>
      </div>
    );
  }

  const s = stat(d.id);
  const all = persons(d.id);
  const used = s.roles.filter((r) => r.value > 0);
  // A role picked on one period may have nobody on another; then the list falls back to everyone.
  const on = role && used.some((r) => r.name === role) ? role : null;
  const list = on ? all.filter((p) => p.role === on) : all;
  const pick = (name: string | null) => { setRole(name); setShown(FIRST); };
  const weekly = range === 90;

  return (
    <div className="shell-page pa-narrow pa-focus">
      <div className="pa-head">
        <TitleSwitch d={d} />
        <Period />
      </div>

      {s.people === 0 ? <Zero s={s} range={range} /> : (
        <>
          <DaysHero s={s} range={range} height={96} />

          <section>
            <div className="pa-people__head">
              <SectionTitle>Who opened it</SectionTitle>
              {used.length > 1 && (
                <div className="pa-period" role="group" aria-label="Role">
                  <button aria-pressed={on === null} onClick={() => pick(null)}>All <span>{fmt(s.people)}</span></button>
                  {used.map((r) => (
                    <button key={r.id} aria-pressed={on === r.name} onClick={() => pick(r.name)}>{r.name} <span>{fmt(r.value)}</span></button>
                  ))}
                </div>
              )}
            </div>
            <table className="pa-people">
              <thead>
                <tr>
                  <th>Person</th>
                  {!narrow && <th style={{ width: list[0] ? list[0].cells.length * 8 + 52 : undefined }}>{weekly ? 'Weeks, and days opened' : 'Days opened'}</th>}
                  <th className="pa-num" style={{ width: 104 }}>Last opened</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, shown).map((p) => (
                  <tr key={p.key}>
                    <td>
                      <span className="pa-person">
                        <Avatar name={p.name} />
                        <span className="pa-person__text">
                          <span className="ds-label ds-truncate">{p.name}</span>
                          <span className="ds-small ds-muted ds-truncate">{p.role}{narrow && `, ${p.days} ${p.days === 1 ? 'day' : 'days'}`}</span>
                        </span>
                      </span>
                    </td>
                    {!narrow && (
                      <td>
                        <span className="pa-days">
                          {/* A dot per day, hollow when they did not open it. For 90 days a dot is a week, darker the more days in it. */}
                          <span className="pa-dots" style={{ '--n': p.cells.length } as CSSProperties} role="img" aria-label={`Opened on ${p.days} of the last ${range} days`}>
                            {p.cells.map((v, i) => <i key={i} data-l={weekly ? Math.min(4, v) : v ? 4 : 0} />)}
                          </span>
                          <span className="ds-num ds-small ds-muted" aria-hidden="true">{p.days}</span>
                        </span>
                      </td>
                    )}
                    <td className="pa-num ds-small ds-muted">{since(p.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length > shown && (
              <Button variant="tertiary" className="pa-more" onClick={() => setShown((n) => n + MORE)}>
                Show {fmt(Math.min(MORE, list.length - shown))} more of {fmt(list.length)}
              </Button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
