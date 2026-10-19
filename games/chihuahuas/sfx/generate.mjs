// Genera los efectos de la carrera con ElevenLabs y los guarda junto a este archivo.
// Se corre a mano, fuera del navegador. No lo usa el sitio. La llave NO va al repo ni al cliente:
//
//   ELEVENLABS_API_KEY=... node games/chihuahuas/sfx/generate.mjs
//       solo los mp3 que falten (lee prompts.json: llave → prompt, duration, prompt_influence)
//   ELEVENLABS_API_KEY=... node games/chihuahuas/sfx/generate.mjs pasitos
//   ELEVENLABS_API_KEY=... node games/chihuahuas/sfx/generate.mjs --key ladrido-chia
//       regenera esa llave aunque el archivo ya exista
//
// POST https://api.elevenlabs.io/v1/sound-generation → mp3 a 64 kbps.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const API = "https://api.elevenlabs.io/v1/sound-generation";
const FORMAT = "mp3_44100_64";

function wantedKeys() {
  const keys = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--key") {
      if (!args[i + 1]) throw new Error("A --key le falta la llave");
      keys.push(args[++i]);
    } else if (a.startsWith("-")) {
      throw new Error("Opción desconocida: " + a + " (usa --key o el nombre de la llave)");
    } else keys.push(a);
  }
  return keys;
}

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("Falta ELEVENLABS_API_KEY en el entorno. No se regeneró nada.");
  process.exit(1);
}

const prompts = JSON.parse(readFileSync(join(DIR, "prompts.json"), "utf8"));
const only = wantedKeys();
for (const k of only) {
  if (!prompts[k]) {
    console.error("No hay prompt para «" + k + "» en prompts.json");
    process.exit(1);
  }
}

const todo = only.length
  ? only
  : Object.keys(prompts).filter((k) => !existsSync(join(DIR, k + ".mp3")));

if (!todo.length) {
  console.log("No falta ningún efecto. Para regenerar uno: node games/chihuahuas/sfx/generate.mjs <llave>");
  process.exit(0);
}

for (const k of todo) {
  const p = prompts[k];
  const body = { text: p.prompt };
  if (p.duration != null) body.duration_seconds = p.duration;
  if (p.prompt_influence != null) body.prompt_influence = p.prompt_influence;
  const res = await fetch(`${API}?output_format=${FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(k + ": " + res.status + " " + (await res.text()));
    process.exit(1);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(DIR, k + ".mp3"), bytes);
  console.log(k + ".mp3 " + bytes.length + " bytes");
}
