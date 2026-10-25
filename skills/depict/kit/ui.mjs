// The player's own words (its buttons, its hint, its start button), in the language a board is built in (scripts/build.mjs
// --lang): English, and the languages depict knows; a board in another language gets English ones until they are here.

const UI = {
  en: {
    back: "Back to the board",
    previous: "Previous sentence",
    play: "Play",
    pause: "Pause",
    replay: "Replay",
    next: "Next sentence",
    time: "Time",
    speed: "Speed",
    hint: "Drag and zoom the board. Tap any part to hear it again.",
    go: "Watch it drawn · {time}",
    noscript: "This board plays with JavaScript. Its explanation:",
  },
  es: {
    back: "Volver a la pizarra",
    previous: "Frase anterior",
    play: "Reproducir",
    pause: "Pausa",
    replay: "Ver otra vez",
    next: "Frase siguiente",
    time: "Tiempo",
    speed: "Velocidad",
    hint: "Arrastra y acerca la pizarra. Toca cualquier parte para volver a verla.",
    go: "Mírala dibujarse · {time}",
    noscript: "Esta pizarra necesita JavaScript. Lo que explica:",
  },
};

/** The player's words in a language ("es", "pt-BR": its own, or its base language's, or English). */
export function uiOf(lang = "en") {
  return { ...UI.en, ...(UI[lang] ?? UI[String(lang).split("-")[0]] ?? {}) };
}
