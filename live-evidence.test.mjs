import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEvidenceLoader, attachLiveEvidence, LIVE_EVIDENCE_SQL } from './lib/live-evidence.ts';
import { monthlyPairs } from './lib/monthly-progress.ts';

const row = (id) => ({ACCOUNT_ID:id,DISTRICT:'East',SE_MANAGER:'SEM',EVIDENCE_DATE:'2026-10-05',SOURCE:'TMR created',CHECKED_AT:'2026-10-21T19:00:00Z'});
const deal = (id) => ({accountId:id,opportunityId:id,district:'East',seManager:'SEM',aseHistoryComplete:false});
test('new source rows change progress after cache expiry without a saved list', async () => {
  let clock = 0;
  let calls = 0;
  const load = createEvidenceLoader(async () => ++calls === 1 ? [row('a')] : [row('a'),row('b')], () => clock);
  const deals = [deal('a'),deal('b')];
  const count = async () => monthlyPairs(attachLiveEvidence(deals,await load()),new Date('2026-10-21T20:00:00Z'))[0].actual;
  assert.equal(await count(),1);
  clock = 59_999;
  assert.equal(await count(),1);
  assert.equal(calls,1);
  clock = 60_000;
  assert.equal(await count(),2);
  assert.equal(calls,2);
});
test('concurrent loads share one source query', async () => {
  let calls = 0;
  const load = createEvidenceLoader(async () => { calls++; return [row('a')]; });
  await Promise.all([load(),load(),load()]);
  assert.equal(calls,1);
});
test('expired source failures propagate and a subsequent retry recovers', async () => {
  let clock = 0;
  let fail = false;
  const load = createEvidenceLoader(async () => { if(fail) throw new Error('source unavailable'); return [row('a')]; },()=>clock);
  await load();
  clock=60_000; fail=true;
  await assert.rejects(load(),/source unavailable/);
  fail=false;
  assert.equal((await load()).length,1);
});
test('joins by account ID, preserves history uncertainty and excludes absent accounts', () => {
  const joined=attachLiveEvidence([deal('a'),{...deal('a'),opportunityId:'other'},deal('unknown')],[row('a'),row('outside')]);
  assert.equal(joined.length,3);
  assert.equal(joined[0].aseHistoryComplete,false);
  assert.equal(joined[2].aseLiveEvidence,undefined);
  assert.equal(monthlyPairs(joined,new Date('2026-10-21T20:00:00Z'))[0].actual,1);
});
test('base coverage route cannot wait for or fail on monthly evidence', async () => {
  const source = await readFile(new URL('./app/api/coverage/route.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /getLiveEvidence|attachLiveEvidence|monthly-evidence/);
  assert.match(source, /loader: getDeals/);
});
test('roster survives empty evidence and gains counts without replacing accounts', () => {
  const roster = Array.from({length:12}, (_,index) => ({...deal(String(index)),district:`District ${index}`}));
  const withoutEvidence=attachLiveEvidence(roster,[]);
  assert.equal(new Set(withoutEvidence.map(row=>row.district)).size,12);
  const withEvidence=attachLiveEvidence(roster,[row('0')]);
  assert.deepEqual(withEvidence.map(row=>row.accountId),withoutEvidence.map(row=>row.accountId));
  assert.ok(withEvidence[0].aseLiveEvidence);
});
test('source query has no fixed month or account allowlist',()=>{
  assert.doesNotMatch(LIVE_EVIDENCE_SQL,/2026-10|001VI|EVIDENCE_SNAPSHOT/);
  assert.match(LIVE_EVIDENCE_SQL,/PARTITION BY ACCOUNT_ID ORDER BY EVIDENCE_DATE/);
});
