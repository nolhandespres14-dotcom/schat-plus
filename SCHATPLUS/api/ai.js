import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Connexion requise.' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return res.status(500).json({ error: 'Supabase serveur non configuré.' });
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return res.status(401).json({ error: 'Session invalide.' });
  const { ai, question, agent_id } = req.body || {};
  if (!ai || !question) return res.status(400).json({ error: 'ai et question sont requis' });
  const { data: agent } = agent_id ? await supabase.from('ai_agents').select('id,name,system_prompt,model,enabled').eq('id',agent_id).maybeSingle() : await supabase.from('ai_agents').select('id,name,system_prompt,model,enabled').eq('name',ai).maybeSingle();
  if (!agent || !agent.enabled) return res.status(403).json({ error: `L’IA ${ai} est désactivée.` });
  const prompt = `${agent.system_prompt || 'Réponds en français, clairement et utilement.'}\n\nQuestion de l'utilisateur :\n${question}`;
  try {
    if (agent.name === 'ChatGPT' && process.env.OPENAI_API_KEY) {
      const r = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.OPENAI_API_KEY}`}, body:JSON.stringify({model:agent.model||process.env.OPENAI_MODEL||'gpt-5-mini',input:prompt}) });
      const data=await r.json(); if(!r.ok)return res.status(502).json({error:data?.error?.message||'Erreur OpenAI'}); return res.json({answer:data.output_text||'Aucune réponse reçue.'});
    }
    if (agent.name === 'Claude' && process.env.ANTHROPIC_API_KEY) {
      const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:agent.model||process.env.ANTHROPIC_MODEL||'claude-sonnet-4-5',max_tokens:1200,messages:[{role:'user',content:prompt}]})});
      const data=await r.json(); if(!r.ok)return res.status(502).json({error:data?.error?.message||'Erreur Anthropic'}); return res.json({answer:(data.content||[]).map(x=>x.text||'').join('\n')||'Aucune réponse reçue.'});
    }
    if (agent.name === 'Gemini' && process.env.GEMINI_API_KEY) {
      const model=agent.model||process.env.GEMINI_MODEL||'gemini-2.5-flash'; const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})}); const data=await r.json(); if(!r.ok)return res.status(502).json({error:data?.error?.message||'Erreur Gemini'}); return res.json({answer:data?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('\n')||'Aucune réponse reçue.'});
    }
    return res.status(503).json({ error: `L’API de ${agent.name} n’est pas encore configurée sur le serveur.` });
  } catch(e) { return res.status(500).json({error:'Erreur serveur IA'}); }
}
