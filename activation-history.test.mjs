import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('district views omit activation history review and cards do not point to it', () => {
 const districtPage = readFileSync(new URL('./app/district/page.tsx', import.meta.url), 'utf8');
 const monthlyCard = readFileSync(new URL('./components/monthly-progress.tsx', import.meta.url), 'utf8');
 assert.doesNotMatch(districtPage, /Review activation history|Already-tagged baselines|historyReview|Prior untagged version/);
 assert.doesNotMatch(monthlyCard, /Review activation history/);
 assert.match(districtPage, /<AttachmentGoals district=\{district\}/);
 assert.match(monthlyCard, /Backlog accounts:/);
});
import { activationProgress, districtSemNames, observedActivationLeaderboard } from './lib/activation-progress.ts';
import { attachActivationHistory, ACTIVATION_HISTORY_SQL } from './lib/activation-history.ts';
const now=new Date('2026-10-22T16:00:00Z');
const row=(id, overrides={})=>({ACCOUNT_ID:id,DISTRICT:'East',SE_MANAGER:'SEM A',FIRST_ACTIVATION_OBSERVED_DATE:'2026-10-14',PREVIOUS_OBSERVED_DATE:'2026-10-13',HISTORY_STATUS:'OBSERVED_TRANSITION',USE_CASE_NUMBER:'UC-test',CHECKED_AT:'2026-10-22T15:00:00Z',...overrides});
const deal=(id, overrides={})=>({accountId:id,opportunityId:id,accountName:id,district:'East',seManager:'SEM A',...overrides});
const progress=(deals,history)=>activationProgress(attachActivationHistory(deals,history),now);
test('local leaderboard uses observed account additions, excludes baseline history and deduplicates',()=>{
 const deals=[deal('a'),deal('a',{opportunityId:'duplicate'}),deal('b'),deal('c',{district:'West'})];
 const joined=attachActivationHistory(deals,[row('a'),row('b',{HISTORY_STATUS:'BASELINE_TAGGED'}),row('c',{DISTRICT:'West'})]);
 const ranking=observedActivationLeaderboard(joined,now);
 assert.equal(ranking.status,'ready');
 assert.deepEqual(ranking.rows.map(r=>[r.district,r.additions,r.rank]),[['East',1,1],['West',1,1]]);
 assert.equal(ranking.unavailableAccounts,1);
 assert.equal(ranking.rows[0].score,1/12*100);
 assert.equal(observedActivationLeaderboard(deals,now).status,'unavailable');
});
test('district card shows unique named SEMs without changing account credit',()=>{
 const deals=[deal('a'),deal('b',{seManager:' SEM B '}),deal('c',{seManager:'SEM A'}),deal('d',{seManager:null}),deal('e',{seManager:'(No SE manager)'}),deal('f',{seManager:'  '}),deal('g',{district:'West',seManager:'SEM West'})];
 assert.deepEqual(districtSemNames(deals,'East'),['SEM A','SEM B']);
 assert.deepEqual(districtSemNames(deals,'West'),['SEM West']);
 assert.deepEqual(districtSemNames(deals,'Empty'),[]);
 const missing=[deal('d',{seManager:null})];
 assert.deepEqual(districtSemNames(missing,'East'),[]);
 assert.equal(progress(missing,[row('d',{SE_MANAGER:null})])[0].actual,1);
 assert.equal(progress(missing,[row('d',{SE_MANAGER:null})])[0].target,12);
});
test('distinct accounts, shared district goal and SEM contributions',()=>{
 const deals=[deal('a'),deal('a',{opportunityId:'duplicate'}),deal('b',{seManager:'SEM B'})];
 const joined=attachActivationHistory(deals,[row('a'),row('b',{SE_MANAGER:'SEM B'})]);
 const district=activationProgress(joined,now)[0];
 assert.equal(district.actual,2);assert.equal(district.target,12);
 const sems=activationProgress(joined,now,true);
 assert.deepEqual(sems.map(p=>p.actual),[1,1]);assert.ok(sems.every(p=>p.target===null));
});
test('baseline tagged cannot receive credit even with an observed date',()=>{
 const p=progress([deal('a')],[row('a',{HISTORY_STATUS:'BASELINE_TAGGED'})])[0];
 assert.equal(p.actual,0);assert.equal(p.unknownAccounts,1);
});
test('no loaded history is unavailable, successful no-transition result is zero',()=>{
 assert.equal(progress([deal('a')],[])[0].actual,null);
 assert.equal(progress([deal('a')],[row('a',{HISTORY_STATUS:'NO_OBSERVED_ACTIVATION',FIRST_ACTIVATION_OBSERVED_DATE:null})])[0].actual,0);
});
test('old observations and rolloffs do not create or erase credit',()=>{
 assert.equal(progress([deal('a',{hasActivationTag:false,hasRolloff:true})],[row('a')])[0].actual,1);
 assert.equal(progress([deal('a')],[row('a',{FIRST_ACTIVATION_OBSERVED_DATE:'2026-09-14',PREVIOUS_OBSERVED_DATE:'2026-09-13'})])[0].actual,0);
});
test('date grain retained at month boundary',()=>{
 const joined=attachActivationHistory([deal('a')],[row('a',{FIRST_ACTIVATION_OBSERVED_DATE:'2026-10-01',PREVIOUS_OBSERVED_DATE:'2026-09-30'})]);
 assert.equal(activationProgress(joined,now)[0].actual,1);
 assert.equal(activationProgress(joined,new Date('2026-11-01T05:00:00Z'))[0].actual,0);
});
test('invalid dates, unknown baseline, and future query time cannot earn credit',()=>{
 for(const changes of [{FIRST_ACTIVATION_OBSERVED_DATE:'2026-10-99'},{PREVIOUS_OBSERVED_DATE:null},{HISTORY_STATUS:'NO_HISTORY'},{CHECKED_AT:'2026-12-01T00:00:00Z'}]) {
 const p=progress([deal('a')],[row('a',changes)])[0];assert.ok(p.actual===0||p.actual===null);assert.equal(p.unknownAccounts,1);
 }
});
test('aggregate date counts distinct accounts with current district and SEM without invented history', () => {
 const upstream = (id, date, overrides = {}) => deal(id, {activationObservedDate: date, refreshedAt: '2026-10-22T15:00:00Z', ...overrides});
 const deals = [upstream('a','2026-10-01'), upstream('a','2026-10-01'), upstream('b','2026-09-30'), upstream('c',null), upstream('d','2026-10-20',{seManager:'SEM B',hasActivationTag:false})];
 const pair = activationProgress(attachActivationHistory(deals, []), now)[0];
 assert.equal(pair.actual, 2);
 assert.equal(pair.target, 12);
 assert.equal(pair.unknownAccounts, 1);
 assert.deepEqual(pair.accounts.map(row => row.accountId), ['a','d']);
 assert.deepEqual(activationProgress(deals,now,true).map(pair => pair.actual),[1,1]);
 assert.equal(activationProgress(deals,now,false,'2026-09')[0].actual,1);
 assert.equal(activationProgress(deals,new Date('2026-11-01T05:00:00Z'))[0].actual,0);
});
test('upstream leaderboard matches monthly goals, handles ties, regions and month rollover', () => {
 const districts = [['A',4],['B',3],['C',3],['D',3]];
 const rows = districts.flatMap(([district,count]) => Array.from({length:count},(_,index) => deal(`${district}-${index}`,{district,region:district === 'A' ? 'East' : 'West',activationObservedDate:'2026-10-01',refreshedAt:'2026-10-22T15:00:00Z'})));
 rows.push({...rows[0],opportunityId:'duplicate'},deal('unknown',{district:'A',activationObservedDate:null,refreshedAt:'2026-10-22T15:00:00Z'}));
 const result = observedActivationLeaderboard(rows,now);
 assert.deepEqual(result.rows.map(row => [row.district,row.additions,row.rank]),[['A',4,1],['B',3,2],['C',3,2]]);
 assert.equal(result.tiedCutoff,true);
 assert.equal(result.unavailableAccounts,1);
 for (const row of result.rows) {
   const goal = activationProgress(rows,now).find(pair => pair.district === row.district);
   assert.equal(row.additions,goal.actual);
   assert.equal(row.score,goal.actual / goal.target * 100);
 }
 assert.deepEqual(observedActivationLeaderboard(rows.filter(row => row.region === 'West'),now).rows.map(row => row.district),['B','C','D']);
 assert.equal(observedActivationLeaderboard(rows,new Date('2026-11-01T05:00:00Z')).status,'empty');
 assert.equal(observedActivationLeaderboard([deal('missing')],now).status,'unavailable');
});
test('aggregate null dates stay uncredited and malformed or conflicting dates cannot earn credit', () => {
 const base = deal('a',{activationObservedDate:null,refreshedAt:'2026-10-22T15:00:00Z'});
 for (const date of [null,'2026-02-30','2026-10-99','2026-11-01']) {
   const pair = activationProgress([{...base,activationObservedDate:date}],now)[0];
   assert.equal(pair.actual,0); assert.equal(pair.unknownAccounts,1);
 }
 assert.equal(activationProgress([{...base,activationObservedDate:'2026-10-01'},{...base,activationObservedDate:'2026-10-02'}],now)[0].actual,null);
 assert.equal(activationProgress([{...base,refreshedAt:null}],now)[0].actual,null);
 assert.equal(activationProgress([deal('a')],now)[0].actual,null);
});
test('production reads upstream activation in base payload and skips the experimental request', () => {
 const data = readFileSync(new URL('./lib/data.ts', import.meta.url),'utf8');
 const provider = readFileSync(new URL('./components/coverage-provider.tsx', import.meta.url),'utf8');
 assert.match(data,/activationObservedDate: r.FIRST_ACTIVATION_OBSERVED_DATE/);
 assert.match(provider,/if \(hasUpstreamActivation\) \{[\s\S]*?return;/);
 assert.match(provider,/v9-upstream-activation/);
});
test('history query computes account first observation before month filtering',()=>{
 assert.match(ACTIVATION_HISTORY_SQL,/SNP_SALESFORCE_USE_CASE/);
 assert.match(ACTIVATION_HISTORY_SQL,/BOOLOR_AGG\(PREVIOUS_TAGGED IS NULL\)/);
 assert.doesNotMatch(ACTIVATION_HISTORY_SQL,/2026-10|FIVETRAN\.|FIELD_SPECIALIST|#rolloff/);
});
