import { createClient } from "@supabase/supabase-js";
import { getPlan } from "../plans.js";

function send(res, status, body) {
  return res.status(status).json(body);
}
function createUserClient(authHeader) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    return send(res, 405, { error: "Méthode non autorisée." });
  }
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return send(res, 401, { error: "Connexion requise." });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return send(res, 503, { error: "Supabase serveur n’est pas configuré." });
  }

  const supabase = createUserClient(auth);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return send(res, 401, { error: "Session invalide." });

  if (req.method === "GET") {
    const [subscriptions, cancellations] = await Promise.all([
      supabase.from("user_subscriptions")
        .select("id,plan_code,status,created_at,updated_at,current_period_start,current_period_end")
        .eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("subscription_cancellation_requests")
        .select("id,subscription_id,status,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false })
    ]);
    if (subscriptions.error || cancellations.error) {
      return send(res, 503, { error: "Les tables d’abonnement ne sont pas encore installées. Applique la migration SQL du projet." });
    }
    const rows = subscriptions.data || [];
    const active = rows.find((row) => row.status === "active") || null;
    const pending = rows.filter((row) => row.status === "pending_payment");
    return send(res, 200, { active, pending, cancellations: cancellations.data || [] });
  }

  const body = req.body || {};
  if (body.action === "select_plan") {
    const plan = getPlan(String(body.plan_code || ""));
    if (!plan) return send(res, 400, { error: "Offre inconnue." });
    const { data: existing, error: readError } = await supabase.from("user_subscriptions")
      .select("id,plan_code,status").eq("user_id", user.id)
      .in("status", ["active", "pending_payment"]);
    if (readError) return send(res, 503, { error: "La base des abonnements n’est pas prête. Applique la migration SQL." });
    if ((existing || []).some((row) => row.status === "active" && row.plan_code === plan.code)) {
      return send(res, 200, { message: "Cette offre est déjà active." });
    }
    const pendingRequest = (existing || []).find((row) => row.status === "pending_payment");
    if (pendingRequest && pendingRequest.plan_code === plan.code) {
      return send(res, 200, { message: "Une demande pour cette offre est déjà en attente." });
    }
    if (pendingRequest) {
      return send(res, 409, { error: "Tu as déjà une demande de paiement en attente. Termine-la ou contacte l’administration avant d’en choisir une autre." });
    }
    const activePaid = (existing || []).find((row) => row.status === "active" && row.plan_code !== "V1");
    if (!plan.paid && activePaid) {
      return send(res, 409, { error: "Pour revenir à l’offre gratuite, demande d’abord l’annulation de ton abonnement payant actif." });
    }
    const status = plan.paid ? "pending_payment" : "active";
    const { error } = await supabase.from("user_subscriptions").insert({
      user_id: user.id, plan_code: plan.code, status
    });
    if (error) return send(res, 400, { error: "Impossible d’enregistrer cette demande : " + error.message });
    return send(res, 201, {
      message: plan.paid
        ? "Demande enregistrée. Aucun paiement n’a été effectué et l’offre payante n’est pas encore activée."
        : "L’offre V1 gratuite est activée."
    });
  }

  if (body.action === "cancel_request") {
    const subscriptionId = String(body.subscription_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(subscriptionId)) return send(res, 400, { error: "Abonnement invalide." });
    const { data: subscription, error: findError } = await supabase.from("user_subscriptions")
      .select("id,status,plan_code").eq("id", subscriptionId).eq("user_id", user.id).maybeSingle();
    if (findError || !subscription) return send(res, 404, { error: "Abonnement introuvable." });
    if (subscription.status !== "active" || subscription.plan_code === "V1") {
      return send(res, 400, { error: "Seul un abonnement payant actif peut faire l’objet d’une demande d’annulation." });
    }
    const { data: existing } = await supabase.from("subscription_cancellation_requests")
      .select("id").eq("subscription_id", subscriptionId).eq("status", "requested").maybeSingle();
    if (existing) return send(res, 200, { message: "Une demande d’annulation est déjà en cours." });
    const { error } = await supabase.from("subscription_cancellation_requests").insert({
      subscription_id: subscriptionId, user_id: user.id, status: "requested"
    });
    if (error) return send(res, 400, { error: "Impossible d’envoyer la demande : " + error.message });
    return send(res, 201, { message: "Demande envoyée. L’abonnement reste actif jusqu’à confirmation de sa résiliation." });
  }

  return send(res, 400, { error: "Action inconnue." });
}
