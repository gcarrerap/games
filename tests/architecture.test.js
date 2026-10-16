// Revisa en cada `npm test` las reglas de dependencia de docs/ARCHITECTURE.md §2, para que la modularidad no se
// pierda con el tiempo. Lee los imports de todos los .js/.mjs del repositorio; no ejecuta nada.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", ".git", "tests"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.m?js$/.test(name)) out.push(p);
  }
  return out;
}

const rel = (p) => relative(ROOT, p).split(sep).join("/");
// Imports estáticos y dinámicos con ruta relativa, ya resueltos a rutas del repositorio
function importsOf(file) {
  const src = readFileSync(file, "utf8");
  const specs = [...src.matchAll(/(?:from\s*|import\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g)].map((m) => m[1]);
  return specs.map((s) => rel(resolve(dirname(file), s)));
}

// Dónde vive un archivo: { kind: "game" | "module" | "platform" | "other", name, layer }
function where(path) {
  const [top, name, layer] = path.split("/");
  if (top === "games" && name && name !== "registry.js") return { kind: "game", name, layer };
  if (top === "modules" && name) return { kind: "module", name, layer };
  if (top === "platform") return { kind: "platform", layer: name };
  return { kind: "other" };
}

const files = walk(ROOT).map((f) => ({ file: rel(f), imports: importsOf(f) }));

function violations(rule) {
  const out = [];
  for (const { file, imports } of files) for (const to of imports) {
    const msg = rule(where(file), where(to), file, to);
    if (msg) out.push(`${file} → ${to}: ${msg}`);
  }
  return out;
}

test("un juego nunca importa a otro juego", () => {
  assert.deepEqual(violations((a, b) => a.kind === "game" && b.kind === "game" && a.name !== b.name && "juego → otro juego"), []);
});

test("los módulos no importan juegos ni capas de la plataforma fuera de core/ y ui/", () => {
  assert.deepEqual(violations((a, b) => {
    if (a.kind !== "module") return null;
    if (b.kind === "game") return "módulo → juego";
    if (b.kind === "platform" && !["core", "ui"].includes(b.layer)) return "módulo → platform/" + b.layer;
    return null;
  }), []);
});

test("desde fuera, un módulo se usa solo por su API pública (index.js o ui.js)", () => {
  assert.deepEqual(violations((a, b, _from, to) => {
    if (b.kind !== "module" || (a.kind === "module" && a.name === b.name)) return null;
    return /^modules\/[^/]+\/(index|ui)\.js$/.test(to) ? null : "usa un archivo interno del módulo";
  }), []);
});

test("la plataforma no conoce a ningún juego (solo games/registry.js)", () => {
  assert.deepEqual(violations((a, b) => a.kind === "platform" && b.kind === "game" && "platform → juego"), []);
});

test("engine/ y ai/ de cada juego no importan ui/ ni servicios", () => {
  assert.deepEqual(violations((a, b) => {
    if (a.kind !== "game" || !["engine", "ai"].includes(a.layer)) return null;
    if (b.kind === "game" && b.layer === "ui") return "lógica → ui";
    if (b.kind === "platform" && b.layer !== "core") return "lógica → platform/" + b.layer;
    return null;
  }), []);
  assert.deepEqual(violations((a, b) => a.kind === "game" && a.layer === "engine" && b.kind === "game" && b.layer === "ai" && "engine → ai"), []);
});

// Pureza: engine/, ai/ y los módulos sin interfaz no tocan el DOM ni el almacenamiento. El tiempo y el azar entran
// como parámetro; `rnd = Math.random` (o `|| Math.random`) y `now = Date.now()` como valores por defecto se permiten. Lo heredado de myDomino está en DEBT con su
// cuenta máxima: puede bajar, nunca subir (ver docs/ARCHITECTURE.md §8, pendientes).
const DEBT = {
  "games/domino/ai/speculate.js": 1,
  "games/domino/ai/search.js": 2,
  "games/domino/ai/tournament.js": 2,
};
test("la lógica es pura", () => {
  const out = [];
  for (const { file } of files) {
    const w = where(file);
    const logic = (w.kind === "game" && ["engine", "ai"].includes(w.layer) && !file.endsWith("/worker.js"))
      || (w.kind === "module" && !file.endsWith("/ui.js")) || (w.kind === "platform" && w.layer === "core");
    if (!logic) continue;
    const code = readFileSync(join(ROOT, file), "utf8").split("\n").filter((l) => !/^\s*(\/\/|\/?\*)/.test(l)).join("\n");
    if (/\b(document|window|localStorage|sessionStorage)\s*\./.test(code)) out.push(`${file}: usa DOM o almacenamiento`);
    const impure = (code.replace(/(\w+\s*=|\|\|)\s*Math\.random\b(?!\s*\()/g, "").replace(/\bnow\s*=\s*Date\.now\(\)/g, "").match(/Date\.now\s*\(|Math\.random\b/g) || []).length;
    if (impure > (DEBT[file] || 0)) out.push(`${file}: ${impure} usos de Date.now/Math.random (máximo ${DEBT[file] || 0})`);
  }
  assert.deepEqual(out, []);
});
