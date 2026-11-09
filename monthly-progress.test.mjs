import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyPairs, belowTarget, monthKey } from './lib/monthly-progress.ts';
const now = new Date('2026-10-21T20:00:00Z');
const deal = (id, overrides = {}) => ({ accountId: id, opportunityId: id, accountName: id, district: 'East', seManager: 'SEM A', hasAnyAse: true, firstAseEvidenceAt: '2026-10-02T10:00:00Z', firstAseEvidenceSource: 'TMR', firstAseDistrict: 'East', firstAseSem: 'SEM A', aseHistoryComplete: true, ...overrides });
test('duplicate opportunities and signals count an account once', () => {
  const rows = [deal('a'), deal('a', {opportunityId: 'other', hasActivationTag: true}), deal('b')];
  assert.equal(monthlyPairs(rows, now)[0].actual, 2);
});
test('missing history is unavailable rather than zero', () => {
  const row = deal('a', {aseHistoryComplete: false});
  const pair = monthlyPairs([row], now)[0];
  assert.equal(pair.actual, null);
  assert.equal(belowTarget(pair), false);
});
test('known never-qualified accounts give zero, while missing history does not', () => {
  assert.equal(monthlyPairs([deal('a', {hasAnyAse: false, firstAseEvidenceAt: null})], now)[0].actual, 0);
});
test('each district and SEM pair owns an independent goal', () => {
  const rows = [deal('a'), deal('b', {district:'West', firstAseDistrict:'West'}), deal('c', {seManager:'SEM B',firstAseSem:'SEM B'})];
  assert.equal(monthlyPairs(rows, now).length, 3);
  assert.ok(monthlyPairs(rows, now).every(pair=>pair.actual===1&&pair.target===12));
});
test('literal threshold clears at twelve and numerator stays above twelve', () => {
  for(const count of [1,11,12,14]) {
    const pair = monthlyPairs(Array.from({length:count},(_,i)=>deal(String(i))), now)[0];
    assert.equal(pair.actual,count);
    assert.equal(belowTarget(pair),count<12);
  }
});
test('Eastern month boundaries and rollover', () => {
  assert.equal(monthKey(new Date('2026-10-01T03:59:59Z')),'2026-09');
  assert.equal(monthKey(new Date('2026-10-01T04:00:00Z')),'2026-10');
  assert.equal(monthKey(new Date('2026-12-01T04:59:59Z')),'2026-11');
  assert.equal(monthlyPairs([deal('a')],new Date('2026-11-01T05:00:00Z'))[0].actual,0);
});
test('old close date is irrelevant and an old qualification cannot count again', () => {
  assert.equal(monthlyPairs([deal('a', {closeDate:'2026-02-01'})],now)[0].actual,1);
  assert.equal(monthlyPairs([deal('a', {firstAseEvidenceAt:'2026-09-02T10:00:00Z', hasActivationTag:true})],now)[0].actual,0);
});
test('missing or invalid or timezone-free timestamps cannot fabricate credit', () => {
  for(const date of [undefined, 'invalid', '2026-10-02', '2026-12-01T10:00:00Z']) {
    assert.equal(monthlyPairs([deal('a',{firstAseEvidenceAt:date})],now)[0].actual,null);
  }
});
test('conflicting duplicate history fails closed',()=>{
  assert.equal(monthlyPairs([deal('a'),deal('a',{firstAseEvidenceAt:'2026-10-03T10:00:00Z'})],now)[0].actual,null);
});
test('historical attribution preserves credit after current owner changes',()=>{
  const pairs=monthlyPairs([deal('a',{district:'West',seManager:'SEM B'})],now);
  assert.equal(pairs.find(pair=>pair.district==='East').actual,1);
  assert.equal(pairs.find(pair=>pair.district==='West').actual,0);
});
const evidenceDeal = (id, overrides = {}) => deal(id, {
  aseHistoryComplete: false,
  firstAseEvidenceAt: null,
  firstAseDistrict: null,
  firstAseSem: null,
  aseLiveEvidence: { date: '2026-10-05', source: 'TMR created', district: 'East', sem: 'SEM A', checkedAt: '2026-10-21T19:00:00Z' },
  ...overrides,
});
test('dated evidence counts survive unknown history without declaring completeness', () => {
  const row = evidenceDeal('a');
  const pair = monthlyPairs([row, {...row, opportunityId:'duplicate'}, deal('unknown',{aseHistoryComplete:false})], now)[0];
  assert.equal(pair.actual, 1);
  assert.equal(pair.partial, true);
  assert.equal(pair.unknownAccounts, 2);
  assert.equal(belowTarget(pair), true);
  assert.equal(pair.accounts[0].aseHistoryComplete, false);
});
test('dated evidence month is fixed and unknown groups are not verified zeros', () => {
  assert.equal(monthlyPairs([evidenceDeal('a')], new Date('2026-11-01T05:00:00Z'))[0].actual,null);
  const pairs = monthlyPairs([evidenceDeal('a'), deal('b',{district:'West', firstAseDistrict:'West',aseHistoryComplete:false})],now);
  assert.equal(pairs.find(pair=>pair.district==='West').actual,null);
});
test('dated evidence groups count 3, 2, 1, 1 without district leakage', () => {
  const rows = [3,2,1,1].flatMap((count,group)=>Array.from({length:count},(_,i)=>evidenceDeal(`${group}-${i}`,{
    district:`District ${group}`,
    aseLiveEvidence:{date:'2026-10-05',source:'TMR created',district:`District ${group}`,sem:'Shared SEM',checkedAt:'2026-10-21T19:00:00Z'},
  })));
  assert.deepEqual(monthlyPairs(rows,now).filter(pair=>pair.sem==='Shared SEM').map(pair=>pair.actual),[3,2,1,1]);
});
test('invalid or conflicting dated evidence data never earns credit', () => {
  const row = evidenceDeal('a');
  for (const change of [{date:'2026-10-99'},{date:'2026-10-30'},{checkedAt:'invalid'},{checkedAt:'2026-12-01T10:00:00Z'},{source:''},{district:''}]) {
    assert.equal(monthlyPairs([{...row,aseLiveEvidence:{...row.aseLiveEvidence,...change}}],now)[0].actual,null);
  }
  assert.equal(monthlyPairs([row,{...row,aseLiveEvidence:{...row.aseLiveEvidence,date:'2026-10-06'}}],now)[0].actual,null);
});
test('complete historical evidence takes precedence over dated evidences', () => {
  assert.equal(monthlyPairs([evidenceDeal('a',{aseHistoryComplete:true,firstAseEvidenceAt:'2026-09-01T10:00:00Z',firstAseDistrict:'East',firstAseSem:'SEM A'})],now)[0].actual,0);
});
test('missing mappings get no quota',()=>{
  const pair=monthlyPairs([deal('a',{district:null,seManager:null,firstAseDistrict:null,firstAseSem:null})],now)[0];
  assert.equal(pair.target,null);
  assert.equal(belowTarget(pair),false);
});
