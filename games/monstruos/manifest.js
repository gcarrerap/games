// El portal carga solo este manifiesto; las ilustraciones y el motor llegan al abrir la mesa.
export default {
  id: "monstruos", name: "Club de Monstruos", players: { min: 1, max: 1 },
  modes: [
    { id: "junior", label: "Junior · 3 lugares", n: 1, difficulty: "junior" },
    { id: "detective", label: "Detective · 4 lugares", n: 1, difficulty: "detective" },
    { id: "expert", label: "Experto · con repetidos", n: 1, difficulty: "expert" },
  ],
};
