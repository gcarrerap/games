// Correr funciones pesadas en un hilo aparte (Web Worker) para que la pantalla no se congele, con plan B: si el
// navegador no puede crear el worker, o el worker falla, se calcula en el hilo principal. Nunca se queda esperando.
// Generalizado de myDomino (ai/worker.js + app/ai-client.js), que solo servía para la compu del dominó.
//
// Del lado del worker:  const handle = createHost({ fn1, fn2 }); serve(handle);
// Del lado de la página: const ai = createClient({ url, local: { fn1, fn2 } }); await ai.call("fn1", ...args);
// Los argumentos y resultados viajan entre hilos, así que deben ser datos simples (JSON).

// Atiende un pedido { id, fn, args } y devuelve { id, result } o { id, error }. Las funciones pueden ser async.
export function createHost(fns) {
  return async ({ id, fn, args }) => {
    try {
      if (!Object.hasOwn(fns, fn)) throw new Error("Función desconocida: " + fn);
      return { id, result: await fns[fn](...args) };
    } catch (e) {
      return { id, error: String((e && e.message) || e) };
    }
  };
}

// Conecta handle a los mensajes, solo si este código corre dentro de un worker (en la página o en Node no hace nada)
export function serve(handle, scope = globalThis) {
  const inWorker = typeof scope.WorkerGlobalScope === "function" && scope instanceof scope.WorkerGlobalScope;
  if (!inWorker) return false;
  scope.onmessage = async (e) => scope.postMessage(await handle(e.data));
  return true;
}

// url: el archivo del worker (new URL("./x.js", import.meta.url)); local: las mismas funciones, para el plan B.
// WorkerImpl: para pruebas. onFallback(motivo): aviso cuando se pasa al plan B.
export function createClient({ url, local, WorkerImpl = globalThis.Worker, onFallback = null }) {
  let worker = null, failed = false, seq = 0;
  const pending = new Map(); // id -> { resolve, reject, fn, args }

  const runLocal = (fn, args) => new Promise((resolve, reject) => {
    try { Promise.resolve(local[fn](...args)).then(resolve, reject); } catch (e) { reject(e); }
  });

  function fallBack(reason) {
    if (!failed && onFallback) onFallback(reason);
    failed = true;
    if (worker) { try { worker.terminate(); } catch {} worker = null; }
    for (const { resolve, reject, fn, args } of pending.values()) runLocal(fn, args).then(resolve, reject);
    pending.clear();
  }

  function getWorker() {
    if (failed || typeof WorkerImpl !== "function") return null;
    if (worker) return worker;
    try { worker = new WorkerImpl(url, { type: "module" }); }
    catch (e) { fallBack(e && e.message); return null; }
    worker.onmessage = (e) => {
      const { id, result, error } = e.data, p = pending.get(id); if (!p) return;
      pending.delete(id);
      if (error) p.reject(new Error(error)); else p.resolve(result);
    };
    worker.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); fallBack(e && e.message); };
    worker.onmessageerror = () => fallBack("mensaje ilegible");
    return worker;
  }

  return {
    call(fn, ...args) {
      if (!Object.hasOwn(local, fn)) return Promise.reject(new Error("Función desconocida: " + fn));
      const w = getWorker();
      if (!w) return runLocal(fn, args);
      return new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject, fn, args });
        try { w.postMessage({ id, fn, args }); } catch (e) { fallBack(e && e.message); }
      });
    },
    get usingWorker() { return !!worker && !failed; },
    reset() { if (worker) { try { worker.terminate(); } catch {} } worker = null; failed = false; pending.clear(); },
  };
}
