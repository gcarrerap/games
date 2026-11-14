// El catálogo de Geografía: los países (de data/world.js), los continentes, qué tan conocido es cada país (para los
// niveles), las regiones, los tipos de pregunta y el buscador de nombres de la respuesta escrita. Puro.
import { COUNTRIES, TERRITORIES } from "../data/world.js";
import { geometry, mainland } from "./geo.js";

export { COUNTRIES, TERRITORIES };
export const BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
export const nameOf = (code) => (BY_CODE[code] ? BY_CODE[code].name : code);

// Seis continentes, como se enseñan en América: Centroamérica y el Caribe van con América del Norte.
export const CONTINENTS = [
  { id: "africa", name: "África", short: "África", color: "#e8a33d" },
  { id: "norteamerica", name: "América del Norte", short: "Norteamérica", color: "#d9604c", hint: "con Centroamérica y el Caribe" },
  { id: "sudamerica", name: "América del Sur", short: "Sudamérica", color: "#3fae7a" },
  { id: "europa", name: "Europa", short: "Europa", color: "#5a7fd6" },
  { id: "asia", name: "Asia", short: "Asia", color: "#b86bd0" },
  { id: "oceania", name: "Oceanía", short: "Oceanía", color: "#2fb5b0" },
];
export const CONTINENT_BY_ID = Object.fromEntries(CONTINENTS.map((c) => [c.id, c]));

// ───────── Qué tan conocido es cada país (de más a menos). Los niveles cortan esta lista.
const FAME = `US MX CA BR AR CO PE CL CU VE ES FR DE IT GB PT NL GR RU CN JP IN AU EG ZA NG MA KE ET SA TR IR IQ IL KR KP TH VN ID PH NZ SE NO FI PL UA CH AT IE BE DK BO EC UY PY PA CR GT PK AF
HN SV NI DO HT JM BS TT CZ SK HU RO BG RS HR BA SI LT LV EE BY IS LU AL MK MD DZ TN LY SD SS SN GH CI CM AO MZ MG TZ UG ZM ZW NA BW CD SO KZ UZ TM MN MM BD NP LK MY SG KH LA SY JO LB YE OM AE KW QA PG FJ TW`.split(/\s+/);
const EASY_CUT = 60, MEDIUM_CUT = FAME.length;
const byArea = [...COUNTRIES].sort((a, b) => b.area - a.area).map((c) => c.code);
const ORDER = [...FAME, ...byArea.filter((c) => !FAME.includes(c))];
export const RANK = Object.fromEntries(ORDER.map((c, i) => [c, i]));
for (const c of COUNTRIES) if (RANK[c.code] === undefined) throw new Error(`catálogo: ${c.code} sin posición`);

export const LEVELS = [
  { id: "facil", name: "Fácil", cut: EASY_CUT, choices: 4, typed: false, scale: 1200, hint: "Los países más conocidos · 4 opciones" },
  { id: "medio", name: "Medio", cut: MEDIUM_CUT, choices: 4, typed: false, scale: 900, hint: "Unos 125 países · 4 opciones" },
  { id: "dificil", name: "Difícil", cut: Infinity, choices: 6, typed: false, scale: 600, hint: "Los 197 países · 6 opciones parecidas" },
  { id: "experto", name: "Experto", cut: Infinity, choices: 0, typed: true, scale: 400, hint: "Los 197 países · escribes el nombre" },
];
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));

export const REGIONS = [
  { id: "mundo", name: "Todo el mundo", conts: null },
  { id: "africa", name: "África", conts: ["africa"] },
  { id: "america", name: "América", conts: ["norteamerica", "sudamerica"] },
  { id: "asia", name: "Asia", conts: ["asia"] },
  { id: "europa", name: "Europa", conts: ["europa"] },
  { id: "oceania", name: "Oceanía", conts: ["oceania"] },
];
export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

// Los cuatro modos (y la mezcla)
export const GAME_KINDS = { continentes: "cont", siluetas: "shape", mapa: "pin", banderas: "flag" };
export const GAMES = [
  { id: "continentes", name: "Continentes", icon: "🌎", kind: "cont", hint: "¿En qué continente está este país?" },
  { id: "siluetas", name: "Siluetas", icon: "🗺️", kind: "shape", hint: "¿De qué país es esta forma?" },
  { id: "mapa", name: "Ubica en el mapa", icon: "📍", kind: "pin", hint: "Clava un pin donde crees que está el país" },
  { id: "banderas", name: "Banderas", icon: "🚩", kind: "flag", hint: "¿De qué país es esta bandera?" },
  { id: "mezcla", name: "Mezcla", icon: "🎲", kind: null, hint: "Un poco de cada modo" },
];
export const ROUNDS = [5, 10, 20, 30]; // preguntas por jugador

// Se pueden confundir si salen juntas entre las opciones de una bandera
export const FLAG_SAME = [["ID", "MC"], ["RO", "TD"]]; // casi idénticas: salen separadas y en la respuesta escrita vale cualquiera de las dos
export const FLAG_LOOKALIKE = [["IE", "CI", "IT"], ["NL", "LU", "HR"], ["AU", "NZ"], ["CO", "EC", "VE"], ["SE", "NO", "FI", "DK", "IS"], ["SK", "SI", "RU", "RS"], ["SN", "ML", "GN", "GH", "BO"], ["ID", "MC", "PL"], ["RO", "TD", "AD", "MD"], ["AT", "LV", "PE"], ["SA", "PK", "AE"], ["SD", "EG", "YE", "IQ", "SY"]];
export const sameFlag = (a, b) => a === b || FLAG_SAME.some((g) => g.includes(a) && g.includes(b));

// Los países chiquitos no se reconocen por su silueta (Mónaco, Vaticano…): no salen en ese modo
export function shapeOk(code) {
  const c = BY_CODE[code], g = geometry(code);
  if (!c || !g || c.area < 120) return false;
  return mainland(code).length > 0;
}

/**
 * Países que pueden salir con ese nivel y esa región. Si no alcanzan para `need` preguntas se abren más países
 * (los siguientes más conocidos) hasta que alcancen, o hasta que no quede ninguno.
 */
export function poolFor({ level = "medio", region = "mundo", kind = null, need = 10 } = {}) {
  const lv = LEVEL_BY_ID[level] || LEVEL_BY_ID.medio, rg = REGION_BY_ID[region] || REGION_BY_ID.mundo;
  const ok = (c) => (!rg.conts || rg.conts.includes(c.cont)) && (kind !== "shape" || shapeOk(c.code));
  const inRegion = COUNTRIES.filter(ok).sort((a, b) => RANK[a.code] - RANK[b.code]);
  let pool = inRegion.filter((c) => RANK[c.code] < lv.cut);
  if (pool.length < need) pool = inRegion.slice(0, Math.max(need, pool.length));
  return pool.map((c) => c.code);
}

// ───────── Regiones de la ONU en español (para las pistas)
export const SUBREGION_ES = {
  "Northern Africa": "el norte de África", "Western Africa": "África occidental", "Middle Africa": "África central", "Eastern Africa": "África oriental", "Southern Africa": "el sur de África",
  "Caribbean": "el Caribe", "Central America": "Centroamérica", "North America": "Norteamérica", "South America": "Sudamérica",
  "Western Asia": "Asia occidental (Medio Oriente)", "Central Asia": "Asia central", "Southern Asia": "el sur de Asia", "South-Eastern Asia": "el sudeste asiático", "Eastern Asia": "el este de Asia",
  "Northern Europe": "el norte de Europa", "Western Europe": "Europa occidental", "Central Europe": "Europa central", "Southeast Europe": "el sureste de Europa", "Southern Europe": "el sur de Europa", "Eastern Europe": "Europa oriental",
  "Australia and New Zealand": "Australia y Nueva Zelanda", "Melanesia": "Melanesia", "Micronesia": "Micronesia", "Polynesia": "Polinesia",
};
export const subregionName = (code) => (BY_CODE[code] ? SUBREGION_ES[BY_CODE[code].sub] || "" : "");

// ───────── Buscador de nombres para la respuesta escrita (sin acentos ni mayúsculas)
export const normalize = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const INDEX = COUNTRIES.map((c) => ({ code: c.code, names: [c.name, ...(c.alias || [])].map(normalize) }));
/**
 * Los países cuyo nombre (o alias) empieza con lo escrito, después los que tienen una palabra que empieza así
 * («Unidos» → Estados Unidos) y al final los que lo contienen. Máximo `limit`.
 */
export function search(query, limit = 6) {
  const q = normalize(query);
  if (!q) return [];
  const tiers = [[], [], []];
  for (const it of INDEX) {
    let tier = -1;
    for (const n of it.names) {
      if (n === q || n.startsWith(q)) { tier = 0; break; }
      if (n.split(" ").some((w) => w.startsWith(q))) tier = tier < 0 ? 1 : Math.min(tier, 1);
      else if (q.length >= 3 && n.includes(q) && tier < 0) tier = 2;
    }
    if (tier >= 0) tiers[tier].push(it.code);
  }
  return tiers.flat().slice(0, limit);
}
/** El país que corresponde exactamente a lo escrito (nombre o alias), o null. */
export function exact(query) {
  const q = normalize(query);
  const hit = INDEX.find((it) => it.names.includes(q));
  return hit ? hit.code : null;
}
