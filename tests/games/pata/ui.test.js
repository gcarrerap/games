// Piezas de la mesa de La Pata que se pueden probar sin navegador.
import { test } from "node:test";
import assert from "node:assert/strict";

test("la pata de comodines dice en la mesa si es de puros 2, de puros jokers o mezclada", async () => {
  const { meldChip } = await import("../../../games/pata/ui/svg/meld.js");
  const chip = (cards) => meldChip({ id: 1, kind: "wild", rank: "W", cards });
  assert.match(chip(["2S0", "2H0", "2D0"]), /wild-twos">2</);
  assert.match(chip(["XR0", "XB0", "XR1"]), /wild-jokers">JK</);
  assert.match(chip(["2S0", "XB0", "2D0"]), /wild-mixed">2\+JK</);
  assert.match(chip(["2S0", "XB0", "2D0"]), /de comodines/);
});
