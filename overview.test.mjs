import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { summarize, byRegion } from './lib/aggregate.ts';

const rows = [
  {opportunityId:'a',fqNum:1,region:'East',cap1Acv:100,hasAnyAse:true},
  {opportunityId:'b',fqNum:1,region:'West',cap1Acv:200,hasAnyAse:false,isSiInvolved:true,isOdFlip:true},
  {opportunityId:'c',fqNum:2,region:'East',cap1Acv:300,hasAnyAse:false},
  {opportunityId:'d',fqNum:2,region:'West',cap1Acv:400,hasAnyAse:true,isOdFlip:true},
  {opportunityId:'e',fqNum:3,region:'East',cap1Acv:500,hasAnyAse:true,isSiInvolved:true},
];
test('overview uses quarter-filtered input everywhere and omits removed sections', async () => {
  const source = await readFile(new URL('./app/page.tsx', import.meta.url),'utf8');
  assert.match(source,/const \{ quarterDeals, quarter \} = useCoverage\(\)/);
  assert.match(source,/summarize\(quarterDeals\)/);
  assert.match(source,/byRegion\(quarterDeals, regionLabel\)/);
  assert.match(source,/eligibleDeals = quarterDeals\.filter/);
  assert.doesNotMatch(source,/visibleDeals|TrendMatrix|MethodologyNote|Coverage by fiscal quarter/);
});
test('all quarters update totals, adjusted coverage, and reconcile region cards', () => {
  for (const [quarter,deals,acv,covered,gapAcv,eligibleCount,eligibleCovered,excluded] of [
    ['ALL',5,1500,3,500,2,1,3], [1,2,300,1,200,1,1,1],
    [2,2,700,1,300,1,0,1], [3,1,500,1,0,0,0,1], [4,0,0,0,0,0,0,0],
  ]) {
    const scoped=rows.filter(row=>quarter==='ALL'||row.fqNum===quarter);
    const summary=summarize(scoped);
    const eligible=summarize(scoped.filter(row=>!row.isSiInvolved&&!row.isOdFlip));
    assert.deepEqual([summary.deals,summary.acv,summary.covered,summary.gapAcv,eligible.deals,eligible.covered,summary.deals-eligible.deals],[deals,acv,covered,gapAcv,eligibleCount,eligibleCovered,excluded]);
    const regions=byRegion(scoped,value=>value);
    for (const key of ['deals','acv','covered','gap','gapAcv']) assert.equal(regions.reduce((sum,row)=>sum+row[key],0),summary[key]);
  }
});
test('ASE Coverage retains both statuses for table, totals and export', async () => {
  const source = await readFile(new URL('./app/uncovered/page.tsx', import.meta.url), 'utf8');
  assert.match(source, /let deals = quarterDeals;/);
  assert.match(source, /const filtered = sorted;/);
  assert.doesNotMatch(source, /filter\([^\n]*!\s*\w+\.hasAnyAse/);
  assert.match(source, /summarize\(filtered\)/);
  assert.match(source, /medianAcv\(filtered\)/);
  assert.match(source, /exportCsv\(filtered, "ase-coverage-cap1s.csv"\)/);
  assert.match(source, /deals=\{regularDeals\}/);
  assert.match(source, /including ASE assigned and No ASE/);
});
test('dictionary explains monthly counting and refresh with readable labels', async () => {
  const source = await readFile(new URL('./app/dictionary/page.tsx', import.meta.url), 'utf8');
  const section = source.split('>Additional information</h2>')[1];
  assert.ok(section);
  for (const text of ['checks every minute', 'cached for 10 minutes', 'first recorded activation date', 'Missing dates:', 'current district and SEM', 'Eastern time', 'do not exclude qualifying monthly additions']) {
    assert.ok(section.includes(text), text);
  }
  assert.doesNotMatch(section, /FIRST_ACTIVATION_OBSERVED_DATE|DT_AGG_WINGMATE|ACCOUNT_ENGINEERING|<details|Q:|A:/);
  assert.doesNotMatch(source, /Each newly activation-tagged account/);
});
test('dashboard copy stays concise while Dictionary retains counting guidance', async () => {
  const paths = ['lib/constants.ts', 'components/district-tmr-leaderboard.tsx', 'components/monthly-progress.tsx', 'components/attachment-goals.tsx'];
  const [constants, leaderboard, monthly, goals] = await Promise.all(paths.map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.doesNotMatch(constants, /where you're covered/);
  assert.doesNotMatch(leaderboard, /How ranking works|Evidence as of|missing or uncertain activation history|carryover is not included/);
  assert.doesNotMatch(monthly, /Counts include accounts with recorded activation dates/);
  assert.match(goals, /12 activation accounts per district each month, shared across SEMs/);
  assert.match(leaderboard, /Coverage refresh failed/);
  assert.match(monthly, /Monthly count unavailable/);
});
test('region and quarter filters intersect rather than override each other',()=>{
  const scoped=rows.filter(row=>row.region==='East'&&row.fqNum===2);
  assert.equal(summarize(scoped).acv,300);
  assert.equal(byRegion(scoped,value=>value).length,1);
});
