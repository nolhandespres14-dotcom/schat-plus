export const SAFE_AI_FIELDS = new Set(['name','enabled','model','system_prompt']);

export function normalizeAdminAction(action) {
  if (!action || typeof action !== 'object') return null;
  if (action.type !== 'update_ai') return null;
  const name = String(action.name || '').trim();
  if (!name || name.length > 80) return null;
  const out = { type:'update_ai', name };
  if ('enabled' in action) {
    if (typeof action.enabled !== 'boolean') return null;
    out.enabled = action.enabled;
  }
  if ('model' in action) {
    const model = String(action.model || '').trim();
    if (!model || model.length > 120) return null;
    out.model = model;
  }
  if ('system_prompt' in action) {
    const prompt = String(action.system_prompt || '').trim();
    if (prompt.length > 6000) return null;
    out.system_prompt = prompt;
  }
  if (Object.keys(out).length === 2) return null;
  return out;
}
