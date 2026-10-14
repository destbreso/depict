// Composing the board: sizes and places every region and item, routes the
// links, and turns all of it into elements made of strokes in pen order. The
// board's unit is a pixel at the size a region is shown: a region is laid out
// to fill a 16:9 frame about 1600 units wide, so the camera's ordinary shot
// is close to 1:1 and only the final overview pulls back.
import { streams } from "./rng.mjs";
import * as ink from "./ink.mjs";
import { write } from "./hand.mjs";
import { icon } from "./icons.mjs";
import { bounds, pad, union } from "./geom.mjs";
import { CAPTION_BAND } from "./camera.mjs";

export const INK = "#1b1b19";
export const GREY = "#55554f";
export const SHADE = "#8f8f88";
export const HIGHLIGHTER = "#f2c94c";

/** Sizes, in board units (cap heights for text). */
export const SIZE = {
  boardTitle: 64,
  regionTitle: 42,
  label: 32,
  note: 21,
  linkLabel: 22,
  icon: 104,
  cardWidth: 300, // the widest a label or note runs before it wraps
  gapRow: 170, // between items side by side: room for an arrow and its label
  gapColumn: 110,
  regionGap: 260,
  frame: [1120, 630], // the smallest region frame
  frameAir: 150, // space round a region's content inside its frame
};
const W = { line: 4.2, icon: 4, label: 3.7, note: 2.9, title: 5.2, mark: 4.6, link: 4, highlight: 0 };

/** One element: something drawn as one gesture group (an item, a link, a note, a mark), with the strokes of each of its parts. */
const element = (id, kind, parts) => ({ id, kind, parts, box: bounds(parts.flatMap((p) => p.strokes)) });
const part = (role, strokes, { width = W.line, color = INK, layer = "ink", opacity = 1, write = false, size = 0 } = {}) => ({ role, strokes, width, color, layer, opacity, write, size });

/** The content of an item, laid out with its top-center at (0, 0): icon, label, note, then the shape drawn round them. */
function itemParts(board, font, it, S) {
  const parts = [];
  let y = 0;
  if (it.icon) {
    const p = ink.pen(S(`${it.id}.icon`), { width: W.icon });
    parts.push(part("icon", icon(p, it.icon, -SIZE.icon / 2, y, SIZE.icon), { width: W.icon }));
    y += SIZE.icon + 18;
  }
  let labelBox = null;
  if (it.label) {
    const wide = ["banner", "bubble"].includes(it.shape) ? SIZE.cardWidth * 1.6 : SIZE.cardWidth;
    const t = write(font, it.label, { x: 0, y, size: SIZE.label, align: "center", maxWidth: wide, rng: S(`${it.id}.label`), lineHeight: 1.6 });
    parts.push(part("label", t.strokes, { width: W.label, write: true, size: SIZE.label }));
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
  if (it.shape !== "none") parts.push(part("shape", shapes[it.shape](), { width: W.line }));
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
  return { parts, labelBox, wordsBox: words.w ? words : null };
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
  const cells = cellItems.map((it, i) => {
    const x = across ? i * cw : 0;
    const y = across ? 0 : i * ch;
    const p = ink.pen(S(`${it.id}.shape`), { width: W.line });
    const cell = i === 0 ? ink.box(p, x, y, cw, ch, { corner: 3 }) : across ? ink.polyline(p, [x, y, x + cw, y, x + cw, y + ch, x, y + ch]) : ink.polyline(p, [x + cw, y, x + cw, y + ch, x, y + ch, x, y]);
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

/** Lays out one region's items (row, column, grid, cells or stack) with the region's top-left at (0, 0). The first region also carries the board's title, as its top line. */
function layoutRegion(board, font, region, S, first) {
  const celled = region.layout === "cells" || region.layout === "stack";
  const cards = celled
    ? cellCards(board, font, region, S)
    : region.items.map((it) => {
        const { parts, labelBox, wordsBox } = itemParts(board, font, it, S);
        return { it, parts, labelBox, wordsBox, box: bounds(parts.flatMap((p) => p.strokes)) };
      });
  const place = (c, x, y) => {
    // the card's box is placed with its top-left at (x, y)
    const dx = x - c.box.x;
    const dy = y - c.box.y;
    c.parts = move(c.parts, dx, dy);
    c.labelBox = moveBox(c.labelBox, dx, dy);
    c.wordsBox = moveBox(c.wordsBox, dx, dy);
    c.box = moveBox(c.box, dx, dy);
  };
  if (celled) {
    // already in place, edge to edge
  } else if (region.layout === "row" || region.layout === "column") {
    let x = 0;
    let y = 0;
    const tallest = Math.max(...cards.map((c) => c.box.h));
    const widest = Math.max(...cards.map((c) => c.box.w));
    for (const c of cards) {
      if (region.layout === "row") {
        place(c, x, (tallest - c.box.h) / 2);
        x += c.box.w + SIZE.gapRow;
      } else {
        place(c, (widest - c.box.w) / 2, y);
        y += c.box.h + SIZE.gapColumn;
      }
    }
  } else {
    const cols = Math.max(...cards.map((c) => c.it.at[0])) + 1;
    const rows = Math.max(...cards.map((c) => c.it.at[1])) + 1;
    const cw = Array(cols).fill(0);
    const rh = Array(rows).fill(0);
    for (const c of cards) {
      cw[c.it.at[0]] = Math.max(cw[c.it.at[0]], c.box.w);
      rh[c.it.at[1]] = Math.max(rh[c.it.at[1]], c.box.h);
    }
    const cx = cw.map((_, i) => cw.slice(0, i).reduce((a, w) => a + w + SIZE.gapRow, 0));
    const ry = rh.map((_, i) => rh.slice(0, i).reduce((a, h) => a + h + SIZE.gapColumn, 0));
    for (const c of cards) {
      const [ci, ri] = c.it.at;
      place(c, cx[ci] + (cw[ci] - c.box.w) / 2, ry[ri] + (rh[ri] - c.box.h) / 2);
    }
  }
  const content = cards.reduce((b, c) => union(b, c.box), null);
  let top = 0;
  let boardTitle = null;
  if (first) {
    // a long title goes on two lines, as on a whiteboard, when it would otherwise widen the first shot by more than a third
    const t = write(font, board.title, { x: content.x, y: 0, size: SIZE.boardTitle, maxWidth: Math.max(content.w * 1.35, 1250), lineHeight: 1.55, rng: S("title") });
    const under = ink.underline(ink.pen(S("title.under"), { width: W.mark * 1.2 }), t.box.x, t.box.y + t.box.h + 10, t.box.w);
    boardTitle = { parts: [part("text", t.strokes, { width: W.title, write: true, size: SIZE.boardTitle }), part("underline", under, { width: W.mark * 1.2, color: board.accent })], box: t.box };
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
  let box = cards.reduce((b, c) => union(b, c.box), null);
  if (title) box = union(box, title.box);
  if (boardTitle) box = union(box, boardTitle.box);
  return { region, cards, title, boardTitle, box };
}

/** Where the regions go on the board: one after the other along the flow, each a neighbour of the last. */
function placeRegions(board, laid) {
  const [fw, fh] = SIZE.frame;
  // a region's frame is its content with air round it, grown to 16:9, never smaller than the smallest shot
  const frames = laid.map((r) => {
    let w = Math.max(fw, r.box.w + 2 * SIZE.frameAir);
    let h = Math.max(fh, r.box.h + 2 * SIZE.frameAir);
    if (w / h > 16 / 9) h = (w * 9) / 16;
    else w = (h * 16) / 9;
    return { w, h };
  });
  if (board.mode === "slides") {
    // a deck: every sheet the size of the largest
    const w = Math.max(...frames.map((f) => f.w));
    const h = Math.max(...frames.map((f) => f.h));
    frames.forEach((f) => Object.assign(f, { w, h }));
  }
  const n = laid.length;
  // a path or grid wraps into the rows that bring the whole board closest to 16:9, so the closing overview reads as a map
  const aspectWith = (per) => {
    const cw = [];
    const rh = [];
    frames.forEach((f, i) => {
      const c = i % per;
      const r = Math.floor(i / per);
      cw[c] = Math.max(cw[c] ?? 0, f.w);
      rh[r] = Math.max(rh[r] ?? 0, f.h);
    });
    const w = cw.reduce((a, v) => a + v, 0) + SIZE.regionGap * (cw.length - 1);
    const h = rh.reduce((a, v) => a + v, 0) + SIZE.regionGap * (rh.length - 1);
    return Math.abs(Math.log(w / h / (16 / 9)));
  };
  let best = n;
  for (let per = n; per >= 1; per--) if (aspectWith(per) < aspectWith(best) - 1e-9) best = per;
  const perRow = board.flow === "row" ? n : board.flow === "column" ? 1 : best;
  const rows = Math.ceil(n / perRow);
  const colW = Array(perRow).fill(0);
  const rowH = Array(rows).fill(0);
  const cell = laid.map((_, i) => {
    const row = Math.floor(i / perRow);
    let col = i % perRow;
    if (board.flow === "path" && row % 2 === 1) col = perRow - 1 - col; // the path turns back on every other row
    if (board.flow === "grid" && laid[i].region.at) return laid[i].region.at;
    return [col, row];
  });
  cell.forEach(([c, r], i) => {
    colW[c] = Math.max(colW[c] ?? 0, frames[i].w);
    rowH[r] = Math.max(rowH[r] ?? 0, frames[i].h);
  });
  const gap = SIZE.regionGap;
  const x0 = colW.map((_, i) => colW.slice(0, i).reduce((a, w) => a + w + gap, 0));
  const y0 = rowH.map((_, i) => rowH.slice(0, i).reduce((a, h) => a + h + gap, 0));
  // a last row with fewer regions than the others is centered under them
  const fullW = colW.reduce((a, w) => a + w, 0) + gap * (colW.length - 1);
  const rowShift = Array(rows).fill(0);
  if (perRow > 1 && board.flow !== "grid") {
    for (let r = 0; r < rows; r++) {
      const inRow = cell.map((c, i) => [c, i]).filter(([c]) => c[1] === r);
      if (inRow.length < perRow) {
        const cols = inRow.map(([c]) => c[0]);
        const lo = Math.min(...cols);
        const hi = Math.max(...cols);
        const used = colW.slice(lo, hi + 1).reduce((a, w) => a + w, 0) + gap * (hi - lo);
        rowShift[r] = (fullW - used) / 2 - x0[lo];
      }
    }
  }
  return laid.map((r, i) => {
    const [c, row] = cell[i];
    const frame = { x: x0[c] + rowShift[row] + (colW[c] - frames[i].w) / 2, y: y0[row] + (rowH[row] - frames[i].h) / 2, w: frames[i].w, h: frames[i].h };
    // the content is centered in its frame; on a slide, in the part of the sheet above the caption's band
    const usable = board.mode === "slides" ? frame.h * (1 - CAPTION_BAND) : frame.h;
    return { ...r, frame, dx: frame.x + (frame.w - r.box.w) / 2 - r.box.x, dy: frame.y + (usable - r.box.h) / 2 - r.box.y };
  });
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
  const laid = placeRegions(board, board.regions.map((r, i) => layoutRegion(board, font, r, S, i === 0)));
  const elements = new Map();
  const regions = [];
  for (const r of laid) {
    const regionBox = moveBox(r.box, r.dx, r.dy);
    regions.push({ id: r.region.id, title: r.region.title, frame: r.frame, box: regionBox, items: r.cards.map((c) => c.it.id) });
    if (r.boardTitle) elements.set("title", { ...element("title", "title", move(r.boardTitle.parts, r.dx, r.dy)), region: r.region.id });
    if (r.title) elements.set(r.region.id, { ...element(r.region.id, "region", move(r.title.parts, r.dx, r.dy)), region: r.region.id });
    for (const c of r.cards) {
      const e = element(c.it.id, "item", move(c.parts, r.dx, r.dy));
      e.region = r.region.id;
      e.labelBox = moveBox(c.labelBox, r.dx, r.dy);
      e.wordsBox = moveBox(c.wordsBox, r.dx, r.dy);
      e.framed = c.it.shape !== "none" || ((r.region.layout === "cells" || r.region.layout === "stack") && c.it.under == null);
      elements.set(c.it.id, e);
    }
  }

  // links, between the boxes of their items
  for (const l of board.links) {
    const a = elements.get(l.from).box;
    const b = elements.get(l.to).box;
    const [x1, y1] = exitPoint(a, b.x + b.w / 2, b.y + b.h / 2, 18);
    const [x2, y2] = exitPoint(b, a.x + a.w / 2, a.y + a.h / 2, 22);
    const bend = l.bend ?? (Math.abs(y2 - y1) < 30 ? -0.08 : 0.1);
    const p = ink.pen(S(`${l.id}.arrow`), { width: W.link });
    let strokes = ink.arrow(p, x1, y1, x2, y2, { bend, double: l.style === "double" });
    if (l.style === "dashed") strokes = [...dashes(strokes[0], 18, 12), ...strokes.slice(1)];
    const parts = [part("arrow", strokes, { width: W.link })];
    if (l.label) {
      // the label sits on the outside of the bend, at the middle
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const nx = -(y2 - y1) / len;
      const ny = (x2 - x1) / len;
      const side = bend <= 0 ? -1 : 1;
      const mx = (x1 + x2) / 2 + nx * bend * len * 0.75;
      const my = (y1 + y2) / 2 + ny * bend * len * 0.75;
      const lt = write(font, l.label, { x: 0, y: 0, size: SIZE.linkLabel, align: "center", maxWidth: 260, rng: S(`${l.id}.label`) });
      // offset from the curve by half the label's extent along the normal, plus air
      const reach = Math.abs(nx) * (lt.box.w / 2) + Math.abs(ny) * (lt.box.h / 2) + 14;
      const ox = mx + nx * side * reach - (lt.box.x + lt.box.w / 2);
      const oy = my + ny * side * reach - (lt.box.y + lt.box.h / 2);
      parts.push(...move([part("label", lt.strokes, { width: W.note, write: true, size: SIZE.linkLabel })], ox, oy));
    }
    const e = element(l.id, "link", parts);
    e.region = elements.get(l.from).region;
    e.joins = [elements.get(l.from).region, elements.get(l.to).region];
    elements.set(l.id, e);
  }

  // notes and marks, beat by beat
  board.beats.forEach((bt, bi) => {
    bt.notes.forEach((n, ni) => {
      const id = `note-${bi + 1}-${ni + 1}`;
      const target = elements.get(n.near);
      const tb = target.box;
      const nt = write(font, n.text, { x: 0, y: 0, size: SIZE.note, align: "center", maxWidth: 280, rng: S(`${id}.text`) });
      const gap = 56;
      const at = {
        below: [tb.x + tb.w / 2, tb.y + tb.h + gap + nt.box.h / 2],
        above: [tb.x + tb.w / 2, tb.y - gap - nt.box.h / 2],
        right: [tb.x + tb.w + gap + nt.box.w / 2, tb.y + tb.h / 2],
        left: [tb.x - gap - nt.box.w / 2, tb.y + tb.h / 2],
      }[n.side];
      const parts = move([part("text", nt.strokes, { width: W.note, color: GREY, write: true, size: SIZE.note })], at[0] - (nt.box.x + nt.box.w / 2), at[1] - (nt.box.y + nt.box.h / 2));
      if (n.arrow) {
        const nb = bounds(parts[0].strokes);
        const [ax, ay] = exitPoint(nb, tb.x + tb.w / 2, tb.y + tb.h / 2, 8);
        const [bx, by] = exitPoint(tb, nb.x + nb.w / 2, nb.y + nb.h / 2, 10);
        parts.push(part("arrow", ink.arrow(ink.pen(S(`${id}.arrow`), { width: W.note }), ax, ay, bx, by, { bend: 0.2, head: 12 }), { width: W.note, color: GREY }));
      }
      const e = element(id, "note", parts);
      e.region = target.region;
      elements.set(id, e);
      bt.draw.push(id);
    });
    bt.mark.forEach((m, mi) => {
      const id = `mark-${bi + 1}-${mi + 1}`;
      const target = elements.get(m.target);
      const tb = m.target === "title" || target.kind !== "item" ? target.box : target.labelBox ?? target.box;
      const p = ink.pen(S(id), { width: W.mark });
      const strokes = {
        // an item's words are circled; an item in a frame of its own is circled round the frame
        circle: () => ink.circleAround(p, target.kind === "item" && !target.framed ? target.wordsBox ?? target.box : target.kind === "item" ? target.box : tb, 12),
        underline: () => ink.underline(p, tb.x, tb.y + tb.h + 8, tb.w),
        box: () => ink.box(p, tb.x - 20, tb.y - 16, tb.w + 40, tb.h + 32),
        cross: () => ink.crossOut(p, tb),
        highlight: () => ink.highlight(ink.pen(S(id), { width: Math.max(18, tb.h * 0.5) }), pad(tb, 6, -2)),
      }[m.kind]();
      const hl = m.kind === "highlight";
      const e = element(id, "mark", [part("mark", strokes, { width: hl ? Math.max(18, tb.h * 0.5) : W.mark, color: hl ? HIGHLIGHTER : board.accent, layer: hl ? "under" : "ink", opacity: hl ? 0.6 : 1 })]);
      e.region = target.region;
      e.target = m.target;
      elements.set(id, e);
      bt.draw.push(id);
    });
  });
  // a region's frame holds everything drawn in it (a note or a mark may reach past the content), grown to 16:9;
  // in slides mode every region is a sheet, and the sheets are all one size
  for (const r of regions) {
    let f = r.frame;
    for (const e of elements.values()) if (e.region === r.id && !e.joins) f = union(f, pad(e.box, 40));
    if (f !== r.frame && board.mode !== "slides") r.frame = fit169(f);
  }
  const sheets = new Map(regions.map((r) => [r.id, r.frame]));
  const all = [...elements.values()];
  let extent = all.reduce((b, e) => union(b, e.box), regions.reduce((b, r) => union(b, r.frame), null));
  for (const s of sheets.values()) extent = union(extent, s);
  return { elements, regions, sheets, extent: pad(extent, 60) };
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
