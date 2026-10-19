// Efectos de la Carrera: los archivos, y qué llave corresponde a cada evento (sin audio).
// La tele suena lo público; el teléfono de una mesa con tele, solo lo suyo. Redibujar no repite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { canRepeat } from "../../../modules/sfx/index.js";
import { DOGS, RULES, SHOW, newGame, apply } from "../../../games/chihuahuas/engine/index.js";
import { CLIP_KEYS, CLIPS, gapFor } from "../../../games/chihuahuas/sfx/index.js";
import { barkKey, soundRole, rollCues, actionCues, revealCues, gather } from "../../../games/chihuahuas/sfx/cues.js";
import { seededRandom as mulberry32 } from "../../../modules/random/index.js";

const prompts = JSON.parse(readFileSync(new URL("../../../games/chihuahuas/sfx/prompts.json", import.meta.url), "utf8"));
const MAX_TOTAL = 1024 * 1024;

test("cada llave de prompts.json tiene su mp3, y al revés; juntos pesan menos de 1 MB", () => {
  assert.deepEqual([...CLIP_KEYS].sort(), Object.keys(prompts).sort());
  let total = 0;
  for (const key of CLIP_KEYS) {
    const href = CLIPS[key];
    const file = fileURLToPath(href);
    assert.ok(file.endsWith(`/sfx/${key}.mp3`), file);
    assert.ok(existsSync(file), `falta ${key}.mp3`);
    const p = prompts[key];
    assert.equal(typeof p.prompt, "string");
    assert.ok(p.prompt.length > 0);
    const cap = key === "celebracion-musica" ? 8 : 2;
    assert.ok(p.duration > 0 && p.duration <= cap, key);
    total += statSync(file).size;
  }
  assert.ok(total <= MAX_TOTAL, `los efectos pesan ${total} bytes`);
  for (const dog of DOGS) {
    assert.equal(barkKey(DOGS.indexOf(dog)), `ladrido-${dog.id}`);
    assert.ok(CLIP_KEYS.includes(`ladrido-${dog.id}`));
  }
});

test("el script de generación lee prompts.json y ELEVENLABS_API_KEY, sin la llave escrita", () => {
  const src = readFileSync(new URL("../../../games/chihuahuas/sfx/generate.mjs", import.meta.url), "utf8");
  assert.match(src, /prompts\.json/);
  assert.match(src, /process\.env\.ELEVENLABS_API_KEY/);
  assert.match(src, /\/v1\/sound-generation/);
  assert.match(src, /--key/);
  assert.doesNotMatch(src, /xi-api-key["']\s*,\s*["'][A-Za-z0-9]{8,}/);
});

test("la tele suena lo público, el teléfono lo local, y una mesa con tele no se oye doble en quien mira", () => {
  assert.equal(soundRole("tv", true), "board");
  assert.equal(soundRole("phone", true), "hand");
  assert.equal(soundRole("full", true), "hand");
  assert.equal(soundRole("full", false), "all");
});

function spacesOf(pairs) {
  const spaces = Array.from({ length: RULES.track + 5 }, () => []);
  for (const [s, dogs] of pairs) spaces[s] = dogs.slice();
  return spaces;
}

test("una tirada: tazón, ladrido del perro, un pasito por casilla, y no se pisan", () => {
  const last = { kind: "roll", dog: 0, n: 2, from: 3, fromLevel: 0, to: 5, landed: 5, carried: [], tile: null };
  const cues = rollCues(last, spacesOf([[5, [0]]]));
  const keys = cues.map((c) => c.key);
  assert.ok(keys.includes("tazon-sacudir"));
  assert.ok(keys.includes("ladrido-chia"));
  assert.ok(keys.includes("croqueta-ganar"));
  const steps = cues.filter((c) => c.key === "pasitos");
  assert.equal(steps.length, 2);
  assert.equal(steps[1].at - steps[0].at, SHOW.step);
  for (let i = 1; i < steps.length; i++) assert.equal(canRepeat(steps[i - 1].at, steps[i].at, gapFor("pasitos")), true);
  assert.ok(gapFor("pasitos") < SHOW.step);
  assert.ok(!keys.includes("apilar"));
  assert.ok(!keys.includes("meta"));
});

test("hueso, aspiradora, apilar y la meta usan su propio efecto", () => {
  const bone = rollCues(
    { kind: "roll", dog: 1, n: 1, from: 3, to: 5, landed: 4, carried: [], tile: { seat: 0, space: 4, kind: "hueso" } },
    spacesOf([[5, [1]]]),
  );
  assert.ok(bone.some((c) => c.key === "caer-hueso"));
  assert.ok(bone.some((c) => c.key === "ladrido-oreo"));
  assert.equal(bone.filter((c) => c.key === "pasitos").length, 1);
  assert.ok(bone.filter((c) => c.key === "croqueta-ganar").length >= 2);

  const vac = rollCues(
    { kind: "roll", dog: 4, n: 1, from: 3, to: 3, landed: 4, carried: [2], tile: { seat: 1, space: 4, kind: "aspiradora" } },
    spacesOf([[3, [4, 2, 0]]]),
  );
  assert.ok(vac.some((c) => c.key === "caer-aspiradora"));
  assert.ok(vac.some((c) => c.key === "ladrido-catrina"));
  assert.ok(vac.some((c) => c.key === "apilar"));
  assert.ok(!vac.some((c) => c.key === "caer-hueso"));

  const pile = rollCues(
    { kind: "roll", dog: 3, n: 1, from: 2, to: 3, landed: 3, carried: [], tile: null },
    spacesOf([[3, [1, 3]]]),
  );
  assert.ok(pile.some((c) => c.key === "apilar"));
  assert.ok(pile.some((c) => c.key === "ladrido-gustavo"));

  const finish = rollCues(
    { kind: "roll", dog: 2, n: 2, from: 15, to: 17, landed: 17, carried: [], tile: null },
    spacesOf([[17, [2]]]),
  );
  assert.ok(finish.some((c) => c.key === "meta"));
  assert.ok(finish.some((c) => c.key === "ladrido-chocolate"));
});

test("boleto, tapete nuevo, tapete movido y apuesta secreta", () => {
  assert.deepEqual(actionCues({ kind: "ticket", seat: 0, dog: 1, value: 5 }, []), [{ key: "boleto-tomar", at: 0 }]);
  assert.deepEqual(actionCues({ kind: "final", seat: 0, which: "winner", dog: 2 }, []), [{ key: "apuesta-secreta", at: 0 }]);
  assert.deepEqual(actionCues({ kind: "tile", seat: 1, space: 8, tileKind: "hueso" }, []), [{ key: "tapete-hueso", at: 0 }]);
  assert.deepEqual(
    actionCues({ kind: "tile", seat: 1, space: 10, tileKind: "aspiradora" }, [{ seat: 1, space: 8, kind: "hueso" }]),
    [{ key: "tapete-mover", at: 0 }],
  );
  assert.deepEqual(
    actionCues({ kind: "tile", seat: 0, space: 6, tileKind: "aspiradora" }, [{ seat: 1, space: 8, kind: "hueso" }]),
    [{ key: "aspiradora-poner", at: 0 }],
  );
});

test("los pagos de la etapa y el ganador de la carrera", () => {
  const leg = {
    phase: "leg",
    summary: { bets: [{ got: 5 }, { got: -1 }, { got: 0 }] },
  };
  const plan = { key: "leg-1", legAt: [1000, 1600, 2200], winAt: [], loseAt: [], end: 3000 };
  assert.deepEqual(revealCues(leg, plan).map((c) => c.key), ["fin-etapa", "pago-ganar", "pago-perder", "pago-perder"]);
  const over = {
    phase: "over",
    summary: { bets: [{ got: 3 }] },
    final: { winner: [{ got: 8 }], loser: [{ got: -1 }] },
  };
  const end = { key: "over-1", legAt: [1000], winAt: [2000], loseAt: [2600], end: 4000 };
  const keys = revealCues(over, end).map((c) => c.key);
  assert.deepEqual(keys, ["fin-carrera", "pago-ganar", "pago-ganar", "pago-perder"]);
  assert.ok(!keys.includes("ganador"));
});

const HUMANS = [{ id: "ana", name: "Ana" }, { id: "bo", name: "Bo" }];

function open(st, seat, seats, role) {
  return gather({ role, prev: null, st, seat, seats, err: "", plan: null, fxOn: false });
}

test("al abrir o reconectar no suena; la jugada nueva sí, y redibujar no la repite", () => {
  let st = newGame({ n: 2, timer: false }, ["Ana", "Bo"], 0, mulberry32(1));
  const first = open(st, 0, HUMANS, "all");
  assert.deepEqual(first.cues, []);
  st = apply(st, 0, { type: "roll" }, { rnd: mulberry32(2) });
  const heard = gather({ role: "all", prev: first.snap, st, seat: 0, seats: HUMANS, err: "", plan: null, fxOn: true });
  assert.ok(heard.cues.some((c) => c.key === "tazon-sacudir"));
  assert.ok(heard.cues.some((c) => c.key === barkKey(st.last.dog)));
  const again = gather({ role: "all", prev: heard.snap, st, seat: 0, seats: HUMANS, err: "", plan: null, fxOn: true });
  assert.deepEqual(again.cues, []);
});

test("con tele, la tirada suena en la tele y «te toca» solo en el teléfono de quien sigue", () => {
  let st = newGame({ n: 2, timer: false }, ["Ana", "Bo"], 0, mulberry32(3));
  const prev = open(st, 0, HUMANS, "all").snap;
  st = apply(st, 0, { type: "ticket", dog: 0 }, { rnd: mulberry32(4) });
  const tv = gather({ role: "board", prev, st, seat: -1, seats: HUMANS, err: "", plan: null, fxOn: false });
  assert.deepEqual(tv.cues.map((c) => c.key), ["boleto-tomar"]);
  const phone = gather({ role: "hand", prev, st, seat: 1, seats: HUMANS, err: "", plan: null, fxOn: false });
  assert.deepEqual(phone.cues.map((c) => c.key), ["te-toca"]);
  const mine = gather({ role: "hand", prev, st, seat: 0, seats: HUMANS, err: "", plan: null, fxOn: false });
  assert.deepEqual(mine.cues, []);
});

test("la compu tiene su aviso, el error solo suena en el aparato de quien jugó, y un asiento nuevo también", () => {
  let st = newGame({ n: 2, timer: false }, ["Ana", "Bo"], 0, mulberry32(5));
  const seats = [{ id: "ana", name: "Ana" }, { bot: true, profile: "normal", name: "Bo" }];
  const prev = open(st, 0, seats, "all").snap;
  st = apply(st, 0, { type: "roll" }, { rnd: mulberry32(6) });
  const tv = gather({ role: "board", prev, st, seat: -1, seats, err: "", plan: null, fxOn: true });
  assert.ok(tv.cues.some((c) => c.key === "turno-compu"));
  assert.ok(!tv.cues.some((c) => c.key === "te-toca"));
  assert.ok(tv.cues.find((c) => c.key === "turno-compu").at > 0);
  const phone = gather({ role: "hand", prev, st, seat: 0, seats, err: "No es tu turno.", plan: null, fxOn: true });
  assert.ok(phone.cues.some((c) => c.key === "error"));
  assert.ok(!phone.cues.some((c) => c.key === "tazon-sacudir"));
  const again = gather({ role: "hand", prev: phone.snap, st, seat: 0, seats, err: "No es tu turno.", plan: null, fxOn: true });
  assert.deepEqual(again.cues, []);

  const left = seats.map((s, i) => (i === 1 ? null : s));
  const bye = gather({ role: "board", prev: again.snap, st, seat: -1, seats: left, err: "", plan: null, fxOn: false });
  assert.ok(bye.cues.some((c) => c.key === "jugador-sale"));
  const back = gather({ role: "board", prev: bye.snap, st, seat: -1, seats, err: "", plan: null, fxOn: false });
  assert.ok(back.cues.some((c) => c.key === "jugador-entra"));
  const quiet = gather({ role: "hand", prev: bye.snap, st, seat: 0, seats, err: "", plan: null, fxOn: false });
  assert.deepEqual(quiet.cues, []);
});

test("la salida de una revancha ladra una vez por perro; al terminarse la animación suenan los pagos y no antes", () => {
  const fresh = newGame({ n: 2, timer: false }, ["Ana", "Bo"], 0, mulberry32(7));
  const prev = { seq: 3, turn: 1, phase: "over", err: "", tiles: [], seats: ["id:ana", "id:bo"], botTurn: false, reveal: "over-1" };
  const barks = gather({ role: "all", prev, st: fresh, seat: 0, seats: HUMANS, err: "", plan: null, fxOn: false });
  const heard = barks.cues.filter((c) => c.key.startsWith("ladrido-")).map((c) => c.key);
  assert.equal(heard.length, DOGS.length);
  assert.equal(new Set(heard).size, DOGS.length);
  const tv = gather({ role: "board", prev, st: fresh, seat: -1, seats: HUMANS, err: "", plan: null, fxOn: false });
  assert.ok(tv.cues.every((c) => c.key.startsWith("ladrido-")));

  let st = newGame({ n: 2, timer: false }, ["Ana", "Bo"], 0, mulberry32(8));
  let snap = open(st, 0, HUMANS, "all").snap;
  const rnd = mulberry32(9);
  for (let i = 0; i < 20 && st.phase === "play"; i++) {
    const seat = st.turn;
    st = apply(st, seat, { type: "roll" }, { rnd });
    const g = gather({ role: "all", prev: snap, st, seat: 0, seats: HUMANS, err: "", plan: st.phase === "leg" ? { key: "leg-1", legAt: [], end: 0 } : null, fxOn: true });
    snap = g.snap;
    if (st.phase === "leg") assert.ok(!g.cues.some((c) => c.key === "fin-etapa"));
  }
  assert.equal(st.phase, "leg");
  const plan = { key: `leg-${st.leg}`, legAt: (st.summary.bets || []).map((_, i) => 1000 + i * 500), end: 2000 };
  const paying = gather({ role: "board", prev: snap, st, seat: -1, seats: HUMANS, err: "", plan, fxOn: false });
  assert.equal(paying.cues[0].key, "fin-etapa");
  assert.ok(paying.cues.every((c) => c.key === "fin-etapa" || c.key === "pago-ganar" || c.key === "pago-perder"));
  const redraw = gather({ role: "board", prev: paying.snap, st, seat: -1, seats: HUMANS, err: "", plan, fxOn: false });
  assert.deepEqual(redraw.cues, []);
});
