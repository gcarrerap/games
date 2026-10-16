// Hilo aparte con plan B, con un Worker de mentira que corre el host en el mismo hilo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHost, serve, createClient } from "../../../modules/worker/index.js";

const FNS = { double: (x) => x * 2, slow: async (x) => x + 1, boom: () => { throw new Error("se rompió"); } };

// Worker de mentira: entrega los mensajes al host de forma asíncrona, como uno de verdad
function fakeWorkerClass(handle, { failOnCreate = false, failOnMessage = false } = {}) {
  const made = [];
  class W {
    constructor(url, opts) { if (failOnCreate) throw new Error("sin workers"); this.url = url; this.opts = opts; made.push(this); }
    postMessage(msg) {
      if (failOnMessage) { setTimeout(() => this.onerror && this.onerror({ message: "falló al cargar" })); return; }
      setTimeout(async () => this.onmessage({ data: await handle(structuredClone(msg)) }));
    }
    terminate() { this.dead = true; }
  }
  W.made = made;
  return W;
}

test("el host responde y reporta errores sin tronar", async () => {
  const h = createHost(FNS);
  assert.deepEqual(await h({ id: 1, fn: "double", args: [4] }), { id: 1, result: 8 });
  assert.deepEqual(await h({ id: 2, fn: "slow", args: [1] }), { id: 2, result: 2 });
  assert.deepEqual(await h({ id: 3, fn: "boom", args: [] }), { id: 3, error: "se rompió" });
  assert.match((await h({ id: 4, fn: "toString", args: [] })).error, /desconocida/);
});

test("serve solo se conecta dentro de un worker", () => {
  assert.equal(serve(createHost(FNS), {}), false);
  class WorkerGlobalScope {}
  const scope = Object.assign(new WorkerGlobalScope(), { WorkerGlobalScope, postMessage() {} });
  assert.equal(serve(createHost(FNS), scope), true);
  assert.equal(typeof scope.onmessage, "function");
});

test("con worker: los pedidos van al hilo aparte y regresan en orden de llegada", async () => {
  const W = fakeWorkerClass(createHost(FNS));
  const c = createClient({ url: "x.js", local: FNS, WorkerImpl: W });
  assert.deepEqual(await Promise.all([c.call("double", 2), c.call("slow", 5)]), [4, 6]);
  assert.equal(W.made.length, 1, "un solo worker");
  assert.deepEqual(W.made[0].opts, { type: "module" });
  assert.equal(c.usingWorker, true);
  await assert.rejects(c.call("boom"), /se rompió/);
  await assert.rejects(c.call("nada"), /desconocida/);
});

test("sin Worker en el navegador, o si no se puede crear: calcula aquí", async () => {
  const c1 = createClient({ url: "x.js", local: FNS, WorkerImpl: undefined });
  assert.equal(await c1.call("double", 3), 6);
  let why = null;
  const c2 = createClient({ url: "x.js", local: FNS, WorkerImpl: fakeWorkerClass(null, { failOnCreate: true }), onFallback: (w) => (why = w) });
  assert.equal(await c2.call("double", 3), 6);
  assert.equal(why, "sin workers");
});

test("si el worker falla al cargar, lo pendiente se calcula aquí y ya no se vuelve a intentar", async () => {
  const W = fakeWorkerClass(null, { failOnMessage: true });
  let falls = 0;
  const c = createClient({ url: "x.js", local: FNS, WorkerImpl: W, onFallback: () => falls++ });
  assert.equal(await c.call("double", 5), 10);
  assert.equal(await c.call("double", 6), 12);
  assert.equal(W.made.length, 1);
  assert.equal(W.made[0].dead, true);
  assert.equal(falls, 1);
  assert.equal(c.usingWorker, false);
});
