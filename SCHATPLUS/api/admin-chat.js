import { createClient } from '@supabase/supabase-js';
import projectContext from './project-context.json' with { type: 'json' };
import { normalizeAdminAction } from './admin-actions.js';

function json(res, status, body) { res.status(status).json(body); }

function buildContext(live) {
  const fileText = projectContext.files.map(f => `FILE: ${f.path}\n${f.content}`).join('\n\n---\n\n');
  const safeLive = {
    ai_agents: live.ai_agents || [], cards: live.cards || [], reservations: live.reservations || [],
    chat_conversations_count: live.chat_conversations_count || 0, chat_messages_count: live.chat_messages_count || 0
  };
  return `Tu es le ChatGPT Admin de schat+. Tu aides l'administrateur du projet. Réponds en français.\n\nTu connais les fichiers fournis, les données Supabase fournies et le module Poképlx. Ne révèle JAMAIS de secret, clé API, mot de passe ou token.\n\nTu peux demander une action de type update_ai uniquement lorsque la demande porte sur une IA existante : activation/désactivation, modèle, ou comportement (system_prompt). Pour toute autre modification de code/interface, réponds sans action et explique que cela nécessite le pont source/deploiement.\n\nQuand une action update_ai est nécessaire, retourne un JSON strict avec : {"reply": string, "action": {"type":"update_ai","name":string,"enabled"?:boolean,"model"?:string,"system_prompt"?:string}}. Sinon action doit être null.\n\nETAT SUPABASE:\n${JSON.stringify(safeLive, null, 2)}\n\nFICHIERS DU PROJET:\n${fileText}`;
}

function extractText(data) {
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
  return (data.output || []).flatMap(item => item.content || []).map(part => part.text || '').filter(Boolean).join('\n').trim();
}

function parseModelOutput(text) {
  try {
    const parsed = JSON.parse(text);
    return { reply: String(parsed.reply || '').trim(), action: normalizeAdminAction(parsed.action) };
  } catch {
    return { reply: text, action: null };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée' });
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return json(res, 401, { error: 'Connexion requise.' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return json(res, 500, { error: 'Supabase serveur non configuré.' });
  if (!process.env.OPENAI_API_KEY) return json(res, 503, { error: 'OPENAI_API_KEY n’est pas configurée sur Vercel.' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json(res, 401, { error: 'Session invalide.' });
  const { data: admin, error: adminError } = await supabase.from('admin_users').select('user_id,can_use_chatgpt,can_modify_site').eq('user_id', user.id).maybeSingle();
  if (adminError) return json(res, 500, { error: 'Impossible de vérifier les droits admin.' });
  if (!admin) return json(res, 403, { error: 'Accès réservé à l’administrateur.' });
  if (!admin.can_use_chatgpt) return json(res, 403, { error: 'Le ChatGPT spécial est réservé à l’Admin 1.' });

  const message = String(req.body?.message || '').trim();
  if (!message) return json(res, 400, { error: 'message est requis.' });
  if (message.length > 8000) return json(res, 400, { error: 'Message trop long.' });

  const [agents, cards, reservations, convs, msgs] = await Promise.all([
    supabase.from('ai_agents').select('id,name,description,model,enabled,system_prompt,created_at,updated_at').order('created_at'),
    supabase.from('cards').select('id,name,price,rarity,stock,card_number,description,status,created_at').order('created_at',{ascending:false}).limit(100),
    supabase.from('reservations').select('id,product_id,buyer_id,buyer_name,buyer_phone,status,created_at,archived').order('created_at',{ascending:false}).limit(100),
    supabase.from('chat_conversations').select('id',{count:'exact',head:true}),
    supabase.from('chat_messages').select('id',{count:'exact',head:true})
  ]);
  const context = buildContext({ai_agents:agents.data||[],cards:cards.data||[],reservations:reservations.data||[],chat_conversations_count:convs.count||0,chat_messages_count:msgs.count||0});

  const response = await fetch('https://api.openai.com/v1/responses', {
    method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
    body:JSON.stringify({
      model:process.env.OPENAI_MODEL||'gpt-5-mini',
      input:[{role:'system',content:[{type:'input_text',text:context}]},{role:'user',content:[{type:'input_text',text:message}]}],
      text:{format:{type:'json_object'}}
    })
  });
  const data = await response.json().catch(()=>({}));
  if(!response.ok) return json(res,502,{error:data?.error?.message||'Erreur OpenAI.'});

  const parsed=parseModelOutput(extractText(data));
  let applied=false;
  if(parsed.action?.type==='update_ai'){
    const { data: target, error: findError } = await supabase.from('ai_agents').select('id,name,enabled,model,system_prompt').ilike('name',parsed.action.name).limit(1).maybeSingle();
    if(findError) return json(res,500,{error:'Impossible de trouver l’IA à modifier.'});
    if(!target) return json(res,404,{error:`IA introuvable : ${parsed.action.name}`});
    const update={updated_at:new Date().toISOString()};
    if('enabled' in parsed.action) update.enabled=parsed.action.enabled;
    if('model' in parsed.action) update.model=parsed.action.model;
    if('system_prompt' in parsed.action) update.system_prompt=parsed.action.system_prompt;
    const {error:updateError}=await supabase.from('ai_agents').update(update).eq('id',target.id);
    if(updateError) return json(res,500,{error:updateError.message});
    applied=true;
  }
  return json(res,200,{answer:parsed.reply||'Commande traitée.',action:parsed.action,applied});
}
