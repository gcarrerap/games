import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import game from "../../../games/geografia/index.js";
import manifest from "../../../games/geografia/manifest.js";
import { COUNTRIES, TERRITORIES, BY_CODE, CONTINENTS, LEVELS, REGIONS, GAMES, ROUNDS, poolFor, shapeOk, sameFlag, search, exact, normalize, RANK } from "../../../games/geografia/engine/catalog.js";
import * as G from "../../../games/geografia/engine/geo.js";
import { setup, apply, legalActions, view, result, normalizeConfig, pinPoints, toleranceKm, question, POINTS, LIMITS_MS, advise } from "../../../games/geografia/engine/index.js";
import { knows, decide, STYLES } from "../../../games/geografia/ai/index.js";
import { seededRandom } from "../../../modules/random/index.js";
import { playGame } from "../../../modules/tournament/index.js";

const ctx = (seed = 1) => ({ rnd: seededRandom(seed), now: 0 });
const fresh = (cfg = {}, seed = 1) => setup({ n: 1, ...cfg }, ctx(seed));
const FLAGS = new URL("../../../games/geografia/assets/flags/", import.meta.url);

// ───────── Datos
test("hay 197 países (193 de la ONU + Vaticano, Palestina, Kosovo y Taiwán), todos con geometría y bandera", () => {
  assert.equal(COUNTRIES.length, 197);
  assert.equal(new Set(COUNTRIES.map((c) => c.code)).size, 197);
  for (const c of COUNTRIES) {
    assert.ok(G.geometry(c.code)?.polys.length > 0, `${c.code} sin geometría`);
    assert.ok(existsSync(new URL(`${c.code.toLowerCase()}.svg`, FLAGS)), `${c.code} sin bandera`);
    assert.ok(CONTINENTS.some((k) => k.id === c.cont), `${c.code}: continente ${c.cont}`);
    assert.ok(c.name && Number.isInteger(c.color));
  }
  for (const code of ["VA", "PS", "XK", "TW"]) assert.ok(BY_CODE[code]);
  assert.ok(TERRITORIES.length > 30);
  for (const t of TERRITORIES) assert.ok(G.geometry(t.code), t.code);
});

test("el centro de cada país queda a menos de 700 km de su geometría (si no, el código estaría mal asignado)", () => {
  for (const c of COUNTRIES) assert.ok(G.distanceKm(c.code, c.ll[1], c.ll[0]) < 700, `${c.code} ${c.name}`);
});

test("cada país cae donde debe: dentro de sí mismo y no de su vecino", () => {
  const spots = { MX: [-99.13, 19.43], US: [-100, 40], BR: [-47.9, -15.8], FR: [2.35, 48.85], FJ: [178, -17.8], MT: [14.4, 35.9], JP: [139.7, 35.7], AU: [149.1, -35.3], RU: [37.6, 55.75], LS: [28.2, -29.5], SG: [103.82, 1.35], CL: [-70.6, -33.4] };
  for (const [code, [lon, lat]] of Object.entries(spots)) {
    assert.ok(G.contains(code, lon, lat), `${code} debería contener ${lon},${lat}`);
    assert.equal(G.distanceKm(code, lon, lat), 0);
  }
  assert.ok(G.distanceKm("TV", 179.2, -8.52) < 5, "Funafuti, Tuvalu");
  assert.ok(!G.contains("ZA", 28.2, -29.5), "Lesoto es un hueco de Sudáfrica");
  assert.ok(!G.contains("MX", -80, 40));
  assert.equal(G.countryAt(-30, 0), null, "mar abierto");
  assert.equal(G.countryAt(-99.13, 19.43), "MX");
  assert.ok(G.contains("MX", -99.13 + 360, 19.43), "la longitud se acomoda a ±180");
});

test("distancias: cerca y lejos dan kilómetros razonables", () => {
  assert.ok(Math.abs(G.haversineKm(0, 0, 0, 1) - 111.2) < 1);
  const lon = G.distanceKm("FR", -0.12, 51.5); // Londres a Francia: unos 140 km a la costa
  assert.ok(lon > 100 && lon < 200, String(lon));
  const far = G.distanceKm("ES", -77, -12); // Lima a España
  assert.ok(far > 6500 && far < 8500, String(far));
});

test("la silueta deja fuera islas lejanas pero mantiene el país completo", () => {
  assert.equal(G.mainland("US").length, 1, "Estados Unidos: solo el territorio contiguo");
  assert.ok(G.mainland("FR").length >= 1 && G.mainland("FR").length < G.geometry("FR").polys.length);
  assert.ok(G.mainland("ID").length > 10, "Indonesia conserva sus islas");
  assert.ok(G.mainland("JP").length >= 4);
  const box = G.mainlandBox("RU");
  assert.ok(box.box[2] - box.box[0] < 200, "Rusia no abarca medio mundo");
  assert.ok(box.box[2] > 180, "el extremo oriental de Rusia se acomoda junto al resto");
  for (const code of ["RU", "FJ", "AQ"]) for (const p of G.geometry(code).polys) assert.ok(p.box[0] >= -180 && p.box[2] <= 180, `${code} cruza el 180°`);
});

test("Tierra Igual: ida y vuelta", () => {
  for (const [lon, lat] of [[0, 0], [170, 80], [-170, -60], [45, -30], [-99, 19], [179.9, 0]]) {
    const [x, y] = G.equalEarth(lon, lat), [lo, la] = G.equalEarthInvert(x, y);
    assert.ok(Math.abs(lo - lon) < 1e-6 && Math.abs(la - lat) < 1e-6, `${lon},${lat} → ${lo},${la}`);
  }
  assert.ok(Math.abs(G.EQUAL_EARTH_BOUNDS.x - 2.7066) < 1e-3 && Math.abs(G.EQUAL_EARTH_BOUNDS.y - 1.3174) < 1e-3);
  const f = G.lambertAzimuthal(10, 50);
  assert.deepEqual(f(10, 50).map((v) => Math.abs(v) < 1e-9), [true, true]);
});

// ───────── Catálogo
test("niveles y regiones: los grupos son de buen tamaño y se abren más países si faltan", () => {
  const sizes = LEVELS.map((l) => poolFor({ level: l.id }).length);
  assert.deepEqual(sizes.slice(0, 2), [60, FAME_MEDIUM()]);
  assert.equal(sizes[2], 197); assert.equal(sizes[3], 197);
  for (const r of REGIONS) assert.ok(poolFor({ level: "facil", region: r.id, need: 12 }).length >= Math.min(12, poolFor({ level: "experto", region: r.id }).length), r.id);
  assert.ok(poolFor({ level: "dificil", kind: "shape" }).every(shapeOk));
  assert.ok(!poolFor({ level: "dificil", kind: "shape" }).includes("VA"));
  assert.ok(RANK.US < RANK.MX && RANK.AR < RANK.LI);
});
function FAME_MEDIUM() { return poolFor({ level: "medio" }).length; }

test("buscador de nombres: sin acentos, por alias y por palabras", () => {
  assert.equal(exact("mexico"), "MX"); assert.equal(exact("EE. UU."), "US"); assert.equal(exact("Holanda"), "NL");
  assert.equal(search("esp")[0], "ES"); assert.equal(search("Mexico")[0], "MX");
  assert.ok(search("unidos").includes("US") && search("unidos").includes("AE"));
  assert.ok(search("per").includes("PE")); assert.equal(search("")[0], undefined);
  assert.equal(normalize("  Côte d'Ivoire "), "cote d ivoire");
  assert.ok(search("congo").includes("CD") && search("congo").includes("CG"));
});

test("el manifiesto coincide con el catálogo", () => {
  const opt = (id) => manifest.options.find((o) => o.id === id).choices.map((c) => c.id);
  assert.deepEqual([...opt("game")].sort(), GAMES.map((g) => g.id).sort());
  assert.deepEqual(opt("level"), LEVELS.map((l) => l.id));
  assert.deepEqual(opt("region"), REGIONS.map((r) => r.id));
  assert.deepEqual(opt("rounds"), ROUNDS.map(String));
  assert.equal(manifest.modes.at(-1).id, "1", "la plataforma empieza con el último modo: Solo");
});

// ───────── Preguntas
test("setup es reproducible y arma las preguntas de cada clase", () => {
  for (const g of ["continentes", "siluetas", "mapa", "banderas", "mezcla"]) for (const level of ["facil", "medio", "dificil", "experto"]) {
    const a = fresh({ game: g, level, rounds: "10" }, 5), b = fresh({ game: g, level, rounds: "10" }, 5);
    assert.deepEqual(a, b); assert.equal(a.questions.length, 10);
    assert.doesNotThrow(() => JSON.stringify(a));
    for (const q of a.questions) {
      assert.ok(BY_CODE[q.code]);
      if (q.t === "shape") assert.ok(shapeOk(q.code), `${q.code} no es para silueta`);
      if (q.t === "shape" || q.t === "flag") {
        if (level === "experto") assert.equal(q.opts, null);
        else {
          assert.equal(q.opts.length, level === "dificil" ? 6 : 4); assert.equal(new Set(q.opts).size, q.opts.length);
          assert.ok(q.opts.includes(q.code));
          if (q.t === "flag") for (const x of q.opts) for (const y of q.opts) if (x !== y) assert.ok(!sameFlag(x, y), `${x} y ${y} se confunden`);
        }
      }
    }
    if (g !== "mezcla") assert.ok(a.questions.every((q) => q.t === { continentes: "cont", siluetas: "shape", mapa: "pin", banderas: "flag" }[g]));
    else assert.equal(new Set(a.questions.map((q) => q.t)).size, 4);
    const seen = a.questions.filter((q) => q.t === a.questions[0].t).map((q) => q.code);
    assert.equal(new Set(seen).size, seen.length, "sin países repetidos en una misma clase");
  }
});

test("la región y el nivel limitan los países; el pin alterna con y sin fronteras", () => {
  const eu = fresh({ game: "banderas", region: "europa", level: "facil", rounds: "10" }, 3);
  assert.ok(eu.questions.every((q) => BY_CODE[q.code].cont === "europa"));
  const easy = fresh({ game: "banderas", level: "facil", rounds: "20" }, 3);
  assert.ok(easy.questions.every((q) => RANK[q.code] < 60));
  const pins = fresh({ game: "mapa", borders: "alterna", rounds: "10" }, 3).questions.map((q) => q.borders);
  assert.ok(pins.some((b) => b) && pins.some((b) => !b));
  assert.ok(fresh({ game: "mapa", borders: "con" }).questions.every((q) => q.borders));
  assert.ok(fresh({ game: "mapa", borders: "sin" }).questions.every((q) => !q.borders));
  const cont = fresh({ game: "continentes", region: "oceania", rounds: "20" }, 3);
  assert.ok(new Set(cont.questions.map((q) => BY_CODE[q.code].cont)).size > 3, "en continentes la región no cuenta");
  assert.equal(normalizeConfig({ n: 9, game: "x", level: "y", rounds: 7 }).n, 4);
  assert.equal(normalizeConfig({ rounds: "30" }).rounds, 30);
  assert.equal(normalizeConfig({}).timer, true);
});

test("cada jugador responde las mismas preguntas y por turnos", () => {
  const st = fresh({ n: 3, rounds: "5", game: "banderas" }, 2);
  assert.equal(st.questions.length, 15);
  let s = st;
  for (let i = 0; i < 15; i++) {
    assert.equal(s.turn, i % 3); assert.deepEqual(game.currentSeats(s), [i % 3]);
    assert.throws(() => apply(s, (i + 1) % 3, { type: "answer", skip: true }), /turno/);
    s = apply(s, i % 3, { type: "answer", skip: true });
    assert.equal(s.phase, "reveal"); assert.deepEqual(legalActions(s, i % 3), [{ type: "next" }]);
    s = apply(s, i % 3, { type: "next" });
  }
  assert.ok(game.isOver(s)); assert.deepEqual(game.currentSeats(s), []);
  assert.throws(() => apply(s, 0, { type: "next" }), /terminó/);
});

// ───────── Responder
const rig = (q, extra = {}) => { const st = fresh({ game: "banderas", level: "facil", rounds: "10", ...extra }, 4); st.questions[0] = { ...st.questions[0], ...q }; return st; };

test("continentes: acierta, falla y acepta el otro continente de un país en dos", () => {
  const st = rig({ t: "cont", code: "BR", opts: undefined });
  const ok = apply(st, 0, { type: "answer", pick: "sudamerica" });
  assert.equal(ok.last.ok, true); assert.equal(ok.scores[0], 100); assert.equal(ok.hits[0], 1);
  assert.equal(apply(st, 0, { type: "answer", pick: "europa" }).last.ok, false);
  assert.throws(() => apply(st, 0, { type: "answer", pick: "atlantida" }), /continentes/);
  const ru = rig({ t: "cont", code: "RU" });
  assert.equal(apply(ru, 0, { type: "answer", pick: "europa" }).last.ok, true);
  assert.equal(apply(ru, 0, { type: "answer", pick: "asia" }).last.ok, true, "Rusia está en Europa y Asia");
  assert.equal(apply(ru, 0, { type: "answer", pick: "africa" }).last.ok, false);
  assert.equal(apply(rig({ t: "cont", code: "MX" }), 0, { type: "answer", pick: "norteamerica" }).last.ok, true);
  assert.equal(apply(rig({ t: "cont", code: "CU" }), 0, { type: "answer", pick: "norteamerica" }).last.ok, true, "el Caribe va con Norteamérica");
});

test("banderas y siluetas: solo vale una de las opciones; las banderas gemelas valen las dos", () => {
  const q = { t: "flag", code: "MC", opts: ["MC", "FR", "PL", "BR"] };
  const st = rig(q);
  assert.equal(apply(st, 0, { type: "answer", pick: "MC" }).last.ok, true);
  assert.equal(apply(st, 0, { type: "answer", pick: "FR" }).last.ok, false);
  assert.throws(() => apply(st, 0, { type: "answer", pick: "MX" }), /respuestas/);
  const typed = rig({ t: "flag", code: "MC", opts: null });
  assert.equal(apply(typed, 0, { type: "answer", pick: "ID" }).last.ok, true, "Indonesia y Mónaco tienen la misma bandera");
  assert.equal(apply(typed, 0, { type: "answer", pick: "FR" }).last.ok, false);
  assert.throws(() => apply(typed, 0, { type: "answer", pick: "ZZ" }), /respuestas/);
  assert.equal(apply(rig({ t: "shape", code: "MC", opts: null }), 0, { type: "answer", pick: "ID" }).last.ok, false, "en siluetas no hay gemelas");
});

test("puntos: racha, rapidez con reloj, pista y no sé", () => {
  const right = (st) => apply(st, 0, { type: "answer", pick: st.questions[st.i].code });
  let st = fresh({ game: "continentes", rounds: "10", timer: false }, 8);
  const gains = [];
  for (let i = 0; i < 7; i++) {
    st = apply(st, 0, { type: "answer", pick: BY_CODE[st.questions[st.i].code].cont });
    gains.push(st.last.gain); st = apply(st, 0, { type: "next" });
  }
  assert.deepEqual(gains, [100, 110, 120, 130, 140, 150, 150], "+10 por cada acierto seguido, hasta +50");
  assert.equal(st.best[0], 7);
  st = apply(st, 0, { type: "answer", skip: true });
  assert.equal(st.streaks[0], 0); assert.equal(st.last.skipped, true); assert.equal(st.last.gain, 0);
  // rapidez
  const t = fresh({ game: "continentes", rounds: "5", timer: true }, 8), lim = LIMITS_MS.cont;
  const c = BY_CODE[t.questions[0].code].cont;
  assert.equal(apply(t, 0, { type: "answer", pick: c, ms: 0 }).last.speedBonus, POINTS.speedMax);
  assert.equal(apply(t, 0, { type: "answer", pick: c, ms: lim / 2 }).last.speedBonus, Math.round(POINTS.speedMax / 2));
  assert.equal(apply(t, 0, { type: "answer", pick: c, ms: lim * 3 }).last.speedBonus, 0);
  assert.equal(apply(t, 0, { type: "answer", pick: c }).last.speedBonus, 0, "sin dato de tiempo no hay bono");
  assert.equal(apply(fresh({ game: "continentes", timer: false }, 8), 0, { type: "answer", pick: c, ms: 0 }).last.speedBonus, 0, "sin reloj no hay bono");
  assert.equal(apply(t, 0, { type: "answer", timeout: true }).last.timeout, true);
  // pista: la mitad
  const h = rig({ t: "flag", code: "BR", opts: ["BR", "AR", "CL", "PE"] }, { timer: false });
  assert.equal(apply(h, 0, { type: "answer", pick: "BR", hint: true }).last.gain, 50);
  assert.equal(apply(h, 0, { type: "answer", pick: "AR", hint: true }).last.gain, 0);
  assert.ok(right(h).last.ok);
});

test("pin: dentro vale 100, cerca vale casi, lejos casi nada; y se valida el punto", () => {
  const st = rig({ t: "pin", code: "FR", borders: true, opts: undefined }, { level: "medio" });
  const inside = apply(st, 0, { type: "answer", lon: 2.35, lat: 48.85 });
  assert.equal(inside.last.dist, 0); assert.equal(inside.last.inside, true); assert.equal(inside.last.base, 100); assert.equal(inside.last.ok, true);
  const near = apply(st, 0, { type: "answer", lon: -0.12, lat: 51.5 }); // Londres
  assert.ok(near.last.dist > 100 && near.last.dist < 200 && near.last.base > 75 && near.last.base < 100, JSON.stringify(near.last));
  const far = apply(st, 0, { type: "answer", lon: -77, lat: -12 }); // Lima
  assert.ok(far.last.base < 10 && far.last.ok === false, JSON.stringify(far.last));
  assert.ok(apply(st, 0, { type: "answer", lon: 2.35 + 360, lat: 48.85 }).last.inside, "la vuelta al mundo no importa");
  for (const bad of [{}, { lon: 5 }, { lon: "a", lat: 3 }, { lon: 0, lat: 95 }, { lon: NaN, lat: 0 }]) assert.throws(() => apply(st, 0, { type: "answer", ...bad }), /pin/);
  assert.equal(pinPoints(0, 0, 900), 100); assert.equal(pinPoints(40, 60, 900), 100);
  assert.ok(pinPoints(900, 0, 900) === 37 && pinPoints(300, 0, 400) < pinPoints(300, 0, 1200));
  assert.ok(toleranceKm("MC") > toleranceKm("MX") && toleranceKm("RU") === 0);
  // en un país chiquito basta con quedar cerca de él
  const mt = rig({ t: "pin", code: "MT", borders: false }, { level: "dificil" });
  assert.equal(apply(mt, 0, { type: "answer", lon: 14.6, lat: 35.95 }).last.base, 100);
  // con la pista valen la mitad
  assert.equal(apply(st, 0, { type: "answer", lon: 2.35, lat: 48.85, hint: true }).last.base, 50);
});

test("rechaza jugadas inválidas y no cambia el estado anterior", () => {
  const st = fresh({ game: "continentes" }), copy = JSON.stringify(st);
  assert.throws(() => apply(st, 0, null)); assert.throws(() => apply(st, 0, { type: "fly" }));
  assert.throws(() => apply(st, 0, { type: "next" }), /Primero/);
  assert.throws(() => apply(st, 1, { type: "answer", skip: true }), /turno/);
  const next = apply(st, 0, { type: "answer", skip: true });
  assert.equal(JSON.stringify(st), copy, "no muta"); assert.notEqual(next, st);
  assert.throws(() => apply(next, 0, { type: "answer", skip: true }), /Siguiente/);
  assert.deepEqual(legalActions(st, 1), []);
  assert.equal(legalActions(st, 0).length, 7);
  assert.equal(view(st, 0), st);
});

test("al final gana quien suma más; el empate se comparte", () => {
  let st = fresh({ n: 2, game: "continentes", rounds: "5", timer: false }, 9);
  for (let i = 0; i < 10; i++) {
    const seat = i % 2, c = BY_CODE[st.questions[st.i].code].cont;
    st = apply(st, seat, seat === 0 ? { type: "answer", pick: c } : { type: "answer", skip: true });
    st = apply(st, seat, { type: "next" });
  }
  const r = result(st);
  assert.equal(r.winner, 0); assert.deepEqual(r.champions, [0]); assert.equal(r.scores[1], 0); assert.equal(r.hits[0], 5); assert.equal(r.accuracy[0], 1);
  const tie = { ...st, scores: [300, 300] };
  assert.equal(result(tie).winner, null); assert.equal(result(tie).draw, true); assert.deepEqual(result(tie).champions, [0, 1]);
});

test("la pista no revela la respuesta y no existe en continentes", () => {
  const st = rig({ t: "flag", code: "BR", opts: ["BR", "AR", "CL", "PE"] });
  const a = advise(view(st, 0));
  assert.equal(a.hint, true); assert.ok(/Sudamérica/.test(a.why)); assert.ok(!/Brasil/.test(a.why));
  assert.equal(advise(view(rig({ t: "cont", code: "BR" }), 0)).hint, undefined);
  assert.equal(game.timing.turnMs(fresh({ game: "banderas" })), LIMITS_MS.flag);
  assert.equal(game.timing.turnMs(fresh({ game: "banderas", timer: false })), null);
  assert.deepEqual(game.timing.autoAction(fresh({ game: "banderas" })), { type: "answer", timeout: true });
});

// ───────── La compu
test("la compu sabe más cuanto más conocido es el país y mejor su estilo", () => {
  assert.ok(knows("geografo", "US") > knows("viajero", "US") && knows("viajero", "US") > knows("aprendiz", "US"));
  assert.ok(knows("viajero", "US") > knows("viajero", "TV"));
  assert.ok(knows("viajero", "US", true) < knows("viajero", "US", false));
});

test("la compu juega partidas completas con cada estilo y cada juego, y siempre responde algo válido", () => {
  for (const style of Object.keys(STYLES)) for (const g of ["continentes", "siluetas", "mapa", "banderas", "mezcla"]) for (const level of ["facil", "experto"]) {
    const r = playGame(game, [style, style], { config: { n: 2, game: g, level, rounds: "5", timer: false }, seed: 11 });
    assert.equal(r.stalled, false); assert.ok(game.isOver(r.state), `${style} ${g} ${level}`);
    assert.equal(r.state.log.length, 10);
    assert.ok(r.result.scores.every((s) => s >= 0));
  }
});

test("los estilos se notan: el geógrafo gana casi siempre al aprendiz", () => {
  let wins = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const r = playGame(game, ["geografo", "aprendiz"], { config: { n: 2, game: "mezcla", level: "medio", rounds: "10", timer: false }, seed });
    if (r.result.winner === 0) wins++;
  }
  assert.ok(wins >= 17, `ganó ${wins} de 20`);
});

test("decide solo mueve a quien le toca", () => {
  const st = fresh({ n: 2, game: "banderas" });
  assert.equal(decide(view(st, 1), 1, "viajero", ctx()), null);
  assert.ok(decide(view(st, 0), 0, "viajero", ctx()));
  assert.equal(decide({ ...st, phase: "reveal" }, 0, "viajero", ctx()).type, "next");
});

// ───────── Opciones: a la vez, hándicap y avance automático
import { levelsFor, levelOf, revealMs, timing, currentSeats, HANDICAP_STEPS, LEVEL_ORDER } from "../../../games/geografia/engine/index.js";

test("las casillas del lobby llegan como \"1\"/\"0\" y valen solo con 2 o más jugadores (avanzar solo vale siempre)", () => {
  assert.deepEqual([normalizeConfig({}).sim, normalizeConfig({}).handicap, normalizeConfig({}).auto], [false, false, true]);
  const c = normalizeConfig({ n: 2, sim: "1", handicap: "1", auto: "0" });
  assert.deepEqual([c.sim, c.handicap, c.auto], [true, true, false]);
  const solo = normalizeConfig({ n: 1, sim: "1", handicap: "1" });
  assert.deepEqual([solo.sim, solo.handicap], [false, false]);
  assert.equal(normalizeConfig({ n: 2, sim: true }).sim, true);
});

test("a la vez: las mismas preguntas para todos, las respuestas se esconden hasta que contesta el último", () => {
  let st = fresh({ n: 2, sim: "1", game: "continentes", rounds: "5" }, 3);
  assert.equal(st.questions.length, 5, "5 preguntas en total, no 5 por jugador");
  assert.deepEqual(currentSeats(st), [0, 1]);
  assert.deepEqual(question(st, 0), question(st, 1));
  const right = BY_CODE[st.questions[0].code].cont;
  st = apply(st, 1, { type: "answer", pick: right });
  assert.equal(st.phase, "play");
  assert.deepEqual(currentSeats(st), [0]);
  assert.deepEqual(legalActions(st, 1), [], "ya contestó");
  assert.throws(() => apply(st, 1, { type: "answer", pick: right }), /Ya contestaste/);
  const v = view(st, 0);
  assert.deepEqual(v.pend, { 1: true }, "la vista no trae lo que contestó el otro");
  assert.equal(JSON.stringify(v).includes(`"pick":"${right}"`) && v.pend[1] !== true, false);
  st = apply(st, 0, { type: "answer", skip: true });
  assert.equal(st.phase, "reveal");
  assert.equal(st.lasts.length, 2);
  assert.deepEqual(st.lasts.map((l) => [l.seat, l.ok]), [[0, false], [1, true]]);
  assert.equal(st.scores[0], 0); assert.ok(st.scores[1] >= 100);
  assert.deepEqual(currentSeats(st), [0]);
  assert.deepEqual(legalActions(st, 1), [{ type: "next" }]);
  st = apply(st, 1, { type: "next" });
  assert.equal(st.phase, "play"); assert.equal(st.i, 1); assert.deepEqual(st.pend, {});
});

test("a la vez: el reloj cuenta como tiempo agotado a quien no contestó; las jugadas inválidas fallan sin guardarse", () => {
  let st = fresh({ n: 3, sim: "1", game: "banderas", level: "facil", rounds: "5" }, 4);
  assert.throws(() => apply(st, 2, { type: "answer", pick: "ZZ" }), /respuestas/);
  assert.deepEqual(st.pend, {});
  st = apply(st, 0, { type: "answer", pick: question(st, 0).code });
  assert.equal(timing.turnMs(st), LIMITS_MS.flag);
  assert.deepEqual(timing.autoAction(st, 1), { type: "timeout" });
  st = apply(st, 1, timing.autoAction(st, 1));
  assert.equal(st.phase, "reveal");
  assert.deepEqual(st.lasts.map((l) => l.timeout), [false, true, true]);
  assert.equal(st.streaks[1], 0);
});

test("a la vez: la partida termina al acabar las preguntas y cada quien suma sus puntos y su racha", () => {
  let st = fresh({ n: 2, sim: "1", game: "continentes", rounds: "5", timer: false }, 5);
  for (let i = 0; i < 5; i++) {
    const c = BY_CODE[st.questions[st.i].code].cont;
    st = apply(st, 0, { type: "answer", pick: c }); st = apply(st, 1, { type: "answer", skip: true });
    st = apply(st, 0, { type: "next" });
  }
  assert.equal(st.phase, "over");
  assert.equal(st.log.length, 10);
  assert.deepEqual(result(st).champions, [0]); assert.equal(st.best[0], 5); assert.equal(st.hits[1], 0);
});

test("hándicap: el nivel sube para quien va ganando por mucho (tope Difícil) y baja si pierde la ventaja", () => {
  const cfg = normalizeConfig({ n: 2, handicap: "1", level: "facil" });
  assert.deepEqual(levelsFor(cfg, [0, 0]), ["facil", "facil"]);
  assert.deepEqual(levelsFor(cfg, [HANDICAP_STEPS[0] - 1, 0]), ["facil", "facil"]);
  assert.deepEqual(levelsFor(cfg, [HANDICAP_STEPS[0], 0]), ["medio", "facil"]);
  assert.deepEqual(levelsFor(cfg, [0, HANDICAP_STEPS[1]]), ["facil", "dificil"]);
  assert.deepEqual(levelsFor(cfg, [5000, 0]), ["dificil", "facil"], "nunca pasa de Difícil (Experto cambia la forma de contestar)");
  assert.deepEqual(levelsFor(cfg, [HANDICAP_STEPS[0], HANDICAP_STEPS[0] - 10]), ["facil", "facil"], "la ventaja es sobre el que sigue");
  const four = normalizeConfig({ n: 4, handicap: "1", level: "medio" });
  assert.deepEqual(levelsFor(four, [400, 300, 100, 0]), ["medio", "medio", "medio", "medio"], "la ventaja es sobre el mejor de los demás");
  assert.deepEqual(levelsFor(four, [500, 100, 100, 0]), ["dificil", "medio", "medio", "medio"]);
  assert.deepEqual(levelsFor(normalizeConfig({ n: 2, handicap: "1", level: "dificil" }), [900, 0]), ["dificil", "dificil"]);
  assert.deepEqual(levelsFor(normalizeConfig({ n: 2, level: "facil" }), [900, 0]), ["facil", "facil"], "sin la casilla no hay hándicap");
});

test("hándicap: la pregunta de quien va ganando es otra, más difícil (más opciones, países menos conocidos)", () => {
  let st = fresh({ n: 2, handicap: "1", level: "facil", game: "banderas", rounds: "10", timer: false }, 6);
  const base = question(st, 0);
  assert.equal(base.opts.length, 4);
  // Fuerza una ventaja grande de 0 sobre 1 y pasa a la siguiente pregunta
  st = { ...st, i: 1, turn: 1, phase: "reveal", scores: [400, 0] };
  st = apply(st, 1, { type: "next" });
  assert.deepEqual(st.lv, ["dificil", "facil"]);
  const lead = question(st, 0), trail = question(st, 1), plain = st.questions[st.i];
  assert.equal(lead.opts.length, 6, "Difícil tiene 6 opciones");
  assert.equal(trail.opts.length, 4);
  assert.deepEqual(trail, plain, "quien va atrás sigue con su nivel");
  assert.ok(lead.opts.includes(lead.code));
  assert.equal(levelOf(st, 0), "dificil");
  // El resultado dice con qué nivel se contestó
  st = apply(st, 0, { type: "answer", pick: lead.code });
  assert.equal(st.last.lvl, "dificil");
  assert.ok(st.last.ok);
});

test("hándicap: el pin del que va ganando es más exigente y la pregunta lleva la misma clase y mapa", () => {
  let st = fresh({ n: 2, handicap: "1", level: "facil", game: "mapa", rounds: "5", timer: false }, 7);
  st = { ...st, i: 1, turn: 1, phase: "reveal", scores: [500, 0] }; st = apply(st, 1, { type: "next" });
  const lead = question(st, 0), plain = st.questions[st.i];
  assert.equal(lead.t, "pin"); assert.equal(lead.borders, plain.borders);
  const c = BY_CODE[lead.code], off = [c.ll[1] + 4, c.ll[0] + 4];
  const a = apply(st, 0, { type: "answer", lon: off[0], lat: off[1] }).last;
  const scale = (id) => LEVELS.find((l) => l.id === id).scale;
  assert.equal(a.lvl, "dificil");
  assert.equal(a.base, pinPoints(a.dist, toleranceKm(lead.code), scale("dificil")), "puntúa con la escala de Difícil");
  assert.ok(scale("dificil") < scale("facil"));
});

test("avanzar solo: al ver la respuesta corre un reloj (más largo si se falló o es un pin); sin la casilla no hay reloj", () => {
  let st = fresh({ n: 1, game: "continentes", rounds: "5" }, 8);
  st = apply(st, 0, { type: "answer", pick: BY_CODE[st.questions[0].code].cont });
  assert.equal(timing.turnMs(st), revealMs(st)); assert.equal(revealMs(st), 2600);
  assert.deepEqual(timing.autoAction(st, 0), { type: "next" });
  let bad = fresh({ n: 1, game: "continentes", rounds: "5" }, 8); bad = apply(bad, 0, { type: "answer", skip: true });
  assert.ok(revealMs(bad) > revealMs(st));
  let pin = fresh({ n: 1, game: "mapa", rounds: "5" }, 8); pin = apply(pin, 0, { type: "answer", skip: true });
  assert.ok(revealMs(pin) > revealMs(bad));
  const off = apply(fresh({ n: 1, game: "continentes", auto: "0" }, 8), 0, { type: "answer", skip: true });
  assert.equal(timing.turnMs(off), null);
  assert.equal(timing.turnMs(apply(fresh({ n: 1, game: "continentes", timer: false }, 8), 0, { type: "answer", skip: true })), 2600 + 1000, "sin reloj de pregunta, el de la respuesta sigue");
});

test("partidas completas a la vez y con hándicap: nadie se atora y todo se graba y se repite igual", () => {
  for (const [n, extra] of [[2, { sim: "1" }], [4, { sim: "1", handicap: "1", level: "facil" }], [3, { handicap: "1", level: "medio", game: "mezcla" }]]) {
    for (const style of ["aprendiz", "geografo"]) {
      const cfg = { n, game: "mezcla", level: "medio", rounds: "5", timer: false, ...extra };
      const r = playGame(game, Array(n).fill(style), { config: cfg, seed: 21 });
      assert.equal(r.stalled, false); assert.ok(game.isOver(r.state), `${n} ${style}`);
      assert.equal(r.state.log.length, 5 * n);
      assert.ok(r.result.scores.every((s) => s >= 0));
      const again = playGame(game, Array(n).fill(style), { config: cfg, seed: 21 });
      assert.deepEqual(again.state.scores, r.state.scores, "determinista");
    }
  }
});

test("a la vez: la compu no ve lo que contestaron los demás y tarda según su estilo", () => {
  const st = fresh({ n: 2, sim: "1", game: "banderas", rounds: "5" }, 9);
  const v = view(apply(st, 1, { type: "answer", pick: question(st, 1).code }), 0);
  const act = decide(v, 0, "viajero", ctx(1));
  assert.equal(act.type, "answer");
  assert.equal(decide(v, 1, "viajero", ctx(1)), null, "ya contestó");
  const fast = game.bots.thinkMs(st, 0, 0, "geografo"), slow = game.bots.thinkMs(st, 0, 0, "aprendiz");
  assert.ok(fast < slow);
  assert.equal(LEVEL_ORDER.length, 4);
});
