import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {districtTmrLeaderboard, tmrPeriod} from './lib/tmr-leaderboard.ts';
import {mapTmrEvidence} from './lib/tmr-evidence.ts';

const now = new Date('2026-10-22T16:00:00Z');
const evidence = (dates = [], extra = {}) => ({dates, coveredFrom:'2026-02-01', coveredThrough:'2026-10-22', checkedAt:'2026-10-22T15:00:00Z', complete:true, ...extra});
const deal = (id, district='District A', dates=['2026-10-02'], extra={}) => ({accountId:id, opportunityId:`opp-${id}`, district, region:'CommAcqEast', fqNum:1, closeDate:'2026-03-01', tmrEvidence:evidence(dates), ...extra});
const run = (rows, mode='month', quarter='ALL', region='FOCUS') => districtTmrLeaderboard(rows, now, mode, quarter, region);

test('mapper validates proposed contract and supports SDK and JSON arrays', () => {
  const raw = {ASE_TMR_CREATED_DATES:['2026-10-02','2026-10-02'], ASE_TMR_HISTORY_FROM:'2026-02-01', ASE_TMR_HISTORY_THROUGH:'2026-10-22', ASE_TMR_HISTORY_COMPLETE:true, ASE_TMR_HISTORY_CHECKED_AT:new Date('2026-10-22T15:00:00Z')};
  assert.deepEqual(mapTmrEvidence(raw), evidence(['2026-10-02'], {checkedAt:'2026-10-22T15:00:00.000Z'}));
  assert.deepEqual(mapTmrEvidence({...raw, ASE_TMR_CREATED_DATES:'["2026-10-02"]'}), evidence(['2026-10-02'], {checkedAt:'2026-10-22T15:00:00.000Z'}));
  assert.equal(mapTmrEvidence({}), null);
  for (const change of [{ASE_TMR_CREATED_DATES:'oops'}, {ASE_TMR_CREATED_DATES:['2026-02-30']}, {ASE_TMR_CREATED_DATES:['2025-01-01']}, {ASE_TMR_HISTORY_COMPLETE:'true'}, {ASE_TMR_HISTORY_CHECKED_AT:'2026-10-22T15:00:00'}, {ASE_TMR_HISTORY_CHECKED_AT:new Date('bad')}]) assert.equal(mapTmrEvidence({...raw,...change}),null);
  assert.deepEqual(mapTmrEvidence({...raw,ASE_TMR_CREATED_DATES:[]}).dates, []);
});

test('distinct accounts, not opportunities or TMRs, determine counts', () => {
  const first=deal('a','District A',['2026-10-02','2026-10-03','2026-10-03']);
  const result=run([first,{...first,opportunityId:'second'},deal('b')]);
  assert.equal(result.rows[0].additions,2);
  assert.equal(result.rows[0].score,2/12*100);
});

test('monthly repeats count once per quarter and ignore close quarter', () => {
  const rows=[deal('a','District A',['2026-08-05','2026-09-05','2026-10-05'])];
  assert.equal(run(rows).rows[0].additions,1);
  assert.equal(run(rows,'quarter',3).rows[0].additions,1);
  assert.equal(run(rows,'quarter',3).period.target,36);
  assert.equal(run(rows,'quarter',1).status,'empty');
  assert.equal(run(rows,'month',1).rows[0].additions,1);
});

test('deterministic current ownership before region filtering', () => {
  const older=deal('a','Old district',undefined,{region:'CommAcqWest'});
  const newer={...older,district:'New district',region:'CommAcqEast',opportunityId:'later',closeDate:'2026-09-01'};
  assert.equal(run([older,newer],'month','ALL','CommAcqWest').status,'empty');
  assert.equal(run([older,newer]).rows[0].district,'New district');
  assert.deepEqual(run([older,newer]),run([newer,older]));
  assert.equal(run([deal('outside','Other',undefined,{region:'Other'})]).status,'empty');
});

test('missing/incomplete/stale/conflicting evidence suppresses the entire ranking', () => {
  for (const invalid of [null,evidence([],{complete:false}),evidence([],{coveredFrom:'2026-10-02'}),evidence([],{coveredThrough:'2026-10-21'}),evidence([],{checkedAt:'2026-10-20T15:00:00Z'}),evidence([],{checkedAt:'2026-10-23T15:00:00Z'}),evidence(['2026-10-23']),evidence(['2026-02-30'])]) {
    const result=run([deal('a'),deal('b','District B',[],{tmrEvidence:invalid})]);
    assert.equal(result.status,'unavailable'); assert.deepEqual(result.rows,[]);
  }
  assert.equal(run([deal('a'),deal('a','District A',[])]).status,'unavailable');
  assert.match(run([deal('a','District A',[],{tmrEvidence:evidence([],{checkedAt:'2026-10-20T15:00:00Z'})})]).reason,/24 hours/);
});

test('known zero differs from missing data and unmapped accounts are disclosed', () => {
  assert.equal(run([deal('a','District A',[])]).status,'empty');
  assert.equal(run([deal('a','District A',[],{tmrEvidence:null})]).status,'unavailable');
  const result=run([deal('a'),deal('b',null)]);
  assert.equal(result.excludedAccounts,1); assert.equal(result.rows[0].additions,1);
  assert.equal(run([deal('')]).status,'unavailable');
  assert.equal(run([]).status,'empty');
});

test('competition ranking, tie cutoff, fewer than three and over-goal scores', () => {
  const tied=run(['D','B','C','A'].map(name=>deal(name,name)));
  assert.deepEqual(tied.rows.map(row=>[row.rank,row.district]),[[1,'A'],[1,'B'],[1,'C']]);
  assert.equal(tied.tiedCutoff,true);
  assert.equal(run([deal('a')]).rows.length,1);
  const rows=Array.from({length:15},(_,index)=>deal(String(index)));
  assert.equal(run(rows).rows[0].score,125);
  const unequal=run([deal('1','A'),deal('2','A'),deal('3','B'),deal('4','B'),deal('5','C')]);
  assert.deepEqual(unequal.rows.map(row=>row.rank),[1,1,3]);
});

test('fiscal periods, QTD full target and FY months started', () => {
  assert.deepEqual([tmrPeriod(now,'quarter',1).start,tmrPeriod(now,'quarter',1).endExclusive],['2026-02-01','2026-05-01']);
  assert.equal(tmrPeriod(now,'quarter',3).label,'FY27 Q3 to date');
  assert.equal(tmrPeriod(now,'quarter',3).target,36);
  assert.equal(tmrPeriod(now,'quarter','ALL').target,108);
  assert.equal(tmrPeriod(now,'quarter',4).available,false);
  assert.equal(tmrPeriod(new Date('2027-01-15T12:00:00Z'),'quarter','ALL').target,144);
  assert.equal(tmrPeriod(new Date('2027-03-01T12:00:00Z'),'quarter','ALL').through,'2027-01-31');
  assert.equal(tmrPeriod(new Date('2027-03-01T12:00:00Z'),'month','ALL').available,false);
  assert.equal(tmrPeriod(new Date('2026-01-31T12:00:00Z'),'quarter','ALL').available,false);
  assert.throws(()=>tmrPeriod(now,'quarter',5),/Invalid fiscal quarter/);
});

test('Eastern month boundary preserves creation date grain', () => {
  const before=new Date('2026-11-01T03:59:00Z');
  const after=new Date('2026-11-01T04:00:00Z');
  assert.equal(tmrPeriod(before,'month','ALL').start,'2026-10-01');
  assert.equal(tmrPeriod(after,'month','ALL').start,'2026-11-01');
  const row=deal('a','A',[],{tmrEvidence:evidence(['2026-10-31'],{coveredThrough:'2026-11-01',checkedAt:after.toISOString()})});
  assert.equal(districtTmrLeaderboard([row],after,'month','ALL').status,'empty');
  assert.equal(districtTmrLeaderboard([row],after,'quarter',3).rows[0].additions,1);
});

test('help pages explain roles, TMR submission and carryover without implementation details', async () => {
  const [dictionary, guide] = await Promise.all(['app/dictionary/page.tsx', 'app/how-to/page.tsx'].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  for (const source of [dictionary, guide]) {
    assert.doesNotMatch(source, /Local experiment|SNOW_CERTIFIED|ACCOUNT_ENGINEERING|FIRST_ACTIVATION|baseline-tagged/i);
    for (const role of ['DM:', 'SEM:', 'AE', 'SE']) assert.ok(source.includes(role));
    assert.match(source, /14/);
    assert.match(source, /not yet|does not yet/);
    assert.match(source, /12/);
  }
  assert.match(guide, /Opening the link does not submit the request/);
  assert.match(dictionary, /Goal attainment = accounts added \/ 12 x 100/);
  assert.doesNotMatch(dictionary, /Coverage and pills|StatusBadge|const signals|These signals can overlap/);
  assert.doesNotMatch(guide, /for the labels/);
});

test('triangle colors and legends distinguish shared district goals from AE/SE coverage', async () => {
  const files = await Promise.all(['app/district/page.tsx','app/ae/page.tsx','app/se/page.tsx','app/dictionary/page.tsx','components/methodology-note.tsx','components/rollup-table.tsx'].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  const [district, ae, se, dictionary, notes, table] = files;
  assert.match(district, /warningTone="yellow"/);
  assert.match(district, /belowTarget\(districtProgress\)/);
  assert.doesNotMatch(district, /DistrictGoalNote/);
  assert.match(dictionary, /<DistrictGoalNote \/>/);
  for (const page of [ae,se]) assert.match(page, /warningTone="red"/);
  assert.match(dictionary, /What the triangles mean/);
  assert.match(notes, /not separate quotas/);
  assert.match(notes, /does not trigger a warning/);
  assert.match(notes, /less than 10%/);
  assert.doesNotMatch(notes, /below-average/);
  assert.match(table, /r.deals >= 5 && r.pctAnyAse < 10/);
  assert.match(table, /text-red-600/);
  assert.match(table, /text-yellow-600/);
});

test('component integration retains independent Overview scope and no extra endpoint', async () => {
  const [page,component,data]=await Promise.all(['app/page.tsx','components/district-tmr-leaderboard.tsx','lib/data.ts'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
  assert.match(page,/<DistrictTmrLeaderboard \/>/);
  assert.match(page,/summarize\(quarterDeals\)/);
  assert.match(component,/observedActivationLeaderboard\(visibleDeals, now\)/);
  assert.doesNotMatch(component,/localPreview|districtTmrLeaderboard\(|window.location.hostname|new ASE-type TMRs/);
  assert.match(component,/same counts as Attachment Goals/);
  assert.doesNotMatch(component,/fetch\(|quarterDeals|activationHistory/);
  assert.doesNotMatch(component, /Selected quarter|setMode|TmrPeriodMode|36 accounts/);
  for (const text of ['Loading monthly rankings','Coverage refresh failed','Goal attainment','tiedCutoff','<table','scope="col"','Pending ranking slot','Awaiting ranking','Dashes mean unavailable, not zero','overflow-x-auto']) assert.ok(component.includes(text));
  assert.match(component, /districtSemNames\(visibleDeals, row.district\)/);
  assert.match(component, /District \/ SEMs/);
  assert.match(data,/tmrEvidence: mapTmrEvidence\(r\)/);
});
