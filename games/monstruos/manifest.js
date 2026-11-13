// El portal carga solo este manifiesto; las ilustraciones y el motor llegan al abrir la mesa.
export default {
  id: "monstruos", name: "Club de Monstruos", players: { min: 1, max: 1 },
  modes: [
    { id: "expert", label: "Experto · con repetidos", n: 1, difficulty: "expert" },
    { id: "detective", label: "Detective · 4 lugares", n: 1, difficulty: "detective" },
    // La plataforma escoge el último modo al entrar por primera vez: empezar por el más sencillo.
    { id: "junior", label: "Junior · 3 lugares", n: 1, difficulty: "junior" },
  ],
};
