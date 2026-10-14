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

  // text stays readable in the shot it is drawn in (in pixels of a 1920 x 1080 frame)
  const capOf = (e) => {
    if (e.kind === "link") return e.parts.some((p) => p.role === "label") ? SIZE.linkLabel * (e.scale ?? 1) : Infinity; // an arrow with no words has nothing to read
    const z = e.zoom ?? 1; // a slide's content drawn larger to fill its page
    if (e.kind === "item") return (e.parts.some((p) => p.role === "note") ? SIZE.note : SIZE.label) * z;
    if (e.kind === "note") return SIZE.note * z;
    return { title: SIZE.boardTitle, region: SIZE.regionTitle, note: SIZE.note, mark: Infinity, guide: Infinity, story: Infinity }[e.kind] ?? SIZE.note;
  };
  board.beats.forEach((bt, i) => {
    for (const id of bt.draw) {
      const e = els.get(id);
      const cap = capOf(e);
      if (!Number.isFinite(cap) || !e.shot) continue;
      const px = Math.round(cap * (VW / e.shot[2]) * 10) / 10; // compared as it is shown
      const fix = e.bridge ? "; a bridge's label grows with the distance it spans, so give it fewer words" : "; split the region, give it fewer items, or a layout that fits a wide shot";
      if (px < 14) problem("readable", `beat ${i + 1}: "${id}" is drawn with letters ${px.toFixed(1)} px tall on screen, too small to read${fix}`);
      else if (px < 18) warn("readable", `beat ${i + 1}: "${id}" has letters ${px.toFixed(1)} px tall on screen; 18 px or more reads comfortably`);
    }
  });

  // nothing drawn lands outside its shot, or under the caption
  board.beats.forEach((bt, i) => {
    for (const id of bt.draw) {
      const e = els.get(id);
      if (!e.shot || e.kind === "story") continue;
      const safe = safeArea(e.shot);
      const bb = e.box;
      if (bb.x < safe.x || bb.y < safe.y || bb.x + bb.w > safe.x + safe.w || bb.y + bb.h > safe.y + safe.h) {
        problem("safe", `beat ${i + 1}: "${id}" reaches ${bb.y + bb.h > safe.y + safe.h ? "under the caption" : "outside the shot"}; move it (a note to another side) or give its region less to hold`);
      }
    }
  });

  // no idea left as an island: every region connects to the rest through some link
  if (board.regions.length > 1) {
    const parent = new Map(board.regions.map((r) => [r.id, r.id]));
    const find = (x) => (parent.get(x) === x ? x : find(parent.get(x)));
    for (const e of els.values()) if (e.joins) parent.set(find(e.joins[0]), find(e.joins[1]));
    const groups = new Map();
    for (const r of board.regions) {
      const g = find(r.id);
      groups.set(g, [...(groups.get(g) ?? []), r.id]);
    }
    if (groups.size > 1) {
      const parts = [...groups.values()].map((g) => g.join(" + "));
      warn("islands", `the board falls apart into ${groups.size} unconnected parts (${parts.join("; ")}); link an item of one region to an item of another, so the map shows how one idea leads to the next`);
    }
  }

  // nothing lands on top of anything else
  const solid = [...els.values()].filter((e) => e.kind !== "mark" && e.kind !== "story");
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
      if ((m.targets ?? [m.target]).includes(e.id) || e.kind === "link") continue;
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

  // captions: two lines of about 42 characters, read at no more than 20 characters a second (for a child, shorter and slower)
  const child = board.audience === "child";
  const cap = child ? { problem: 80, warn: 64, rate: 10 } : { problem: 110, warn: 90, rate: 20 };
  tl.beats.forEach((b, i) => {
    const n = b.say.length;
    if (n > cap.problem) problem("caption", `beat ${i + 1} says ${n} characters; keep a sentence under about ${cap.warn} so it fits two caption lines${child ? " a child can read" : ""}`);
    else if (n > cap.warn) warn("caption", `beat ${i + 1} says ${n} characters; under about ${cap.warn} fits two caption lines${child ? " a child can read" : ""}`);
    const rate = n / ((b.t1 - b.t0) / (board.speed ?? 1)); // read at the speed the page plays it
    if (rate > cap.rate) warn("pace", `beat ${i + 1} asks for ${rate.toFixed(0)} characters a second of reading; ${cap.rate} is the most`);
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
    // the cells of an array are one thing; what hangs under them counts on its own
    const n = r.layout === "cells" || r.layout === "stack" ? 1 + r.items.filter((it) => it.under != null).length : r.items.length;
    if (n > 6) warn("load", `region "${r.id}" holds ${n} items; four read best and six is the most, so split it`);
  }

  // a few new things at a time (the cells of one array drawn together count once)
  const celled = new Set(board.regions.filter((r) => r.layout === "cells" || r.layout === "stack").map((r) => r.id));
  board.beats.forEach((bt, i) => {
    const groups = new Set();
    const fresh = bt.draw.filter((id) => {
      if (id.startsWith("mark-") || id.startsWith("guide")) return false;
      const e = els.get(id);
      if (e.kind === "item" && celled.has(e.region)) {
        if (groups.has(e.region)) return false;
        groups.add(e.region);
      }
      return true;
    }).length;
    if (fresh > 4) warn("load", `beat ${i + 1} draws ${fresh} things at once; four is about what a viewer takes in before a pause`);
  });

  // composition: lines that cross read as a tangle
  const lines = [...els.values()].filter((e) => e.path);
  const crossings = [];
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) if (cross(lines[i].path, lines[j].path)) crossings.push([lines[i].id, lines[j].id]);
  for (const [a, b] of crossings) warn("tangle", `"${a}" and "${b}" cross; crossing lines read as a tangle: put the item between the other two, link fewer things, or say the connection instead of drawing it`);

  // a bridge between regions that are not side by side runs across the board
  // two regions are side by side when they face each other along one side and no other region stands between them
  const slots = comp.regions.map((r) => r.slot);
  const slotOf = (id) => comp.regions.find((r) => r.id === id).slot;
  const beside = (a, b) => {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    let band = null;
    if (oy > 0.25 * Math.min(a.h, b.h)) band = { x: Math.min(a.x + a.w, b.x + b.w), y: Math.max(a.y, b.y), w: Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w), h: oy };
    else if (ox > 0.25 * Math.min(a.w, b.w)) band = { x: Math.max(a.x, b.x), y: Math.min(a.y + a.h, b.y + b.h), w: ox, h: Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h) };
    return !!band && !slots.some((o) => o !== a && o !== b && overlaps(pad(o, -1), band));
  };
  const bridges = [...els.values()].filter((e) => e.kind === "link" && e.bridge);
  for (const e of bridges) {
    if (!beside(slotOf(e.joins[0]), slotOf(e.joins[1]))) warn("bridge", `link "${e.id}" runs between regions ${e.joins.join(" and ")}, which are not side by side; ${board.story ? "the story arrows already lead from each idea to the next, so say this connection in a sentence" : "say this connection in a sentence"}, or put both items in one region`);
  }
  if (board.story && bridges.length > Math.max(1, board.regions.length - 2)) warn("bridge", `${bridges.length} links run between regions; the story arrows already tie each idea to the next, so keep one or two that say something they do not`);

  // every region has something the eye goes to first, and is not mostly empty paper
  for (const r of board.regions) {
    if (r.layout === "cells" || r.layout === "stack") continue;
    const marked = new Set(board.beats.flatMap((b) => b.mark.map((m) => m.target)));
    const focal = r.items.some((it) => it.size === "large" || it.character || it.sketch || it.shape !== "none" || marked.has(it.id));
    if (r.items.length > 1 && !focal) warn("focal", `region "${r.id}" has no focal point: make the item it is about large, a character or a sketch, give it a frame, or mark it`);
    const frame = comp.regions.find((x) => x.id === r.id).frame;
    const area = r.items.reduce((a, it) => a + els.get(it.id).box.w * els.get(it.id).box.h, 0);
    const fill = area / (frame.w * frame.h);
    if (fill < 0.1) warn("sparse", `region "${r.id}" is mostly empty paper (its items cover ${Math.round(fill * 100)}% of its shot): draw its idea as a scene, a character or a sketch, or make its key item large`);
  }

  // the opening: a picture soon, not a long piece of writing (the guide's hello is quick, and counts as the picture)
  const first = tl.beats[0];
  const most = 7 + (board.beats[0].draw.includes("guide") ? 3 : 0);
  if (first.draw1 - first.draw0 > most) warn("hook", `the first beat draws for ${(first.draw1 - first.draw0).toFixed(1)} s; open with a picture within about 5 s, and write the rest in the next beat`);

  // length: an explainer runs one to three minutes, a lesson under six
  if (tl.duration > 360) warn("length", `the board runs ${(tl.duration / 60).toFixed(1)} minutes; under six holds attention, or split it into two boards`);

  // the closing map: its titles at least must read in the overview
  const kOverview = VW / tl.overview[2];
  const regionPx = SIZE.regionTitle * kOverview;
  if (regionPx < 10) warn("map", `in the closing overview the region titles are ${regionPx.toFixed(0)} px tall; the board is very large for one picture (the page can still be zoomed)`);
  return out;
}

/** Whether two polylines cross, away from their ends (two arrows from one item may touch where they start). */
function cross(a, b) {
  const ends = (pts) => [pts[0], pts[1], pts[pts.length - 2], pts[pts.length - 1]];
  const [a0x, a0y, a1x, a1y] = ends(a);
  const [b0x, b0y, b1x, b1y] = ends(b);
  const nearEnd = (x, y) => [[a0x, a0y], [a1x, a1y], [b0x, b0y], [b1x, b1y]].some(([ex, ey]) => Math.hypot(x - ex, y - ey) < 40);
  for (let i = 0; i + 3 < a.length; i += 2) {
    for (let j = 0; j + 3 < b.length; j += 2) {
      const [px, py, qx, qy] = [a[i], a[i + 1], a[i + 2], a[i + 3]];
      const [rx, ry, sx, sy] = [b[j], b[j + 1], b[j + 2], b[j + 3]];
      const d = (qx - px) * (sy - ry) - (qy - py) * (sx - rx);
      if (!d) continue;
      const u = ((rx - px) * (sy - ry) - (ry - py) * (sx - rx)) / d;
      const v = ((rx - px) * (qy - py) - (ry - py) * (qx - px)) / d;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1 && !nearEnd(px + u * (qx - px), py + u * (qy - py))) return true;
    }
  }
  return false;
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
