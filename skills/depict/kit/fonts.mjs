// The handwriting fonts, read from disk at build time; a page only carries the strokes it draws.
import fs from "node:fs";

const cache = new Map();

// Glyphs the EMS fonts lack, drawn to match each hand (advance, then polylines in pen order, y up):
// □, the box a missing number goes in (8 + □ = 13), and −, a minus as wide as the equal sign; and a 1 with
// the flag a child is taught to give it, so 11 never reads as ll and a 1 never as one more tick on a ruler.
// Points sit near each corner so the spline through them keeps the corners.
const EXTRA = {
  print: {
    "\u25a1": [880, [100, 676, 140, 677, 730, 683, 768, 684, 768, 644, 762, 24, 760, -14, 720, -15, 134, -19, 94, -20, 95, 20, 99, 636, 101, 680, 150, 684]],
    "\u2212": [520, [118, 250, 290, 262, 452, 276]],
    1: [260, [92, 548, 173, 671, 154, 16]],
  },
  marker: {
    "\u25a1": [680, [70, 760, 108, 761, 552, 767, 590, 768, 589, 728, 585, 26, 584, -12, 546, -13, 102, -15, 64, -16, 65, 24, 68, 722, 71, 764, 116, 768]],
    "\u2212": [480, [80, 292, 270, 306, 440, 322]],
    1: [150, [36, 548, 110, 646, 82, 318, 88, 22]],
  },
};

/** The font for a hand: "print" (EMS Tech) or "marker" (EMS Casual Hand). */
export function hand(name = "print") {
  if (!cache.has(name)) {
    const url = new URL(`./fonts/${name}.json`, import.meta.url);
    if (!fs.existsSync(url)) throw new Error(`no hand named "${name}": use "print" or "marker"`);
    const font = JSON.parse(fs.readFileSync(url, "utf8"));
    Object.assign(font.glyphs, EXTRA[name]);
    cache.set(name, font);
  }
  return cache.get(name);
}
