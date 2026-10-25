import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAdminAction } from '../api/admin-actions.js';

test('accepts an AI behavior change', () => {
  assert.deepEqual(
    normalizeAdminAction({type:'update_ai', name:'ChatGPT', enabled:true, system_prompt:'Réponds en français.'}),
    {type:'update_ai', name:'ChatGPT', enabled:true, system_prompt:'Réponds en français.'}
  );
});

test('rejects secrets and unknown actions', () => {
  assert.equal(normalizeAdminAction({type:'update_ai', name:'ChatGPT', OPENAI_API_KEY:'secret'}), null);
  assert.equal(normalizeAdminAction({type:'set_setting', key:'home_title', value:'Salut'}), null);
  assert.equal(normalizeAdminAction({type:'update_ai', name:'ChatGPT', enabled:'yes'}), null);
});
