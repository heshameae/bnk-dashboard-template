// Reads usage/opens.csv, one row per open (contract: docs/contracts/usage.md), and counts it into
// what the Analytics page draws. Pure functions: text in, numbers out. Tested in usage.test.mjs.
//
// How it counts. The page's own words are in quotes.
//   "the last N days"  The N days that end on the day of the newest row in the whole file. Not the day the page is viewed.
//   "people"           Different `person` ids. Someone who opened it twice is one person.
//   "opens"            Rows.
//   "came back"        People who opened it on more than one day of the range.
//   the change chips   The same count for the N days before the range.
//   "busiest day"      The day with the most different people. On a tie, the later day.
//   by role            Different people per role. Someone who changed role inside the range is counted under both.
//   busiest time       The weekday with the most opens, and the two hours in a row with the most opens.
// A day or an hour is read from the characters of `at`. Nothing is converted between time zones.

export const RANGES = [7, 30, 90];
/** The page shows up to this many days. */
export const SHOWN = 90;
const HEADER = 'at,dashboard,person,role';
const AT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;
const MS = 86_400_000;

/** A calendar day as a whole number of days, or null when the date does not exist (30 February). */
const dayNumber = (y, m, d) => {
  const t = Date.UTC(y, m - 1, d);
  const back = new Date(t);
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d ? t / MS : null;
};
/** A day number back to YYYY-MM-DD. */
export const dateOf = (day) => new Date(day * MS).toISOString().slice(0, 10);
/** 0 Monday ... 6 Sunday. */
const weekday = (day) => (new Date(day * MS).getUTCDay() + 6) % 7;

/**
 * The file's text to rows. Every line that breaks the contract is reported, with its line number;
 * the caller stops the build when `errors` is not empty.
 * @returns {{ rows: { day: number, hour: number, dashboard: string, person: string, role: string }[], errors: string[] }}
 */
export function parseOpens(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const rows = [], errors = [];
  if ((lines[0] ?? '').trim() !== HEADER) return { rows, errors: [`line 1: the header must be "${HEADER}"`] };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const cells = lines[i].split(',').map((c) => c.trim());
    if (cells.length !== 4) { errors.push(`line ${i + 1}: expected 4 cells (${HEADER}), found ${cells.length}`); continue; }
    const [at, dashboard, person, role] = cells;
    const m = AT.exec(at);
    const day = m ? dayNumber(+m[1], +m[2], +m[3]) : null;
    if (day === null || +m[4] > 23 || +m[5] > 59 || +m[6] > 59) { errors.push(`line ${i + 1}: "at" must be a real date and time written YYYY-MM-DDTHH:MM:SS, found "${at}"`); continue; }
    if (!dashboard) { errors.push(`line ${i + 1}: "dashboard" is blank`); continue; }
    if (!person) { errors.push(`line ${i + 1}: "person" is blank`); continue; }
    rows.push({ day, hour: +m[4], dashboard, person, role });
  }
  return { rows, errors };
}

/** The value for a key, made on first use. */
const at = (map, key, make) => { let v = map.get(key); if (v === undefined) { v = make(); map.set(key, v); } return v; };

/** One dashboard's figures for the `n` days ending on `asOf`. */
function range(list, asOf, n) {
  const from = asOf - n + 1, before = from - n;
  const daysOf = new Map();   // person -> the days they opened it
  const perDay = new Map();   // day -> the people who opened it
  const perRole = new Map();  // role -> the people who held it
  const prev = new Set();
  const hours = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let opens = 0, prevOpens = 0;
  for (const r of list) {
    if (r.day >= from && r.day <= asOf) {
      opens++;
      at(daysOf, r.person, () => new Set()).add(r.day);
      at(perDay, r.day, () => new Set()).add(r.person);
      at(perRole, r.role, () => new Set()).add(r.person);
      hours[weekday(r.day)][r.hour]++;
    } else if (r.day >= before && r.day < from) {
      prevOpens++;
      prev.add(r.person);
    }
  }
  let cameBack = 0;
  for (const days of daysOf.values()) if (days.size > 1) cameBack++;
  let busiest = null;
  for (const [day, who] of perDay) if (!busiest || who.size > busiest.people || (who.size === busiest.people && day > busiest.day)) busiest = { day, people: who.size };
  const byDay = hours.map((row) => row.reduce((a, b) => a + b, 0));
  const byHour = Array.from({ length: 24 }, (_, h) => hours.reduce((a, row) => a + row[h], 0));
  let wd = 0, hr = 0;
  for (let i = 1; i < 7; i++) if (byDay[i] > byDay[wd]) wd = i;
  for (let h = 1; h < 23; h++) if (byHour[h] + byHour[h + 1] > byHour[hr] + byHour[hr + 1]) hr = h;
  return {
    people: daysOf.size,
    prevPeople: prev.size,
    opens,
    prevOpens,
    cameBack,
    roles: [...perRole].map(([id, who]) => ({ id, people: who.size })).sort((a, b) => b.people - a.people || a.id.localeCompare(b.id)),
    busiest: busiest && { date: dateOf(busiest.day), people: busiest.people },
    when: opens ? { weekday: wd, hour: hr } : null,
    hours,
  };
}

/** One dashboard: its day and week series, and its figures for each range. */
function one(list, asOf) {
  const start = asOf - SHOWN + 1;
  // Weeks are counted back from asOf, so the newest week is a full one. 90 is not a multiple of 7: the oldest has 6 days.
  const nWeeks = Math.ceil(SHOWN / 7);
  const weekOf = (i) => nWeeks - 1 - Math.floor((SHOWN - 1 - i) / 7);
  const dayPeople = Array.from({ length: SHOWN }, () => new Set()), dayOpens = new Array(SHOWN).fill(0);
  const weekPeople = Array.from({ length: nWeeks }, () => new Set()), weekOpens = new Array(nWeeks).fill(0);
  let last = null;
  for (const r of list) {
    if (last === null || r.day > last) last = r.day;
    const i = r.day - start;
    if (i < 0 || i >= SHOWN) continue;
    dayPeople[i].add(r.person); dayOpens[i]++;
    weekPeople[weekOf(i)].add(r.person); weekOpens[weekOf(i)]++;
  }
  return {
    last: last === null ? null : dateOf(last),
    days: { from: dateOf(start), people: dayPeople.map((s) => s.size), opens: dayOpens },
    weeks: { people: weekPeople.map((s) => s.size), opens: weekOpens },
    ranges: Object.fromEntries(RANGES.map((n) => [n, range(list, asOf, n)])),
  };
}

/**
 * Rows to what the page draws: one entry per published dashboard, opened or not.
 * @param rows from parseOpens
 * @param {string[]} published the ids of the dashboards the portal shows
 * @returns {{ asOf: string | null, dashboards: Record<string, object>, skipped: number }}
 *   asOf null: there are no rows, so nothing is recorded. skipped: rows for a dashboard that is not published.
 */
export function summarize(rows, published) {
  if (rows.length === 0) return { asOf: null, dashboards: {}, skipped: 0 };
  let asOf = rows[0].day;
  for (const r of rows) if (r.day > asOf) asOf = r.day;
  const lists = new Map(published.map((id) => [id, []]));
  let skipped = 0;
  for (const r of rows) { const list = lists.get(r.dashboard); if (list) list.push(r); else skipped++; }
  return { asOf: dateOf(asOf), dashboards: Object.fromEntries([...lists].map(([id, list]) => [id, one(list, asOf)])), skipped };
}
