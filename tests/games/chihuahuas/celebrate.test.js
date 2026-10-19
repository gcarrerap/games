// La fiesta: qué evento la abre, y qué sonido va con el movimiento de cada perro. Sin audio ni DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DOGS, newGame, apply } from "../../../games/chihuahuas/engine/index.js";
import { CLIP_KEYS } from "../../../games/chihuahuas/sfx/index.js";
import { soundRole, gather } from "../../../games/chihuahuas/sfx/cues.js";
import {
  MOVES, DOG_SOUNDS, PARKED_CLIPS, PAPEL, CONFETTI, PARTY_MS,
  packSounds, winnerShout, partyFrom, takeParty, partyHears, partySize, celebrationSounds,
} from "../../../games/chihuahuas/sfx/celebrate.js";
import { seededRandom as mulberry32 } from "../../../modules/random/index.js";

const root = new URL("../../../", import.meta.url);

test("cada perro tiene su gesto y un sonido dentro de esa animación", () => {
  assert.deepEqual(Object.keys(MOVES).sort(), DOGS.map((d) => d.id).sort());
  assert.deepEqual(Object.keys(DOG_SOUNDS).sort(), Object.keys(MOVES).sort());
  for (const dog of DOGS) {
    const festejo = MOVES[dog.id].festejo;
    assert.ok(festejo.ms > 1000, dog.id);
    assert.ok(existsSync(fileURLToPath(new URL(`games/chihuahuas/assets/${festejo.file}`, root))));
    assert.ok(existsSync(fileURLToPath(new URL(`games/chihuahuas/assets/${festejo.shadow}`, root))));
    assert.ok(DOG_SOUNDS[dog.id].cues.length >= 1);
    for (const c of DOG_SOUNDS[dog.id].cues) {
      assert.ok(CLIP_KEYS.includes(c.key), c.key);
      assert.ok(c.at >= 0 && c.at < festejo.ms, `${dog.id} ${c.key} @ ${c.at}`);
      assert.ok(!(c.key in PARKED_CLIPS), c.key);
    }
  }
  for (const dog of DOGS) assert.deepEqual(Object.keys(MOVES[dog.id]), ["festejo"], dog.id);
  for (const key of Object.keys(PARKED_CLIPS)) assert.ok(CLIP_KEYS.includes(key));
});

test("el grito nombra al perro, y Catrina lleva artículo", () => {
  assert.equal(winnerShout(4), "¡¡GANÓ LA CATRINA!!");
  assert.equal(winnerShout(0), "¡¡GANÓ CHIA!!");
  assert.equal(winnerShout(1), "¡¡GANÓ OREO!!");
  assert.equal(winnerShout(3), "¡¡GANÓ GUSTAVO!!");
  assert.equal(winnerShout(2), "¡¡GANÓ CHOCOLATE!!");
});

test("los sonidos del festejo no se amontonan: a lo más dos a la vez, y separados", () => {
  const dogs = DOGS.map((d, i) => ({ dog: i, id: d.id, anim: "festejo" }));
  const cues = celebrationSounds({ dogs });
  const times = [...new Set(cues.map((c) => c.at))].sort((a, b) => a - b);
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 200, `${times[i - 1]} y ${times[i]}`);
  for (const t of times) assert.ok(cues.filter((c) => c.at === t).length <= 2);
  for (const dog of DOGS) {
    const key = DOG_SOUNDS[dog.id].cues[0].key;
    assert.ok(cues.some((c) => c.key === key), dog.id);
  }
  assert.ok(cues.some((c) => c.key === "confeti"));
  assert.ok(cues.some((c) => c.key === "nombre-entra"));
  assert.ok(cues.every((c) => c.at < PARTY_MS));
  assert.deepEqual(packSounds([{ key: "a", at: 0 }, { key: "b", at: 0 }, { key: "c", at: 10 }]).map((c) => c.key), ["a", "b"]);
});

test("sale solo cuando un perro llega a la meta, no al cerrar una etapa ni al abrir, reconectar o redibujar", () => {
  let st = newGame({ n: 2, timer: false }, ["Ana", "Bo"], 0, mulberry32(4));
  const rnd = mulberry32(5);
  for (let i = 0; i < 8 && st.phase === "play"; i++) st = apply(st, st.turn, { type: "roll" }, { rnd });
  assert.equal(st.phase, "leg");
  const plan = { key: `leg-${st.summary.leg}` };
  assert.equal(takeParty({ prev: { reveal: null }, st, plan, fxOn: false }), null);
  assert.equal(partyFrom(st, plan.key), null);

  const over = {
    phase: "over",
    summary: { leg: 3, rank: [4, 0, 1, 3, 2] },
    final: { rank: [4, 0, 1, 3, 2] },
  };
  const end = { key: "over-3" };
  assert.equal(takeParty({ prev: null, st: over, plan: end, fxOn: false }), null);
  assert.equal(takeParty({ prev: { reveal: "leg-3" }, st: over, plan: end, fxOn: true }), null);
  const win = takeParty({ prev: { reveal: "leg-3" }, st: over, plan: end, fxOn: false });
  assert.equal(win.kind, "winner");
  assert.equal(win.key, end.key);
  assert.equal(win.winnerId, "catrina");
  assert.equal(win.shout, "¡¡GANÓ LA CATRINA!!");
  assert.deepEqual(win.dogs.map((d) => [d.id, d.anim, d.file, d.shadow]),
    [["catrina", "festejo", "festejo-catrina.webp", "festejo-catrina-sombra.webp"]]);
  // Solo los sonidos del ganador, más el confeti y el letrero
  const mine = new Set(["confeti", "nombre-entra", ...DOG_SOUNDS.catrina.cues.map((c) => c.key)]);
  assert.ok(win.cues.every((c) => mine.has(c.key)), win.cues.map((c) => c.key).join());
  assert.ok(!win.cues.some((c) => c.key.startsWith("ladrido-") && c.key !== "ladrido-doble"));
  assert.equal(takeParty({ prev: { reveal: "over-3" }, st: over, plan: end, fxOn: false }), null);
  assert.equal(takeParty({ prev: { reveal: "leg-3", party: "over-3" }, st: over, plan: end, fxOn: false }), null);
  assert.equal(partyFrom({ phase: "play" }, "x"), null);
});

test("los pagos de la hoja final esperan a que termine la fiesta, y no se repite al redibujar", () => {
  const st = {
    phase: "over", seq: 9, turn: 0, tiles: [], last: { kind: "roll" },
    summary: { leg: 3, rank: [2, 0, 1, 3, 4], bets: [{ got: 5 }], delta: [5, 0] },
    final: { rank: [2, 0, 1, 3, 4], winner: [{ got: 8 }], loser: [] },
  };
  const plan = { key: "over-3", legAt: [1100], winAt: [2000], loseAt: [], end: 2300 };
  const base = { role: "all", st, seat: 0, seats: [], err: "", plan, fxOn: false };
  const prev = { seq: 9, turn: 0, phase: "over", err: "", tiles: [], seats: [], botTurn: false, reveal: "leg-3", party: null };
  // Sale la fiesta: los pagos no suenan y la foto no marca el plan como revelado
  const party = takeParty({ prev, st, plan, fxOn: false });
  assert.ok(party);
  const during = gather({ ...base, prev, hold: true });
  assert.equal(during.cues.length, 0);
  assert.equal(during.snap.reveal, "leg-3");
  during.snap.party = party.key;
  // Redibujar con la fiesta encima: nada nuevo, y la fiesta no vuelve a salir
  assert.equal(takeParty({ prev: during.snap, st, plan, fxOn: false }), null);
  const still = gather({ ...base, prev: during.snap, hold: true });
  assert.equal(still.cues.length, 0);
  // Terminó (o la saltaron): ahora sí la hoja y sus pagos, una sola vez
  assert.equal(takeParty({ prev: still.snap, st, plan, fxOn: false }), null);
  const after = gather({ ...base, prev: still.snap, hold: false });
  assert.deepEqual(after.cues.map((c) => c.key), ["fin-carrera", "pago-ganar", "pago-ganar"]);
  assert.equal(after.snap.reveal, "over-3");
  assert.equal(gather({ ...base, prev: after.snap }).cues.length, 0);
});

test("la tele oye la fiesta completa y el teléfono de una mesa con tele no", () => {
  assert.equal(partyHears(soundRole("tv", true)), true);
  assert.equal(partySize(soundRole("tv", true)), "full");
  assert.equal(partyHears(soundRole("full", false)), true);
  assert.equal(partySize(soundRole("full", false)), "full");
  assert.equal(partyHears(soundRole("phone", true)), false);
  assert.equal(partySize(soundRole("phone", true)), "mini");
  assert.equal(partyHears(soundRole("full", true)), false);
  assert.equal(CONFETTI.reduced < CONFETTI.mini && CONFETTI.mini < CONFETTI.full, true);
  assert.equal(PAPEL.length, 6);
});

test("la pieza, los efectos nuevos y la fuente caben en 500 KB, con licencia", () => {
  const extra = ["celebracion-musica", "aullido-festejo", "ladrido-doble", "grunido-feliz", "brinco", "confeti", "nombre-entra"];
  let bytes = 0;
  for (const key of extra) bytes += statSync(fileURLToPath(new URL(`games/chihuahuas/sfx/${key}.mp3`, root))).size;
  const font = fileURLToPath(new URL("games/chihuahuas/fonts/LilitaOne-Regular.woff2", root));
  const ofl = readFileSync(fileURLToPath(new URL("games/chihuahuas/fonts/OFL.txt", root)), "utf8");
  bytes += statSync(font).size;
  assert.ok(bytes < 500 * 1024, `${bytes} bytes`);
  assert.match(ofl, /SIL Open Font License, Version 1\.1/);
  assert.match(ofl, /Juan Montoreano/);
  const css = readFileSync(fileURLToPath(new URL("games/chihuahuas/styles/table.css", root)), "utf8");
  const ui = readFileSync(fileURLToPath(new URL("games/chihuahuas/ui/party.js", root)), "utf8");
  assert.match(css, /Lilita One/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /playCue/);
  assert.match(ui, /Escape/);
});
