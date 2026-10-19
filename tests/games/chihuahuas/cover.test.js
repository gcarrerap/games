// La portada al empezar una partida (#56): cuándo se muestra, qué imagen usa y que el primer turno cuente su tiempo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { coverWanted, coverKey } from "../../../games/chihuahuas/ui/cover.js";
import { COVER_MS, startMs, introMs } from "../../../games/chihuahuas/timing.js";
import { BANK } from "../../../games/chihuahuas/assets/bank.js";
import game from "../../../games/chihuahuas/index.js";
import { RULES, ND } from "../../../games/chihuahuas/engine/index.js";

const rnd = (() => { let x = 7; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); })();

test("partida nueva: al abrir la mesa sin que nadie haya movido, sí", () => {
  assert.equal(coverWanted({ first: true, seq: 0, round: 1, seenRound: undefined }), true);
});

test("mesa a medias (recargar, reabrir por enlace, regresar de otra pantalla): no", () => {
  assert.equal(coverWanted({ first: true, seq: 7, round: 1, seenRound: undefined }), false);
});

test("revancha: otra ronda en la misma mesa, sí", () => {
  assert.equal(coverWanted({ first: false, seq: 0, round: 2, seenRound: 1 }), true);
});

test("entre jugadas o etapas de la misma partida: no", () => {
  assert.equal(coverWanted({ first: false, seq: 12, round: 1, seenRound: 1 }), false);
  assert.equal(coverWanted({ first: false, seq: 0, round: 1, seenRound: 1 }), false);
});

test("la tele pide la portada en alta; el teléfono y la mesa de siempre, la chica", () => {
  assert.equal(coverKey("tv"), "portada@tv");
  assert.equal(coverKey("phone"), "portada");
  assert.equal(coverKey("full"), "portada");
  assert.ok(BANK["portada@tv"] && BANK.portada && BANK["portada@tv"].href !== BANK.portada.href);
});

test("el primer turno cuenta la portada y la salida; los demás no", () => {
  assert.ok(COVER_MS >= 2500 && COVER_MS <= 3500);
  assert.ok(startMs(ND) > COVER_MS + introMs(ND) - 1);
  const st = game.setup({ n: 4, timer: true }, { now: 0, rnd });
  assert.equal(st.seq, 0);
  assert.equal(game.timing.turnMs(st), RULES.turnMs + startMs(ND));
  const v = game.view(st, 0);
  assert.ok(game.bots.thinkMs(v) >= startMs(ND), "la compu espera a que se quite la portada");
  const seat = game.currentSeats(st)[0];
  const after = game.apply(st, seat, { type: "roll" }, { now: 1, rnd });
  assert.equal(game.timing.turnMs(after), RULES.turnMs);
  assert.ok(game.bots.thinkMs(game.view(after, 0)) < startMs(ND));
});
