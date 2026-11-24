// The messy cases for the usage reader. Contract: docs/contracts/usage.md. Run: npm test -w @bank-dashboards/portal
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOpens, summarize } from './usage.mjs';

const HEAD = 'at,dashboard,person,role';
const csv = (...lines) => [HEAD, ...lines].join('\n');
/** Parse, expect no errors, and count for the published dashboards given. */
const count = (lines, published = ['d1']) => {
  const { rows, errors } = parseOpens(csv(...lines));
  assert.deepEqual(errors, []);
  return summarize(rows, published);
};

/* ----------------------------------------------------------------- reading */
test('a clean file gives one row per line', () => {
  const { rows, errors } = parseOpens(csv('2026-11-24T08:12:40,d1,p1,finance', '2026-11-23T17:00:00,d2,p2,'));
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 2);
  assert.deepEqual({ ...rows[0], day: undefined }, { day: undefined, hour: 8, dashboard: 'd1', person: 'p1', role: 'finance' });
  assert.equal(rows[1].role, '', 'a blank role stays blank');
  assert.equal(rows[0].day - rows[1].day, 1, 'days are whole numbers, one apart');
});

test('a byte order mark, Windows line ends, blank lines and spaces around cells are tolerated', () => {
  const { rows, errors } = parseOpens(`﻿${HEAD}\r\n 2026-11-24T08:12:40 , d1 , p1 , finance \r\n\r\n2026-11-24T09:00:00,d1,p2,finance\r\n\r\n`);
  assert.deepEqual(errors, []);
  assert.deepEqual(rows.map((r) => r.person), ['p1', 'p2']);
});

test('a missing or different header stops the read at line 1', () => {
  for (const text of ['', '2026-11-24T08:12:40,d1,p1,finance', 'dashboard,at,person,role\n2026-11-24T08:12:40,d1,p1,finance']) {
    const { rows, errors } = parseOpens(text);
    assert.equal(rows.length, 0);
    assert.match(errors[0], /^line 1: the header must be/);
  }
});

test('every broken line is reported with its line number, and the good lines are still read', () => {
  const { rows, errors } = parseOpens(csv(
    '2026-11-24T08:12:40,d1,p1,finance',  // line 2, fine
    '2026-11-24T08:12:40,d1,p1',          // line 3, three cells
    '2026-02-30T08:00:00,d1,p1,finance',  // line 4, no such day
    '2026-11-24 08:00,d1,p1,finance',     // line 5, wrong shape
    '2026-11-24T24:00:00,d1,p1,finance',  // line 6, no such hour
    '2026-11-24T08:00:00,,p1,finance',    // line 7, no dashboard
    '2026-11-24T08:00:00,d1,,finance',    // line 8, no person
    '2026-11-24T08:00:00,d1,p1,a,b',      // line 9, five cells
  ));
  assert.equal(rows.length, 1);
  assert.deepEqual(errors.map((e) => e.slice(0, e.indexOf(':'))), ['line 3', 'line 4', 'line 5', 'line 6', 'line 7', 'line 8', 'line 9']);
  assert.match(errors[1], /found "2026-02-30T08:00:00"/);
});

/* ---------------------------------------------------------------- counting */
test('no rows means nothing is recorded', () => {
  assert.deepEqual(summarize([], ['d1']), { asOf: null, dashboards: {}, skipped: 0 });
});

test('the ranges end on the newest row of the whole file, even a row for a dashboard that is not published', () => {
  const out = count(['2026-11-20T08:00:00,d1,p1,finance', '2026-11-24T08:00:00,gone,p9,finance']);
  assert.equal(out.asOf, '2026-11-24');
  assert.equal(out.skipped, 1);
  assert.equal(out.dashboards.d1.last, '2026-11-20');
  assert.equal(out.dashboards.d1.ranges[7].people, 1, '20 Nov is inside the 7 days to 24 Nov');
  assert.equal(out.dashboards.gone, undefined);
});

test('a published dashboard nobody opened is listed with zeros', () => {
  const d2 = count(['2026-11-24T08:00:00,d1,p1,finance'], ['d1', 'd2']).dashboards.d2;
  assert.equal(d2.last, null);
  assert.equal(d2.days.people.length, 90);
  assert.equal(d2.weeks.people.length, 13);
  assert.deepEqual(d2.ranges[30], { people: 0, prevPeople: 0, opens: 0, prevOpens: 0, cameBack: 0, roles: [], busiest: null, when: null, hours: d2.ranges[30].hours });
  assert.equal(d2.ranges[30].hours.flat().reduce((a, b) => a + b, 0), 0);
});

test('people are counted once, opens every time, and came back means more than one day', () => {
  const r = count([
    '2026-11-24T08:00:00,d1,p1,finance',
    '2026-11-24T09:00:00,d1,p1,finance',  // p1 again the same day: one person, two opens, not "came back"
    '2026-11-24T08:30:00,d1,p2,finance',
    '2026-11-23T08:00:00,d1,p2,finance',  // p2 on a second day: came back
    '2026-11-21T08:00:00,d1,p3,finance',
  ]).dashboards.d1.ranges[7];
  assert.equal(r.people, 3);
  assert.equal(r.opens, 5);
  assert.equal(r.cameBack, 1);
});

test('the range is N days ending on the newest day, and the change is counted on the N days before it', () => {
  const r = count([
    '2026-11-24T08:00:00,d1,now,finance',     // the newest day: in
    '2026-11-18T08:00:00,d1,edge,finance',    // 6 days before: the first day of the 7, in
    '2026-11-17T08:00:00,d1,prev1,finance',   // 7 days before: the last day of the 7 before
    '2026-11-11T08:00:00,d1,prev2,finance',   // 13 days before: the first day of the 7 before
    '2026-11-11T09:00:00,d1,prev2,finance',
    '2026-11-10T08:00:00,d1,old,finance',     // 14 days before: outside both
  ]).dashboards.d1.ranges;
  assert.deepEqual([r[7].people, r[7].opens], [2, 2]);
  assert.deepEqual([r[7].prevPeople, r[7].prevOpens], [2, 3]);
  assert.equal(r[30].people, 5, 'all six rows are inside the 30 days, from five people');
  assert.equal(r[30].prevPeople, 0);
});

test('people by role: most first, a blank role kept blank, a change of role counted under both', () => {
  const roles = count([
    '2026-11-24T08:00:00,d1,p1,finance',
    '2026-11-24T08:00:00,d1,p2,finance',
    '2026-11-23T08:00:00,d1,p2,head_office',  // p2 changed role inside the range
    '2026-11-24T08:00:00,d1,p3,',
    '2026-11-24T08:00:00,d1,p4,finance',
  ]).dashboards.d1.ranges[7].roles;
  assert.deepEqual(roles, [{ id: 'finance', people: 3 }, { id: '', people: 1 }, { id: 'head_office', people: 1 }]);
});

test('the busiest day is the one with the most people; on a tie, the later one', () => {
  const r = count([
    '2026-11-20T08:00:00,d1,p1,finance', '2026-11-20T08:00:00,d1,p2,finance',
    '2026-11-23T08:00:00,d1,p1,finance', '2026-11-23T08:00:00,d1,p3,finance',
    '2026-11-24T08:00:00,d1,p1,finance', '2026-11-24T09:00:00,d1,p1,finance', '2026-11-24T10:00:00,d1,p1,finance',  // three opens, one person
  ]).dashboards.d1.ranges[7];
  assert.deepEqual(r.busiest, { date: '2026-11-23', people: 2 });
});

test('opens by weekday and hour, Monday first, and the busiest time', () => {
  // 23 November 2026 is a Monday, the 24th a Tuesday, the 22nd a Sunday.
  const r = count([
    '2026-11-23T07:10:00,d1,p1,finance', '2026-11-23T07:50:00,d1,p2,finance', '2026-11-23T08:05:00,d1,p3,finance',
    '2026-11-24T08:30:00,d1,p1,finance',
    '2026-11-22T23:59:59,d1,p1,finance',
  ]).dashboards.d1.ranges[7];
  assert.equal(r.hours.length, 7);
  assert.equal(r.hours[0][7], 2, 'Monday 07:00');
  assert.equal(r.hours[0][8], 1, 'Monday 08:00');
  assert.equal(r.hours[1][8], 1, 'Tuesday 08:00');
  assert.equal(r.hours[6][23], 1, 'Sunday 23:00');
  assert.deepEqual(r.when, { weekday: 0, hour: 7 }, 'Mondays, and the two hours from 07:00');
});

test('the day series is the 90 days to the newest day, and the weeks are counted back from it', () => {
  const d1 = count([
    '2026-11-24T08:00:00,d1,p1,finance',  // the newest day: the last of 90, in the last week
    '2026-11-18T08:00:00,d1,p2,finance',  // 6 days before: still the last week
    '2026-11-17T08:00:00,d1,p1,finance',  // 7 days before: the week before
    '2026-08-27T08:00:00,d1,p3,finance',  // 89 days before: the first of 90, in the short oldest week
    '2026-08-26T08:00:00,d1,p4,finance',  // 90 days before: not shown
  ]).dashboards.d1;
  assert.equal(d1.days.from, '2026-08-27');
  assert.deepEqual([d1.days.people.length, d1.days.people[0], d1.days.people[89], d1.days.opens[82]], [90, 1, 1, 1]);
  assert.equal(d1.days.people.reduce((a, b) => a + b, 0), 4);
  assert.deepEqual([d1.weeks.people[12], d1.weeks.opens[12]], [2, 2]);
  assert.deepEqual([d1.weeks.people[11], d1.weeks.people[0]], [1, 1]);
  assert.equal(d1.ranges[90].people, 3, 'p4, 90 days before, is in the 90 days before, not in the range');
  assert.equal(d1.ranges[90].prevPeople, 1);
});
