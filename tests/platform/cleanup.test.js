// Limpieza de mesas abandonadas, con un Firestore de mentira.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeFirestore } from "../fakes/firebase.js";
import nim from "../modules/fixtures/nim.js";
import { makeDb, saveNewTable, updateTable } from "../../platform/services/index.js";
import { newTable, sit, addBot, start } from "../../platform/app/table.js";
import { idleLimitMs, staleTables, cleanupInactiveTables, EMPTY_TABLE_GRACE_MS, WAITING_TABLE_IDLE_MS, STARTED_TABLE_IDLE_MS } from "../../platform/app/cleanup.js";

const MIN = 60_000;
const lobby = (code) => newTable(nim, { code, mode: "normal", seed: code, now: 0 });
const waiting = (code) => sit(lobby(code), 0, { id: "a", name: "Ana" });
const started = (code) => start(nim, addBot(waiting(code), 1, { profile: "azar", name: "L" }), 0);

test("cada estado aguanta su tiempo sin cambios", () => {
  assert.equal(idleLimitMs(lobby("A")), EMPTY_TABLE_GRACE_MS);
  assert.equal(idleLimitMs(addBot(lobby("A"), 1, { profile: "azar", name: "L" })), EMPTY_TABLE_GRACE_MS, "la compu sola no cuenta");
  assert.equal(idleLimitMs(waiting("B")), WAITING_TABLE_IDLE_MS);
  assert.equal(idleLimitMs(started("C")), STARTED_TABLE_IDLE_MS);
  assert.ok(EMPTY_TABLE_GRACE_MS < WAITING_TABLE_IDLE_MS && WAITING_TABLE_IDLE_MS < STARTED_TABLE_IDLE_MS);
});

test("solo vencen las que pasaron su límite", () => {
  const list = [lobby("E"), waiting("W"), started("S"), lobby("NEW")];
  const now = 100 * MIN;
  const updated = { E: now - 6 * MIN, W: now - 30 * MIN, S: now - 7 * 60 * MIN, NEW: now - MIN };
  assert.deepEqual(staleTables(list, updated, now).map((t) => t.code), ["E", "S"]);
  assert.deepEqual(staleTables(list, {}, now), [], "sin hora de guardado no se borra");
});

test("borra las vencidas, pero no si cambiaron desde que se vieron", async () => {
  const fs = fakeFirestore(), db = makeDb(fs, () => 0);
  for (const t of [lobby("E"), lobby("SAT"), waiting("W")]) await saveNewTable(db, t);
  const list = [lobby("E"), lobby("SAT"), waiting("W")];
  const now = 10 * MIN, updated = { E: 0, SAT: 0, W: 0 };
  await updateTable(db, "SAT", (t) => sit(t, 0, { id: "b", name: "Beto" })); // alguien se sentó después de verla
  const gone = await cleanupInactiveTables(db, list, updated, now);
  assert.deepEqual(gone, ["E"]);
  assert.ok(!fs._docs.has("juegos-mesas/E"));
  assert.ok(fs._docs.has("juegos-mesas/SAT"));
  assert.ok(fs._docs.has("juegos-mesas/W"), "esperando, todavía no vence");
});

test("sin conexión no hace nada; si la mesa ya no existe, no pasa nada", async () => {
  assert.deepEqual(await cleanupInactiveTables(null, [lobby("E")], { E: 0 }, 10 * MIN), []);
  const db = makeDb(fakeFirestore());
  assert.deepEqual(await cleanupInactiveTables(db, [lobby("GHOST")], { GHOST: 0 }, 10 * MIN), []);
});
