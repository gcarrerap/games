// La fiesta: qué evento la abre, y qué sonido va con el movimiento de cada perro. Sin audio ni DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DOGS, newGame, apply } from "../../../games/chihuahuas/engine/index.js";
import { CLIP_KEYS } from "../../../games/chihuahuas/sfx/index.js";
import { soundRole } from "../../../games/chihuahuas/sfx/cues.js";
import {
  MOVES, DOG_SOUNDS, STUMBLE_SOUNDS, PARKED_CLIPS, PAPEL, CONFETTI, PARTY_MS,
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
  for (const c of STUMBLE_SOUNDS.cues) {
    assert.ok(CLIP_KEYS.includes(c.key));
    assert.ok(c.at >= 0 && c.at < MOVES.catrina.tropiezo.ms);
  }
  assert.ok(existsSync(fileURLToPath(new URL("games/chihuahuas/assets/tropiezo-catrina.webp", root))));
  for (const key of Object.keys(PARKED_CLIPS)) assert.ok(CLIP_KEYS.includes(key));
});

test("el grito nombra al perro, y Catrina lleva artículo", () => {
  assert.equal(winnerShout(4, "over"), "¡¡GANÓ LA CATRINA!!");
  assert.equal(winnerShout(0, "over"), "¡¡GANÓ CHIA!!");
  assert.equal(winnerShout(1, "leg"), "¡¡OREO GANÓ LA ETAPA!!");
  assert.equal(winnerShout(3, "over"), "¡¡GANÓ GUSTAVO!!");
  assert.equal(winnerShout(2, "leg"), "¡¡CHOCOLATE GANÓ LA ETAPA!!");
});

test("la fiesta no amontona sonidos: a lo más dos a la vez, y separados", () => {
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

test("se dispara al revelar la etapa o al ganador, no al abrir, reconectar, redibujar o a media tirada", () => {
  let st = newGame({ n: 2, timer: false }, ["Ana", "Bo"], 0, mulberry32(4));
  const rnd = mulberry32(5);
  for (let i = 0; i < 8 && st.phase === "play"; i++) st = apply(st, st.turn, { type: "roll" }, { rnd });
  assert.equal(st.phase, "leg");
  const plan = { key: `leg-${st.summary.leg}` };
  assert.equal(takeParty({ prev: null, st, plan, fxOn: false }), null);
  assert.equal(takeParty({ prev: { reveal: null }, st, plan, fxOn: true }), null);
  const party = takeParty({ prev: { reveal: null }, st, plan, fxOn: false });
  assert.equal(party.kind, "leg");
  assert.equal(party.key, plan.key);
  assert.equal(party.winner, st.summary.rank[0]);
  assert.equal(party.shout, winnerShout(party.winner, "leg"));
  assert.ok(party.dogs.every((d) => d.anim === "festejo"));
  assert.equal(takeParty({ prev: { reveal: plan.key }, st, plan, fxOn: false }), null);

  const over = {
    phase: "over",
    summary: { leg: 3, rank: [2, 0, 1, 3, 4] },
    final: { rank: [2, 0, 1, 3, 4] },
  };
  const end = { key: "over-3" };
  const win = takeParty({ prev: { reveal: "leg-3" }, st: over, plan: end, fxOn: false });
  assert.equal(win.kind, "winner");
  assert.equal(win.winnerId, "chocolate");
  assert.equal(win.shout, "¡¡GANÓ CHOCOLATE!!");
  assert.equal(win.dogs.find((d) => d.id === "catrina").anim, "tropiezo");
  const stumble = win.cues.filter((c) => c.key === "apilar" || c.key === "ladrido-doble");
  assert.ok(stumble.length >= 2);
  assert.equal(takeParty({ prev: { reveal: "over-3" }, st: over, plan: end, fxOn: false }), null);
  assert.equal(partyFrom({ phase: "play" }, "x"), null);
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
