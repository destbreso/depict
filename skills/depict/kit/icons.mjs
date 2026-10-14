// Icons, drawn by the hand: a Lucide icon flattened on its 24 unit grid,
// scaled to the board, each line wobbled a little. An icon is drawn element
// by element in the order Lucide lists them.
import fs from "node:fs";
import { shapeLines } from "./svgpath.mjs";
import { wobble } from "./ink.mjs";

let set = null;
const load = () => (set ??= JSON.parse(fs.readFileSync(new URL("./icons/lucide.json", import.meta.url), "utf8")));

export const hasIcon = (name) => Object.hasOwn(load(), name);

/** Lucide names close to a missing one, for the error message. */
export function nearIcons(name, max = 6) {
  const words = name.split("-");
  return Object.keys(load())
    .map((k) => [k, words.filter((w) => k.includes(w)).length + (k.startsWith(words[0]) ? 0.5 : 0)])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);
}

/** An icon's strokes with its top-left at (x, y), `size` units across. */
export function icon(p, name, x, y, size) {
  const els = load()[name];
  if (!els) throw new Error(`no icon named "${name}"; close ones: ${nearIcons(name).join(", ") || "none"}`);
  const k = size / 24;
  const lines = [];
  for (const el of els) {
    for (const pts of shapeLines(el, 0.5)) {
      const scaled = pts.map((v, i) => (i % 2 ? y + v * k : x + v * k));
      lines.push(wobble(p, scaled, { amp: Math.min(1.2, 0.3 * p.width), wave: p.r(50, 90) }));
    }
  }
  return lines;
}
