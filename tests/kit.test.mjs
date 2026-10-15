import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalize } from "../skills/depict/kit/model.mjs";
import { compose } from "../skills/depict/kit/compose.mjs";
import { time, PACE } from "../skills/depict/kit/timeline.mjs";
import { hand } from "../skills/depict/kit/fonts.mjs";
import { measure, wrap, write } from "../skills/depict/kit/hand.mjs";
import { flight, pan, shotOf } from "../skills/depict/kit/camera.mjs";
import { flattenPath, shapeLines } from "../skills/depict/kit/svgpath.mjs";
import { sceneOf } from "../skills/depict/kit/page.mjs";
import { audit } from "../skills/depict/kit/audit.mjs";

const examples = fs.readdirSync(new URL("../skills/depict/examples/", import.meta.url)).filter((d) => fs.existsSync(new URL(`../skills/depict/examples/${d}/board.mjs`, import.meta.url)));
const load = async (name) => (await import(`../skills/depict/examples/${name}/board.mjs`)).default;
const build = (input) => {
  const { board, errors } = normalize(structuredClone(input));
  assert.deepEqual(errors, []);
  const comp = compose(board, hand(board.hand));
  return { board, comp, tl: time(board, comp) };
};
const tiny = () => ({
  title: "A tiny board",
  regions: [{ id: "r", title: "Two things", items: [{ id: "a", icon: "cpu", label: "One" }, { id: "b", icon: "database", label: "Two", note: "a short note" }] }],
  links: [{ id: "ab", from: "a", to: "b", label: "goes to" }],
  beats: [
    { say: "Here is the first thing.", draw: ["title", "a"] },
    { say: "And here is the second, and how they meet.", draw: ["r", "b", "ab"], mark: [{ circle: "b" }] },
  ],
});

test("a script that says too little is refused, with every reason at once", () => {
  const { errors } = normalize({ regions: [{ id: "r", items: [{ id: "x", icon: "no-such-icon" }] }], beats: [{ say: "", draw: ["nothing"] }] });
  const text = errors.join("\n");
  assert.match(text, /needs a title/);
  assert.match(text, /no icon named "no-such-icon"/);
  assert.match(text, /nothing to say/);
  assert.match(text, /draws "nothing"/);
  assert.match(text, /item "x" is never drawn/);
});

test("a thing drawn twice, or marked before it is drawn, is a mistake", () => {
  const s = tiny();
  s.beats[1].draw.push("a");
  s.beats[0].mark = [{ underline: "b" }];
  const text = normalize(s).errors.join("\n");
  assert.match(text, /"a" is drawn twice/);
  assert.match(text, /marks "b" before it is drawn/);
});

test("a wrong icon name comes back with the close ones", () => {
  const s = tiny();
  s.regions[0].items[0].icon = "data-base";
  assert.match(normalize(s).errors.join("\n"), /close ones: .*database/);
});

test("the same seed draws the same board, and another seed another hand", () => {
  const a = sceneOf(...Object.values(build(tiny())));
  const b = sceneOf(...Object.values(build(tiny())));
  assert.deepEqual(a, b);
  const c = sceneOf(...Object.values(build({ ...tiny(), seed: 2 })));
  assert.notDeepEqual(a.strokes, c.strokes);
  assert.equal(a.strokes.length, c.strokes.length);
});

test("a glyph whose ink runs past its advance pushes the next letter on (the print hand's I)", () => {
  const font = hand("print");
  const I = write(font, "In", { size: 40, rng: () => 0.5, wobble: 0 });
  const iRight = Math.max(...I.strokes[I.glyphs[0].from].filter((_, k) => k % 2 === 0));
  const nLeft = Math.min(...I.strokes.slice(I.glyphs[1].from, I.glyphs[1].to).flat().filter((_, k) => k % 2 === 0));
  assert.ok(nLeft > iRight, `the n starts at ${nLeft.toFixed(1)}, after the I ends at ${iRight.toFixed(1)}`);
});

test("wrapping evens out the lines instead of leaving one word alone", () => {
  const font = hand("print");
  const lines = wrap(font, "needs data every step", 21, 300);
  assert.equal(lines.length, 2);
  const [a, b] = lines.map((l) => measure(font, l, 21));
  assert.ok(Math.abs(a - b) < 0.6 * Math.max(a, b), `lines of ${a.toFixed(0)} and ${b.toFixed(0)}`);
});

test("a camera flight starts and ends on its shots, and a pan moves in a straight line", () => {
  const a = [0, 0, 1600];
  const b = [3000, 1200, 1200];
  const f = flight(a, b);
  f.at(0).forEach((v, i) => assert.ok(Math.abs(v - a[i]) < 1e-6));
  f.at(1).forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-3));
  // the flight pulls back as it travels: wider in the middle than at either end
  assert.ok(f.at(0.5)[2] > Math.max(a[2], b[2]));
  const p = pan(a, b);
  assert.deepEqual(p.at(0.5), [1500, 600, 1400]);
  assert.deepEqual(shotOf({ x: 0, y: 0, w: 900, h: 900 }), [450, 450, 1600]);
});

test("arcs with packed flags flatten, and so does every Lucide icon", () => {
  const [line] = flattenPath("M10 2v7.751a.25.25 0 00.407.195l2.28-1.834");
  assert.ok(line.every(Number.isFinite));
  const icons = JSON.parse(fs.readFileSync(new URL("../skills/depict/kit/icons/lucide.json", import.meta.url), "utf8"));
  for (const [name, els] of Object.entries(icons)) {
    const lines = els.flatMap((e) => shapeLines(e));
    assert.ok(lines.length && lines.every((l) => l.length >= 4 && l.every(Number.isFinite)), name);
  }
});

test("every beat lasts at least as long as its sentence takes to read, and strokes run in order", () => {
  const { board, tl } = build(tiny());
  tl.beats.forEach((b, i) => assert.ok(b.t1 - b.draw0 >= PACE.readBase + board.beats[i].say.length / PACE.readRate - 1e-9));
  for (let i = 1; i < tl.strokes.length; i++) assert.ok(tl.strokes[i].t0 >= tl.strokes[i - 1].t1 - 1e-9);
  for (const s of tl.strokes) assert.ok(s.t1 <= tl.beats[s.beat].t1 + 1e-9);
});

for (const name of examples) {
  test(`example ${name}: builds and passes the audit`, async () => {
    const input = await load(name);
    const { board, errors } = normalize(input);
    assert.deepEqual(errors, []);
    for (const it of board.regions.flatMap((r) => r.items)) if (it.figure) it.figureUrl = it.figure;
    const comp = compose(board, hand(board.hand));
    const tl = time(board, comp);
    const problems = audit(board, comp, tl).filter((f) => f.level === "problem");
    assert.deepEqual(problems, []);
  });
}

test("cells sit edge to edge, and an item hangs under its cell", () => {
  const s = {
    title: "Cells",
    regions: [{ id: "arr", title: "An array", layout: "cells", items: [{ id: "c0", label: "0" }, { id: "c1", label: "1" }, { id: "c2", label: "2" }, { id: "v", label: "Ana", shape: "box", under: "c1" }] }],
    beats: [{ say: "An array of three, and a value under the middle one.", draw: ["title", "arr", "c0", "c1", "c2", "v"] }],
  };
  const { comp } = build(s);
  const [a, b, c] = ["c0", "c1", "c2"].map((id) => comp.elements.get(id).box);
  assert.ok(Math.abs(a.x + a.w - b.x) < 12 && Math.abs(b.x + b.w - c.x) < 12, "cells share their edges");
  const v = comp.elements.get("v").box;
  assert.ok(v.y > b.y + b.h && Math.abs(v.x + v.w / 2 - (b.x + b.w / 2)) < 2, "the value hangs centered under its cell");
  const bad = normalize({ ...s, regions: [{ ...s.regions[0], items: [{ id: "c0", label: "0", icon: "cpu" }, { id: "v", label: "x", under: "nope" }] }] }).errors.join("\n");
  assert.match(bad, /not an icon/);
  assert.match(bad, /under "nope" is not a cell/);
});

test("typographic marks are written the plain way, and a character no hand has is refused", () => {
  const { board, errors } = normalize({ ...tiny(), title: "Key → index…", regions: [{ id: "r", title: "It’s here", items: [{ id: "a", label: "one 中" }, { id: "b", label: "two" }] }] });
  assert.equal(board.title, "Key -> index...");
  assert.equal(board.regions[0].title, "It's here");
  assert.match(errors.join("\n"), /cannot write "中" \(U\+4E2D\)/);
});

test("a circle holds every corner of what it circles", async () => {
  const ink = await import("../skills/depict/kit/ink.mjs");
  const { splitmix32 } = await import("../skills/depict/kit/rng.mjs");
  for (const [w, h] of [[300, 60], [180, 90], [90, 90], [500, 40]]) {
    const b = { x: 100, y: 100, w, h };
    const [pts] = ink.circleAround(ink.pen(splitmix32(w * 7 + h)), b, 12);
    // every corner lies inside the drawn loop: the loop's radius toward each corner is longer than the corner's
    for (const [cx, cy] of [[b.x, b.y], [b.x + w, b.y], [b.x, b.y + h], [b.x + w, b.y + h]]) {
      const ang = Math.atan2(cy - (b.y + h / 2), cx - (b.x + w / 2));
      let best = null;
      for (let i = 0; i < pts.length; i += 2) {
        const a = Math.atan2(pts[i + 1] - (b.y + h / 2), pts[i] - (b.x + w / 2));
        const d = Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang)));
        if (!best || d < best.d) best = { d, r: Math.hypot(pts[i] - (b.x + w / 2), pts[i + 1] - (b.y + h / 2)) };
      }
      assert.ok(best.r > Math.hypot(cx - (b.x + w / 2), cy - (b.y + h / 2)), `the corner of a ${w} x ${h} box is inside the circle`);
    }
  }
});

test("a note low in its region stays inside its shot", () => {
  const s = tiny();
  s.beats[1].draw.push({ note: "a note that sits low on purpose", near: "b", side: "below" });
  const { board, comp, tl } = build(s);
  const findings = audit(board, comp, tl);
  assert.ok(!findings.some((f) => f.rule === "safe"), "the shot holds the note");
});

test("regions on a grid need a place each, and two cannot share one", () => {
  const s = { ...tiny(), flow: "grid", regions: [{ ...tiny().regions[0], at: [0, 0] }] };
  assert.deepEqual(normalize(s).errors, []);
  delete s.regions[0].at;
  assert.match(normalize(s).errors.join("\n"), /give the region at/);
});

test("a marker fill stays inside its shape, even a curved one", async () => {
  const ink = await import("../skills/depict/kit/ink.mjs");
  const { splitmix32 } = await import("../skills/depict/kit/rng.mjs");
  const { cubic } = await import("../skills/depict/kit/geom.mjs");
  const inside = (poly, x, y) => {
    let c = false;
    for (let i = 0, j = poly.length / 2 - 1; i < poly.length / 2; j = i++) {
      const [xi, yi, xj, yj] = [poly[2 * i], poly[2 * i + 1], poly[2 * j], poly[2 * j + 1]];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  // a box, and a wide arrow bent into an arc: every point of every pass of the fill lies inside the shape
  const p = ink.pen(splitmix32(3), { width: 5 });
  const boxPoly = [0, 0, 200, 0, 200, 120, 0, 120];
  for (const pts of ink.fill(p, boxPoly, { nib: 14 }).strokes) for (let i = 0; i < pts.length; i += 2) assert.ok(inside(boxPoly, pts[i], pts[i + 1]));
  const arrow = ink.fatArrow(p, cubic(0, 200, 120, 60, 280, 60, 400, 200, 6), { width: 40 });
  for (const pts of arrow.along(14)) for (let i = 0; i < pts.length; i += 2) assert.ok(inside(arrow.poly, pts[i], pts[i + 1]), `a pass leaves the arrow at ${pts[i].toFixed(0)}, ${pts[i + 1].toFixed(0)}`);
});

test("the ideas are numbered in the order they are told and read as a page: left to right, then down", async () => {
  const input = await load("cpu-cache");
  const { comp } = build(input);
  // each region's title carries its number, in a disc
  for (const r of comp.regions) assert.ok(comp.elements.get(r.id).parts.some((q) => q.role === "badge"), `${r.id} is numbered`);
  // reading order: each idea starts to the right of the one before on its row, or on a row below
  const line = (r) => comp.elements.get(r.id).box;
  for (let i = 1; i < comp.regions.length; i++) {
    const a = line(comp.regions[i - 1]);
    const b = line(comp.regions[i]);
    assert.ok(b.x > a.x + a.w - 1 || b.y > a.y + a.h, `${comp.regions[i].id} comes after ${comp.regions[i - 1].id} as a page is read`);
  }
});

test("ten ideas fill a 16:9 page in rows that hold about as many each", () => {
  const regions = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, title: `Idea ${i + 1}`, items: [{ id: `a${i}`, icon: "cpu", label: "One" }, { id: `b${i}`, icon: "database", label: "Two" }] }));
  const s = { title: "Ten ideas", regions, beats: regions.map((r) => ({ say: `Here is ${r.title}.`, draw: [r.id, ...r.items.map((it) => it.id)] })) };
  s.beats[0].draw.unshift("title");
  const { comp } = build(s);
  const aspect = comp.extent.w / comp.extent.h;
  assert.ok(aspect > 1.3 && aspect < 2.4, `the page is about 16:9 (${aspect.toFixed(2)})`);
  const rows = new Map();
  for (const r of comp.regions) {
    const y = Math.round(comp.elements.get(r.id).box.y / 40);
    rows.set(y, (rows.get(y) ?? 0) + 1);
  }
  const counts = [...rows.values()];
  assert.ok(counts.length >= 2 && Math.max(...counts) - Math.min(...counts) <= 1, `rows hold about as many ideas each (${counts.join(", ")})`);
  assert.equal(comp.elements.get("r9").parts.find((q) => q.role === "number").strokes.length > 0, true, "the tenth is numbered too");
});

test("the guide comes alive, hops to each new idea with the camera, lands in its shot, and is surprised by a mark", async () => {
  const { actorAt } = await import("../skills/depict/kit/act.mjs");
  const input = await load("cpu-cache");
  const { board, comp, tl } = build(input);
  const [guide] = tl.actors;
  assert.ok(guide, "the board has its guide");
  const tr = guide.track;
  // every trip starts with a camera flight to another region and lands in that region's shot
  for (const m of tr.moves.filter((m) => m.from[0] !== m.to[0] || m.from[1] !== m.to[1])) {
    const k = tl.camera.find((c) => Math.abs(c.t0 + 0.08 - m.t0) < 1e-6);
    assert.ok(k && k.region, "a trip rides a camera flight");
    const f = comp.regions.find((r) => r.id === k.region).frame;
    assert.ok(m.to[0] > f.x && m.to[0] < f.x + f.w && m.to[1] > f.y && m.to[1] <= f.y + f.h, "it lands inside the region's shot");
  }
  // the same time, the same pose
  assert.deepEqual(actorAt(guide, 21.3), actorAt(guide, 21.3));
  // a mark makes it surprised while the mark is drawn
  const mark = tl.strokes.find((s) => s.el.startsWith("mark-"));
  assert.equal(actorAt(guide, mark.t0 + 0.3).feel, "surprised");
  // it is hidden before it appears, and in the air during a trip
  assert.equal(actorAt(guide, tr.appear[0] - 0.01).shown, false);
  const trip = tr.moves[0];
  assert.ok(actorAt(guide, trip.t0 + (trip.t1 - trip.t0) / (2 * trip.hops)).lift > 10);
});

test("a feeling or an act the guide does not have is refused", () => {
  const s = tiny();
  s.beats[0].feel = "giddy";
  s.beats[1].act = "dance";
  const text = normalize(s).errors.join("\n");
  assert.match(text, /feel "giddy"/);
  assert.match(text, /act "dance"/);
  assert.match(normalize({ ...tiny(), regions: [{ ...tiny().regions[0], items: [{ id: "note-1", label: "x" }, { id: "b", label: "y" }] }] }).errors.join("\n"), /one the kit uses/);
});

test("a slide whose content is small is drawn larger to fill its page", async () => {
  const input = await load("compound-interest");
  const { comp } = build(input);
  const zooms = [...comp.elements.values()].filter((e) => e.kind === "item").map((e) => e.zoom ?? 1);
  assert.ok(Math.max(...zooms) > 1.1, "some slide is drawn larger");
  for (const r of comp.regions) {
    const sheet = comp.sheets.get(r.id);
    for (const e of comp.elements.values()) if (e.region === r.id && !e.joins && e.kind !== "guide") assert.ok(e.box.x >= sheet.x && e.box.x + e.box.w <= sheet.x + sheet.w, `${e.id} stays on its sheet`);
  }
});

test("every board ends on the outro: the guide waves, the circle closes on it, the title is written, and the page rests on the whole board", async () => {
  const { actorAt } = await import("../skills/depict/kit/act.mjs");
  const input = await load("cpu-cache");
  const { tl } = build(input);
  const o = tl.outro;
  assert.ok(o, "the board has its outro");
  assert.ok(tl.explore < o.iris.t0 && o.iris.t0 < o.iris.hold && o.iris.hold < o.iris.close && o.iris.close < o.iris.t1, "the circle closes in order");
  assert.ok(o.card.length && o.card[0].t0 >= o.iris.t1 && o.card.at(-1).t1 < tl.duration, "the title is written on the dark, then held");
  // the guide waves goodbye, then winks inside the circle
  const [guide] = tl.actors;
  assert.equal(actorAt(guide, o.iris.t0 + 0.2).front.glove, "open");
  assert.equal(actorAt(guide, o.iris.close - 0.1).feel, "wink");
  assert.ok(!normalize({ ...tiny(), outro: false }).board.outro === true);
});

test("a mark can span several things, and a child's board plays at half speed", () => {
  const s = {
    title: "Cells",
    regions: [{ id: "arr", title: "An array", layout: "cells", items: [{ id: "c0", label: "4" }, { id: "c1", label: "1" }, { id: "c2", label: "7" }, { id: "c3", label: "2" }] }],
    beats: [
      { say: "An array of four numbers.", draw: ["title", "arr", "c0", "c1", "c2", "c3"] },
      { say: "A window over the middle three.", mark: [{ highlight: ["c1", "c2", "c3"] }] },
    ],
  };
  const { comp, tl } = build(s);
  const mark = [...comp.elements.values()].find((e) => e.kind === "mark");
  const r = mark.parts[0].width / 2; // the highlighter's nib reaches this far past its line
  const [c0, c1, c3] = ["c0", "c1", "c3"].map((id) => comp.elements.get(id).cell);
  assert.ok(mark.box.x - r <= c1.x + 14 && mark.box.x + mark.box.w + r >= c3.x + c3.w - 14, "the window spans the three cells");
  assert.ok(mark.box.x - r >= c0.x + c0.w && mark.box.y - r >= c1.y && mark.box.y + mark.box.h + r <= c1.y + c1.h, "and stays inside them, off the cell before");
  // a child's board plays at half speed by default: its captions are read at about eight letters a second
  const kid = build({ ...s, audience: "child" });
  assert.equal(kid.board.speed, 0.5);
  assert.equal(sceneOf(kid.board, kid.comp, kid.tl).speed, 0.5);
  assert.equal(tl.beats.length, kid.tl.beats.length);
});

test("cells with places make a matrix, and a line link is an edge with no head", () => {
  const s = {
    title: "A grid",
    regions: [
      { id: "m", title: "Two by two", layout: "cells", items: [{ id: "a", label: "1", at: [0, 0] }, { id: "b", label: "2", at: [1, 0] }, { id: "c", label: "3", at: [0, 1] }, { id: "d", label: "4", at: [1, 1] }] },
      { id: "t", title: "Two nodes", items: [{ id: "x", label: "8", shape: "circle" }, { id: "y", label: "3", shape: "circle" }] },
    ],
    links: [{ id: "e", from: "x", to: "y", style: "line" }],
    beats: [{ say: "A grid, and an edge.", draw: ["title", "m", "a", "b", "c", "d", "t", "x", "y", "e"] }],
  };
  const { comp } = build(s);
  const [a, b, c] = ["a", "b", "c"].map((id) => comp.elements.get(id).box);
  assert.ok(Math.abs(b.x - (a.x + a.w)) < 14 && Math.abs(c.y - (a.y + a.h)) < 14, "the cells share their edges across and down");
  assert.equal(comp.elements.get("e").parts[0].strokes.length, 1, "an edge is one line, no head");
});

test("a link meets a ring at its outline, cells drawn out of order are never left open, and a thin bar is colored in", () => {
  const s = {
    title: "Edges and cells",
    regions: [
      { id: "t", title: "A tree", items: [{ id: "x", label: "8", shape: "circle", at: [1, 0] }, { id: "y", label: "3", shape: "circle", at: [0, 1] }, { id: "z", label: "9", shape: "circle", at: [2, 1] }] },
      { id: "m", title: "Two by two", layout: "cells", items: [{ id: "a", label: "1", at: [0, 0] }, { id: "b", label: "2", at: [1, 0] }, { id: "c", label: "3", at: [0, 1] }, { id: "d", label: "4", at: [1, 1] }] },
      { id: "s", title: "A bar", items: [{ id: "bar", sketch: [{ d: "M48 10 L52 10 L52 90 L48 90 Z", fill: "accent" }], label: "Thin" }] },
    ],
    links: [{ id: "xy", from: "x", to: "y", style: "line" }, { id: "xz", from: "x", to: "z" }],
    beats: [
      { say: "A tree of three nodes.", draw: ["title", "t", "x", "y", "z", "xy", "xz"] },
      { say: "Its last cell first, then the rest.", draw: ["m", "d", "a", "b", "c"] },
      { say: "And a thin bar.", draw: ["s", "bar"] },
    ],
  };
  const { comp } = build(s);
  // the edge starts at the circle, not at the corner of the box round it, on a diagonal too
  const ring = comp.elements.get("x").ring;
  const [cx, cy] = [ring.x + ring.w / 2, ring.y + ring.h / 2];
  for (const id of ["xy", "xz"]) {
    const [x0, y0] = comp.elements.get(id).parts[0].strokes[0];
    const d = Math.hypot(x0 - cx, y0 - cy);
    assert.ok(d < ring.w / 2 + 20, `${id} leaves the circle at its outline (${d.toFixed(0)} from its middle, radius ${(ring.w / 2).toFixed(0)})`);
  }
  // d is drawn first, before the cells above and before it, so it draws all four of its sides; a draws three
  const sidesOf = (id) => comp.elements.get(id).parts.find((q) => q.role === "shape").strokes;
  const extent = (id) => {
    const c = comp.elements.get(id).cell;
    const pts = sidesOf(id).flat();
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);
    return { c, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  const d = extent("d");
  assert.ok(d.x0 < d.c.x + 6 && d.y0 < d.c.y + 6 && d.x1 > d.c.x + d.c.w - 6 && d.y1 > d.c.y + d.c.h - 6, "the cell drawn first is closed on every side");
  // the bar, four units wide in its drawing, is colored in
  const fill = comp.elements.get("bar").parts.find((q) => q.role === "fill");
  assert.ok(fill && fill.strokes.length > 0, "a thin shape gets its color");
});

test("the guide is dressed for the subject: what it cannot wear is refused, one hat at a time, and the seed picks how it arrives and leaves", async () => {
  const bad = normalize({ ...tiny(), guide: { wear: ["cape"], hold: "sword", skin: "plaid", intro: "moonwalk", hat: "crown" } }).errors.join("\n");
  for (const m of [/wears "cape"/, /holds "sword"/, /skin "plaid"/, /intro "moonwalk"/, /guide\.hat/]) assert.match(bad, m);
  assert.match(normalize({ ...tiny(), guide: { wear: ["crown", "beanie"] } }).errors.join("\n"), /one hat at a time/);
  // the same board always arrives and leaves the same way; other boards in other ways
  const ways = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const a = normalize({ ...tiny(), seed }).board.cast;
    assert.deepEqual(a, normalize({ ...tiny(), seed }).board.cast);
    ways.add(`${a.intro} ${a.outro}`);
  }
  assert.ok(ways.size >= 4, `twelve boards arrive and leave in ${ways.size} ways`);
  // a tipped cap lifts the cap (and its hat) alone; what it holds is drawn in its hand
  const { actorAt } = await import("../skills/depict/kit/act.mjs");
  const { tl } = build({ ...tiny(), guide: { wear: ["grad-cap", "glasses"], hold: "book", intro: "tip" } });
  const [g] = tl.actors;
  const parts = new Set(g.rig.strokes.map((s) => s.part));
  for (const p of ["cap", "hat", "wear", "held"]) assert.ok(parts.has(p), `the rig has its ${p}`);
  const tip = g.track.caps[0];
  assert.ok(tip && actorAt(g, (tip[0] + tip[1]) / 2).cap.lift > 0, "the cap is lifted in the tip");
  assert.equal(actorAt(g, tip[1] + 0.1).cap.lift, 0, "and put back");
});

test("however it comes alive, the guide ends beside the last idea it presented", () => {
  for (const intro of ["wave", "hop", "spin", "bow", "tip", "jump"]) {
    const s = { ...tiny(), guide: { intro } };
    s.regions = [...s.regions, { id: "r2", title: "A second idea", items: [{ id: "c", icon: "users", label: "Three" }] }];
    s.beats = [...s.beats, { say: "And a second idea.", draw: ["r2", "c"] }];
    const { comp, tl } = build(s);
    const [g] = tl.actors;
    const last = g.track.moves.filter((m) => m.t1 <= tl.explore).sort((a, b) => a.t1 - b.t1).at(-1);
    const spot = comp.guide.spots.find((q) => q.region === "r2");
    assert.deepEqual(last.to, [spot.x, spot.y], `with a ${intro} it ends at the last idea`);
  }
});

test("a node between two columns sits centered over them, and a line through a third thing is flagged", () => {
  const s = {
    title: "A small tree",
    regions: [{ id: "t", title: "A tree", items: [{ id: "root", label: "8", shape: "circle", at: [0.5, 0] }, { id: "l", label: "3", shape: "circle", at: [0, 1] }, { id: "r", label: "9", shape: "circle", at: [1, 1] }] }],
    links: [{ id: "a", from: "root", to: "l", style: "line" }, { id: "b", from: "root", to: "r", style: "line" }],
    beats: [{ say: "A root and its two children.", draw: ["title", "t", "root", "l", "r", "a", "b"] }],
  };
  const { board, comp, tl } = build(s);
  assert.ok(Number.isFinite(tl.duration), "the board has a length");
  const mid = (id) => comp.elements.get(id).box.x + comp.elements.get(id).box.w / 2;
  assert.ok(Math.abs(mid("root") - (mid("l") + mid("r")) / 2) < 2, "the root is centered over its children");
  assert.ok(!audit(board, comp, tl).some((f) => f.rule === "through"), "the edges have a clear way");
  // a straight line from the first cell to the third runs through the second
  const t = { title: "Three in a row", regions: [{ id: "row", title: "Three", items: [{ id: "x", label: "One", shape: "box" }, { id: "y", label: "Two", shape: "box" }, { id: "z", label: "Three", shape: "box" }] }], links: [{ id: "xz", from: "x", to: "z", bend: 0 }], beats: [{ say: "Three things, and a line over the middle one.", draw: ["title", "row", "x", "y", "z", "xz"] }] };
  const b2 = build(t);
  assert.ok(audit(b2.board, b2.comp, b2.tl).some((f) => f.rule === "through"), "the line through the middle one is flagged");
  assert.match(normalize({ ...s, regions: [{ ...s.regions[0], items: [{ id: "root", label: "8", at: [-1, 0] }] }] }).errors.join("\n"), /two numbers from 0/);
});

test("a matrix is a table with columns of their own width, and a second note on one side goes past the first", () => {
  const s = {
    title: "A table",
    regions: [{ id: "m", title: "Two columns", layout: "cells", items: [{ id: "a", label: "1", at: [0, 0] }, { id: "b", label: "A long name", at: [1, 0] }, { id: "c", label: "2", at: [0, 1] }, { id: "d", label: "Short", at: [1, 1] }] }],
    beats: [
      { say: "A table of two columns.", draw: ["title", "m", "a", "b", "c", "d", { note: "first", near: "d", side: "below" }] },
      { say: "And one more note under it.", draw: [{ note: "second", near: "d", side: "below" }] },
    ],
  };
  const { comp } = build(s);
  const [a, b, c] = ["a", "b", "c"].map((id) => comp.elements.get(id).cell);
  assert.ok(a.w < b.w - 40, `the column of short labels is narrower (${a.w.toFixed(0)} against ${b.w.toFixed(0)})`);
  assert.ok(Math.abs(b.x - (a.x + a.w)) < 1 && Math.abs(c.y - (a.y + a.h)) < 1, "the cells still share their edges");
  const [n1, n2] = ["note-1-1", "note-2-1"].map((id) => comp.elements.get(id).box);
  assert.ok(n2.y >= n1.y + n1.h, "the second note sits below the first");
});
