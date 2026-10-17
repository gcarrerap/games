// El tutorial de Skull: una ronda de ejemplo (Tú, Lupe y Beto) jugada de verdad con engine/, y los pasos que la
// cuentan. Puro: sin DOM. Cada escena es la vista de tu asiento (0) en un momento de la ronda, así lo que muestra
// el tutorial nunca se aparta de las reglas. ui/tutorial.js lo dibuja.
//
// Un paso: { id, title, text (HTML), scene, quiz? }. Con quiz, `after` es la escena que se ve al contestar bien.
// Cada opción del quiz es "good" (la recomendada), "ok" (se vale, con su explicación) o "bad" (se explica y se
// vuelve a intentar).
import { newGame, apply, view, RULES, FLOWER as F, SKULL as S } from "../engine/index.js";

export const NAMES = ["Tú", "Lupe", "Beto"];
const ME = 0, LUPE = 1, BETO = 2;

// El azar solo decide qué disco te quitan con la calavera ajena: 0.5 de 4 discos → una flor
const ctx = { rnd: () => 0.5, now: 0 };
const play = (st, moves) => moves.reduce((s, [seat, a]) => apply(s, seat, a, ctx), st);

// La ronda de ejemplo. Tapetes (de abajo hacia arriba): Tú [flor, flor], Lupe [flor, flor], Beto [calavera, flor].
export function tutorialStates() {
  const start = newGame({ n: 3, timer: false }, NAMES, 0);
  const placed = play(start, [[LUPE, { type: "place", disc: F }], [BETO, { type: "place", disc: S }], [ME, { type: "place", disc: F }]]);
  const built = play(placed, [[ME, { type: "place", disc: F }], [LUPE, { type: "place", disc: F }], [BETO, { type: "place", disc: F }]]);
  const bid2 = play(built, [[ME, { type: "bid", n: 2 }]]);
  const raised = play(bid2, [[LUPE, { type: "bid", n: 3 }], [BETO, { type: "pass" }]]);
  const challenge = play(raised, [[ME, { type: "bid", n: 4 }], [LUPE, { type: "pass" }]]);
  const ownFlipped = play(challenge, [[ME, { type: "flip", seat: ME }]]);
  const won = play(ownFlipped, [[ME, { type: "flip", seat: LUPE }], [ME, { type: "flip", seat: LUPE }]]);
  const lost = play(ownFlipped, [[ME, { type: "flip", seat: BETO }], [ME, { type: "flip", seat: BETO }]]);
  return { start, placed, built, bid2, raised, challenge, ownFlipped, won, lost };
}

// Las escenas: lo que ves desde tu asiento
export function tutorialScenes() {
  const out = {};
  for (const [k, st] of Object.entries(tutorialStates())) out[k] = view(st, ME);
  return out;
}

const wins = RULES.winsToWin, total = RULES.flowers + RULES.skulls;

export const STEPS = [
  {
    id: "goal",
    title: "Un juego de faroleo",
    scene: "start",
    text: `<p>Cada quien empieza con <b>${total} discos</b>: ${RULES.flowers} flores y ${RULES.skulls} calavera. Por fuera todos se ven iguales, así que nadie sabe cuál pusiste.</p>
      <p><b>Ganas</b> si cumples ${wins} retos, o si eres el último que conserva discos.</p>
      <p>Vamos a jugar una ronda de ejemplo contra Lupe y Beto.</p>`,
  },
  {
    id: "first",
    title: "Todos ponen un disco",
    scene: "start",
    after: "placed",
    text: `<p>Al empezar la ronda <b>todos a la vez</b> ponen un disco boca abajo en su tapete.</p>`,
    quiz: {
      q: "¿Cuál pones primero?",
      options: [
        { label: "Una flor", disc: F, kind: "good", why: "Lo seguro: si alguien voltea tu tapete, encuentra una flor. Así haremos en el ejemplo." },
        { label: "La calavera", disc: S, kind: "ok", why: "Atrevido: quien voltee tu tapete se topa con ella. En el ejemplo pondremos una flor, pero se vale." },
      ],
    },
  },
  {
    id: "build",
    title: "Pon otro o apuesta",
    scene: "built",
    after: "bid2",
    text: `<p>Por turnos, cada quien <b>pone otro disco</b> encima del suyo o <b>abre la apuesta</b>. Ya todos pusieron dos: hay 6 discos en la mesa.</p>
      <p>Apostar es decir cuántos discos crees poder voltear <b>sin toparte con una calavera</b>.</p>`,
    quiz: {
      q: "Tus dos discos son flores. ¿Cuánto apuestas para abrir?",
      options: [
        { label: "Apostar 2", kind: "good", why: "Bien: tus dos flores las volteas tú primero, así que 2 es seguro." },
        { label: "Apostar 6", kind: "bad", why: "Tendrías que voltear los 6 discos de la mesa, y Beto o Lupe pueden tener su calavera. Muy arriesgado." },
      ],
    },
  },
  {
    id: "raise",
    title: "Suben o pasan",
    scene: "raised",
    after: "challenge",
    text: `<p>En la apuesta, por turnos, cada quien <b>sube</b> o <b>pasa</b>. Quien pasa ya no vuelve en esta ronda.</p>
      <p>Lupe subió a 3 y Beto pasó.</p>`,
    quiz: {
      q: "Te toca. ¿Qué haces?",
      options: [
        { label: "Subir a 4", kind: "good", why: "Así sigues tú. Lupe pasa y te vuelves el retador: tienes que voltear 4 sin calavera." },
        { label: "Pasar", kind: "ok", why: "También se vale: Lupe sería la retadora y tú solo miras. En el ejemplo subes a 4." },
      ],
    },
  },
  {
    id: "mine",
    title: "Eres el retador",
    scene: "challenge",
    after: "ownFlipped",
    text: `<p>Cuando todos los demás pasan (o alguien apuesta todos los discos de la mesa), el que apostó más alto es el <b>retador</b> y empieza a voltear.</p>`,
    quiz: {
      q: "¿Qué volteas primero?",
      options: [
        { label: "Mis discos", kind: "good", why: "Así es: el retador voltea primero todos los suyos, de arriba hacia abajo. Dos flores: van 2 de 4." },
        { label: "El de Lupe", kind: "bad", why: "Todavía no: la regla es voltear primero <b>todos los tuyos</b>. Por eso poner tu calavera también te puede tumbar a ti." },
      ],
    },
  },
  {
    id: "others",
    title: "Ahora los de los demás",
    scene: "ownFlipped",
    after: "won",
    text: `<p>Faltan 2. Escoges un tapete ajeno y volteas <b>el disco de arriba</b>, uno a la vez. Puedes repetir tapete.</p>`,
    quiz: {
      q: "¿De quién volteas?",
      options: [
        { label: "Lupe", kind: "good", why: "Buena lectura: Lupe subió la apuesta, así que seguramente no esconde su calavera arriba. Volteas sus dos discos: ¡flores!" },
        { label: "Beto", kind: "bad", why: "Beto pasó sin apostar: nada indica que tenga flores. Quien apuesta suele tener flores arriba. Intenta otra vez." },
      ],
    },
  },
  {
    id: "won",
    title: "¡Ganaste el reto!",
    scene: "won",
    text: `<p>Volteaste 4 flores sin toparte con una calavera: <b>ganas el reto</b> 🏆. Con ${wins} retos ganados, ganas la partida.</p>
      <p>La siguiente ronda la abre el retador. Los discos regresan a la mano de cada quien.</p>`,
  },
  {
    id: "lost",
    title: "¿Y si sale una calavera?",
    scene: "lost",
    text: `<p>Si hubieras volteado los dos de Beto, el segundo era <b>su calavera</b>. Pierdes el reto y Beto te quita un disco <b>al azar, sin verlo</b>. Solo tú sabes cuál fue.</p>
      <p>Los discos perdidos no regresan. Quien se queda sin discos sale del juego.</p>`,
  },
  {
    id: "ownskull",
    title: "Tu propia calavera",
    scene: null,
    hand: [F, F, S],
    text: `<p>Si te topas con <b>tu propia</b> calavera, tú escoges qué disco pierdes.</p>`,
    quiz: {
      q: "Te quedan dos flores y la calavera. ¿Cuál pierdes?",
      options: [
        { label: "Una flor", disc: F, kind: "good", why: "Lo más común: conservas la calavera para seguir faroleando." },
        { label: "La calavera", disc: S, kind: "ok", why: "Se vale, pero sin calavera los demás pueden voltear tus discos sin miedo… aunque ellos no lo saben." },
      ],
    },
  },
  {
    id: "tips",
    title: "Listo para jugar",
    scene: null,
    text: `<ul>
        <li><b>Farolea:</b> pon tu calavera y apuesta bajo; quien suba y se vuelva retador puede toparse con ella.</li>
        <li><b>Lee las apuestas:</b> quien apuesta suele tener flores arriba; quien pasa puede esconder su calavera.</li>
        <li><b>Cuida tus discos:</b> con pocos, cada reto perdido duele más.</li>
      </ul>
      <p>Las reglas completas están siempre en el botón <b>Reglas</b>.</p>`,
  },
];
