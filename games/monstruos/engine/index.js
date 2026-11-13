// Mastermind con personajes: pistas agregadas, nunca asociadas a una casilla.
export const CHARACTERS = [
  { id: 0, name: "Pipo", trait: "El cíclope travieso", color: "#27cdbf" },
  { id: 1, name: "Lola", trait: "Orejas de detective", color: "#c899e8" },
  { id: 2, name: "Taco", trait: "El señor bigotón", color: "#ffb14c" },
  { id: 3, name: "Momo", trait: "Cuatro brazos, mil abrazos", color: "#b8df4d" },
  { id: 4, name: "Bibi", trait: "La estrella bromista", color: "#f990b7" },
  { id: 5, name: "Nubo", trait: "El dormilón del club", color: "#c4d9f5" },
];
export const LEVELS = {
  junior: { name: "Junior", slots: 3, repeats: false, attempts: 8 },
  detective: { name: "Detective", slots: 4, repeats: false, attempts: 10 },
  expert: { name: "Experto", slots: 4, repeats: true, attempts: 10 },
};
export function score(secret, guess) {
  let exact = 0, misplaced = 0;
  const left = Array(6).fill(0), right = Array(6).fill(0);
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) exact++;
    else { left[secret[i]]++; right[guess[i]]++; }
  }
  for (let i = 0; i < 6; i++) misplaced += Math.min(left[i], right[i]);
  return { exact, misplaced };
}
export function allCodes(level) {
  const codes = [];
  function visit(prefix) {
    if (prefix.length === level.slots) { codes.push(prefix); return; }
    for (let i = 0; i < 6; i++) if (level.repeats || !prefix.includes(i)) visit([...prefix, i]);
  }
  visit([]); return codes;
}
export const sameCode = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
export function setup(config, { rnd }) {
  const difficulty = Object.hasOwn(LEVELS, config.difficulty) ? config.difficulty : "junior";
  const level = LEVELS[difficulty], codes = allCodes(level);
  return { difficulty, ...level, secret: codes[Math.floor(rnd() * codes.length)],
    names: config.names || ["Detective"], history: [], phase: "play", won: false, gaveUp: false, seq: 0 };
}
export function validGuess(st, code) {
  return Array.isArray(code) && code.length === st.slots &&
    Array.from(code).every((x) => Number.isInteger(x) && x >= 0 && x < 6) &&
    (st.repeats || new Set(code).size === code.length);
}
export function legalActions(st, seat) {
  if (seat !== 0 || st.phase !== "play") return [];
  return allCodes(st).filter((code) => !st.history.some((h) => sameCode(h.code, code)))
    .map((code) => ({ type: "guess", code })).concat({ type: "giveup" });
}
export function apply(st, seat, action) {
  if (seat !== 0 || st.phase !== "play") throw new Error("No puedes jugar en este momento.");
  if (action?.type === "giveup") return { ...st, phase: "over", gaveUp: true, seq: st.seq + 1 };
  if (action?.type !== "guess" || !validGuess(st, action.code)) throw new Error("Completa la fila con personajes válidos y respeta las repeticiones.");
  if (st.history.some((h) => sameCode(h.code, action.code))) throw new Error("Ya probaste esa fila. Cambia algún personaje o su lugar.");
  const feedback = score(st.secret, action.code), won = feedback.exact === st.slots;
  const history = [...st.history, { code: [...action.code], ...feedback }];
  return { ...st, history, won, phase: won || history.length === st.attempts ? "over" : "play", seq: st.seq + 1 };
}
export function view(st) {
  const { secret, ...publicState } = st;
  // Copia independiente: ni la UI ni la compu reciben referencias mutables al motor.
  return JSON.parse(JSON.stringify({ ...publicState, ...(st.phase === "over" ? { solution: secret } : {}) }));
}
export const result = (st) => ({ winner: st.won ? 0 : null, champions: st.won ? [0] : [],
  won: st.won, attempts: st.history.length, difficulty: st.difficulty });
