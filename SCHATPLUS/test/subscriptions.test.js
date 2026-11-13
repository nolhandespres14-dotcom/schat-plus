import test from "node:test";
import assert from "node:assert/strict";
import { PLAN_CATALOG, getPlan, formatPlanPrice } from "../plans.js";

test("le catalogue contient exactement les cinq offres attendues", () => {
  assert.deepEqual(PLAN_CATALOG.map((plan) => plan.code), ["V1", "V2", "V3", "V4", "V5"]);
});

test("les tarifs sont exprimés en dollars canadiens par mois", () => {
  assert.deepEqual(PLAN_CATALOG.map((plan) => plan.monthlyPriceCents), [0, 2000, 3000, 4000, 5000]);
  assert.ok(PLAN_CATALOG.every((plan) => plan.currency === "CAD" && plan.interval === "month"));
});

test("seule V1 est gratuite", () => {
  assert.equal(PLAN_CATALOG.filter((plan) => !plan.paid).map((plan) => plan.code).join(","), "V1");
  assert.equal(formatPlanPrice(getPlan("V1")), "Gratuit");
});

test("une offre inconnue ne peut pas être sélectionnée", () => {
  assert.equal(getPlan("V99"), null);
});
