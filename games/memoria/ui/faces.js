// Las caras de las cartas: una por número de cara del motor (RULES.faces). Por ahora emoji; cuando Petra haga las
// ilustraciones, aquí se cambia el dibujo sin tocar las reglas.
export const FACES = ["🌮", "🌵", "🪅", "🎸", "🌶️", "🥑", "🌽", "☀️", "🌙", "⭐", "🐓", "🐴", "🦜", "🐢", "🐙", "🦋", "🌻", "🍉", "🍍", "🥥", "🎺", "🎲", "🐕", "🍄"];
export const faceOf = (f) => FACES[f] ?? "?";
