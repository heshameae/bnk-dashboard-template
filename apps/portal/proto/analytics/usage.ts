// Throwaway: made-up usage, so each design is judged with numbers in it. The portal records none today.
// Every dashboard gets a set of pretend people who open it on a pattern (daily, weekly, month end, never),
// simulated for 180 days. All figures on screen are counted from that one simulation, so they agree with each other.
// Imported by nothing outside proto/analytics.
import { humanize, roles, type Dashboard } from '../../src/shell/data';

export type Range = 7 | 30 | 90;
export const RANGES: Range[] = [7, 30, 90];
const SPAN = 180;

/* ------------------------------------------------------------------ dates */
const now = new Date();
/** The date t days ago. */
export const dateOf = (t: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - t);
const DATES = Array.from({ length: SPAN }, (_, t) => dateOf(t));
/** Minutes since midnight, when the page loaded. Today's opens stop here: the rest of today has not happened. */
const NOW = now.getHours() * 60 + now.getMinutes();
/** 08:05 */
export const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export const todayName = () => wdLong(now);
const workday = (d: Date) => d.getDay() >= 1 && d.getDay() <= 5;
const monthEnd = (d: Date) => d.getDate() <= 2 || d.getDate() >= new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - 3;

const part = (o: Intl.DateTimeFormatOptions) => { const f = new Intl.DateTimeFormat('en-GB', o); return (d: Date) => f.format(d); };
const wd = part({ weekday: 'short' }), wdLong = part({ weekday: 'long' }), mo = part({ month: 'short' }), moLong = part({ month: 'long' });
export const weekdayShort = wd;
export const monthShort = mo;
/** 4 Nov */
export const dayMonth = (d: Date) => `${d.getDate()} ${mo(d)}`;
/** Tue 4 Nov */
export const shortDay = (d: Date) => `${wd(d)} ${dayMonth(d)}`;
/** Tuesday 4 November */
export const longDay = (d: Date) => `${wdLong(d)} ${d.getDate()} ${moLong(d)}`;
/** Days since it was last opened, for a table cell: Today, 3 days ago, 12 Sep, Never. */
export const since = (t: number | null) => (t === null ? 'Never' : t === 0 ? 'Today' : t === 1 ? 'Yesterday' : t < 7 ? `${t} days ago` : dayMonth(dateOf(t)));
/** The same, for the middle of a sentence: "last opened on 12 Sep". */
export const sinceIn = (t: number) => (t === 0 ? 'today' : t === 1 ? 'yesterday' : t < 7 ? `${t} days ago` : `on ${dayMonth(dateOf(t))}`);

export const fmt = (n: number) => n.toLocaleString('en-US');
export const people = (n: number) => (n === 0 ? 'nobody' : `${fmt(n)} ${n === 1 ? 'person' : 'people'}`);
export const times = (n: number) => (n === 1 ? 'once' : `${fmt(n)} times`);

/* ------------------------------------------------------------- simulation */
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Kind = 'daily' | 'weekly' | 'monthEnd' | 'lapsed' | 'never' | 'fresh';
type Profile = { n: number; kind: Kind; rate: number; weekday?: number };
// One per real dashboard, in listing order. Between them: a very large one, a single person, one never opened,
// one that lapsed seven weeks ago, one published last week, a Monday habit and two month-end ones.
const PROFILES: Profile[] = [
  { n: 640, kind: 'daily', rate: 0.5 },
  { n: 0, kind: 'never', rate: 0 },
  { n: 140, kind: 'daily', rate: 0.22 },
  { n: 96, kind: 'daily', rate: 0.8 },
  { n: 42, kind: 'monthEnd', rate: 0.75 },
  { n: 58, kind: 'daily', rate: 0.6 },
  { n: 31, kind: 'weekly', rate: 0.85, weekday: 3 },
  { n: 1, kind: 'daily', rate: 0.9 },
  { n: 24, kind: 'fresh', rate: 0.7 },
  { n: 12, kind: 'weekly', rate: 0.9, weekday: 1 },
  { n: 9, kind: 'lapsed', rate: 0.8 },
  { n: 17, kind: 'monthEnd', rate: 0.8 },
];
// For the made-up extra dashboards: mostly small, several dead, as a real estate of dashboards is.
const MORE: Profile[] = [
  { n: 0, kind: 'never', rate: 0 },
  { n: 3, kind: 'daily', rate: 0.5 },
  { n: 8, kind: 'weekly', rate: 0.8, weekday: 2 },
  { n: 15, kind: 'monthEnd', rate: 0.7 },
  { n: 27, kind: 'daily', rate: 0.3 },
  { n: 6, kind: 'lapsed', rate: 0.8 },
  { n: 44, kind: 'daily', rate: 0.6 },
  { n: 73, kind: 'daily', rate: 0.4 },
  { n: 0, kind: 'never', rate: 0 },
  { n: 120, kind: 'daily', rate: 0.35 },
  { n: 19, kind: 'weekly', rate: 0.85, weekday: 4 },
  { n: 210, kind: 'daily', rate: 0.5 },
];

function chance(p: Profile, keen: number, t: number): number {
  const d = DATES[t]!;
  if (p.kind === 'never') return 0;
  if (p.kind === 'fresh' && t > 5) return 0;
  if (p.kind === 'lapsed') return t >= 47 && t <= 58 && workday(d) ? p.rate * keen : 0;
  if (!workday(d)) return 0.02 * keen;
  if (p.kind === 'weekly') return d.getDay() === p.weekday ? p.rate * keen : 0.03 * keen;
  if (p.kind === 'monthEnd') return monthEnd(d) ? p.rate * keen : 0.015 * keen;
  return p.rate * keen;
}

type Open = { u: number; m: number };
type Sim = { n: number; seed: number; kind: Kind; role: Uint8Array; opens: Uint8Array; /** Opens per day and hour: [t * 24 + hour]. */ hourly: Uint16Array; today: Open[]; week: Open[] };
/** A morning habit: most opens fall before the 9am call, the rest thin out through the day. */
const minuteOfDay = (rand: () => number) => {
  const r = rand();
  const [a, b] = r < 0.6 ? [420, 570] : r < 0.85 ? [570, 840] : r < 0.97 ? [840, 1080] : [300, 1320];
  return Math.floor(a + rand() * (b - a));
};
function simulate(d: Dashboard, p: Profile): Sim {
  const seed = hash(d.id);
  const rand = rng(seed);
  const today: Open[] = [], week: Open[] = [];
  // Most people who open a dashboard hold the role it was built for. Some roles never open it.
  const weights = roles.map((r) => { const j = rand(); return r.id !== d.audience && j < 0.25 ? 0 : (r.id === d.audience ? 8 : 1) * (0.5 + j); });
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const role = new Uint8Array(p.n), opens = new Uint8Array(p.n * SPAN), hourly = new Uint16Array(SPAN * 24);
  for (let u = 0; u < p.n; u++) {
    let x = rand() * total, r = 0;
    while (r < weights.length - 1 && x >= weights[r]!) { x -= weights[r]!; r++; }
    role[u] = r;
    // Six in ten are regulars; the rest look in now and then.
    const keen = p.n <= 2 ? 1 : rand() < 0.4 ? 0.02 + 0.1 * rand() : 0.4 + 0.6 * rand();
    for (let t = 0; t < SPAN; t++) {
      if (rand() >= chance(p, keen, t)) continue;
      const n = 1 + (rand() < 0.35 ? 1 : 0) + (rand() < 0.1 ? 1 : 0);
      let kept = 0;
      for (let k = 0; k < n; k++) {
        const m = minuteOfDay(rand);
        if (t === 0 && m > NOW) continue; // later today: it has not happened yet
        kept++;
        hourly[t * 24 + Math.floor(m / 60)]!++;
        if (t === 0) today.push({ u, m });
        else if (t === 7) week.push({ u, m });
      }
      opens[u * SPAN + t] = kept;
    }
  }
  return { n: p.n, seed, kind: p.kind, role, opens, hourly, today, week };
}

/* ------------------------------------------------------------------ stats */
export type Day = { date: Date; people: number; opens: number };
export type RoleStat = { id: string; name: string; value: number; days: number[] };
export type Stats = {
  /** Different people who opened it in the range, and in the range before it. */
  people: number;
  prev: number;
  opens: number;
  prevOpens: number;
  /** People who opened it on more than one day. */
  returning: number;
  /** Days since it was last opened. null: not in the 180 days simulated. */
  last: number | null;
  /** Oldest first. */
  days: Day[];
  /** The same range in weeks ending today, oldest first: different people and opens per week. The oldest may be a short week. */
  weeks: (Day & { from: number; to: number })[];
  activeDays: number;
  busiest: Day | null;
  /** Most people first. */
  roles: RoleStat[];
  /** Opens by weekday, Monday first. */
  weekdays: number[];
  /** Opens by weekday (Monday first) and hour of the day: grid[weekday][hour]. */
  grid: number[][];
  /** The two hours in a row with the most opens, and their share of all opens. null when there are none. */
  peak: { hour: number; share: number } | null;
};

function count(sim: Sim, range: Range): Stats {
  const days: Day[] = Array.from({ length: range }, (_, i) => ({ date: DATES[range - 1 - i]!, people: 0, opens: 0 }));
  const perRole: RoleStat[] = roles.map((r) => ({ id: r.id, name: humanize(r.id), value: 0, days: new Array<number>(range).fill(0) }));
  const weekdays = new Array<number>(7).fill(0);
  // Weeks are counted back from today, so the newest week is always a full one.
  const nWeeks = Math.ceil(range / 7);
  const weekOf = (i: number) => nWeeks - 1 - Math.floor((range - 1 - i) / 7);
  const weeks = Array.from({ length: nWeeks }, (_, w) => {
    const from = Math.max(0, range - (nWeeks - w) * 7), to = range - 1 - (nWeeks - 1 - w) * 7;
    return { date: days[from]!.date, people: 0, opens: 0, from, to };
  });
  const inWeek = new Uint8Array(nWeeks);
  let peopleN = 0, prev = 0, opens = 0, prevOpens = 0, returning = 0, last: number | null = null;
  for (let u = 0; u < sim.n; u++) {
    const base = u * SPAN, mine = perRole[sim.role[u]!];
    let on = 0;
    inWeek.fill(0);
    for (let t = 0; t < range; t++) {
      const o = sim.opens[base + t]!;
      if (!o) continue;
      const i = range - 1 - t, day = days[i]!;
      day.people++; day.opens += o; opens += o; on++;
      if (mine) mine.days[i]!++;
      weekdays[(day.date.getDay() + 6) % 7]! += o;
      const w = weekOf(i);
      weeks[w]!.opens += o;
      if (!inWeek[w]) { inWeek[w] = 1; weeks[w]!.people++; }
    }
    if (on) { peopleN++; if (mine) mine.value++; if (on > 1) returning++; }
    let before = 0;
    for (let t = range; t < range * 2; t++) before += sim.opens[base + t]!;
    if (before) { prev++; prevOpens += before; }
    for (let t = 0; t < SPAN && (last === null || t < last); t++) if (sim.opens[base + t]) { last = t; break; }
  }
  const busiest = peopleN ? days.reduce((a, b) => (b.people >= a.people ? b : a)) : null;
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  const byHour = new Array<number>(24).fill(0);
  for (let t = 0; t < range; t++) {
    const row = grid[(DATES[t]!.getDay() + 6) % 7]!;
    for (let h = 0; h < 24; h++) { const v = sim.hourly[t * 24 + h]!; row[h]! += v; byHour[h]! += v; }
  }
  let peakHour = 0;
  for (let h = 1; h < 23; h++) if (byHour[h]! + byHour[h + 1]! > byHour[peakHour]! + byHour[peakHour + 1]!) peakHour = h;
  const peak = opens ? { hour: peakHour, share: (byHour[peakHour]! + byHour[peakHour + 1]!) / opens } : null;
  return {
    people: peopleN, prev, opens, prevOpens, returning, last, days, weeks, busiest, weekdays, grid, peak,
    activeDays: days.filter((d) => d.people > 0).length,
    roles: perRole.sort((a, b) => b.value - a.value),
  };
}

const sims = new Map<string, Sim>();
const profileOf = (index: number) => (index < PROFILES.length ? PROFILES[index]! : MORE[index % MORE.length]!);
function simOf(d: Dashboard, index: number): Sim {
  let sim = sims.get(d.id);
  if (!sim) { sim = simulate(d, profileOf(index)); sims.set(d.id, sim); }
  return sim;
}
const cache = new Map<string, Stats>();
/** A dashboard's figures for a range. `index` is its place in the list, which picks its usage pattern. */
export function statsFor(d: Dashboard, index: number, range: Range): Stats {
  const key = `${d.id}:${range}`;
  let s = cache.get(key);
  if (!s) { s = count(simOf(d, index), range); cache.set(key, s); }
  return s;
}

/* ----------------------------------------------------------------- people */
// 26 x 25 = 650 different names: more than the largest pretend audience, so no two people share one.
const FIRST = ['Sarah', 'Omar', 'Fatima', 'James', 'Aisha', 'Rahul', 'Emma', 'Khalid', 'Priya', 'Marcus', 'Noura', 'Li', 'Abdulrahman', 'Maria-José', 'Yusuf', 'Olivia', 'Hassan', 'Ananya', 'Tariq', 'Mei', 'Layla', 'Daniel', 'Zainab', 'Arjun', 'Hind', 'Thomas'];
const LAST = ['Mitchell', 'Al-Farsi', 'Khan', 'Chen', 'Al-Mansoori', 'Sharma', 'Rodriguez', 'Haddad', 'Patel', 'Webb', 'Al-Suwaidi', 'Wei', 'Fernández de Córdoba', 'Nair', 'Okafor', 'Ibrahim', 'O’Connor', 'Qureshi', 'Tan', 'Mahmoud', 'Verma', 'El-Sayed', 'Al-Hashimi', 'Dsouza', 'Bin Rashid'];
const nameOf = (seed: number, u: number) => { const k = (u * 277 + (seed % 650)) % 650; return `${FIRST[k % 26]} ${LAST[Math.floor(k / 26)]}`; };
const roleOf = (sim: Sim, u: number) => { const r = roles[sim.role[u]!]; return r ? humanize(r.id) : ''; };

export type Person = {
  key: string;
  name: string;
  role: string;
  /** Oldest first. One cell per day (1 if opened), or per week for 90 days (days opened that week). */
  cells: number[];
  /** Days it was opened on. */
  days: number;
  opens: number;
  /** Days since they last opened it. */
  last: number;
};
const personCache = new Map<string, Person[]>();
/** Everyone who opened a dashboard in the range, the most regular first. */
export function personsFor(d: Dashboard, index: number, range: Range): Person[] {
  const key = `${d.id}:${range}`;
  let out = personCache.get(key);
  if (out) return out;
  const sim = simOf(d, index), weekly = range === 90;
  out = [];
  for (let u = 0; u < sim.n; u++) {
    const cells = new Array<number>(weekly ? Math.ceil(range / 7) : range).fill(0);
    let days = 0, opens = 0, last = 0;
    for (let t = range - 1; t >= 0; t--) {
      const o = sim.opens[u * SPAN + t]!;
      if (!o) continue;
      const i = range - 1 - t;
      days++; opens += o; last = t;
      if (weekly) cells[Math.floor(i / 7)]!++; else cells[i] = 1;
    }
    if (days) out.push({ key: `${d.id}:${u}`, name: nameOf(sim.seed, u), role: roleOf(sim, u), cells, days, opens, last });
  }
  out.sort((a, b) => b.days - a.days || a.last - b.last || a.name.localeCompare(b.name));
  personCache.set(key, out);
  return out;
}

/* ------------------------------------------------------------------ today */
export type TodayStats = {
  /** Different people so far today, and by this time on the same weekday last week. */
  people: number;
  lastWeek: number;
  opens: number;
  /** Different people in the last 30 minutes. */
  recent: number;
  /** 24 entries, midnight first. Hours still to come are empty. */
  hours: Day[];
  /** The latest opens, newest first, and how many earlier ones are left out. */
  feed: { key: string; name: string; role: string; minute: number }[];
  more: number;
  nowMinute: number;
};
const todayCache = new Map<string, TodayStats>();
export function todayFor(d: Dashboard, index: number): TodayStats {
  let out = todayCache.get(d.id);
  if (out) return out;
  const sim = simOf(d, index);
  const hours: Day[] = Array.from({ length: 24 }, (_, h) => ({ date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), h), people: 0, opens: 0 }));
  const perHour = hours.map(() => new Set<number>());
  const all = new Set<number>(), recent = new Set<number>();
  for (const o of sim.today) {
    const h = Math.floor(o.m / 60);
    hours[h]!.opens++; perHour[h]!.add(o.u); all.add(o.u);
    if (o.m > NOW - 30) recent.add(o.u);
  }
  hours.forEach((h, i) => { h.people = perHour[i]!.size; });
  const sorted = [...sim.today].sort((a, b) => b.m - a.m);
  out = {
    people: all.size,
    lastWeek: new Set(sim.week.filter((o) => o.m <= NOW).map((o) => o.u)).size,
    opens: sim.today.length,
    recent: recent.size,
    hours,
    feed: sorted.slice(0, 8).map((o, i) => ({ key: `${o.u}:${o.m}:${i}`, name: nameOf(sim.seed, o.u), role: roleOf(sim, o.u), minute: o.m })),
    more: Math.max(0, sorted.length - 8),
    nowMinute: NOW,
  };
  todayCache.set(d.id, out);
  return out;
}

/* ------------------------------------------------------------------ marks */
/** Something that happened on a day and explains the line: a month end, a new version of the dashboard. */
export type Mark = { i: number; kind: 'monthEnd' | 'version'; label: string };
export function marksFor(d: Dashboard, index: number, range: Range): Mark[] {
  const out: Mark[] = [];
  for (let i = 0; i < range - 1; i++) {
    const t = range - 1 - i, day = DATES[t]!;
    if (!workday(day)) continue;
    // The last working day of its month: the next working day falls in another month.
    let next = t - 1;
    while (next > 0 && !workday(DATES[next]!)) next--;
    if (workday(DATES[next]!) && DATES[next]!.getMonth() !== day.getMonth()) out.push({ i, kind: 'monthEnd', label: 'Month end' });
  }
  const fresh = simOf(d, index).kind === 'fresh';
  const ago = fresh ? 5 : index % 2 === 0 ? 9 + (hash(d.id) % 12) : -1;
  if (ago >= 0 && ago < range) out.push({ i: range - 1 - ago, kind: 'version', label: fresh ? 'Published' : 'New version' });
  return out.sort((a, b) => a.i - b.i);
}

/* ------------------------------------------------------------------ words */
const WEEKDAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
const topWeekday = (s: Stats) => s.weekdays.indexOf(Math.max(...s.weekdays));
/** When it is opened, as a phrase: "every working day", "mostly on Mondays", "around month end". */
export function rhythm(s: Stats): string {
  const total = s.weekdays.reduce((a, b) => a + b, 0);
  if (!total) return 'not opened';
  const work = s.days.filter((d) => workday(d.date));
  const active = work.filter((d) => d.people > 0).length;
  if (s.days.length > 7) {
    const top = topWeekday(s);
    if (s.weekdays[top]! / total >= 0.55) return `mostly on ${WEEKDAYS[top]}`;
    if (s.days.filter((d) => monthEnd(d.date)).reduce((a, d) => a + d.opens, 0) / total >= 0.7) return 'around month end';
  }
  if (active === work.length) return 'every working day';
  if (active / work.length >= 0.7) return 'most working days';
  return `on ${s.activeDays} of the ${s.days.length} days`;
}
/** "Mondays", when one weekday clearly leads and the dashboard is opened on most days. */
export function busiestWeekday(s: Stats): string | null {
  const r = rhythm(s);
  return r === 'every working day' || r === 'most working days' ? WEEKDAYS[topWeekday(s)]! : null;
}

/* ------------------------------------------------------- more dashboards */
const AREAS = ['Deposits', 'Lending', 'Cards', 'Payments', 'Trade finance', 'Treasury', 'Mortgages', 'Remittances', 'Fees and commissions', 'Collections', 'Wealth', 'SME banking'];
const CUTS = ['by branch', 'by region', 'by customer segment', 'daily position', 'month-end pack', 'weekly review'];
/** Made-up dashboards, to see each design with sixty rows instead of twelve. */
export function extras(real: Dashboard[], n: number): Dashboard[] {
  return Array.from({ length: n }, (_, i) => {
    const like = real[i % Math.max(1, real.length)];
    const area = AREAS[i % AREAS.length]!;
    return {
      id: `more-${i + 1}`,
      title: `${area} ${CUTS[(i * 5 + Math.floor(i / AREAS.length)) % CUTS.length]}`,
      owner: i % 9 === 4 ? null : `Head of ${area}`,
      audience: roles.length ? roles[i % roles.length]!.id : null,
      numbers: like?.numbers ?? [],
      filters: like?.filters ?? [],
      widgets: like?.widgets ?? 0,
      refresh: like?.refresh ?? null,
    };
  });
}
