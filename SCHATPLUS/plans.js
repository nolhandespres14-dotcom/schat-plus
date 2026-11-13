export const PLAN_CATALOG = [
  { code: "V1", name: "V1 — Gratuit", monthlyPriceCents: 0, currency: "CAD", interval: "month", description: "Découvrir schat+ sans frais.", paid: false },
  { code: "V2", name: "V2", monthlyPriceCents: 2000, currency: "CAD", interval: "month", description: "Offre schat+ à 20 $ CA par mois.", paid: true },
  { code: "V3", name: "V3 — Emergent", monthlyPriceCents: 3000, currency: "CAD", interval: "month", description: "Offre schat+ Emergent à 30 $ CA par mois.", paid: true },
  { code: "V4", name: "V4 — Lovable", monthlyPriceCents: 4000, currency: "CAD", interval: "month", description: "Offre schat+ Lovable à 40 $ CA par mois.", paid: true },
  { code: "V5", name: "V5 — SCHAT+ MASTER", monthlyPriceCents: 5000, currency: "CAD", interval: "month", description: "Offre complète SCHAT+ MASTER à 50 $ CA par mois.", paid: true }
];

export function getPlan(code) {
  return PLAN_CATALOG.find((plan) => plan.code === code) || null;
}

export function formatPlanPrice(plan) {
  if (!plan || plan.monthlyPriceCents === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: plan.currency,
    maximumFractionDigits: 0
  }).format(plan.monthlyPriceCents / 100) + " / mois";
}
