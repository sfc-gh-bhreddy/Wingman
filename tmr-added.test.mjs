import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fiscalQuarterOf, currentFiscalQuarter, quarterLabel, tmrAddedBy, topAdded, quartersSoFar } from './lib/tmr-added.ts';

const deal = (accountId, district, seManager) => ({ accountId, district, seManager });

test('fiscal quarters start in February', () => {
  assert.deepEqual(fiscalQuarterOf('2026-02-01'), { fy: 2027, fq: 1 });
  assert.deepEqual(fiscalQuarterOf('2026-04-30'), { fy: 2027, fq: 1 });
  assert.deepEqual(fiscalQuarterOf('2026-05-01'), { fy: 2027, fq: 2 });
  assert.deepEqual(fiscalQuarterOf('2026-10-31'), { fy: 2027, fq: 3 });
  assert.deepEqual(fiscalQuarterOf('2026-11-01'), { fy: 2027, fq: 4 });
  assert.deepEqual(fiscalQuarterOf('2027-01-31'), { fy: 2027, fq: 4 });
  assert.equal(fiscalQuarterOf('bad'), null);
  assert.equal(quarterLabel({ fy: 2027, fq: 3 }), 'FY27 Q3');
});

test('current quarter uses Eastern time', () => {
  assert.deepEqual(currentFiscalQuarter(new Date('2026-11-01T03:00:00Z')), { fy: 2027, fq: 3 });
  assert.deepEqual(currentFiscalQuarter(new Date('2026-11-01T05:00:00Z')), { fy: 2027, fq: 4 });
  assert.equal(quartersSoFar(new Date('2026-10-28T12:00:00Z')).length, 3);
});

test('counts each account once by first ASE TMR in the quarter', () => {
  const deals = [deal('a', 'NY', 'Andy'), deal('a', 'NY', 'Andy'), deal('b', 'NY', 'Bo'), deal('c', 'TOLA', 'Derek'), deal('d', 'TOLA', 'Derek'), deal('e', null, null)];
  const dates = { a: '2026-08-02', b: '2026-10-30', c: '2026-07-31', d: '2026-09-15', e: '2026-09-01', z: '2026-09-01' };
  const q3 = { fy: 2027, fq: 3 };
  const byDistrict = tmrAddedBy(deals, dates, q3, d => d.district ?? '(No district)');
  assert.deepEqual(Object.fromEntries(byDistrict), { NY: 2, TOLA: 1, '(No district)': 1 });
  const bySem = tmrAddedBy(deals, dates, q3, d => d.seManager ?? '(No SE manager)');
  assert.deepEqual(topAdded(bySem), [{ key: '(No SE manager)', added: 1 }, { key: 'Andy', added: 1 }, { key: 'Bo', added: 1 }]);
});

test('top list drops zeros, sorts by count then name, caps at 3', () => {
  const counts = new Map([['B', 2], ['A', 2], ['C', 5], ['D', 1], ['E', 0]]);
  assert.deepEqual(topAdded(counts), [{ key: 'C', added: 5 }, { key: 'A', added: 2 }, { key: 'B', added: 2 }]);
  assert.deepEqual(topAdded(new Map([['E', 0]])), []);
});

test('no 12 target, rank, goal or attainment remains in the UI', async () => {
  const files = ['app/page.tsx', 'components/top-ase-added.tsx', 'components/ase-added-table.tsx', 'app/dm/page.tsx', 'app/sem/page.tsx', 'app/dictionary/page.tsx', 'app/how-to/page.tsx', 'components/sidebar.tsx'];
  const sources = await Promise.all(files.map(p => readFile(new URL(p, import.meta.url), 'utf8')));
  for (const [i, s] of sources.entries()) {
    assert.doesNotMatch(s, /Goal attainment|Monthly goal|of 12|goal of 12|carryover|Carryover|DistrictTmrLeaderboard|Attachment Goals/, files[i]);
  }
  const [overview, top] = sources;
  assert.match(overview, /<TopAseAdded \/>/);
  assert.match(top, /Top 3 districts/);
  assert.match(top, /Top 3 SEMs/);
  assert.doesNotMatch(top, /Rank|Trophy/);
});

test('DM and SEM rollups are flat pages without triangles; AE and SE keep red triangles', async () => {
  const [dm, sem, ae, se, table, sidebar, district] = await Promise.all(['app/dm/page.tsx', 'app/sem/page.tsx', 'app/ae/page.tsx', 'app/se/page.tsx', 'components/rollup-table.tsx', 'components/sidebar.tsx', 'app/district/page.tsx'].map(p => readFile(new URL(p, import.meta.url), 'utf8')));
  for (const page of [dm, sem]) { assert.match(page, /showWarning=\{false\}/); assert.match(page, /addedFor=/); assert.doesNotMatch(page, /redirect/); }
  for (const page of [ae, se]) { assert.match(page, /warningTone="red"/); assert.doesNotMatch(page, /showWarning=\{false\}/); }
  assert.match(table, /r\.deals >= 5 && r\.pctAnyAse < 10/);
  assert.match(table, /showWarning && needsAttention\(r\)/);
  assert.match(sidebar, /href: "\/dm", label: "District Rollup"/);
  assert.match(sidebar, /href: "\/sem", label: "SEM Rollup"/);
  assert.doesNotMatch(sidebar, /ase-added/);
  assert.match(district, /redirect\("\/dm"\)/);
});

test('TMR dates come read-only from the Elementum feed with ASE specialist types', async () => {
  const data = await readFile(new URL('./lib/data.ts', import.meta.url), 'utf8');
  assert.match(data, /FROM SALES\.SALES_ENGINEERING\.FIELD_SPECIALIST_REQUESTS_DX_ELEMENTUM/);
  assert.match(data, /MIN\(REQUEST_CREATED_DATE\)/);
  assert.match(data, /ASE_TMR_SPECIALIST_TYPES\.map/);
  assert.doesNotMatch(data.split('TMR_DATES_SQL')[1].split('`;')[0], /\b(INSERT|UPDATE|DELETE|MERGE|CREATE)\b/);
});

test('help pages describe ASE TMRs added with no targets', async () => {
  const [dictionary, guide] = await Promise.all(['app/dictionary/page.tsx', 'app/how-to/page.tsx'].map(p => readFile(new URL(p, import.meta.url), 'utf8')));
  assert.match(dictionary, /first ASE TMR/);
  assert.match(dictionary, /There is no target/);
  assert.match(dictionary, /red triangle appears on the AE and SE rollups only/);
  assert.match(guide, /There are no targets/);
  assert.match(guide, /Opening the link does not submit the request/);
  for (const s of [dictionary, guide]) assert.doesNotMatch(s, /DT_AGG|ACCOUNT_ENGINEERING|DX_ELEMENTUM|yellow/i);
});

test('ASE capacity = ASEs x 15 - active, negative means over capacity', async () => {
  const { aseCapacity } = await import('./lib/ase-capacity.ts');
  assert.deepEqual(aseCapacity(9, 119), { aseCount: 9, capacity: 135, active: 119, open: 16 });
  assert.equal(aseCapacity(2, 45).open, -15);
  assert.equal(aseCapacity(0, 0).open, 0);
});

test('capacity query is read-only from bob_current; open capacity uses Active, card also shows Pending Kickoff and Stalled', async () => {
  const [data, constants, overview, card] = await Promise.all(['lib/data.ts', 'lib/constants.ts', 'app/page.tsx', 'components/ase-capacity-card.tsx'].map(p => readFile(new URL(p, import.meta.url), 'utf8')));
  const sql = data.split('ASE_CAPACITY_SQL = `')[1].split('`;')[0];
  assert.match(sql, /ACCOUNT_ENGINEERING\.SNOWCATS\.BOB_CURRENT/);
  assert.match(sql, /COUNT\(DISTINCT IFF\(STATUS = 'Active', ACCOUNT_ID, NULL\)\) AS TEAM_ACTIVE/);
  assert.match(sql, /STATUS = 'Pending Kickoff'.*TEAM_PENDING/s);
  assert.match(sql, /STATUS = 'Stalled'.*TEAM_STALLED/s);
  assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|MERGE|CREATE)\b/);
  assert.match(constants, /ASE_TARGET_ACCOUNTS = 15/);
  assert.match(overview, /<AseCapacityCard \/>/);
  assert.match(card, /aseCapacity\(data\.owners\.length, data\.teamActive\)/);
  assert.match(card, /Pending kickoff/);
  assert.match(card, /Stalled/);
  assert.match(card, /Source: ASE book of business \(ACCOUNT_ENGINEERING\.SNOWCATS\.BOB_CURRENT\)/);
});

test('District and AE Rollup drilldowns hide the Open TMR column; AE drill shows SE', async () => {
  const [page, table] = await Promise.all(['app/uncovered/page.tsx', 'components/deals-table.tsx'].map(p => readFile(new URL(p, import.meta.url), 'utf8')));
  assert.match(page, /const hideTmrLink = Boolean\(drillDistrict \|\| drillOwner\)/);
  assert.equal((page.match(/hideTmrLink=\{hideTmrLink\}/g) ?? []).length, 2);
  assert.match(page, /drillOwner\s*\? \{ district: true, seManager: true, leadSe: true \}/);
  assert.match(table, /No SE assigned/);
  assert.match(table, /hideTmrLink \? null : \(/);
});
