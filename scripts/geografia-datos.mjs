#!/usr/bin/env node
// Genera los datos de «Geografía» (games/geografia/data/world.js y las banderas en games/geografia/assets/flags/).
// No es un paso de compilación del sitio: se corre a mano, solo cuando se quiere actualizar el mapa, y el resultado
// se sube al repositorio. El sitio no necesita nada de esto para correr.
//
// Entradas (paquetes de npm, bajados con `npm pack` y descomprimidos):
//   world-atlas    (ISC; Natural Earth, dominio público): countries-50m.json y countries-10m.json (solo para Tuvalu)
//   world-countries (ODbL): nombres en español, región, centro y superficie de cada país
//   flag-icons     (MIT): banderas SVG 4×3
//
// Uso:
//   node scripts/geografia-datos.mjs <carpeta de world-atlas> <countries.json de world-countries> <carpeta flags/4x3> [salida]
// Con la variable SVGO apuntando a un `svgo` instalado, las banderas se comprimen (opcional).
//
// La geometría se guarda en una cadena por país: cada punto es un salto (dx, dy) en pasos de 0,005° respecto al
// anterior, en enteros con signo escritos en base 64 (5 bits por letra y una bandera de «sigue»). Los anillos van
// separados por «,» y los polígonos por «|»; el primer anillo de cada polígono es el exterior y los demás, huecos.
// El anillo no repite el primer punto al final. El lector está en games/geografia/engine/geo.js.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [atlasDir, countriesFile, flagsDir, outDir = "games/geografia"] = process.argv.slice(2);
if (!atlasDir || !countriesFile || !flagsDir) {
  console.error("Uso: node scripts/geografia-datos.mjs <world-atlas> <countries.json> <flags/4x3> [salida]");
  process.exit(1);
}
const Q = 200; // pasos por grado (0,005°, unos 550 m)
const readJSON = (p) => JSON.parse(readFileSync(p, "utf8"));
const topo50 = readJSON(join(atlasDir, "countries-50m.json"));
const topo10 = readJSON(join(atlasDir, "countries-10m.json"));
const meta = readJSON(countriesFile);

// ───────── TopoJSON → polígonos [anillo [[lon, lat]]]
function decoder(topo) {
  const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
  const arc = (k) => (k >= 0 ? arcs[k] : arcs[~k].slice().reverse());
  const ring = (idx) => { const pts = []; for (const k of idx) { const a = arc(k); for (let i = pts.length ? 1 : 0; i < a.length; i++) pts.push(a[i]); } return pts; };
  const polys = (g) => (g.type === "Polygon" ? [g.arcs.map(ring)] : g.type === "MultiPolygon" ? g.arcs.map((p) => p.map(ring)) : []);
  const arcIds = (g) => { const out = new Set(); const walk = (a) => { if (typeof a === "number") out.add(a >= 0 ? a : ~a); else a.forEach(walk); }; walk(g.arcs); return out; };
  return { polys, arcIds, geometries: topo.objects.countries.geometries };
}
const d50 = decoder(topo50), d10 = decoder(topo10);

// ───────── El meridiano 180°
// En el atlas, los polígonos que cruzan el meridiano 180° (el extremo de Rusia, la isla Wrangel, Fiyi) saltan de 180 a −180
// dentro del mismo anillo: en un mapa plano eso dibuja una raya de lado a lado y rompe «¿está este punto dentro?».
// Se parten en el 180° (cada pedazo queda entre −180 y 180, con un borde recto sobre el meridiano). La Antártida es
// distinta: su anillo rodea el polo, así que se cierra bajando a −90° por los dos lados.
function clipX(pts, c, keepLE) {
  const out = [], inside = (p) => (keepLE ? p[0] <= c : p[0] >= c);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (c - a[0]) / (b[0] - a[0]); out.push([c, a[1] + t * (b[1] - a[1])]); }
  }
  return out;
}
const pointInRing = (p, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
function fixPolygon(rawPoly) {
  // El anillo que bordea el polo (todo a ±90°) no es una frontera: se descarta
  const poly = rawPoly.filter((r) => !r.every((p) => Math.abs(p[1]) > 89.9));
  if (!poly.length) return [];
  const open = (r) => (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] ? r.slice(0, -1) : r);
  const outer = open(poly[0]), holes = poly.slice(1);
  let jumps = 0, drift = 0;
  const u = [[outer[0][0], outer[0][1]]];
  for (let i = 1; i <= outer.length; i++) {
    const a = outer[i - 1], b = outer[i % outer.length];
    let d = b[0] - a[0];
    if (d > 180) { drift -= 360; jumps++; } else if (d < -180) { drift += 360; jumps++; }
    if (i < outer.length) u.push([b[0] + drift, b[1]]);
  }
  if (!jumps) return [poly];
  if (drift !== 0) { // rodea un polo (solo la Antártida)
    const pole = drift > 0 ? -90 : 90, last = outer[outer.length - 1];
    return [[[...outer, [180, last[1]], [180, pole], [-180, pole]], ...holes]];
  }
  const mean = u.reduce((s, p) => s + p[0], 0) / u.length, sh = -360 * Math.round(mean / 360);
  const pts = u.map(([x, y]) => [x + sh, y]);
  const parts = [clipX(clipX(pts, 180, true), -180, false)];
  if (pts.some((p) => p[0] > 180)) parts.push(clipX(pts, 180, false).map(([x, y]) => [x - 360, y]));
  if (pts.some((p) => p[0] < -180)) parts.push(clipX(pts, -180, true).map(([x, y]) => [x + 360, y]));
  const ok = parts.filter((r) => r.length >= 3 && Math.abs(r.reduce((a, p, i, arr) => { const q = arr[(i + 1) % arr.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) > 1e-9);
  return ok.map((r) => [r, ...holes.filter((h) => pointInRing(h[0], r))]);
}

// ───────── Qué es cada cosa
const byN3 = new Map(meta.map((c) => [c.ccn3, c]));
const byA2 = new Map(meta.map((c) => [c.cca2, c]));
const QUIZ = new Set(meta.filter((c) => c.unMember || ["PS", "VA", "XK", "TW"].includes(c.cca2)).map((c) => c.cca2)); // 193 de la ONU + Vaticano, Palestina, Kosovo y Taiwán

const CONT = { Africa: "africa", Europe: "europa", Asia: "asia", Oceania: "oceania", Antarctic: "antartida" };
const contOf = (c) => (c.region === "Americas" ? (c.subregion === "South America" ? "sudamerica" : "norteamerica") : CONT[c.region]);

// Países en dos continentes: la respuesta principal sale del dato; aquí, la otra que también se acepta
const ALT_CONT = { RU: "asia", TR: "europa", KZ: "europa", GE: "europa", AM: "europa", AZ: "europa", CY: "asia", EG: "asia" };
const MAIN_CONT = { RU: "europa", CY: "europa", TR: "asia" };

// Nombres que se dicen distinto en español de América
const NAME = {
  SA: "Arabia Saudita", CD: "RD del Congo", CG: "República del Congo", IR: "Irán", SZ: "Esuatini", GD: "Granada", BH: "Baréin",
  RO: "Rumanía", KG: "Kirguistán", BN: "Brunéi", GW: "Guinea-Bisáu", FJ: "Fiyi", TL: "Timor Oriental",
};
// Otros nombres con que alguien podría escribirlos (el buscador de la respuesta escrita los acepta)
const ALIAS = {
  US: ["EE. UU.", "EEUU", "USA", "Estados Unidos de América"], GB: ["Gran Bretaña", "Inglaterra", "UK"], NL: ["Holanda"],
  MM: ["Birmania"], CI: ["Côte d'Ivoire"], CZ: ["República Checa"], BY: ["Belarús"], MD: ["Moldova"], TR: ["Türkiye"],
  QA: ["Qatar"], DJ: ["Yibuti"], CD: ["República Democrática del Congo", "Congo Kinshasa", "Zaire"], CG: ["Congo", "Congo Brazzaville"],
  KR: ["Corea"], KP: ["Corea"], SZ: ["Suazilandia", "Swazilandia"], KG: ["Kirguizistán"], KZ: ["Kazajstán"], TL: ["Timor Leste"],
  VA: ["Vaticano", "Santa Sede"], MK: ["Macedonia"], AE: ["Emiratos", "EAU"], SA: ["Arabia Saudí"], GD: ["Grenada"], BH: ["Bahrein"],
  ST: ["Santo Tomé"], KN: ["San Cristóbal", "Saint Kitts"], VC: ["San Vicente"], AG: ["Antigua"], TT: ["Trinidad"], BA: ["Bosnia"],
  PG: ["Papúa Nueva Guinea"], GW: ["Guinea Bissau"], CF: ["Centroafricana"], DO: ["Dominicana"], FM: ["Estados Federados de Micronesia"],
  SB: ["Salomón"], MH: ["Marshall"], BS: ["Las Bahamas"], GM: ["La Gambia"], CV: ["Cabo Verde", "Cape Verde"], BN: ["Brunei"],
  LA: ["Laos"], RO: ["Rumania"], GR: ["Grecia"], KH: ["Kampuchea"], LK: ["Ceilán"], TW: ["República de China"], PS: ["Territorios Palestinos"],
};

// ───────── Los 241 polígonos del atlas → un registro por país o territorio
const records = new Map(); // code → { polys, arcs:Set, quiz }
const TERRITORY_MERGE = { Somaliland: "SO", "N. Cyprus": "CY" };
const SKIP = new Set(["Siachen Glacier"]);
const addRecord = (code, polys, arcs) => {
  const r = records.get(code) || { polys: [], arcs: new Set() };
  r.polys.push(...polys); for (const a of arcs) r.arcs.add(a); records.set(code, r);
};
for (const g of d50.geometries) {
  const name = g.properties.name;
  if (SKIP.has(name)) continue;
  let code = null;
  if (g.id) { const c = byN3.get(String(g.id).padStart(3, "0")); if (c) code = c.cca2; }
  else if (name === "Kosovo") code = "XK";
  else if (TERRITORY_MERGE[name]) code = TERRITORY_MERGE[name];
  else if (name === "Indian Ocean Ter.") code = "IOT";
  if (!code) { console.warn("sin código:", name, g.id); continue; }
  addRecord(code, d50.polys(g).flatMap(fixPolygon), d50.arcIds(g));
}
// Tuvalu no está en el atlas de 50 m: sale del de 10 m
for (const g of d10.geometries) if (g.properties.name === "Tuvalu") addRecord("TV", d10.polys(g).flatMap(fixPolygon), new Set());

// ───────── Cuantizar y escribir la geometría
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function put(n) { let v = n < 0 ? (-n << 1) - 1 : n << 1; let s = ""; while (v >= 32) { s += ALPHA[(v & 31) | 32]; v >>= 5; } return s + ALPHA[v]; }
function encodeRing(pts) {
  let px = 0, py = 0, s = "";
  for (const [x, y] of pts) { s += put(x - px) + put(y - py); px = x; py = y; }
  return s;
}
function quantRing(r) {
  const out = [];
  for (const [lon, lat] of r) {
    const p = [Math.round((lon + 180) * Q), Math.round((lat + 90) * Q)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  if (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop(); // sin repetir el primero
  return out;
}
const areaOf = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };
function encodeCountry(polys) {
  const out = [];
  for (const poly of polys) {
    const rings = poly.map(quantRing).filter((r) => r.length >= 3 && areaOf(r) > 0);
    if (!rings.length) continue;
    out.push(rings.map(encodeRing).join(","));
  }
  return out.join("|");
}

// ───────── Colores del mapa: ningún vecino repite color (por arcos compartidos)
const codes = [...records.keys()];
const nb = new Map(codes.map((c) => [c, new Set()]));
const owner = new Map();
for (const c of codes) for (const a of records.get(c).arcs) { if (owner.has(a)) { const o = owner.get(a); if (o !== c) { nb.get(c).add(o); nb.get(o).add(c); } } else owner.set(a, c); }
const PALETTE = 8;
const color = new Map();
for (const c of [...codes].sort((a, b) => nb.get(b).size - nb.get(a).size || (a < b ? -1 : 1))) {
  const used = new Set([...nb.get(c)].map((n) => color.get(n)).filter((x) => x !== undefined));
  let k = 0; while (used.has(k)) k++;
  color.set(c, k % PALETTE);
}

// ───────── Metadatos
const spa = (c) => NAME[c.cca2] || c.translations.spa.common;
const countries = [], territories = [], geometry = {};
for (const code of [...codes].sort()) {
  const rec = records.get(code), enc = encodeCountry(rec.polys);
  if (code === "IOT") { territories.push({ code, name: "Territorios australianos del Índico", cont: "oceania", color: color.get(code) }); geometry[code] = enc; continue; }
  const c = byA2.get(code) || (code === "XK" ? { cca2: "XK", region: "Europe", subregion: "Southeast Europe", latlng: [42.667, 21.167], area: 10908, translations: { spa: { common: "Kosovo" } } } : null);
  if (!c) { console.warn("sin metadatos:", code); continue; }
  geometry[code] = enc;
  if (QUIZ.has(code)) {
    const cont = MAIN_CONT[code] || contOf(c);
    const row = { code, name: spa(c), cont, sub: c.subregion, ll: [Math.round(c.latlng[0] * 100) / 100, Math.round(c.latlng[1] * 100) / 100], area: Math.round(c.area), color: color.get(code) };
    if (ALT_CONT[code]) row.alt = ALT_CONT[code];
    if (ALIAS[code]) row.alias = ALIAS[code];
    countries.push(row);
  } else territories.push({ code, name: spa(c), cont: contOf(c), color: color.get(code) });
}
for (const code of QUIZ) if (!geometry[code]) console.warn("país sin geometría:", code);

// El orden del juego es el alfabético en español
countries.sort((a, b) => a.name.localeCompare(b.name, "es"));
const header = `// Generado por scripts/geografia-datos.mjs: NO editar a mano (ver el encabezado de ese script y games/geografia/README.md).
// Mapa: Natural Earth (dominio público) vía world-atlas; nombres y datos: world-countries; ${countries.length} países y ${territories.length} territorios.
`;
mkdirSync(join(outDir, "data"), { recursive: true });
const lines = [header, "export const COUNTRIES = [", ...countries.map((c) => "  " + JSON.stringify(c) + ","), "];", "",
  "export const TERRITORIES = [", ...territories.map((t) => "  " + JSON.stringify(t) + ","), "];", "",
  "export const GEOMETRY = {", ...Object.keys(geometry).sort().map((k) => `  ${k}: ${JSON.stringify(geometry[k])},`), "};", ""];
writeFileSync(join(outDir, "data", "world.js"), lines.join("\n"));
console.log(`world.js: ${countries.length} países, ${territories.length} territorios, ${(lines.join("\n").length / 1024).toFixed(0)} KiB`);

// ───────── Banderas
const flagOut = join(outDir, "assets", "flags");
mkdirSync(flagOut, { recursive: true });
let optimize = null;
if (process.env.SVGO) { try { ({ optimize } = await import(pathToFileURL(process.env.SVGO).href)); } catch (e) { console.warn("sin svgo:", e.message); } }
let total = 0;
for (const c of countries) {
  const src = join(flagsDir, `${c.code.toLowerCase()}.svg`);
  if (!existsSync(src)) { console.warn("sin bandera:", c.code); continue; }
  const dst = join(flagOut, `${c.code.toLowerCase()}.svg`);
  if (optimize) {
    const r = optimize(readFileSync(src, "utf8"), { multipass: true, floatPrecision: 2, plugins: ["preset-default", { name: "removeViewBox", active: false }, { name: "cleanupIds", params: { minify: true, prefix: c.code.toLowerCase() } }] });
    writeFileSync(dst, r.data); total += r.data.length;
  } else { copyFileSync(src, dst); total += readFileSync(dst).length; }
}
console.log(`banderas: ${countries.length}, ${(total / 1024).toFixed(0)} KiB${optimize ? " (comprimidas con svgo)" : ""}`);
