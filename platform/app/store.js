// Store mínimo hecho a mano (heredado de myDomino): un objeto de estado, quién lo escucha y cómo avisar.
// Solo platform/app lo escribe; la interfaz se suscribe y lo cambia siempre por medio de una acción.
export function createStore(initial) {
  const state = initial;
  const listeners = new Set();
  return {
    state,
    set(patch) { Object.assign(state, patch); this.notify(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    notify() { for (const fn of [...listeners]) fn(state); },
  };
}
