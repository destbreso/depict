// A board in another language: every word it draws and says (its title, its ideas' titles, its items' labels, notes and
// speech, its beats' sentences and notes, the words inside its sketches) looked up in a table of translations, keyed by
// the words as the board's script has them. The board is composed again with the words it is given, so a longer word
// gets its own room, and the audit judges it as any board. A text with no letters in it (a number, a sum) is the same
// in every language and needs no translation.

/** The fields that hold words a board draws or says. */
export const TEXT_KEYS = ["title", "label", "note", "says", "say", "text"];
const WORDS = /\p{L}/u;
// a text as a table has it: the spaces that keep a sum on one line (no-break spaces, the script's) are plain ones there,
// so a translator types what they see; the page keeps sums together in any language
const keyOf = (s) => s.replace(/\u00a0/g, " ");

function walk(v, visit) {
  if (Array.isArray(v)) return v.map((x) => walk(x, visit));
  if (!v || typeof v !== "object") return v;
  const out = {};
  for (const [k, x] of Object.entries(v)) out[k] = TEXT_KEYS.includes(k) && typeof x === "string" && WORDS.test(x) ? visit(x) : walk(x, visit);
  return out;
}

/** Every text of a board that holds words, once each, in the order the script has them. */
export function stringsOf(board) {
  const seen = new Set();
  walk(board, (s) => (seen.add(keyOf(s)), s));
  return [...seen];
}

/**
 * The board in another language: `table` maps each text (as the board has it) to its translation. Returns
 * { board, missing }: the texts it has no translation for stay as they were, and are listed.
 */
export function translate(board, table) {
  const missing = new Set();
  const out = walk(board, (s) => {
    const t = table[keyOf(s)];
    if (typeof t === "string" && t.trim()) return t;
    missing.add(keyOf(s));
    return s;
  });
  return { board: out, missing: [...missing] };
}

/** A table of translations from a file's contents: { lang, strings: { text: translation } }. */
export function readTable(json, lang) {
  const j = typeof json === "string" ? JSON.parse(json) : json;
  if (!j || typeof j.strings !== "object") throw new Error(`a table of translations is { lang, strings }`);
  if (lang && j.lang && j.lang !== lang) throw new Error(`this table is for "${j.lang}", not "${lang}"`);
  return j.strings;
}
