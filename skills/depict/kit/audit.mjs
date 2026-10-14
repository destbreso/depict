// The audit: what the board is checked against before anyone sees it. Each
// rule comes from the craft of whiteboard explanations (references/craft.md
// has the sources) or from the geometry of the board itself. Problems stop
// the build; warnings are worth a look.
import { overlaps, pad } from "./geom.mjs";
import { SIZE } from "./compose.mjs";
import { safeArea } from "./camera.mjs";

const VW = 1920; // a shot fills this many pixels across in the video

/** Every finding: { level: "problem" | "warning", rule, text }. */
export function audit(board, comp, tl) {
  const out = [];
  const problem = (rule, text) => out.push({ level: "problem", rule, text });
  const warn = (rule, text) => out.push({ level: "warning", rule, text });
  const els = comp.elements;

  // text stays readable in every shot (in pixels of a 1920 x 1080 frame)
  const capOf = (e) => ({ title: SIZE.boardTitle, region: SIZE.regionTitle, item: e.parts.some((p) => p.role === "label") ? SIZE.label : SIZE.note, note: SIZE.note, link: SIZE.linkLabel, mark: Infinity })[e.kind] ?? SIZE.note;
  tl.beats.forEach((b, i) => {
    const k = VW / b.shot[2];
    // a beat whose things sit in more than one region is shot wide enough for all of them, and everything in it shrinks
    const spans = new Set();
    const joiner = board.beats[i].draw.map((id) => els.get(id)).find((e) => e?.joins && e.joins[0] !== e.joins[1]);
    for (const id of board.beats[i].draw) {
      const e = els.get(id);
      (e.joins ?? [e.region]).forEach((r) => spans.add(r));
    }
    const why = spans.size > 1 ? `; the shot spans regions ${[...spans].join(" and ")}${joiner ? ` because link "${joiner.id}" joins them` : ""}, so everything in it is drawn smaller: draw a link between regions in a beat of its own, after both its ends, or keep linked items in one region` : "; split the region or shorten what it holds";
    for (const id of board.beats[i].draw) {
      const e = els.get(id);
      if (e.kind === "link" && !e.parts.some((p) => p.role === "label")) continue; // an arrow with no words has nothing to read
      const cap = Math.min(capOf(e), e.parts.some((p) => p.role === "note") ? SIZE.note : Infinity);
      if (!Number.isFinite(cap)) continue;
      const px = Math.round(cap * k * 10) / 10; // compared as it is shown
      if (px < 14) problem("readable", `beat ${i + 1}: "${id}" is drawn with letters ${px.toFixed(1)} px tall on screen, too small to read${why}`);
      else if (px < 18) warn("readable", `beat ${i + 1}: "${id}" has letters ${px.toFixed(1)} px tall on screen; 18 px or more reads comfortably${spans.size > 1 ? why : ""}`);
    }
  });

  // nothing drawn lands outside its beat's shot, or under the caption
  tl.beats.forEach((b, i) => {
    const safe = safeArea(b.shot);
    for (const id of board.beats[i].draw) {
      const e = els.get(id);
      const bb = e.box;
      if (bb.x < safe.x || bb.y < safe.y || bb.x + bb.w > safe.x + safe.w || bb.y + bb.h > safe.y + safe.h) {
        problem("safe", `beat ${i + 1}: "${id}" reaches ${bb.y + bb.h > safe.y + safe.h ? "under the caption" : "outside the shot"}; move it (a note to another side) or give its region less to hold`);
      }
    }
  });

  // nothing lands on top of anything else
  const solid = [...els.values()].filter((e) => e.kind !== "mark");
  const boxOf = (e) => {
    if (e.kind !== "link") return e.box;
    // a link's own box spans its ends; what can collide is its label
    const label = e.parts.find((p) => p.role === "label");
    return label ? labelBox(label) : null;
  };
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i];
      const b = solid[j];
      const ba = boxOf(a);
      const bb = boxOf(b);
      if (!ba || !bb) continue;
      if (a.kind === "title" || b.kind === "title" || a.kind === "region" || b.kind === "region") {
        if (overlaps(pad(ba, -4), pad(bb, -4))) problem("overlap", `"${a.id}" and "${b.id}" overlap`);
        continue;
      }
      if (overlaps(pad(ba, -6), pad(bb, -6))) problem("overlap", `"${a.id}" and "${b.id}" overlap; move one (another side for a note, another layout or cell for an item)`);
    }
  }

  // a mark lands on its target and nothing else
  for (const m of els.values()) {
    if (m.kind !== "mark") continue;
    for (const e of solid) {
      if (e.id === m.target || e.kind === "link") continue;
      const b = boxOf(e);
      if (b && overlaps(pad(m.box, -8), pad(b, -8))) warn("overlap", `a mark on "${m.target}" runs into "${e.id}"`);
    }
  }

  // every element sits inside its region's frame (a slide's sheet in slides mode)
  for (const e of els.values()) {
    if (e.joins) continue;
    const f = comp.sheets.get(e.region);
    const b = e.box;
    if (b.x < f.x - 1 || b.y < f.y - 1 || b.x + b.w > f.x + f.w + 1 || b.y + b.h > f.y + f.h + 1) {
      (board.mode === "slides" ? problem : warn)("frame", `"${e.id}" reaches outside ${board.mode === "slides" ? "its slide" : "its region"} (${e.region})`);
    }
  }

  // captions: two lines of about 42 characters, read at no more than 20 characters a second
  tl.beats.forEach((b, i) => {
    const n = b.say.length;
    if (n > 110) problem("caption", `beat ${i + 1} says ${n} characters; keep a sentence under about 90 so it fits two caption lines`);
    else if (n > 90) warn("caption", `beat ${i + 1} says ${n} characters; under about 90 fits two caption lines`);
    const rate = n / (b.t1 - b.t0);
    if (rate > 20) warn("pace", `beat ${i + 1} asks for ${rate.toFixed(0)} characters a second of reading; 20 is the most`);
  });

  // labels of two or three words, notes short
  for (const r of board.regions) {
    for (const it of r.items) {
      // words with letters in them: a formula like "72 ÷ 10 = 7.2" reads at a glance
      const words = it.label.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
      if (words > 4) warn("label", `item "${it.id}": a label of ${words} words; two or three read at a glance (put the rest in its note)`);
      const nw = it.note.split(/\s+/).filter(Boolean).length;
      if (nw > 9) warn("note", `item "${it.id}": a note of ${nw} words; keep notes to a short phrase`);
    }
  }

  // a region holds a few things: four reads best, six at most
  for (const r of board.regions) {
    if (r.items.length > 6) warn("load", `region "${r.id}" holds ${r.items.length} items; four read best and six is the most, so split it`);
  }

  // a few new things at a time (the cells of one array drawn together count once)
  const celled = new Set(board.regions.filter((r) => r.layout === "cells" || r.layout === "stack").map((r) => r.id));
  board.beats.forEach((bt, i) => {
    const groups = new Set();
    const fresh = bt.draw.filter((id) => {
      if (id.startsWith("mark-")) return false;
      const e = els.get(id);
      if (e.kind === "item" && celled.has(e.region)) {
        if (groups.has(e.region)) return false;
        groups.add(e.region);
      }
      return true;
    }).length;
    if (fresh > 4) warn("load", `beat ${i + 1} draws ${fresh} things at once; four is about what a viewer takes in before a pause`);
  });

  // the opening: a picture soon, not a long piece of writing
  const first = tl.beats[0];
  if (first.draw1 - first.draw0 > 7) warn("hook", `the first beat draws for ${(first.draw1 - first.draw0).toFixed(1)} s; open with a picture within about 5 s, and write the rest in the next beat`);

  // length: an explainer runs one to three minutes, a lesson under six
  if (tl.duration > 360) warn("length", `the board runs ${(tl.duration / 60).toFixed(1)} minutes; under six holds attention, or split it into two boards`);

  // the closing map: its titles at least must read in the overview
  const kOverview = VW / tl.overview[2];
  const regionPx = SIZE.regionTitle * kOverview;
  if (regionPx < 10) warn("map", `in the closing overview the region titles are ${regionPx.toFixed(0)} px tall; the board is very large for one picture (the page can still be zoomed)`);
  return out;
}

const labelBox = (part) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pts of part.strokes) for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i]);
    x1 = Math.max(x1, pts[i]);
    y0 = Math.min(y0, pts[i + 1]);
    y1 = Math.max(y1, pts[i + 1]);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

/** The findings as text, problems first. */
export function report(findings) {
  const problems = findings.filter((f) => f.level === "problem");
  const warnings = findings.filter((f) => f.level === "warning");
  const lines = [];
  for (const f of problems) lines.push(`  problem (${f.rule}): ${f.text}`);
  for (const f of warnings) lines.push(`  warning (${f.rule}): ${f.text}`);
  lines.push(problems.length ? `audit failed: ${problems.length} problem${problems.length > 1 ? "s" : ""}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : `audit passed${warnings.length ? ` with ${warnings.length} warning${warnings.length > 1 ? "s" : ""}` : ""}`);
  return { text: lines.join("\n"), ok: !problems.length };
}
