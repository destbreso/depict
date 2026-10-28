// Seeded randomness. Every board is reproducible: the same seed gives the
// same wobble in every line, so a page, its video and a test all see the
// same drawing.

/** splitmix32 and hash32 (act.mjs, where a page that colors a look's shapes in itself has them too). */
import { hash32, splitmix32 } from "./act.mjs";
export { hash32, splitmix32 };

/**
 * One independent stream per name (an idea, a link, a label). Editing one
 * element's text or position never changes the wobble of another.
 */
export function streams(seed) {
  const cache = new Map();
  return function stream(name) {
    let s = cache.get(name);
    if (!s) {
      s = splitmix32((seed ^ hash32(name)) >>> 0);
      cache.set(name, s);
    }
    return s;
  };
}
