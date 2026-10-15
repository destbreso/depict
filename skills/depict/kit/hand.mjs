// Handwriting. Text is written, not wiped in: every glyph of a single-stroke
// font is a set of polylines in pen order, so a word appears letter by letter
// the way a hand writes it. Each glyph gets a small seeded tilt, size and
// baseline change, so a line reads as handwriting rather than type.
import { smooth } from "./geom.mjs";

/** The height of a capital H in font units: the scale is set so `size` is the cap height on the board. */
function capUnits(font) {
  if (font._cap) return font._cap;
  const h = font.glyphs.H;
  let top = 0;
  for (const s of h.slice(1)) for (let i = 1; i < s.length; i += 2) top = Math.max(top, s[i]);
  font._cap = top || font.capHeight || 500;
  return font._cap;
}

const glyphOf = (font, ch) => font.glyphs[ch] ?? font.glyphs[ch.normalize("NFD")[0]] ?? font.glyphs["?"];

/** A hyphen standing alone between spaces is a minus (15 - 7): it is written as one, as wide as the equal sign. */
const math = (font, text) => (font.glyphs["\u2212"] ? String(text).replace(/(^|\s)-(?=\s|$)/g, "$1\u2212") : String(text));

/**
 * How far a glyph moves the pen: its advance, or further when its ink runs
 * past it. Some glyphs of the EMS fonts draw beyond their own advance (the
 * print hand's I is a stroke at 129 with an advance of 107), and the next
 * letter would land on them: "In" would read as "h".
 */
function advanceOf(font, g) {
  if (!g) return font.em * 0.4;
  if (g._adv != null) return g._adv;
  let right = -Infinity;
  for (const s of g.slice(1)) for (let i = 0; i < s.length; i += 2) right = Math.max(right, s[i]);
  const adv = Math.max(g[0], right + font.em * 0.045);
  Object.defineProperty(g, "_adv", { value: adv, enumerable: false });
  return adv;
}

/** How wide a line of text is at a cap height of `size`. */
export function measure(font, text, size) {
  const k = size / capUnits(font);
  let w = 0;
  for (const ch of math(font, text)) w += advanceOf(font, glyphOf(font, ch)) * k;
  return w;
}

/** Breaks text into lines no wider than maxWidth, at spaces, then evens them out so no line is left with one word. */
export function wrap(font, text, size, maxWidth = Infinity) {
  const lines = greedy(font, text, size, maxWidth);
  if (lines.length < 2 || !Number.isFinite(maxWidth)) return lines;
  // the narrowest width that still needs no more lines gives the most even lines
  let lo = 0;
  let hi = maxWidth;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (greedy(font, text, size, mid).length > lines.length) lo = mid;
    else hi = mid;
  }
  return greedy(font, text, size, hi);
}

/**
 * A sum is one word to the wrapper: a line never breaks at the spaces either side of + − × ÷ = < > (10 + 10 = 20
 * stays whole), nor between a number and the word it counts (10 tens, 2 hundreds).
 */
const wordsOf = (para) =>
  para
    .replace(/ ([+\-\u2212\u00d7\u00f7=<>]) /g, "\u00a0$1\u00a0")
    .replace(/(\d) (?=\p{L})/gu, "$1\u00a0")
    .split(/[ \t]+/)
    .filter(Boolean)
    .map((w) => w.replace(/\u00a0/g, " "));

/** The width of the widest piece of text that cannot be broken (a word, or a sum). */
export function widest(font, text, size) {
  return Math.max(0, ...String(text).split("\n").flatMap(wordsOf).map((w) => measure(font, w, size)));
}

function greedy(font, text, size, maxWidth) {
  const lines = [];
  for (const para of String(text).split("\n")) {
    let cur = "";
    for (const word of wordsOf(para)) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && measure(font, next, size) > maxWidth) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    }
    lines.push(cur);
  }
  return lines;
}

/**
 * Writes text with its top-left (or top-center) at (x, y). Returns the
 * strokes in pen order, the box the ink fills, and each line's place.
 *   size: cap height; lineHeight: in sizes; align: "left" | "center";
 *   maxWidth: wrap width; rng: the element's random stream; wobble: 0 to 1.
 */
export function write(font, text, { x = 0, y = 0, size = 24, lineHeight = 1.9, align = "left", maxWidth = Infinity, rng = Math.random, wobble = 1, step = 2.5 } = {}) {
  const k = size / capUnits(font);
  const lines = wrap(font, math(font, text), size, maxWidth);
  const strokes = [];
  const glyphs = [];
  const placed = [];
  const r = (a) => (rng() * 2 - 1) * a * wobble;
  let top = y;
  let widest = 0;
  for (const lineText of lines) {
    const w = measure(font, lineText, size);
    widest = Math.max(widest, w);
    const baseline = top + size;
    let pen = align === "center" ? x - w / 2 : x;
    const slope = r(0.012); // the line drifts a little up or down
    const start = pen;
    for (const ch of lineText) {
      const g = glyphOf(font, ch);
      const adv = advanceOf(font, g) * k;
      if (g && g.length > 1) {
        const rot = r(0.03);
        const sc = 1 + r(0.035);
        const dy = r(size * 0.035) + (pen - start) * slope;
        const cx = adv / 2;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const from = strokes.length;
        for (const s of g.slice(1)) {
          const pts = [];
          for (let i = 0; i < s.length; i += 2) {
            const gx = s[i] * k * sc - cx;
            const gy = -s[i + 1] * k * sc;
            pts.push(pen + cx + gx * cos - gy * sin, baseline + dy + gx * sin + gy * cos);
          }
          strokes.push(pts.length > 4 ? smooth(pts, step) : pts);
        }
        glyphs.push({ ch, from, to: strokes.length });
      }
      pen += adv;
    }
    placed.push({ text: lineText, x: align === "center" ? x - w / 2 : x, y: top, w, baseline });
    top += size * lineHeight;
  }
  const h = (lines.length - 1) * size * lineHeight + size * 1.3;
  const box = { x: align === "center" ? x - widest / 2 : x, y: y - size * 0.1, w: widest, h };
  return { strokes, glyphs, box, lines: placed };
}
