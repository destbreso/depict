// Composing the board: sizes and places every region and item, routes the
// links, and turns all of it into elements made of strokes in pen order. The
// board's unit is a pixel at the size a region is shown: a region is laid out
// to fill a 16:9 frame about 1600 units wide, so the camera's ordinary shot
// is close to 1:1 and only the final overview pulls back.
import { hash32, streams } from "./rng.mjs";
import * as ink from "./ink.mjs";
import { write } from "./hand.mjs";
import { icon } from "./icons.mjs";
import { person, TINTS } from "./people.mjs";
import { rig } from "./rig.mjs";
import { layRoad, stretch } from "./road.mjs";
import { flattenPath } from "./svgpath.mjs";
import { bounds, cubic, pad, union } from "./geom.mjs";
import { CAPTION_BAND, shotSafe } from "./camera.mjs";

export const INK = "#1b1b19";
export const GREY = "#55554f";
export const SHADE = "#8f8f88";
export const HIGHLIGHTER = "#f2c94c";
export const SHADOW = "#d9d5ca";
const PAPER = "#fbfaf7";
/** The shirts a character gets when the script does not choose one: one of these, the same for the same id. */
const SHIRTS = ["blue", "green", "sand", "pink"];

/** Sizes, in board units (cap heights for text). */
export const SIZE = {
  boardTitle: 64,
  regionTitle: 42,
  label: 32,
  note: 21,
  linkLabel: 22,
  icon: 104,
  sketch: 150, // a drawn object, across
  character: 210, // a person, tall
  guide: 270, // the marker who greets the viewer beside the title
  story: 40, // the width of a story arrow, the wide arrow from one idea to the next
  large: 1.55, // how much bigger a large item's picture is (its label grows by a fifth)
  cardWidth: 300, // the widest a label or note runs before it wraps
  gapRow: 160, // between items side by side: room for an arrow and its label
  gapColumn: 100,
  regionGap: 340, // between one region's content and the next on a canvas: about twice the gap inside a region, so ideas read as groups, and room for a story arrow
  sheetGap: 200, // between slides on the table
  frame: [1120, 630], // the smallest shot of a region
  frameAir: 90, // space round a region's content inside its shot
};
const W = { line: 5, icon: 4.6, label: 4, note: 3.1, title: 6.4, mark: 5, link: 4.6, story: 4.8, highlight: 0 };

/** One element: something drawn as one gesture group (an item, a link, a note, a mark), with the strokes of each of its parts. */
const element = (id, kind, parts) => ({ id, kind, parts, box: bounds(parts.flatMap((p) => p.strokes)) });
const part = (role, strokes, { width = W.line, color = INK, layer = "ink", opacity = 1, write = false, size = 0, group = null } = {}) => ({ role, strokes, width, color, layer, opacity, write, size, group });

/** The colors a sketch's shape can be filled with. */
const fillColor = (board, name) => ({ ...TINTS, accent: board.accent, yellow: HIGHLIGHTER, ink: INK })[name];

/**
 * A sketch the agent drew, as SVG paths in a 100 x 100 box: scaled to the
 * board and wobbled by the hand. A path with a fill is colored in after the
 * lines, with a broad nib, under them. Returns the parts: the lines, then
 * each fill.
 */
function sketchParts(board, font, S, id, p, paths, x, y, size, width) {
  const k = size / 100;
  const lines = [];
  const thin = []; // details drawn with a finer nib (a grid inside a block, a label's ring)
  const fills = [];
  const words = [];
  paths.forEach((e, n) => {
    if (e.text != null) {
      // words inside the drawing (a clock's numbers, a coin's value), in the board's hand, centered on their place
      const t = write(font, String(e.text), { x: 0, y: 0, size: (e.size ?? 10) * k, align: "center", rng: S(`${id}.text.${n}`) });
      const [cx, cy] = [x + e.at[0] * k, y + e.at[1] * k];
      const dx = cx - (t.box.x + t.box.w / 2);
      const dy = cy - (t.box.y + t.box.h / 2);
      words.push(...move([part("text", t.strokes, { width: Math.max(1.6, (e.size ?? 10) * k * 0.13), color: e.color === "grey" ? GREY : e.color === "paper" ? PAPER : INK, write: true, size: (e.size ?? 10) * k, group: "figure" })], dx, dy));
      return;
    }
    const polys = flattenPath(e.d, 0.8).map((pts) => pts.map((v, i) => (i % 2 ? y + v * k : x + v * k)));
    for (const pts of polys) (e.fine ? thin : lines).push(ink.wobble(p, pts, { amp: Math.min(e.fine ? 0.6 : 1.4, 0.32 * p.width) }));
    if (e.fill) {
      const f = ink.fill(p, polys[0], { nib: Math.max(7, size * 0.07), angle: -35 });
      fills.push(part("fill", f.strokes, { width: f.width, color: fillColor(board, e.fill), layer: "under", opacity: e.fill === "ink" ? 0.95 : 0.88, group: "figure" }));
    }
  });
  return [part("sketch", lines, { width, group: "figure" }), ...(thin.length ? [part("sketch", thin, { width: Math.max(1.6, width * 0.42), group: "figure" })] : []), ...fills, ...words];
}

/**
 * The content of an item, laid out with its top-center at (0, 0): its
 * picture (an icon, a sketch or a character, and what the character says),
 * label, note, then the shape drawn round them. `ground` is where the
 * picture stands: the line its foot is on.
 */
function itemParts(board, font, it, S) {
  const parts = [];
  let ground = null;
  const big = it.size === "large" ? SIZE.large : 1;
  let y = 0;
  const kind = it.icon ? "icon" : it.sketch ? "sketch" : it.character ? "character" : null;
  if (kind) {
    const size = SIZE[kind] * big;
    const width = W.icon * (big > 1 ? 1.2 : 1);
    const p = ink.pen(S(`${it.id}.${kind}`), { width });
    let strokes;
    if (kind === "icon") {
      strokes = icon(p, it.icon, -size / 2, y, size);
      parts.push(part(kind, strokes, { width }));
    } else {
      // a sketch or a character is a picture of several parts (lines, then color), drawn as one gesture
      const drawn =
        kind === "sketch"
          ? sketchParts(board, font, S, it.id, p, it.sketch, -size / 2, y, size, width)
          : person(p, 0, y, size, { ...it.character, shirt: it.character.shirt ?? SHIRTS[hash32(it.id) % SHIRTS.length], accent: board.accent }).map((q) => part(q.role, q.strokes, { width: q.width, color: q.color, layer: q.layer, opacity: q.opacity, group: "figure" }));
      parts.push(...drawn);
      strokes = drawn.filter((q) => q.layer === "ink").flatMap((q) => q.strokes);
    }
    if (it.says) {
      // what the character says, in a bubble beside its head on the side it faces, clear of a raised hand
      const right = it.character.facing !== "left";
      const t = write(font, it.says, { x: 0, y: 0, size: SIZE.note * 1.05, align: "center", maxWidth: 230, rng: S(`${it.id}.says`) });
      const bw = t.box.w + 44;
      const bh = t.box.h + 30;
      let lo = Infinity;
      let hi = -Infinity;
      for (const pts of strokes) for (let i = 0; i < pts.length; i += 2) if (pts[i + 1] < y + size * 0.42) {
        lo = Math.min(lo, pts[i]);
        hi = Math.max(hi, pts[i]);
      }
      const bx = right ? hi + 12 : lo - 12 - bw;
      const by = y + size * 0.04 - bh * 0.6;
      parts.push(...move([part("says", t.strokes, { width: W.note, write: true, size: SIZE.note * 1.05 })], bx + bw / 2 - (t.box.x + t.box.w / 2), by + bh / 2 - (t.box.y + t.box.h / 2)));
      const bubble = ink.bubble(ink.pen(S(`${it.id}.bubble`), { width: W.note }), { x: bx, y: by, w: bw, h: bh }, { tail: right ? "left" : "right" });
      parts.push(part("bubble", bubble, { width: W.note * 1.1 }));
      parts.push(part("shadow", dropShadow(bubble, 6, 7), { width: 9, color: SHADOW, layer: "shadow" }));
    }
    const pb = bounds(strokes);
    ground = pb.y + pb.h;
    y = ground + 18;
  }
  let labelBox = null;
  if (it.label) {
    const wide = ["banner", "bubble"].includes(it.shape) ? SIZE.cardWidth * 1.6 : SIZE.cardWidth;
    const ls = SIZE.label * (big > 1 ? 1.2 : 1);
    const t = write(font, it.label, { x: 0, y, size: ls, align: "center", maxWidth: wide * (big > 1 ? 1.2 : 1), rng: S(`${it.id}.label`), lineHeight: 1.6 });
    parts.push(part("label", t.strokes, { width: W.label * (big > 1 ? 1.15 : 1), write: true, size: ls }));
    labelBox = t.box;
    y = t.box.y + t.box.h + 12;
  }
  if (it.note) {
    const t = write(font, it.note, { x: 0, y, size: SIZE.note, align: "center", maxWidth: SIZE.cardWidth, rng: S(`${it.id}.note`), lineHeight: 1.75 });
    parts.push(part("note", t.strokes, { width: W.note, color: GREY, write: true, size: SIZE.note }));
  }
  const content = bounds(parts.flatMap((p) => p.strokes));
  const words = bounds(parts.filter((q) => q.role === "label" || q.role === "note").flatMap((q) => q.strokes));
  const p = ink.pen(S(`${it.id}.shape`), { width: W.line });
  const shapes = {
    box: () => ink.box(p, content.x - 28, content.y - 24, content.w + 56, content.h + 48),
    ellipse: () => ink.circleAround(p, content, 12),
    circle: () => {
      const r = Math.hypot(content.w, content.h) / 2 + 16;
      return ink.ellipse(p, content.x + content.w / 2, content.y + content.h / 2, r, r);
    },
    cloud: () => ink.cloud(p, content, 10),
    bubble: () => ink.bubble(p, pad(content, 26, 20)),
    banner: () => ink.banner(p, pad(content, 30, 16)),
  };
  if (it.shape !== "none") {
    const outline = shapes[it.shape]();
    parts.push(part("shape", outline, { width: W.line }));
    if (it.shape === "banner") {
      // a banner is the take-away: its band colored in, its folded ends in the accent
      const band = pad(content, 30, 16);
      const f = ink.fill(p, [band.x, band.y, band.x + band.w, band.y, band.x + band.w, band.y + band.h, band.x, band.y + band.h], { nib: 15, angle: -30 });
      parts.push(part("fill", f.strokes, { width: f.width, color: HIGHLIGHTER, layer: "under", opacity: 0.8 }));
      for (const end of outline.slice(1)) {
        const e = ink.fill(p, end, { nib: 11, angle: 60, edge: 0.4 });
        parts.push(part("fill", e.strokes, { width: e.width, color: board.accent, layer: "under", opacity: 0.85 }));
      }
    }
    // and a drop shadow, a grey marker along its lower right, so it stands off the paper
    if (it.shape !== "ellipse" && it.shape !== "circle") parts.push(part("shadow", dropShadow(outline.slice(0, 1)), { width: 11, color: SHADOW, layer: "shadow" }));
  }
  if (it.figure) {
    // a live part: a small play mark at its top right, in the accent, saying "this one runs"
    const b = bounds(parts.flatMap((q) => q.strokes));
    const r = 22;
    const cx = b.x + b.w + 6;
    const cy = b.y + 4;
    const lp = ink.pen(S(`${it.id}.live`), { width: W.mark * 0.8 });
    const tri = ink.polyline(lp, [cx - 6, cy - 9, cx + 10, cy, cx - 6, cy + 9], true);
    parts.push(part("live", [...ink.ellipse(lp, cx, cy, r, r, { overshoot: 0.08 }), ...tri], { width: W.mark * 0.8, color: board.accent }));
  }
  return { parts, labelBox, wordsBox: words.w ? words : null, ground };
}

/**
 * A drop shadow for a closed outline: the stretches of it that face down and
 * to the right, moved that way and drawn wide in grey, the way a sketchnoter
 * shades a frame with one grey marker.
 */
function dropShadow(lines, dx = 8, dy = 9) {
  const out = [];
  for (const pts of lines) {
    const b = bounds([pts]);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    let run = [];
    for (let i = 0; i < pts.length; i += 2) {
      // facing down-right: the point lies on the far side of the center toward the lower right
      const facing = (pts[i] - cx) / (b.w / 2 || 1) + (pts[i + 1] - cy) / (b.h / 2 || 1) > 0.55;
      if (facing) run.push(pts[i] + dx, pts[i + 1] + dy);
      else if (run.length) {
        if (run.length >= 6) out.push(run);
        run = [];
      }
    }
    if (run.length >= 6) out.push(run);
  }
  return out;
}

const move = (parts, dx, dy) =>
  parts.map((p) => ({ ...p, strokes: p.strokes.map((pts) => pts.map((v, i) => v + (i % 2 ? dy : dx))) }));
const moveBox = (b, dx, dy) => b && { ...b, x: b.x + dx, y: b.y + dy };

/**
 * Adjacent cells (an array, a row of a table) or a stack: every cell one
 * size, each sharing its edge with the one before, so the first is a whole
 * box and the others add three sides. The label sits inside; the note under a
 * cell, or beside an entry of a stack (an index, a value).
 */
function cellCards(board, font, region, S) {
  const across = region.layout === "cells";
  const cellItems = region.items.filter((it) => it.under == null);
  const labels = cellItems.map((it) => write(font, it.label, { x: 0, y: 0, size: SIZE.label, align: "center", maxWidth: SIZE.cardWidth, rng: S(`${it.id}.label`) }));
  const cw = Math.max(...labels.map((t) => t.box.w)) + 64;
  const ch = Math.max(...labels.map((t) => t.box.h)) + 46;
  // cells with at: [column, row] make a matrix, every cell sharing its edges with its neighbours
  const matrix = cellItems.some((it) => Array.isArray(it.at));
  const cells = cellItems.map((it, i) => {
    const [ci, ri] = matrix ? it.at : across ? [i, 0] : [0, i];
    const x = ci * cw;
    const y = ri * ch;
    const p = ink.pen(S(`${it.id}.shape`), { width: W.line });
    let cell;
    if (matrix) {
      // its right and bottom sides, and its top and left where no cell is above or before it
      const above = cellItems.some((o) => o.at[0] === ci && o.at[1] === ri - 1);
      const before = cellItems.some((o) => o.at[0] === ci - 1 && o.at[1] === ri);
      cell = ink.polyline(p, !before && !above ? [x, y + ch, x, y, x + cw, y, x + cw, y + ch, x, y + ch] : !above ? [x, y, x + cw, y, x + cw, y + ch, x, y + ch] : !before ? [x + cw, y, x + cw, y + ch, x, y + ch, x, y] : [x + cw, y, x + cw, y + ch, x, y + ch]);
    } else cell = i === 0 ? ink.box(p, x, y, cw, ch, { corner: 3 }) : across ? ink.polyline(p, [x, y, x + cw, y, x + cw, y + ch, x, y + ch]) : ink.polyline(p, [x + cw, y, x + cw, y + ch, x, y + ch, x, y]);
    const t = labels[i];
    const parts = [part("shape", cell, { width: W.line }), ...move([part("label", t.strokes, { width: W.label, write: true, size: SIZE.label })], x + cw / 2 - (t.box.x + t.box.w / 2), y + ch / 2 - (t.box.y + t.box.h / 2))];
    if (it.note) {
      const n = write(font, it.note, { x: 0, y: 0, size: SIZE.note, align: across ? "center" : "left", maxWidth: across ? cw : SIZE.cardWidth, rng: S(`${it.id}.note`) });
      const [nx, ny] = across ? [x + cw / 2 - (n.box.x + n.box.w / 2), y + ch + 14 - n.box.y] : [x + cw + 22 - n.box.x, y + ch / 2 - (n.box.y + n.box.h / 2)];
      parts.push(...move([part("note", n.strokes, { width: W.note, color: GREY, write: true, size: SIZE.note })], nx, ny));
    }
    const words = bounds(parts.filter((q) => q.role !== "shape").flatMap((q) => q.strokes));
    return { it, parts, labelBox: moveBox(t.box, x + cw / 2 - (t.box.x + t.box.w / 2), y + ch / 2 - (t.box.y + t.box.h / 2)), wordsBox: words, box: bounds(parts.flatMap((q) => q.strokes)) };
  });
  // items that hang under a cell, one below the other, with room for an arrow between
  const hung = [];
  const depth = new Map(cells.map((c) => [c.it.id, c.box.y + c.box.h]));
  for (const it of region.items.filter((x) => x.under != null)) {
    const { parts, labelBox, wordsBox } = itemParts(board, font, it, S);
    const box = bounds(parts.flatMap((q) => q.strokes));
    const cell = cells.find((c) => c.it.id === it.under);
    const dx = cell.box.x + cell.box.w / 2 - (box.x + box.w / 2);
    const dy = depth.get(it.under) + 84 - box.y;
    depth.set(it.under, box.y + dy + box.h);
    hung.push({ it, parts: move(parts, dx, dy), labelBox: moveBox(labelBox, dx, dy), wordsBox: moveBox(wordsBox, dx, dy), box: moveBox(box, dx, dy) });
  }
  return [...cells, ...hung];
}

/** Which way a character faces when the script does not say: into its region, as a figure in a picture looks into it, never out of it. */
function faceInto(region, it, index) {
  const n = region.items.length;
  if (region.layout === "row") return index > (n - 1) / 2 ? "left" : "right";
  if (region.layout === "grid") {
    const cols = Math.max(...region.items.map((x) => x.at[0])) + 1;
    return it.at[0] > (cols - 1) / 2 ? "left" : "right";
  }
  if (region.layout === "radial") {
    const hub = region.items.find((x) => x.size === "large") ?? region.items[0];
    if (it === hub) return "right";
    const rest = region.items.filter((x) => x !== hub);
    return Math.cos(radialAngle(rest.indexOf(it), rest.length)) > 0.05 ? "left" : "right";
  }
  return "right";
}

/** Where satellite i of n sits round a hub: evenly, starting so they sit balanced (two: either side; three: a triangle; four: the corners). */
const radialAngle = (i, n) => ((-90 + 180 / n + (360 * i) / n) * Math.PI) / 180;

/** Where a card stands: the foot of its picture, or, for a card of words alone, just above its label. Pictures in a row share one ground line, and their labels a line under it. */
const groundOf = (c) => c.ground ?? (c.labelBox ? c.labelBox.y - 18 : c.box.y + c.box.h / 2);

/** Lays out one region's items (row, column, grid, radial, cells or stack) with the region's top-left at (0, 0). The first region also carries the board's title, as its top line, and the guide beside it. */
function layoutRegion(board, font, region, S, first) {
  const celled = region.layout === "cells" || region.layout === "stack";
  region.items.forEach((it, i) => {
    if (it.character && it.character.facing == null) it.character.facing = faceInto(region, it, i);
  });
  const cards = celled
    ? cellCards(board, font, region, S)
    : region.items.map((it) => {
        const { parts, labelBox, wordsBox, ground } = itemParts(board, font, it, S);
        return { it, parts, labelBox, wordsBox, ground, box: bounds(parts.flatMap((p) => p.strokes)) };
      });
  const place = (c, x, y) => {
    // the card's box is placed with its top-left at (x, y)
    const dx = x - c.box.x;
    const dy = y - c.box.y;
    c.parts = move(c.parts, dx, dy);
    c.labelBox = moveBox(c.labelBox, dx, dy);
    c.wordsBox = moveBox(c.wordsBox, dx, dy);
    if (c.ground != null) c.ground += dy;
    c.box = moveBox(c.box, dx, dy);
  };
  const lift = (c) => groundOf(c) - c.box.y; // how far below its top a card stands
  // the gap between two neighbours: wider when a link between them says they are far apart
  const apart = (a, b, gap) => (board.links.some((l) => l.far && ((l.from === a.it.id && l.to === b.it.id) || (l.from === b.it.id && l.to === a.it.id))) ? gap * 2.4 : gap);
  if (celled) {
    // already in place, edge to edge
  } else if (region.layout === "radial") {
    const hub = cards.find((c) => c.it.size === "large") ?? cards[0];
    const rest = cards.filter((c) => c !== hub);
    const mw = Math.max(0, ...rest.map((c) => c.box.w));
    const mh = Math.max(0, ...rest.map((c) => c.box.h));
    const rx = hub.box.w / 2 + mw / 2 + SIZE.gapRow * 0.8;
    const ry = hub.box.h / 2 + mh / 2 + SIZE.gapColumn * 0.7;
    place(hub, -hub.box.w / 2, -hub.box.h / 2);
    rest.forEach((c, i) => {
      const a = radialAngle(i, rest.length);
      place(c, Math.cos(a) * rx - c.box.w / 2, Math.sin(a) * ry - c.box.h / 2);
    });
  } else if (region.layout === "row") {
    // pictures stand on one ground line and the labels line up under them; two things linked as far apart stand further apart
    const G = Math.max(...cards.map(lift));
    let x = 0;
    cards.forEach((c, i) => {
      if (i > 0) x += apart(cards[i - 1], c, SIZE.gapRow);
      place(c, x, G - lift(c));
      x += c.box.w;
    });
  } else if (region.layout === "column") {
    let y = 0;
    const widest = Math.max(...cards.map((c) => c.box.w));
    cards.forEach((c, i) => {
      if (i > 0) y += apart(cards[i - 1], c, SIZE.gapColumn);
      place(c, (widest - c.box.w) / 2, y);
      y += c.box.h;
    });
  } else {
    // a grid: columns as wide as their widest card, and each row a ground line of its own
    const cols = Math.max(...cards.map((c) => c.it.at[0])) + 1;
    const rows = Math.max(...cards.map((c) => c.it.at[1])) + 1;
    const cw = Array(cols).fill(0);
    const above = Array(rows).fill(0);
    const below = Array(rows).fill(0);
    for (const c of cards) {
      const [ci, ri] = c.it.at;
      cw[ci] = Math.max(cw[ci], c.box.w);
      above[ri] = Math.max(above[ri], lift(c));
      below[ri] = Math.max(below[ri], c.box.h - lift(c));
    }
    const rh = above.map((a, i) => a + below[i]);
    const cx = cw.map((_, i) => cw.slice(0, i).reduce((a, w) => a + w + SIZE.gapRow, 0));
    const ry = rh.map((_, i) => rh.slice(0, i).reduce((a, h) => a + h + SIZE.gapColumn, 0));
    for (const c of cards) {
      const [ci, ri] = c.it.at;
      place(c, cx[ci] + (cw[ci] - c.box.w) / 2, ry[ri] + above[ri] - lift(c));
    }
  }
  const content = cards.reduce((b, c) => union(b, c.box), null);
  let top = 0;
  let boardTitle = null;
  if (first) {
    // a long title goes on two lines, as on a whiteboard, when it would otherwise widen the first shot by more than a third
    const t = write(font, board.title, { x: content.x, y: 0, size: SIZE.boardTitle, maxWidth: Math.max(content.w * 1.35, 1250), lineHeight: 1.55, rng: S("title") });
    // a highlighter swash behind the lower half of each line, as a heading is marked on a whiteboard
    const hp = ink.pen(S("title.swash"), { width: 4 });
    const swash = t.lines.map((ln) => ink.segment(hp, ln.x - 16, ln.baseline - SIZE.boardTitle * 0.2 + hp.off(3), ln.x + ln.w + 20, ln.baseline - SIZE.boardTitle * 0.26 + hp.off(3)));
    boardTitle = { parts: [part("text", t.strokes, { width: W.title, write: true, size: SIZE.boardTitle }), part("swash", swash, { width: SIZE.boardTitle * 0.6, color: HIGHLIGHTER, layer: "under", opacity: 0.8 })], box: t.box };
    top = t.box.h + 70;
  }
  let title = null;
  if (region.title) {
    const t = write(font, region.title, { x: content.x, y: top, size: SIZE.regionTitle, rng: S(`${region.id}.title`) });
    const under = ink.underline(ink.pen(S(`${region.id}.under`), { width: W.mark }), t.box.x, t.box.y + t.box.h + 6, t.box.w);
    title = { parts: [part("text", t.strokes, { width: W.title * 0.9, write: true, size: SIZE.regionTitle }), part("underline", under, { width: W.mark, color: board.accent })], box: t.box };
    top = t.box.y + t.box.h + 64;
  }
  // the items sit under the titles
  for (const c of cards) place(c, c.box.x, c.box.y + top);
  let guide = null;
  if (board.guide && (boardTitle || (board.mode === "slides" && title))) {
    // the guide: the marker that draws every board, standing beside the titles on the line under them,
    // where it first appears and presents the title (its pointing finger stops short of the first letter)
    const line = title ?? boardTitle;
    const h = SIZE.guide;
    const feet = [content.x - 34 - GUIDE.reach * h, line.box.y + line.box.h + 40];
    guide = { feet, box: { x: feet[0] - GUIDE.back * h, y: feet[1] - h, w: (GUIDE.back + GUIDE.reach) * h, h } };
  }
  let box = cards.reduce((b, c) => union(b, c.box), null);
  if (title) box = union(box, title.box);
  if (boardTitle) box = union(box, boardTitle.box);
  if (guide) box = union(box, guide.box);
  return { region, cards, title, boardTitle, guide, box };
}

/** The guide's measures, in units of its height, from the point between its feet: how far it reaches back and forward (a pointing finger), and how tall it is. */
const GUIDE = { back: 0.32, reach: 0.56, front: 0.36 };

/** The paper the guide takes on a spot, at rest (hands on its hips), facing either way. */
const spotBox = (q, h) => ({ x: q.x - (q.facing > 0 ? GUIDE.back : GUIDE.front) * h, y: q.y - h, w: (GUIDE.back + GUIDE.front) * h, h });

/**
 * Where the guide stands in a region: beside its title, beside its items, or
 * after them, whichever leaves it on free paper and inside the region's shot,
 * facing into the region. When none is free, the least crowded.
 */
function freeSpot(r, elements, taken, h) {
  const tb = elements.get(r.id)?.box;
  const items = r.items.map((id) => elements.get(id).box);
  const content = items.reduce((b, x) => union(b, x), null);
  const ground = Math.max(...items.map((b) => b.y + b.h));
  const cands = [];
  if (tb) cands.push({ x: tb.x - 40 - GUIDE.reach * h, y: tb.y + tb.h + 40, facing: 1 });
  cands.push({ x: content.x - 40 - GUIDE.front * h, y: ground, facing: 1 });
  cands.push({ x: content.x + content.w + 40 + GUIDE.front * h, y: ground, facing: -1 });
  if (tb) cands.push({ x: tb.x + tb.w + 60 + GUIDE.back * h, y: tb.y + tb.h + 40, facing: 1 });
  const clash = (q) => {
    const b = spotBox(q, h);
    let a = 0;
    for (const o of taken) {
      const w = Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x);
      const hh = Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y);
      if (w > 0 && hh > 0) a += w * hh;
    }
    return a;
  };
  let best = null;
  for (const q of cands) {
    const a = clash(q);
    if (!best || a < best.a) best = { q, a };
    if (a === 0) break;
  }
  return { region: r.id, ...best.q };
}

/**
 * Where the guide stands in a region on a board with a road: on the road
 * itself, near the region's stop, where nothing drawn is in its way, facing
 * the region. Off the turns, so it stands on level road.
 */
function roadSpot(r, road, index, elements, taken, h) {
  const stop = road.stops[index];
  const { pts, cum, width } = road;
  const at = (s) => {
    let k = 1;
    while (k < cum.length - 1 && cum[k] < s) k++;
    const t = Math.max(0, Math.min(1, (s - cum[k - 1]) / (cum[k] - cum[k - 1] || 1)));
    const dx = pts[2 * k] - pts[2 * k - 2];
    const dy = pts[2 * k + 1] - pts[2 * k - 1];
    return { x: pts[2 * k - 2] + dx * t, y: pts[2 * k - 1] + dy * t, level: Math.abs(dy) < 0.4 * Math.abs(dx) };
  };
  const center = r.slot.x + r.slot.w / 2;
  let best = null;
  for (const d of [0, -170, 170, -340, 340, -510, 510, -680, 680, -850, 850]) {
    const s = Math.max(0, Math.min(cum.at(-1), stop.s + d));
    const q = at(s);
    if (!q.level) continue;
    const spot = { region: r.id, x: q.x, y: q.y - width / 2 + 6, facing: center >= q.x ? 1 : -1, s };
    const b = spotBox(spot, h);
    let a = 0;
    for (const o of taken) {
      const w = Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x);
      const hh = Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y);
      if (w > 0 && hh > 0) a += w * hh;
    }
    if (!best || a < best.a) best = { spot, a };
    if (a === 0) break;
  }
  return best.spot;
}

/** A region's shot frame: its content with air round it, grown to 16:9 about its center, never smaller than the smallest shot. */
function frameFor(box) {
  const [fw, fh] = SIZE.frame;
  let w = Math.max(fw, box.w + 2 * SIZE.frameAir);
  let h = Math.max(fh, box.h + 2 * SIZE.frameAir);
  if (w / h > 16 / 9) h = (w * 9) / 16;
  else w = (h * 16) / 9;
  return { x: box.x + box.w / 2 - w / 2, y: box.y + box.h / 2 - h / 2, w, h };
}

/**
 * Where the regions go on a canvas: packed as a mural, each region's content
 * a gap from the next along the flow, and every row with its region titles on
 * one line. A path wraps into the rows that bring the board closest to 16:9
 * and turns back on every other row, so each region is next to the one told
 * before it. A region's frame, the shot that shows it, is its content with
 * air round it; the edge of a neighbour may show in it, as the rest of a mural
 * does.
 */
function placeMural(board, laid) {
  const gap = SIZE.regionGap;
  const n = laid.length;
  // how far below a region's top its title line is (the first region carries the board's title and the guide above its own)
  const off = laid.map((r) => (r.title ? r.title.box.y : r.box.y) - r.box.y);
  const lineOf = (row) => Math.max(...row.map((i) => off[i]));
  const heightOf = (row) => Math.max(...row.map((i) => lineOf(row) - off[i] + laid[i].box.h));
  const pos = Array(n);
  if (board.flow === "grid") {
    const cols = Math.max(...laid.map((r) => r.region.at[0])) + 1;
    const nrows = Math.max(...laid.map((r) => r.region.at[1])) + 1;
    const cw = Array(cols).fill(0);
    const members = Array.from({ length: nrows }, () => []);
    laid.forEach((r, i) => {
      cw[r.region.at[0]] = Math.max(cw[r.region.at[0]], r.box.w);
      members[r.region.at[1]].push(i);
    });
    const cx = cw.map((_, c) => cw.slice(0, c).reduce((a, w) => a + w + gap, 0));
    let y = 0;
    for (const row of members) {
      if (!row.length) continue;
      const line = lineOf(row);
      for (const i of row) {
        const c = laid[i].region.at[0];
        pos[i] = [cx[c] + (cw[c] - laid[i].box.w) / 2, y + line - off[i]];
      }
      y += heightOf(row) + gap;
    }
  } else {
    // a path (or a row, or a column) laid as a mural: the regions of the first row side by side with their titles
    // on one line, and every later region straight under the one above it in its column, as close as the gap
    // allows, so a short region leaves no hole under it. A path turns back on every other row, so each region
    // is next to the one told before it.
    const arrange = (per) => {
      const rows = [];
      for (let k = 0; k * per < n; k++) rows.push([...Array(Math.min(per, n - k * per)).keys()].map((j) => k * per + j));
      const widthOf = (row) => row.reduce((a, i) => a + laid[i].box.w, 0) + gap * (row.length - 1);
      const W = Math.max(...rows.map(widthOf));
      const at = Array(n);
      const placed = [];
      rows.forEach((row, k) => {
        const order = board.flow === "path" && k % 2 === 1 ? [...row].reverse() : row;
        const line = lineOf(row);
        // the first row starts at the left; a later row is centered under it, and on a path a full row runs back from the right
        let x = k === 0 ? 0 : (W - widthOf(row)) / 2;
        for (const i of order) {
          const r = laid[i];
          // as high as the regions above it allow: under the lowest one it would overlap
          const above = placed.filter((q) => q.x < x + r.box.w + gap * 0.5 && x < q.x + q.w + gap * 0.5);
          const top = k === 0 ? line - off[i] : Math.max(0, ...above.map((q) => q.y + q.h)) + gap;
          at[i] = [x, top];
          placed.push({ x, y: top, w: r.box.w, h: r.box.h });
          x += r.box.w + gap;
        }
      });
      return { at, w: Math.max(...placed.map((q) => q.x + q.w)), h: Math.max(...placed.map((q) => q.y + q.h)) };
    };
    const misfit = (per) => {
      const { w, h } = arrange(per);
      return Math.abs(Math.log((w + 2 * SIZE.frameAir) / (h + 2 * SIZE.frameAir) / (16 / 9)));
    };
    let best = n;
    for (let per = n; per >= 1; per--) if (misfit(per) < misfit(best) - 1e-9) best = per;
    arrange(board.flow === "row" ? n : board.flow === "column" ? 1 : best).at.forEach((v, i) => (pos[i] = v));
  }
  return laid.map((r, i) => {
    const dx = pos[i][0] - r.box.x;
    const dy = pos[i][1] - r.box.y;
    const slot = moveBox(r.box, dx, dy);
    return { ...r, frame: frameFor(slot), slot, dx, dy };
  });
}

/**
 * A laid-out region drawn larger by k about its top-left: every stroke, box
 * and place in it. Lines thicken less than the drawing grows (a marker's nib
 * is the same on a larger page); fills and highlighter grow with it.
 */
function scaleLaid(r, k) {
  const ox = r.box.x;
  const oy = r.box.y;
  const sp = (pts) => pts.map((v, i) => (i % 2 ? oy + (v - oy) * k : ox + (v - ox) * k));
  const sb = (b) => b && { x: ox + (b.x - ox) * k, y: oy + (b.y - oy) * k, w: b.w * k, h: b.h * k };
  const sparts = (parts) => parts.map((q) => ({ ...q, strokes: q.strokes.map(sp), width: q.width * (q.layer === "ink" ? Math.pow(k, 0.6) : k), size: q.size * k }));
  for (const c of r.cards) {
    c.parts = sparts(c.parts);
    c.labelBox = sb(c.labelBox);
    c.wordsBox = sb(c.wordsBox);
    c.box = sb(c.box);
    if (c.ground != null) c.ground = oy + (c.ground - oy) * k;
  }
  if (r.title) r.title = { parts: sparts(r.title.parts), box: sb(r.title.box) };
  if (r.boardTitle) r.boardTitle = { parts: sparts(r.boardTitle.parts), box: sb(r.boardTitle.box) };
  if (r.guide) r.guide = { feet: [ox + (r.guide.feet[0] - ox) * k, oy + (r.guide.feet[1] - oy) * k], box: sb(r.guide.box) };
  r.box = sb(r.box);
  r.zoom = k;
}

/** Where the regions go on the board: a canvas is packed as a mural; slides lie on the table as sheets of one size, in the order they are told. */
function placeRegions(board, laid) {
  const slides = board.mode === "slides";
  if (!slides && board.flow !== "path") return { laid: placeMural(board, laid), road: null };
  let w = 0;
  let h = 0;
  if (slides) {
    // a deck: every sheet the size of the largest, and what is on a smaller one drawn larger to fill its page
    for (const r of laid) {
      const f = frameFor({ x: 0, y: 0, w: r.box.w, h: r.box.h });
      w = Math.max(w, f.w);
      h = Math.max(h, f.h);
    }
    for (const r of laid) {
      const k = Math.min(1.45, (w - 2 * SIZE.frameAir) / r.box.w, (h * (1 - CAPTION_BAND) - 2 * SIZE.frameAir) / r.box.h);
      if (k > 1.04) scaleLaid(r, k);
    }
  }
  // the ideas (or the sheets) along the story road, each on the other side of it from the one before
  const boxes = laid.map((r) => (slides ? { w, h } : { w: r.box.w, h: r.box.h }));
  const { places, road } = layRoad(boxes, slides ? { side: 46, same: 110, stagger: 0.5, band: 70 } : {});
  const placed = laid.map((r, i) => {
    const q = places[i];
    if (slides) {
      const frame = { x: q.x, y: q.y, w, h };
      // the content is centered in its sheet, in the part above the caption's band
      return { ...r, frame, side: q.side, dx: frame.x + (frame.w - r.box.w) / 2 - r.box.x, dy: frame.y + (frame.h * (1 - CAPTION_BAND) - r.box.h) / 2 - r.box.y };
    }
    const dx = q.x - r.box.x;
    const dy = q.y - r.box.y;
    const slot = moveBox(r.box, dx, dy);
    return { ...r, frame: frameFor(slot), slot, side: q.side, dx, dy };
  });
  return { laid: placed, road };
}

/** The point where a ray from a box's center toward (tx, ty) leaves the box, `gap` further out. */
function exitPoint(b, tx, ty, gap) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const s = Math.min(Math.abs(b.w / 2 / (dx || 1e-9)), Math.abs(b.h / 2 / (dy || 1e-9)));
  const len = Math.hypot(dx, dy) || 1;
  return [cx + dx * s + (dx / len) * gap, cy + dy * s + (dy / len) * gap];
}

/** A frame grown to 16:9 about its center. */
const fit169 = (f) => {
  const w = Math.max(f.w, (f.h * 16) / 9);
  const h = (w * 9) / 16;
  return { x: f.x + f.w / 2 - w / 2, y: f.y + f.h / 2 - h / 2, w, h };
};

/** Composes the whole board: every element, with its strokes, its box and the region it belongs to. */
export function compose(board, font) {
  const S = streams(board.seed);
  const { laid, road } = placeRegions(board, board.regions.map((r, i) => layoutRegion(board, font, r, S, i === 0)));
  const elements = new Map();
  const regions = [];
  let guideStart = null;
  const reserved = new Map();
  const zoomOf = new Map(); // how much larger a slide's content is drawn
  for (const r of laid) {
    const regionBox = moveBox(r.box, r.dx, r.dy);
    regions.push({ id: r.region.id, title: r.region.title, frame: r.frame, slot: r.slot ?? r.frame, box: regionBox, items: r.cards.map((c) => c.it.id) });
    zoomOf.set(r.region.id, r.zoom ?? 1);
    if (r.boardTitle) elements.set("title", { ...element("title", "title", move(r.boardTitle.parts, r.dx, r.dy)), region: r.region.id, zoom: r.zoom ?? 1 });
    if (r.guide && r.boardTitle) {
      // the guide is an actor, not strokes: its element holds the place it first stands in
      const e = { id: "guide", kind: "guide", parts: [], box: moveBox(r.guide.box, r.dx, r.dy), region: r.region.id };
      elements.set("guide", e);
      guideStart = { region: r.region.id, x: r.guide.feet[0] + r.dx, y: r.guide.feet[1] + r.dy, facing: 1 };
    }
    // on a slide, the place beside the sheet's title
    if (r.guide) reserved.set(r.region.id, { region: r.region.id, x: r.guide.feet[0] + r.dx, y: r.guide.feet[1] + r.dy, facing: 1 });
    if (r.title) elements.set(r.region.id, { ...element(r.region.id, "region", move(r.title.parts, r.dx, r.dy)), region: r.region.id, zoom: r.zoom ?? 1 });
    for (const c of r.cards) {
      const e = element(c.it.id, "item", move(c.parts, r.dx, r.dy));
      e.region = r.region.id;
      e.labelBox = moveBox(c.labelBox, r.dx, r.dy);
      e.wordsBox = moveBox(c.wordsBox, r.dx, r.dy);
      e.framed = c.it.shape !== "none" || ((r.region.layout === "cells" || r.region.layout === "stack") && c.it.under == null);
      e.zoom = r.zoom ?? 1;
      elements.set(c.it.id, e);
    }
  }

  // the guide appears first, in the beat that writes the title: a picture before any words
  if (elements.has("guide")) {
    const bt = board.beats.find((b) => b.draw.includes("title"));
    if (bt) bt.draw.splice(bt.draw.indexOf("title"), 0, "guide");
    else elements.delete("guide");
  }
  // the opening shot: the guide presenting the title, close, before the camera pulls back to the first idea
  const opening = elements.has("title") ? pad([elements.get("title"), elements.get("guide")].filter(Boolean).reduce((b, e) => union(b, e.box), null), 70) : null;

  // links. Inside a region, an arrow between two items. Between regions, a bridge: the connection that
  // ties one idea to another on the map. It is routed round what stands in its way, and drawn larger in
  // proportion to the wider shot that shows both regions, so its label reads there too.
  const obstacles = [...elements.values()].filter((e) => e.kind === "item" || e.kind === "region" || e.kind === "title" || e.kind === "guide");
  const frameOf = (id) => regions.find((r) => r.id === id).frame;
  const drawnCurves = []; // every link's line so far: a new one should not cross them
  const labelBoxes = [];
  // bridges last: the short arrows inside regions are settled first, and the long ones route round them
  for (const l of [...board.links].sort((a, b) => (elements.get(a.from).region !== elements.get(a.to).region) - (elements.get(b.from).region !== elements.get(b.to).region))) {
    const from = elements.get(l.from);
    const to = elements.get(l.to);
    const a = from.box;
    const b = to.box;
    const bridge = from.region !== to.region;
    let f = bridge ? 1 : zoomOf.get(from.region) ?? 1;
    if (bridge) {
      const both = shotSafe(pad(union(frameOf(from.region), frameOf(to.region)), 40))[2];
      const own = Math.max(shotSafe(pad(frameOf(from.region), 40))[2], shotSafe(pad(frameOf(to.region), 40))[2]);
      f = Math.min(3, Math.max(1, both / own));
    }
    const others = obstacles.filter((e) => e.id !== l.from && e.id !== l.to).map((e) => pad(e.box, 12 * f));
    let [x1, y1] = exitPoint(a, b.x + b.w / 2, b.y + b.h / 2, 18 * f);
    let [x2, y2] = exitPoint(b, a.x + a.w / 2, a.y + a.h / 2, 22 * f);
    if (bridge && l.bend == null) {
      // the sides of each box that face the other: the line may leave by any of them (not through a title above it)
      const sides = (bx, tx, ty, gap) => {
        const cx = bx.x + bx.w / 2;
        const cy = bx.y + bx.h / 2;
        const out = [];
        if (ty < bx.y + bx.h) out.push([cx, bx.y - gap]);
        if (ty > bx.y) out.push([cx, bx.y + bx.h + gap]);
        if (tx < bx.x + bx.w) out.push([bx.x - gap, cy]);
        if (tx > bx.x) out.push([bx.x + bx.w + gap, cy]);
        return out;
      };
      let best = null;
      for (const s1 of sides(a, b.x + b.w / 2, b.y + b.h / 2, 18 * f)) {
        for (const s2 of sides(b, a.x + a.w / 2, a.y + a.h / 2, 22 * f)) {
          const r = routeScore(s1[0], s1[1], s2[0], s2[1], others, drawnCurves, 0.3);
          if (!best || r.score < best.score) best = { ...r, s1, s2 };
        }
      }
      [x1, y1] = best.s1;
      [x2, y2] = best.s2;
    }
    const labelSize = SIZE.linkLabel * f;
    const lt = l.label ? write(font, l.label, { x: 0, y: 0, size: labelSize, align: "center", maxWidth: 260 * f, rng: S(`${l.id}.label`) }) : null;
    // where the label goes for a given bend: on the outside of the curve, at its middle
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    const labelAt = (bend) => {
      if (!lt) return null;
      const side = bend <= 0 ? -1 : 1;
      const mx = (x1 + x2) / 2 + nx * bend * len * 0.75;
      const my = (y1 + y2) / 2 + ny * bend * len * 0.75;
      const reach = Math.abs(nx) * (lt.box.w / 2) + Math.abs(ny) * (lt.box.h / 2) + 14 * f + (l.style === "bold" ? 16 : 0);
      return { dx: mx + nx * side * reach - (lt.box.x + lt.box.w / 2), dy: my + ny * side * reach - (lt.box.y + lt.box.h / 2) };
    };
    const bend = l.bend ?? bestBend(x1, y1, x2, y2, others, lt && ((bd) => moveBox(lt.box, labelAt(bd).dx, labelAt(bd).dy)), drawnCurves, bridge ? 0.3 : 0.4);
    const width = W.link * (1 + (f - 1) * 0.6);
    const p = ink.pen(S(`${l.id}.arrow`), { width });
    let strokes;
    let path;
    let parts;
    if (l.style === "bold") {
      // a wide arrow: the main move inside an idea, colored in
      const b = bend * len;
      const c1 = [x1 + (x2 - x1) / 3 + nx * b, y1 + (y2 - y1) / 3 + ny * b];
      const c2 = [x1 + (2 * (x2 - x1)) / 3 + nx * b, y1 + (2 * (y2 - y1)) / 3 + ny * b];
      path = cubic(x1, y1, ...c1, ...c2, x2, y2, 6);
      const fat = ink.fatArrow(p, path, { width: 26 * (bridge ? Math.sqrt(f) : f) });
      strokes = [fat.outline];
      parts = [part("arrow", strokes, { width }), part("fill", fat.along(11), { width: 11, color: HIGHLIGHTER, layer: "under", opacity: 0.9 }), part("shadow", [ink.shift(fat.poly, 6, 7)].map((q) => ink.fill(p, q, { nib: 12 }).strokes).flat(), { width: 12, color: SHADOW, layer: "shadow" })];
    } else {
      strokes = ink.arrow(p, x1, y1, x2, y2, { bend, double: l.style === "double", head: bridge ? Math.min(26, Math.max(10, len * 0.18)) * Math.sqrt(f) : null, solid: true });
      path = strokes[0];
      if (l.style === "line") strokes = [strokes[0]]; // an edge, with no head
      if (l.style === "dashed") strokes = [...dashes(strokes[0], 18 * f, 12 * f), ...strokes.slice(1)];
      parts = [part("arrow", strokes, { width })];
    }
    if (lt) {
      const { dx, dy } = labelAt(bend);
      parts.push(...move([part("label", lt.strokes, { width: W.note * Math.sqrt(f), write: true, size: labelSize })], dx, dy));
    }
    const e = element(l.id, "link", parts);
    e.region = from.region;
    e.joins = [from.region, to.region];
    e.bridge = bridge;
    e.scale = f;
    e.path = path;
    elements.set(l.id, e);
    drawnCurves.push(strokes[0]);
    if (lt) labelBoxes.push(bounds(parts[parts.length - 1].strokes));
  }

  // notes and marks, beat by beat
  board.beats.forEach((bt, bi) => {
    bt.notes.forEach((n, ni) => {
      const id = `note-${bi + 1}-${ni + 1}`;
      const target = elements.get(n.near);
      const tb = target.box;
      const z = zoomOf.get(target.region) ?? 1;
      const nt = write(font, n.text, { x: 0, y: 0, size: SIZE.note * z, align: "center", maxWidth: 280 * z, rng: S(`${id}.text`) });
      const gap = 56 * z;
      const at = {
        below: [tb.x + tb.w / 2, tb.y + tb.h + gap + nt.box.h / 2],
        above: [tb.x + tb.w / 2, tb.y - gap - nt.box.h / 2],
        right: [tb.x + tb.w + gap + nt.box.w / 2, tb.y + tb.h / 2],
        left: [tb.x - gap - nt.box.w / 2, tb.y + tb.h / 2],
      }[n.side];
      const parts = move([part("text", nt.strokes, { width: W.note * Math.pow(z, 0.6), color: GREY, write: true, size: SIZE.note * z })], at[0] - (nt.box.x + nt.box.w / 2), at[1] - (nt.box.y + nt.box.h / 2));
      if (n.arrow) {
        const nb = bounds(parts[0].strokes);
        const [ax, ay] = exitPoint(nb, tb.x + tb.w / 2, tb.y + tb.h / 2, 8);
        const [bx, by] = exitPoint(tb, nb.x + nb.w / 2, nb.y + nb.h / 2, 10);
        parts.push(part("arrow", ink.arrow(ink.pen(S(`${id}.arrow`), { width: W.note }), ax, ay, bx, by, { bend: 0.2, head: 12 }), { width: W.note, color: GREY }));
      }
      const e = element(id, "note", parts);
      e.region = target.region;
      e.zoom = z;
      elements.set(id, e);
      bt.draw.push(id);
    });
    bt.mark.forEach((m, mi) => {
      const id = `mark-${bi + 1}-${mi + 1}`;
      const target = elements.get(m.target);
      // several targets side by side are marked as one: the box round all of them
      const many = m.targets.length > 1 ? m.targets.map((id) => elements.get(id)) : null;
      const span = many && many.reduce((b, e) => union(b, e.kind === "item" && !e.framed ? e.wordsBox ?? e.box : e.box), null);
      const tb = span ?? (m.target === "title" || target.kind !== "item" ? target.box : target.labelBox ?? target.box);
      const z = zoomOf.get(target.region) ?? 1;
      const p = ink.pen(S(id), { width: W.mark * Math.pow(z, 0.6) });
      const strokes = {
        // an item's words are circled; an item in a frame of its own is circled round the frame
        circle: () => ink.circleAround(p, span ?? (target.kind === "item" && !target.framed ? target.wordsBox ?? target.box : target.kind === "item" ? target.box : tb), 12),
        underline: () => ink.underline(p, tb.x, tb.y + tb.h + 8, tb.w),
        box: () => ink.box(p, tb.x - 20, tb.y - 16, tb.w + 40, tb.h + 32),
        cross: () => ink.crossOut(p, tb),
        highlight: () => ink.highlight(ink.pen(S(id), { width: Math.max(18, tb.h * 0.5) }), pad(tb, 6, -2)),
      }[m.kind]();
      const hl = m.kind === "highlight";
      const e = element(id, "mark", [part("mark", strokes, { width: hl ? Math.max(18, tb.h * 0.5) : W.mark * Math.pow(z, 0.6), color: hl ? HIGHLIGHTER : board.accent, layer: hl ? "under" : "ink", opacity: hl ? 0.6 : 1 })]);
      e.region = target.region;
      e.target = m.target;
      e.targets = m.targets;
      e.targetBox = tb;
      elements.set(id, e);
      bt.draw.push(id);
    });
  });
  // the story arrows: a wide arrow in the accent from each idea to the next, in the order they are told,
  // across the gap between them. They are what ties the board together, so no idea is left an island
  // and no long line is needed for it.
  if (board.story && road) {
    // the road, drawn a stretch at a time: its start with the title, a stretch on each flight to the next idea, its arrowhead at the end
    const n = regions.length;
    const stops = road.stops;
    const pieces = [{ id: "story-0", s0: 0, s1: stops[0].s, from: regions[0].id, to: regions[0].id, cap: true }];
    for (let i = 0; i + 1 < n; i++) pieces.push({ id: `story-${i + 1}`, s0: stops[i].s, s1: stops[i + 1].s, from: regions[i].id, to: regions[i + 1].id });
    pieces.push({ id: "story-end", s0: stops[n - 1].s, s1: road.cum.at(-1), from: regions[n - 1].id, to: regions[n - 1].id, head: true });
    for (const q of pieces) {
      if (q.s1 - q.s0 < 8) continue;
      const path = stretch(road.pts, road.cum, q.s0, q.s1);
      const p = ink.pen(S(q.id), { width: W.story });
      const rb = ink.ribbon(p, path, { width: road.width, head: q.head });
      const lines = [...rb.lines];
      if (q.cap) {
        // the road begins in a round end
        const [x0, y0, x1, y1] = path;
        const a = Math.atan2(y1 - y0, x1 - x0);
        const cap = [];
        for (let k = 0; k <= 10; k++) {
          const t = a + Math.PI / 2 + (Math.PI * k) / 10;
          cap.push(x0 + Math.cos(t) * road.width / 2, y0 + Math.sin(t) * road.width / 2);
        }
        lines.unshift(ink.wobble(p, cap, { amp: 0.6 }));
      }
      const sh = ink.fill(p, ink.shift(rb.poly, 8, 9), { nib: 16 });
      // and a dashed line down its middle, in paper, so it reads as a road
      const mid = dashes(q.head ? stretch(path, cumulate(path), 0, Math.max(0, cumulate(path).at(-1) - road.width * 1.6)) : path, 20, 16);
      const st = element(q.id, "story", [
        part("arrow", lines, { width: W.story }),
        part("fill", rb.along(14), { width: 14, color: board.accent, layer: "under", opacity: 0.9 }),
        part("lane", mid.map((d) => ink.wobble(p, d, { amp: 0.4 })), { width: 3.4, color: PAPER }),
        part("shadow", sh.strokes, { width: sh.width, color: SHADOW, layer: "shadow" }),
      ]);
      st.region = q.to;
      st.joins = [q.from, q.to];
      st.path = path;
      elements.set(q.id, st);
    }
    // the road's start is drawn as the camera first goes to the first idea, its end as it pulls back to the whole board
  } else if (board.story) {
    const blockers = [...elements.values()].filter((e) => !e.joins && e.kind !== "mark").map((e) => pad(e.box, 16));
    for (let i = 0; i + 1 < regions.length; i++) {
      const st = storyArrow(board, S, regions[i], regions[i + 1], elements, blockers, drawnCurves, `story-${i + 1}`);
      elements.set(st.id, st);
      drawnCurves.push(st.path);
      blockers.push(pad(st.box, 8));
    }
  }

  // the guide's spots: where it stands in each idea, in free paper beside it, so it never covers the drawing
  let guide = null;
  if (guideStart) {
    const h = SIZE.guide;
    const taken = [...elements.values()].filter((e) => e.kind !== "guide" && e.kind !== "story").map((e) => pad(e.box, 18));
    const spots = [guideStart];
    for (const r of regions) {
      if (r.id === guideStart.region) continue;
      const spot = reserved.get(r.id) ?? (road && board.mode !== "slides" ? roadSpot(r, road, regions.indexOf(r), elements, taken, h) : freeSpot(r, elements, taken, h));
      spots.push(spot);
      taken.push(pad(spotBox(spot, h), 10));
    }
    guide = { h, rig: rig(ink.pen(S("guide"), { width: W.icon }), h, board.accent), spots, road: board.mode !== "slides" ? road : null };
  }

  // a region's frame holds everything drawn in it (a note or a mark may reach past the content), grown to 16:9;
  // in slides mode every region is a sheet, and the sheets are all one size
  for (const r of regions) {
    let f = r.frame;
    for (const e of elements.values()) if (e.region === r.id && !e.joins) f = union(f, pad(e.box, 40));
    const spot = guide?.spots.find((q) => q.region === r.id);
    if (spot) f = union(f, pad(spotBox(spot, guide.h), 30));
    if (f !== r.frame && board.mode !== "slides") r.frame = fit169(f);
  }
  const sheets = new Map(regions.map((r) => [r.id, r.frame]));
  // the closing overview frames what is drawn (on a canvas) or the sheets on the table (slides), with a margin
  const all = [...elements.values()];
  let extent = all.reduce((b, e) => union(b, e.box), null);
  if (board.mode === "slides") for (const s of sheets.values()) extent = union(extent, s);
  for (const q of guide?.spots ?? []) extent = union(extent, spotBox(q, guide.h));
  // the end card: the title in paper on the dark, in the frame's own coordinates (1920 x 1080), underlined in the accent
  const et = write(font, board.title, { x: 960, y: 0, size: 76, align: "center", maxWidth: 1500, lineHeight: 1.5, rng: S("endcard") });
  const ey = 520 - (et.box.y + et.box.h / 2);
  const endCard = [
    ...et.strokes.map((pts) => ({ pts: pts.map((v, i) => (i % 2 ? v + ey : v)), width: W.title * 1.15, color: PAPER })),
    ...ink.underline(ink.pen(S("endcard.under"), { width: W.mark * 1.3 }), et.box.x, et.box.y + ey + et.box.h + 22, et.box.w).map((pts) => ({ pts, width: W.mark * 1.3, color: board.accent })),
  ];
  return { elements, regions, sheets, opening, guide, endCard, extent: pad(extent, board.mode === "slides" ? 60 : 110) };
}

/**
 * The story arrow between two regions told one after the other: a wide arrow
 * in the accent, outlined in ink, with a shadow, across the gap between them.
 * Side by side it arcs over the gap at a height both share; one above the
 * other it drops down the gap; corner to corner it swings from one to the
 * other. Of a few such arrows, the one that runs into the least wins.
 * Between slides it runs from the margin of one sheet to the next.
 */
function storyArrow(board, S, a, b, elements, blockers, curves, id) {
  const slides = board.mode === "slides";
  const A = slides ? a.frame : a.slot;
  const B = slides ? b.frame : b.slot;
  const m = slides ? -70 : 46; // how far from each side it starts and stops (on a slide: inside the sheet's margin)
  const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
  const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
  const cands = [];
  if (slides) {
    // between sheets: from the margin of one to the margin of the next, at the height of their titles
    const right = B.x > A.x;
    const y = (oy > 120 ? Math.max(A.y, B.y) + oy * 0.22 : null);
    if (y != null) for (const bend of [-0.2, 0.2]) cands.push({ s: [right ? A.x + A.w + m : A.x - m, y], e: [right ? B.x - m : B.x + B.w + m, y], bend: right ? bend : -bend });
    else {
      const down = B.y > A.y;
      const x = Math.max(A.x, B.x) + Math.max(0, ox) * 0.5;
      for (const bend of [0.2, -0.2]) cands.push({ s: [x, down ? A.y + A.h + m : A.y - m], e: [x, down ? B.y - m : B.y + B.h + m], bend });
    }
  } else {
    // on a canvas the arrow points at where the next idea starts, its title, from the side of this one that faces it;
    // when that path is long or in the way, at the nearest side of the next region instead
    const tb = elements.get(b.id)?.box ?? B;
    const right = B.x >= A.x + A.w - 1;
    const left = B.x + B.w <= A.x + 1;
    const below = !right && !left && B.y > A.y;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const ends = [];
    if (right) ends.push({ e: [tb.x - 28, tb.y + tb.h * 0.55], title: true }, { e: [B.x - m * 0.6, clamp(A.y + A.h / 2, B.y + 40, B.y + B.h - 40)], title: false });
    else if (left) ends.push({ e: [tb.x + tb.w + 28, tb.y + tb.h * 0.55], title: true }, { e: [B.x + B.w + m * 0.6, clamp(A.y + A.h / 2, B.y + 40, B.y + B.h - 40)], title: false });
    else if (below) {
      ends.push({ e: [tb.x + Math.min(tb.w * 0.35, 160), tb.y - 30], title: true });
      const lo = Math.max(A.x, B.x);
      const hi = Math.min(A.x + A.w, B.x + B.w);
      if (hi - lo > 80) ends.push({ e: [(lo + hi) / 2, B.y - m * 0.6], title: false });
      else ends.push({ e: [clamp(A.x + A.w / 2, B.x + 60, B.x + B.w - 60), B.y - m * 0.6], title: false });
    } else ends.push({ e: [clamp(A.x + A.w / 2, B.x + 60, B.x + B.w - 60), B.y + B.h + m * 0.6], title: false });
    for (const { e: e0, title } of ends) {
      for (const k of [0, 1, 2, 3]) {
        let s0;
        if (right) s0 = [A.x + A.w + m * 0.6, clamp(e0[1] + k * 60, A.y + 40, A.y + A.h - 40)];
        else if (left) s0 = [A.x - m * 0.6, clamp(e0[1] + k * 60, A.y + 40, A.y + A.h - 40)];
        else if (below) s0 = [clamp(e0[0] + (k - 1.5) * 50, A.x + 60, A.x + A.w - 60), A.y + A.h + m * 0.6];
        else s0 = [clamp(e0[0] + (k - 1.5) * 50, A.x + 60, A.x + A.w - 60), A.y - m * 0.6];
        for (const bend of [-0.22, 0.22, -0.1, 0.1]) cands.push({ s: s0, e: e0, bend: right ? bend : -bend, title });
      }
    }
  }
  const centerline = ({ s, e, bend }) => {
    const len = Math.hypot(e[0] - s[0], e[1] - s[1]) || 1;
    const nx = -(e[1] - s[1]) / len;
    const ny = (e[0] - s[0]) / len;
    const k = bend * len;
    return cubic(s[0], s[1], s[0] + (e[0] - s[0]) / 3 + nx * k, s[1] + (e[1] - s[1]) / 3 + ny * k, s[0] + (2 * (e[0] - s[0])) / 3 + nx * k, s[1] + (2 * (e[1] - s[1])) / 3 + ny * k, e[0], e[1], 6);
  };
  const half = SIZE.story * 0.62;
  const cost = (pts) => {
    let n = 0;
    for (let i = 0; i < pts.length; i += 2) {
      // the arrow is wide: a box within its half-width of the centerline is in the way
      if (blockers.some((o) => pts[i] > o.x - half && pts[i] < o.x + o.w + half && pts[i + 1] > o.y - half && pts[i + 1] < o.y + o.h + half)) n++;
    }
    for (let i = 0; i + 3 < pts.length; i += 2) n += 15 * crossings(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], curves);
    return n;
  };
  // in the way of nothing first; then short, and pointing at a title when that is not much longer
  let best = null;
  for (const c of cands) {
    const pts = centerline(c);
    const n = cost(pts) * 1000 + Math.hypot(c.e[0] - c.s[0], c.e[1] - c.s[1]) * (c.title === false ? 1.6 : 1) + Math.abs(c.bend) * 40;
    if (!best || n < best.n) best = { pts, n };
  }
  const p = ink.pen(S(id), { width: W.story });
  const fat = ink.fatArrow(p, best.pts, { width: SIZE.story });
  const sh = ink.fill(p, ink.shift(fat.poly, 8, 9), { nib: 16 });
  const st = element(id, "story", [
    part("arrow", [fat.outline], { width: W.story }),
    part("fill", fat.along(15), { width: 15, color: board.accent, layer: "under", opacity: 0.92 }),
    part("shadow", sh.strokes, { width: sh.width, color: SHADOW, layer: "shadow" }),
  ]);
  st.region = b.id;
  st.joins = [a.id, b.id];
  st.path = best.pts;
  return st;
}

/** The best bend for a line between two points, and how much it hits, without a label. */
function routeScore(x1, y1, x2, y2, boxes, curves, most) {
  const bend = bestBend(x1, y1, x2, y2, boxes, null, curves, most);
  return { bend, score: bendScore(x1, y1, x2, y2, boxes, null, curves, bend) };
}

/**
 * The bend that keeps an arrow (and its label) off the things between its
 * ends: the ideal curve is sampled for each candidate bend, and the one that
 * runs through the fewest boxes wins, the straighter one on a tie.
 */
function bestBend(x1, y1, x2, y2, boxes, labelBox, curves = [], most = 0.4) {
  const flat = Math.abs(y2 - y1) < 30 ? -0.08 : 0.1;
  let best = null;
  for (const bend of [flat, 0, -flat, 0.14, -0.14, 0.22, -0.22, 0.3, -0.3, 0.4, -0.4].filter((b) => Math.abs(b) <= most)) {
    const score = bendScore(x1, y1, x2, y2, boxes, labelBox, curves, bend);
    if (!best || score < best.score) best = { bend, score };
    if (score === 0) break;
  }
  return best.bend;
}

/** How much a line with this bend runs through boxes and across other lines (and its label over boxes). */
function bendScore(x1, y1, x2, y2, boxes, labelBox, curves, bend) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const inside = (x, y) => boxes.some((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
  const segs = [];
  for (const c of curves) for (let i = 0; i + 3 < c.length; i += 6) segs.push([c[i], c[i + 1], c[Math.min(i + 6, c.length - 2)], c[Math.min(i + 7, c.length - 1)]]);
  const cross = (ax, ay, bx, by) => {
    let n = 0;
    for (const [cx, cy, dx, dy] of segs) {
      const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (!d) continue;
      const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
      const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
      if (u > 0 && u < 1 && v > 0 && v < 1) n++;
    }
    return n;
  };
  {
    const b = bend * len;
    const c1x = x1 + (x2 - x1) / 3 + nx * b, c1y = y1 + (y2 - y1) / 3 + ny * b;
    const c2x = x1 + (2 * (x2 - x1)) / 3 + nx * b, c2y = y1 + (2 * (y2 - y1)) / 3 + ny * b;
    let score = 0;
    let px = x1;
    let py = y1;
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      const u = 1 - t;
      const x = u * u * u * x1 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x2;
      const y = u * u * u * y1 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y2;
      if (i < 40 && inside(x, y)) score++;
      score += 15 * cross(px, py, x, y); // crossing another link's line costs more than grazing a box
      px = x;
      py = y;
    }
    score += Math.abs(bend) * 4; // and a straighter line is better when nothing else differs
    if (labelBox) {
      const lb = labelBox(bend);
      score += 8 * boxes.filter((o) => o.x < lb.x + lb.w && lb.x < o.x + o.w && o.y < lb.y + lb.h && lb.y < o.y + o.h).length;
    }
    return score;
  }
}

/** How many of the lines a segment crosses. */
function crossings(ax, ay, bx, by, curves) {
  let n = 0;
  for (const c of curves) {
    for (let i = 0; i + 3 < c.length; i += 2) {
      const [cx, cy, dx, dy] = [c[i], c[i + 1], c[i + 2], c[i + 3]];
      const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (!d) continue;
      const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
      const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
      if (u > 0 && u < 1 && v > 0 && v < 1) n++;
    }
  }
  return n;
}

/** The cumulative lengths along a polyline. */
function cumulate(pts) {
  const cum = [0];
  for (let k = 1; k < pts.length / 2; k++) cum.push(cum[k - 1] + Math.hypot(pts[2 * k] - pts[2 * k - 2], pts[2 * k + 1] - pts[2 * k - 1]));
  return cum;
}

/** A polyline cut into dashes of `on` units with `off` gaps, for dashed links. */
function dashes(pts, on, off) {
  const out = [];
  let cur = [pts[0], pts[1]];
  let run = 0;
  let drawing = true;
  for (let i = 2; i < pts.length; i += 2) {
    const seg = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
    run += seg;
    if (drawing) cur.push(pts[i], pts[i + 1]);
    if (run >= (drawing ? on : off)) {
      if (drawing && cur.length >= 4) out.push(cur);
      drawing = !drawing;
      run = 0;
      cur = [pts[i], pts[i + 1]];
    }
  }
  if (drawing && cur.length >= 4) out.push(cur);
  return out;
}
