import test from 'node:test';
import assert from 'node:assert/strict';
import { districtScope, byDistrict, bySeManager, summarize } from './lib/aggregate.ts';

const makeDeal = (opportunityId, district, seManager, hasAnyAse = false) => ({
  opportunityId, accountId: opportunityId, district, seManager, hasAnyAse,
  cap1Acv: 10000, hasAseByClose: false, isOpenQuarter: false,
});
const rows = [
  makeDeal('one', 'East', 'Shared SEM', true),
  makeDeal('two', 'West', 'Shared SEM'),
  makeDeal('three', 'East', 'Other SEM'),
  makeDeal('four', 'East', null),
  makeDeal('five', null, null),
];

test('district scope contains only its own SEM accounts, including assigned ones', () => {
  assert.deepEqual(districtScope(rows, 'East', 'Shared SEM').map(d => d.opportunityId), ['one']);
  assert.equal(summarize(districtScope(rows, 'East', 'Shared SEM')).covered, 1);
});
test('district list and SEM rollup reconcile without dropping unassigned mappings', () => {
  assert.equal(byDistrict(rows).reduce((sum, row) => sum + row.deals, 0), rows.length);
  const east = districtScope(rows, 'East');
  assert.equal(bySeManager(east).reduce((sum, row) => sum + row.deals, 0), east.length);
  assert.deepEqual(districtScope(rows, 'East', '(No SE manager)').map(d => d.opportunityId), ['four']);
  assert.deepEqual(districtScope(rows, '(No district)', '(No SE manager)').map(d => d.opportunityId), ['five']);
});
test('invalid district or SEM produces an empty result, never a wider scope', () => {
  assert.equal(districtScope(rows, 'Missing').length, 0);
  assert.equal(districtScope(rows, 'East', 'Missing').length, 0);
});
test('SEM-only URL does not bypass the district-first navigation', () => {
  assert.equal(districtScope(rows, null, 'Shared SEM').length, rows.length);
});
test('caller region and quarter subset is preserved', () => {
  assert.deepEqual(districtScope([rows[1]], 'East'), []);
});
test('rollups retain distinct-opportunity summary semantics', () => {
  const duplicates = [rows[0], rows[0]];
  assert.equal(byDistrict(duplicates)[0].deals, 1);
  assert.equal(bySeManager(duplicates)[0].acv, 10000);
});
