import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";
import { PLAN_CATALOG, formatPlanPrice } from "./plans.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const page = document.body.dataset.page;
let session = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}
function message(text, isError = false) {
  const node = $("subscriptionMessage");
  if (!node) return;
  node.textContent = text;
  node.classList.toggle("error", isError);
}
async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  session = data.session;
  $("subscriptionAccount").textContent = session?.user?.email
    ? "Connecté : " + session.user.email
    : "Tu dois te connecter à schat+ pour gérer un abonnement.";
}
async function api(action, payload = {}) {
  if (!session?.access_token) throw new Error("Connecte-toi à schat+ avant de continuer.");
  const response = await fetch("/api/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.access_token
    },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "La demande n’a pas pu être traitée.");
  return data;
}
async function loadState() {
  if (!session?.access_token) return { active: null, pending: [], cancellations: [] };
  const response = await fetch("/api/subscriptions", {
    headers: { Authorization: "Bearer " + session.access_token }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Impossible de charger ton abonnement.");
  return data;
}
function renderPlans(state) {
  const grid = $("plansGrid");
  if (!grid) return;
  const activeCode = state.active?.plan_code;
  grid.innerHTML = PLAN_CATALOG.map((plan) => {
    const selected = activeCode === plan.code;
    const disabled = selected || (!plan.paid && activeCode === "V1");
    return `<article class="plan-card ${plan.code === "V5" ? "plan-featured" : ""}">
      <div class="plan-code">${escapeHtml(plan.code)}</div>
      <h2>${escapeHtml(plan.name)}</h2>
      <div class="plan-price">${escapeHtml(formatPlanPrice(plan))}</div>
      <p>${escapeHtml(plan.description)}</p>
      <div class="plan-inclusions">Les fonctionnalités et limites détaillées de cette offre seront publiées avant l’ouverture des paiements.</div>
      <button class="primary-btn plan-select" data-plan="${plan.code}" ${disabled ? "disabled" : ""}>${selected ? "Offre actuelle" : plan.paid ? "Demander cette offre" : "Choisir gratuitement"}</button>
    </article>`;
  }).join("");
  grid.querySelectorAll("[data-plan]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        button.disabled = true;
        const result = await api("select_plan", { plan_code: button.dataset.plan });
        message(result.message || "Demande enregistrée.");
        await refresh();
      } catch (error) {
        message(error.message, true);
        button.disabled = false;
      }
    });
  });
}
function renderAccount(state) {
  const host = $("subscriptionDetails");
  if (!host) return;
  const active = state.active;
  const pending = state.pending || [];
  const cancellations = state.cancellations || [];
  const plan = active && PLAN_CATALOG.find((item) => item.code === active.plan_code);
  host.innerHTML = `
    <div class="subscription-status"><span class="status-pill">${active ? escapeHtml(active.status) : "Aucune offre active"}</span></div>
    <h2>${plan ? escapeHtml(plan.name) : "Aucun abonnement actif"}</h2>
    <p>${plan ? escapeHtml(formatPlanPrice(plan)) : "Tu peux commencer avec l’offre V1 gratuite."}</p>
    ${active?.status === "active" && active.plan_code !== "V1" ? '<button id="cancelSubscription" class="secondary-btn">Demander l’annulation</button>' : ""}
    <h3>Demandes en attente</h3>
    ${pending.length ? pending.map((item) => {
      const p = PLAN_CATALOG.find((candidate) => candidate.code === item.plan_code);
      return `<div class="subscription-row"><strong>${escapeHtml(p?.name || item.plan_code)}</strong><span>En attente de paiement</span></div>`;
    }).join("") : '<p class="small-note">Aucune demande en attente.</p>'}
    <h3>Demandes d’annulation</h3>
    ${cancellations.length ? cancellations.map((item) => `<div class="subscription-row"><strong>Demande du ${new Date(item.created_at).toLocaleDateString("fr-CA")}</strong><span>${escapeHtml(item.status)}</span></div>`).join("") : '<p class="small-note">Aucune demande d’annulation.</p>'}
    <p class="small-note">Un abonnement payant reste inactif tant qu’un paiement n’a pas été confirmé. Une demande d’annulation n’est pas une confirmation de résiliation.</p>`;
  const cancelButton = $("cancelSubscription");
  if (cancelButton) cancelButton.addEventListener("click", async () => {
    if (!active?.id || !confirm("Envoyer une demande d’annulation à l’administration ?")) return;
    try {
      cancelButton.disabled = true;
      const result = await api("cancel_request", { subscription_id: active.id });
      message(result.message || "Demande d’annulation envoyée.");
      await refresh();
    } catch (error) {
      message(error.message, true);
      cancelButton.disabled = false;
    }
  });
}
async function refresh() {
  await getSession();
  const state = await loadState();
  if (page === "plans") renderPlans(state);
  if (page === "account") renderAccount(state);
}
try {
  await refresh();
} catch (error) {
  message(error.message, true);
  if ($("subscriptionDetails")) $("subscriptionDetails").textContent = error.message;
}
