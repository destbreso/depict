// The handwriting fonts, read from disk at build time; a page only carries the strokes it draws.
import fs from "node:fs";

const cache = new Map();

/** The font for a hand: "print" (EMS Tech) or "marker" (EMS Casual Hand). */
export function hand(name = "print") {
  if (!cache.has(name)) {
    const url = new URL(`./fonts/${name}.json`, import.meta.url);
    if (!fs.existsSync(url)) throw new Error(`no hand named "${name}": use "print" or "marker"`);
    cache.set(name, JSON.parse(fs.readFileSync(url, "utf8")));
  }
  return cache.get(name);
}
