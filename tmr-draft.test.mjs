import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mapTmrDraft, isDraftReady, loadEdits, saveEdits, resetEdits, editKey, draftAsText, combinedDraftText } from './lib/tmr-draft.ts';

const memoryStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m };
};

test('no draft status maps to null', () => {
  assert.equal(mapTmrDraft({}), null);
  assert.equal(mapTmrDraft({ TMR_DRAFT_STATUS: '  ' }), null);
});

test('low-evidence drafts map but are not ready', () => {
  const d = mapTmrDraft({ TMR_DRAFT_STATUS: 'LOW_EVIDENCE', TMR_DRAFT_MEETINGS_READ: 0 });
  assert.equal(d.status, 'LOW_EVIDENCE');
  assert.equal(d.requestReason, null);
  assert.equal(isDraftReady(d), false);
});

test('drafted rows map all fields and are ready', () => {
  const d = mapTmrDraft({
    TMR_DRAFT_STATUS: 'DRAFTED',
    TMR_DRAFT_REQUEST_REASON: ' Context: x ',
    TMR_DRAFT_TARGET_SUCCESS_OUTCOME: 'Outcome',
    TMR_DRAFT_PARTNER_STATUS: 'engaged',
    TMR_DRAFT_PARTNER_NAMES: 'Acme SI',
    TMR_DRAFT_PARTNER_CONFLICT: true,
    TMR_DRAFT_OPPORTUNITY_ID: '006X',
    TMR_DRAFT_MEETINGS_READ: '3',
    TMR_DRAFT_GENERATED_AT: '2026-10-29T20:24:52Z',
  });
  assert.equal(d.requestReason, 'Context: x');
  assert.equal(d.partnerConflict, true);
  assert.equal(d.meetingsRead, 3);
  assert.equal(d.generatedAt, '2026-10-29T20:24:52.000Z');
  assert.equal(isDraftReady(d), true);
});

test('drafted status with no text is not ready', () => {
  assert.equal(isDraftReady(mapTmrDraft({ TMR_DRAFT_STATUS: 'DRAFTED' })), false);
});

test('edits save, load and reset per opportunity', () => {
  const s = memoryStore();
  assert.equal(loadEdits(s, 'opp1'), null);
  saveEdits(s, 'opp1', { text: 'a' });
  assert.deepEqual(loadEdits(s, 'opp1'), { text: 'a' });
  assert.equal(loadEdits(s, 'opp2'), null);
  resetEdits(s, 'opp1');
  assert.equal(loadEdits(s, 'opp1'), null);
});

test('corrupt saved edits are ignored', () => {
  const s = memoryStore();
  s.setItem(editKey('opp1'), '{not json');
  assert.equal(loadEdits(s, 'opp1'), null);
  s.setItem(editKey('opp1'), JSON.stringify({ requestReason: 1 }));
  assert.equal(loadEdits(s, 'opp1'), null);
});

test('draft is one block with no section headings', () => {
  const d = mapTmrDraft({ TMR_DRAFT_STATUS: 'DRAFTED', TMR_DRAFT_REQUEST_REASON: 'reason', TMR_DRAFT_TARGET_SUCCESS_OUTCOME: 'goal', TMR_DRAFT_PARTNER_STATUS: 'no_partner', TMR_DRAFT_OPPORTUNITY_ID: '006X' });
  assert.equal(combinedDraftText(d), 'reason\n\ngoal\n\nPartner: no_partner\nOpportunity: 006X');
  assert.doesNotMatch(combinedDraftText(d), /Request reason|Target success/);
  assert.equal(draftAsText({ text: 'edited' }), 'edited');
});

test('legacy two-field edits load as one block', () => {
  const s = memoryStore();
  s.setItem(editKey('opp1'), JSON.stringify({ requestReason: 'a', targetOutcome: 'b' }));
  assert.deepEqual(loadEdits(s, 'opp1'), { text: 'a\n\nb' });
});

test('drawer warns users to edit and double-check, and table opens it from the name', async () => {
  const drawer = await readFile(new URL('./components/tmr-draft-drawer.tsx', import.meta.url), 'utf8');
  assert.match(drawer, /Edit and double-check every field/);
  assert.match(drawer, /Open TMR form/);
  const table = await readFile(new URL('./components/deals-table.tsx', import.meta.url), 'utf8');
  assert.match(table, /setDraftDeal\(d\)/);
  assert.match(table, /e\.stopPropagation\(\); setDraftDeal/);
});
