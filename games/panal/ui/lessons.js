// Lecciones del tutorial de Panal. Puro: cada lección es una posición armada a mano, una tarea y cómo se revisa.
// Las reglas son las del juego (engine/), así que lo que se aprende aquí es exactamente lo que pasa en la mesa.
//
// Cada lección:
//   title, text (HTML)  lo que se explica
//   task                lo que tienes que hacer
//   spec                la colmena: { "q,r": "0reina" } (0 = tus fichas claras, 1 = las oscuras del rival)
//   only(a)             qué jugadas se permiten en la lección (las demás no se marcan)
//   goal(a, after)      si la jugada cumple la tarea
//   solution            una jugada que la cumple (para "Muéstrame" y para las pruebas)
//   goalCell            casilla que se marca como meta (opcional)
//   tray                si se muestra tu reserva para poner bichos
//   ok                  lo que se dice al cumplirla
// Una lección sin spec solo es texto (la última, con consejos).
import { newGame, PIECES } from "../engine/index.js";

export function lessonState(lesson) {
  const cells = {};
  for (const [k, v] of Object.entries(lesson.spec || {})) cells[k] = [].concat(v).map((s) => ({ p: Number(s[0]), k: s.slice(1) }));
  const all = Object.values(cells).flat();
  const hand = [0, 1].map((p) => { const h = { ...PIECES }; for (const s of all) if (s.p === p) h[s.k]--; return h; });
  const placed = [0, 1].map((p) => all.filter((x) => x.p === p).length);
  return { ...newGame({ n: 2, timer: false }, ["Tú", "Rival"]), cells, hand, placed, turn: 0 };
}

const isMove = (from) => (a) => a.type === "move" && a.from === from;
const moves = (a) => a.type === "move";

export const LESSONS = [
  {
    id: "meta",
    title: "La meta: rodear a la reina",
    text: `<p>Panal se juega entre dos, sin tablero: las fichas hexagonales forman una <b>colmena</b> sobre la mesa. Tú juegas con las <b>claras</b>; el rival, con las <b>oscuras</b>.</p>
      <p><b>Gana quien rodea a la abeja reina del rival por sus seis lados.</b> Cuentan fichas de cualquier color, también las suyas.</p>
      <p>La reina oscura ya tiene cinco lados ocupados. Le falta uno.</p>`,
    task: "Toca tu hormiga de la derecha y luego la casilla azul para cerrar el último lado.",
    spec: { "0,0": "1reina", "1,0": "0hormiga", "1,-1": "0arana", "0,-1": "1arana", "-1,0": "1hormiga", "-1,1": "1chapulin", "2,0": "0reina", "2,1": "0hormiga" },
    only: isMove("2,1"),
    goal: (a, after) => after.winner === 0,
    solution: { type: "move", from: "2,1", to: "0,1" },
    goalCell: "0,1",
    ok: "¡Ganaste! Así termina toda partida. Arriba de la mesa, los seis hexágonos junto a cada nombre cuentan cuántos lados de su reina están ocupados.",
  },
  {
    id: "poner",
    title: "Poner un bicho",
    text: `<p>En tu turno haces <b>una</b> de dos cosas: <b>poner</b> un bicho de tu reserva o <b>mover</b> uno tuyo que ya esté en la colmena.</p>
      <p>Al poner, la ficha nueva <b>solo puede tocar fichas de tu color</b>, ninguna del rival. (La primera ficha de la partida va al centro y la segunda, junto a ella: esa es la única excepción.)</p>`,
    task: "Toca un bicho de tu reserva (abajo) y ponlo en una de las casillas marcadas.",
    spec: { "0,0": "0reina", "-1,0": "0hormiga", "1,0": "1reina", "2,0": "1arana" },
    tray: true,
    only: (a) => a.type === "place",
    goal: (a) => a.type === "place",
    solution: { type: "place", kind: "chapulin", to: "-1,-1" },
    ok: "Fíjate: ninguna casilla marcada tocaba una ficha oscura. Después de puesta, una ficha sí puede moverse junto al rival.",
  },
  {
    id: "reina4",
    title: "La reina, a más tardar en la 4.ª ficha",
    text: `<p>Tu abeja reina tiene que estar en la colmena <b>a más tardar en tu cuarta ficha</b>. Y mientras no la pongas, <b>no puedes mover nada</b>: solo poner.</p>
      <p>Aquí ya pusiste tres fichas sin la reina. Ahora tu reserva solo deja escoger a la reina.</p>`,
    task: "Pon tu abeja reina.",
    spec: { "0,0": "0hormiga", "-1,0": "0arana", "-1,1": "0chapulin", "1,0": "1reina", "2,0": "1hormiga", "2,-1": "1mayate" },
    tray: true,
    only: (a) => a.type === "place",
    goal: (a) => a.type === "place" && a.kind === "reina",
    solution: { type: "place", kind: "reina", to: "-2,1" },
    ok: "Ponerla pronto te deja mover tus bichos antes. Pero ojo: donde la pongas es donde el rival la va a querer rodear.",
  },
  {
    id: "reina",
    title: "Abeja reina: un paso",
    text: `<p>Las fichas se mueven <b>deslizándose alrededor de la colmena</b>, sin despegarse de ella.</p>
      <p>La <b>abeja reina</b> es lenta: avanza <b>un solo paso</b>. Es la pieza más importante, así que conviene dejarle espacio para escapar.</p>`,
    task: "Toca tu reina y muévela un paso.",
    spec: { "0,0": "0reina", "1,0": "1reina", "0,1": "0hormiga", "2,-1": "1arana" },
    only: isMove("0,0"),
    goal: (a) => a.type === "move" && a.from === "0,0",
    solution: { type: "move", from: "0,0", to: "-1,1" },
    ok: "Un paso a la vez. Si la rodean poco a poco, la reina puede ir saliéndose.",
  },
  {
    id: "hormiga",
    title: "Hormiga: a cualquier lado",
    text: `<p>La <b>hormiga</b> es la pieza más ágil: da <b>todos los pasos que quiera</b> alrededor de la orilla de la colmena.</p>
      <p>Por eso es muy buena para llegar al otro lado y cerrar huecos junto a la reina rival.</p>`,
    task: "Lleva tu hormiga hasta la casilla azul, al otro extremo.",
    spec: { "0,0": "0reina", "1,0": "1reina", "2,0": "1hormiga", "3,0": "1arana", "-1,0": "0hormiga" },
    only: isMove("-1,0"),
    goal: (a) => a.to === "4,0",
    solution: { type: "move", from: "-1,0", to: "4,0" },
    goalCell: "4,0",
    ok: "Le dio la vuelta a media colmena en una sola jugada.",
  },
  {
    id: "arana",
    title: "Araña: exactamente tres pasos",
    text: `<p>La <b>araña</b> camina por la orilla <b>exactamente tres pasos</b>: ni uno ni dos, y sin regresar por donde vino.</p>
      <p>Por eso solo tiene unas pocas casillas posibles. Tócala y mira cuáles se marcan.</p>`,
    task: "Mueve tu araña a una de sus casillas.",
    spec: { "0,0": "0reina", "1,0": "1reina", "2,0": "1hormiga", "-1,0": "0arana" },
    only: isMove("-1,0"),
    goal: (a) => a.type === "move" && a.from === "-1,0",
    solution: { type: "move", from: "-1,0", to: "2,-1" },
    ok: "Tres pasos justos. La araña es buena para meterse en huecos que están a esa distancia.",
  },
  {
    id: "chapulin",
    title: "Chapulín: salta",
    text: `<p>El <b>chapulín</b> no camina: <b>salta en línea recta</b> por encima de una o más fichas y cae en el <b>primer hueco</b>.</p>
      <p>Tiene que saltar al menos una ficha. Aquí solo hay una línea con fichas para saltar.</p>`,
    task: "Haz que tu chapulín salte toda la fila.",
    spec: { "-1,0": "0chapulin", "0,0": "0reina", "1,0": "1reina", "2,0": "1hormiga" },
    only: isMove("-1,0"),
    goal: (a) => a.to === "3,0",
    solution: { type: "move", from: "-1,0", to: "3,0" },
    goalCell: "3,0",
    ok: "Saltó tres fichas de un jalón. El chapulín es perfecto para tapar un hueco al otro lado de la colmena.",
  },
  {
    id: "mayate",
    title: "Mayate: se sube a la colmena",
    text: `<p>El <b>mayate</b> da un paso, como la reina, pero además <b>puede subirse encima</b> de otras fichas y caminar por arriba.</p>
      <p>La ficha que queda abajo <b>no se puede mover</b>, y para poner fichas cuenta el color de la de arriba.</p>`,
    task: "Súbete con tu mayate encima de la reina oscura.",
    spec: { "0,0": "0mayate", "1,0": "1reina", "-1,0": "0reina", "-1,1": "0hormiga", "0,1": "1hormiga" },
    only: isMove("0,0"),
    goal: (a) => a.to === "1,0",
    solution: { type: "move", from: "0,0", to: "1,0" },
    goalCell: "1,0",
    ok: "La reina oscura quedó atrapada debajo: ya no puede escapar. El número en la esquina dice cuántas fichas hay en la pila.",
  },
  {
    id: "colmena",
    title: "Colmena única",
    text: `<p>La colmena <b>nunca puede quedar partida en dos</b>, ni siquiera a medio movimiento.</p>
      <p>Tu hormiga está entre tu reina y la oscura: si se moviera, la colmena se partiría. Tócala y verás que no se deja escoger.</p>`,
    task: "Prueba tocar la hormiga del medio. Luego mueve la ficha que sí se puede mover.",
    spec: { "0,0": "0reina", "1,0": "0hormiga", "2,0": "1reina", "-1,0": "0arana" },
    only: moves,
    goal: (a) => a.type === "move" && a.from !== "1,0",
    solution: { type: "move", from: "-1,0", to: "1,1" },
    ok: "Esta regla es la que más partidas decide: una ficha que une dos partes queda clavada aunque sea una hormiga.",
  },
  {
    id: "caber",
    title: "Caber por el hueco",
    text: `<p>Las fichas se deslizan, así que <b>no pueden pasar por un hueco donde no caben</b>: si las dos fichas de los lados le cierran el paso, no entra.</p>
      <p>El hueco del centro está cerrado por los seis lados. Tu hormiga no puede entrar (tócala: el centro no se marca). El <b>chapulín sí</b>, porque salta.</p>`,
    task: "Mete tu chapulín al hueco del centro.",
    spec: { "1,0": "0reina", "1,-1": "1reina", "0,-1": "0arana", "-1,0": "1arana", "-1,1": "0hormiga", "0,1": "1hormiga", "2,0": "0chapulin" },
    only: moves,
    goal: (a) => a.to === "0,0",
    solution: { type: "move", from: "2,0", to: "0,0" },
    goalCell: "0,0",
    ok: "Lo mismo vale a medio camino: una hormiga o una araña no pasan entre dos fichas que están juntas, aunque del otro lado haya espacio.",
  },
  {
    id: "consejos",
    title: "Listo para jugar",
    text: `<p>Eso es todo. Dos reglas más que casi no salen:</p>
      <ul><li>Si no tienes ninguna jugada, <b>pasas</b> (aparece un botón).</li>
      <li>Si las dos reinas quedan rodeadas a la vez, o pasan 240 jugadas sin ganador, es <b>empate</b>.</li></ul>
      <p><b>Consejos para tus primeras partidas:</b></p>
      <ul><li>Pon tu reina pronto y <b>déjale lados libres</b>: cada ficha junto a ella, aunque sea tuya, ayuda al rival.</li>
      <li>Saca las <b>hormigas</b> temprano: son las que más se mueven.</li>
      <li>Busca <b>clavar</b> fichas del rival: una que une dos partes no se puede mover.</li>
      <li>Un <b>mayate encima de la reina rival</b> la deja sin escape.</li>
      <li>Si te atoras, toca <b>Consejo</b>: la compu te sugiere una jugada.</li></ul>
      <p>Empieza contra la compu en <b>Fácil</b>. Las reglas completas siempre están en el botón <b>Reglas</b>.</p>`,
  },
];
