import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase-config.js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const STORAGE_KEY="schat_plus_state_v2";
const defaultAIs=[
 {id:1,name:"ChatGPT",icon:"🧠",active:true},
 {id:2,name:"Claude",icon:"🟣",active:true},
 {id:3,name:"Gemini",icon:"🔵",active:true},
 {id:4,name:"Grok",icon:"⚡",active:true},
 {id:5,name:"Perplexity",icon:"🟠",active:true},
 {id:6,name:"Copilot",icon:"🟢",active:true},
 {id:7,name:"Plaisir AI",icon:"✨",active:true}
];
let currentUser = null;
let state={questions:[],ais:defaultAIs,user:{username:'Utilisateur'}};
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
async function initAuth(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){location.href='login.html';return false;}
 currentUser=session.user;
 const {data:profile}=await supabase.from('profiles').select('username,role,banned').eq('id',currentUser.id).single();
 if(profile?.banned){await supabase.auth.signOut();location.href='login.html';return false;}
 if(profile?.role==='admin'){location.href='admin.html';return false;}
 state.user={username:profile?.username||currentUser.user_metadata?.username||currentUser.email?.split('@')[0]||'Utilisateur'};
 const {data:qs}=await supabase.from('questions').select('id,text,created_at').eq('user_id',currentUser.id).order('created_at',{ascending:true});
 if(qs) state.questions=qs.map(q=>({id:q.id,text:q.text,createdAt:q.created_at}));
 const {data:ais}=await supabase.from('ais').select('id,name,active').eq('active',true).order('id');
 if(ais?.length) state.ais=ais.map(a=>({id:a.id,name:a.name,icon:defaultAIs.find(x=>x.name===a.name)?.icon||'🤖',active:true}));
 return true;
}
let selectedQuestionId=null, selectedAI=null;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function activeAIs(){return state.ais.filter(a=>a.active)}
function renderQuestions(){
 const el=$("#questionList"), count=$("#questionCount");
 count.textContent=state.questions.length;
 if(!state.questions.length){el.className="question-list empty";el.textContent="Aucune question pour le moment.";return}
 el.className="question-list";
 el.innerHTML=state.questions.slice().reverse().map(q=>`<button class="q-item ${q.id===selectedQuestionId?"active":""}" data-q="${q.id}">${escapeHtml(q.text)}<span class="q-time">${new Date(q.createdAt).toLocaleString("fr-CA")}</span></button>`).join("");
 $$(".q-item").forEach(b=>b.onclick=()=>selectQuestion(Number(b.dataset.q)));
}
function renderAIs(){
 const el=$("#aiList"), all=$("#allAIGrid");
 el.innerHTML=activeAIs().map(a=>aiButton(a)).join("");
 all.innerHTML=state.ais.map(a=>`<article class="ai-card"><div class="ai-icon">${a.icon}</div><h3>${escapeHtml(a.name)}</h3><p>${a.active?"IA active et disponible":"IA désactivée par l’administration"}</p></article>`).join("");
 $$(".ai-button").forEach(b=>b.onclick=()=>selectAI(Number(b.dataset.ai)));
}
function aiButton(a){return `<button class="ai-button ${selectedAI===a.id?"active":""}" data-ai="${a.id}"><span class="ai-icon">${a.icon}</span><span class="ai-name">${escapeHtml(a.name)}</span><span class="ai-state">${a.active?"ACTIVE":"OFF"}</span></button>`}
function selectQuestion(id){
 selectedQuestionId=id;
 const q=state.questions.find(x=>x.id===id);
 $("#activeQuestion").textContent=q?`Question : ${q.text}`:"";
 $("#answerBox").className="answer-box empty-answer";
 $("#answerBox").innerHTML='<div class="big-icon">✦</div><h3>Choisis une IA</h3><p>La même question sera utilisée automatiquement.</p>';
 selectedAI=null;$("#activeAI").textContent="Aucune IA";renderQuestions();renderAIs();
}
async function selectAI(id){
 const q=state.questions.find(x=>x.id===selectedQuestionId);
 const a=state.ais.find(x=>x.id===id);
 if(!q){alert("Sélectionne d’abord une question.");return}
 if(!a||!a.active)return;
 selectedAI=id;
 $("#activeAI").textContent=a.name;
 $("#answerBox").className="answer-box";
 $("#answerBox").textContent=`${a.icon} ${a.name} réfléchit…`;
 renderAIs();
 try{
   const r=await fetch('../api/ai',{method:'POST',headers:{'Content-Type':'application/json', ...(session?.access_token ? {Authorization:`Bearer ${session.access_token}`} : {})},body:JSON.stringify({ai:a.name,question:q.text})});
   const data=await r.json();
   if(!r.ok) throw new Error(data?.error||'Impossible d’obtenir une réponse.');
   const answerText=data.answer||'Aucune réponse reçue.';
   $("#answerBox").innerHTML=`<strong>${a.icon} ${escapeHtml(a.name)}</strong>

${escapeHtml(answerText)}`;
   const {error}=await supabase.from('answers').insert({question_id:q.id,ai_name:a.name,answer_text:answerText});
   if(error) console.warn('Réponse non enregistrée:',error.message);
 }catch(e){
   $("#answerBox").innerHTML=`<strong>${a.icon} ${escapeHtml(a.name)}</strong><br><br>${escapeHtml(e.message)}`;
 }
}
function buildDemoAnswer(ai,text){
 return `Réponse de démonstration de ${ai} à ta question :\n\n« ${text} »\n\nL’interface est prête pour brancher l’API officielle de cette IA côté serveur. Tu peux déjà changer d’IA sans recopier la question.`;
}
async function sendQuestion(){
 const input=$("#questionInput"), text=input.value.trim(); if(!text)return;
 if(!currentUser){location.href='login.html';return;}
 const {data:q,error}=await supabase.from('questions').insert({user_id:currentUser.id,text}).select('id,text,created_at').single();
 if(error){alert(error.message);return;}
 const item={id:q.id,text:q.text,createdAt:q.created_at};
 state.questions.push(item); save(); input.value=""; selectQuestion(item.id); renderHistory();
}
function renderHistory(){
 const el=$("#historyList");
 if(!state.questions.length){el.innerHTML='<div class="panel" style="padding:20px;color:#71809e">Aucune question.</div>';return}
 el.innerHTML=state.questions.slice().reverse().map(q=>`<div class="history-item"><strong>${escapeHtml(q.text)}</strong><small>${new Date(q.createdAt).toLocaleString("fr-CA")}</small></div>`).join("");
}
function go(page){
 $$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 $$(".page").forEach(p=>p.classList.add("hidden"));
 $(`#page-${page}`).classList.remove("hidden");
 const labels={chat:["ESPACE IA","Chat"],ais:["ESPACE IA","IA"],pokeplex:["POKÉPLÉX","Poképléx"],history:["HISTORIQUE","Historique"],profile:["COMPTE","Profil"]};
 $("#pageEyebrow").textContent=labels[page][0];$("#pageTitle").textContent=labels[page][1];
 if(page==="history")renderHistory();
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
$("#sendBtn").onclick=sendQuestion;
$("#questionInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendQuestion()}});
$$(".nav-btn").forEach(b=>b.onclick=()=>go(b.dataset.page));
$("#openPokeplex").onclick=()=>window.open("https://pokemarket-pret-a-publier.vercel.app/","_blank");
$("#logoutBtn").onclick=async()=>{await supabase.auth.signOut();localStorage.removeItem(STORAGE_KEY);location.href="login.html"};
$("#mobileMenu").onclick=()=>document.body.classList.toggle("menu-open");
(async()=>{if(await initAuth()){ $("#userName").textContent=state.user.username; $("#profileName").textContent=state.user.username; renderQuestions();renderAIs();renderHistory(); }})();
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
