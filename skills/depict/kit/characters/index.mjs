// The characters a board can be presented by. The marker is depict's own and
// the default; each other one is a module of its own here, made the way
// references/characters.md describes (from a drawing, as often as not). A
// board can also bring its own: `guide: { character: <a module like these> }`.
import marker from "./marker.mjs";
import stuart from "./stuart.mjs";

export const CHARACTERS = { marker, stuart };

/** The character a cast names: a built-in one by its id, one a board brings, or the marker. */
export function characterOf(cast = {}) {
  const c = cast.character;
  if (c && typeof c === "object") return c;
  return CHARACTERS[c ?? "marker"] ?? marker;
}

/** What a character module must say, checked before a board is built with it: every problem at once. */
export function checkCharacter(c) {
  const out = [];
  const need = (k, ok, what) => {
    if (!ok) out.push(`"${k}" ${what}`);
  };
  const num = (v) => Number.isFinite(v);
  const pair = (v) => Array.isArray(v) && v.length === 2 && v.every(num);
  need("id", typeof c.id === "string" && /^[a-z][a-z0-9-]*$/.test(c.id), "is a short lowercase name");
  need("name", typeof c.name === "string", "is how a sentence names it");
  need("measures", c.measures && ["back", "front", "reach"].every((k) => num(c.measures[k]) && c.measures[k] > 0 && c.measures[k] < 1.5), "gives back, front and reach, in units of its height");
  need("shoulders", c.shoulders && pair(c.shoulders.front) && pair(c.shoulders.back), "gives front and back as [u, v]");
  need("arm", c.arm && num(c.arm.width) && (c.arm.fill == null || num(c.arm.fillWidth)), "gives its width (and fillWidth with a fill)");
  need("capPivot", pair(c.capPivot), "is the [u, v] its hat tips about");
  for (const pose of ["rest", "present", "wave", "cheer", "shrug", "scratch", "salute", "tip", "point"]) {
    const P = c.poses?.[pose];
    need(`poses.${pose}`, P && ["front", "back"].every((s) => P[s] && pair(P[s].hand) && pair(P[s].bow) && ["open", "fist", "point"].includes(P[s].glove)), "gives each hand's hand, bow and glove");
  }
  need("personality", c.personality && Array.isArray(c.personality.intros) && c.personality.intros.length && Array.isArray(c.personality.outros) && c.personality.outros.length, "lists its intros and outros");
  need("wear", Array.isArray(c.wear), "lists the shared costumes it can wear");
  need("skins", Array.isArray(c.skins) && c.skins.includes("plain"), "lists its skins, plain among them");
  need("hands", typeof c.hands === "function", "returns its hands' shapes for what it wears");
  const wearable = [...(c.wear ?? []), ...Object.keys(c.costumes ?? {})];
  for (const o of c.outfits ?? []) need(`outfits.${o.name}`, o.name && Array.isArray(o.wear) && o.wear.every((w) => wearable.includes(w)), "is a name and things it can wear");
  need("draw", typeof c.draw === "function", "draws its body and face and returns its eyes");
  return out;
}
