// Aviso "Hay una versión nueva · Actualizar" (heredado de myDomino #19). Vive fuera de #app para verse en
// cualquier pantalla. No recarga solo: así no interrumpe a nadie a media partida.
export function renderUpdateBar(state) {
  let bar = document.getElementById("update");
  if (!state.updateAvailable) { if (bar) bar.remove(); return; }
  if (bar) return;
  bar = document.createElement("div");
  bar.id = "update"; bar.className = "update-bar"; bar.setAttribute("role", "status");
  bar.innerHTML = `<span>Hay una versión nueva</span><button class="primary" id="updatenow">Actualizar</button>`;
  document.body.appendChild(bar);
  bar.querySelector("#updatenow").onclick = () => location.reload();
}
