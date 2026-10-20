// The guide's performance, written from the timeline: it comes alive once it
// is drawn (each board its own way: a wave, a hop, a spin, a bow, a tip of its
// cap, a jump), presents the title while it is written, looks at and
// points to each new thing as the pen draws it, turns to face what is behind
// it, is surprised when something is marked, hops to the next idea while the
// camera flies there, steps to free paper when something in the way would make
// it seem to point at that instead (and only looks where no place sees it), and
// presents the whole board at the end (or, with no outro to say goodbye,
// cheers). A beat can set how it feels (`feel`) and what it does (`act`).
// Blinks come at the guide's own uneven pace, from the board's seed.
import { hash32, splitmix32 } from "./rng.mjs";
import { FEELINGS, feetBox, reachAbove, spotBox } from "./rig.mjs";
import { overlaps, pad } from "./geom.mjs";
import { INTROS, keepClear } from "./act.mjs";

/** The acts that aim at a thing: past something in the way they would seem to aim at that, so there it only looks. */
const AIMED = new Set(["point", "present"]);
/**
 * A step to another place: how long one hop takes, in seconds, and each of two when it goes round what is in its way;
 * how soon after another one can come; and how high a hop may go to pass over what lies on its way.
 */
const STEP = { time: 0.45, hop: 0.36, gap: 2, clear: 150 };

/**
 * The actor for the page: its rig and its track, and `needs`: the beats whose step had no time before the pen began
 * (beat index to the seconds it lacked), for the timeline to give them. A step that lacks time is taken all the same
 * when `provisional` (the timeline times the board again with that time given), and left out when not.
 */
export function perform(board, comp, tl, appear, { provisional = false } = {}) {
  const g = comp.guide;
  const els = comp.elements;
  const spotOf = new Map(g.spots.map((s) => [s.region, s]));
  const start = g.spots[0];
  const track = { start: [start.x, start.y, start.facing], appear, moves: [], turns: [], arms: [], feel: [[0, "happy"]], look: [], bounces: [], blinks: [], leans: [], spins: [], caps: [] };
  const [, alive] = appear;

  // when each element is drawn: its first stroke's start and its last stroke's end
  const span = new Map();
  for (const s of tl.strokes) {
    const sp = span.get(s.el) ?? [Infinity, -Infinity];
    sp[0] = Math.min(sp[0], s.t0);
    sp[1] = Math.max(sp[1], s.t1);
    span.set(s.el, sp);
  }
  const center = (b) => [b.x + b.w / 2, b.y + b.h / 2];
  const holds = (o, b) => o.x <= b.x && o.y <= b.y && o.x + o.w >= b.x + b.w && o.y + o.h >= b.y + b.h;
  const near = (b, x, y, m) => x > b.x - m && x < b.x + b.w + m && y > b.y - m && y < b.y + b.h + m;
  /** Whether a thing is on the board by time t: its first stroke has begun. */
  const shownBy = (id, t) => (span.get(id)?.[0] ?? Infinity) <= t;
  const solid = [...els.entries()].filter(([, e]) => e.kind === "item" || e.kind === "note" || e.kind === "region" || e.kind === "title");
  // the slot the board keeps for its guide directs it: where it can stand, what its finger reaches and along which line
  const M = g.rig.slot.measures;
  const tip = (g.rig.slot.tip ?? 0.13) * g.h + (g.rig.hold === "pointer" ? 0.27 * g.h : 0) + 12;
  /** Which way it faces to gesture at x from where it stands: it turns to what is well behind it. */
  const facingTo = (at, x) => {
    const side = Math.sign(x - at.x);
    return side && side !== at.facing && Math.abs(x - at.x) > 0.3 * g.h ? side : at.facing;
  };
  const [shx, shy] = g.rig.slot.shoulders.front;
  const shoulder = (at, facing) => [at.x + facing * shx, at.y + shy];
  // it points at the middle of a thing, and its hand stops where the tip of its glove (or of its pointer) would reach the
  // first thing in the way, the thing itself included: a finger that lands on the words hides them. Only what is on the
  // board while it points is in the way: nothing stops its hand that is not drawn yet.
  const reachTo = (at, px, py, also, until) => {
    const [sx, sy] = shoulder(at, facingTo(at, px));
    const d = Math.hypot(px - sx, py - sy) || 1;
    const [ux, uy] = [(px - sx) / d, (py - sy) / d];
    const boxes = [...solid.filter(([id]) => shownBy(id, until)).map(([, e]) => e.box), ...(also ? [also] : [])];
    for (let r = 0; r <= g.rig.slot.reach * g.h + tip; r += 5) {
      const [qx, qy] = [sx + ux * r, sy + uy * r];
      if (boxes.some((b) => near(b, qx, qy, 6))) return Math.max(0.05 * g.h, r - tip);
    }
    return Infinity;
  };
  // the first other thing on the board on the way from its shoulder to the middle of a thing, or null when the way is
  // clear: a hand that has to cross one thing to reach another seems to point at the first. Across the cells of the
  // thing's own table or stack the hand points at the table, which reads; a frame round the thing is not in the way.
  const layoutOf = new Map(board.regions.map((r) => [r.id, r.layout]));
  const inTheWay = (q, tid, tbox, until) => {
    const [cx, cy] = center(tbox);
    const [sx, sy] = shoulder(q, facingTo(q, cx));
    const te = els.get(tid);
    const table = layoutOf.get(te?.region) === "cells" || layoutOf.get(te?.region) === "stack";
    // a note and the thing it is on read as one: a hand toward either may cross the other
    const own = (id, o) => (o.kind === "note" && o.near === tid) || (te?.kind === "note" && te.near === id);
    const others = solid.filter(([id, o]) => id !== tid && shownBy(id, until) && !holds(o.box, tbox) && !own(id, o) && !(table && o.region === te.region && o.kind !== "region"));
    const d = Math.hypot(cx - sx, cy - sy) || 1;
    for (let r = 0; r < d; r += 6) {
      const [x, y] = [sx + ((cx - sx) * r) / d, sy + ((cy - sy) * r) / d];
      if (near(tbox, x, y, 6)) break;
      const o = others.find(([, b]) => near(b.box, x, y, 6));
      if (o) return o[0];
    }
    // a thing out of reach: the finger stops in the air, and the eye follows it to the first thing ahead. A finger that
    // stops beside another thing, or has another thing ahead of it, within a narrow cone, before the one it means,
    // seems to point at that one
    const full = g.rig.slot.reach * g.h + tip;
    if (d > full) {
      const [ux, uy] = [(cx - sx) / d, (cy - sy) / d];
      const [x, y] = [sx + ux * full, sy + uy * full];
      const ahead = (b) => {
        if (near(b, x, y, 0.12 * g.h)) return true;
        const px = b.x + b.w / 2 - x;
        const py = b.y + b.h / 2 - y;
        const along = px * ux + py * uy;
        const across = Math.abs(px * uy - py * ux);
        return along > 0 && along < d - full && across < 0.21 * along + Math.hypot(b.w, b.h) / 2;
      };
      const o = others.find(([, b]) => ahead(b.box));
      if (o) return o[0];
    }
    return null;
  };

  // its trips: when the camera flies to another idea, the guide hops there, landing as the camera arrives, never
  // higher than the shot it lands in has room for: once the camera holds still, all of it is in the picture
  const room = (to, shot) => {
    const top = shot[1] - (shot[2] * 9) / 32 + 24;
    return Math.max(40, to.y - g.h * (1 + reachAbove(board.cast)) - top);
  };
  let here = start;
  for (const k of tl.camera) {
    const to = k.region != null ? spotOf.get(k.region) : null;
    if (!to || to === here) continue;
    const dx = to.x - here.x;
    const dist = Math.hypot(dx, to.y - here.y);
    // a few big leaps rather than many small ones, as many as the camera's flight has time for, timed to land just as
    // the camera arrives
    const t0 = k.t0 + 0.08;
    const hops = Math.max(1, Math.min(3, Math.round(dist / 650), Math.floor((k.t1 - t0) / 0.42)));
    const t1 = Math.max(t0 + 0.42 * hops, k.t1);
    const ceiling = room(to, k.to);
    track.moves.push({ t0, t1, from: [here.x, here.y], to: [to.x, to.y], hops, height: Math.min(340, ceiling, 80 + (0.18 * dist) / hops), ceiling, facing: Math.sign(dx) || here.facing, land: to.facing });
    track.bounces.push([t0 - 0.1, -0.7]); // it crouches before it jumps
    track.bounces.push([t1, 0.85]);
    track.arms.push([t0 - 0.12, "cheer"]);
    here = to;
  }
  /** Where the guide is at time t, and which way it faces (before any turn). */
  const whereAt = (t) => {
    let at = { x: start.x, y: start.y, facing: start.facing };
    let last = -Infinity;
    for (const m of track.moves) {
      if (m.t1 > t || m.t1 < last) continue;
      at = { x: m.to[0], y: m.to[1], facing: m.land };
      last = m.t1;
    }
    return at;
  };

  // it comes alive, the way the board's cast says (or its seed chose), and then waves hello
  const ready = INTROS[board.cast?.intro ?? "wave"](track, alive, start);
  // what it did and from where: a page that casts another character in its place has that one arrive its own way
  // (act.mjs, personalize), chosen among its own with the board's own seed
  track.intro = { kind: board.cast?.intro ?? "wave", at: alive, from: { x: start.x, y: start.y, facing: start.facing }, seed: hash32(`${board.seed}:${board.title}:intro`) };
  track.look.push([alive, null]);
  // the title: it presents it as it is written
  const title = span.get("title");
  if (title) {
    const tb = els.get("title").box;
    track.arms.push([Math.max(title[0] + 0.4, ready), "present", tb.x + Math.min(tb.w * 0.25, 320), tb.y + tb.h * 0.5]);
    track.intro.title = title[0] + 0.4;
    track.look.push([title[0], tb.x + tb.w * 0.4, tb.y + tb.h / 2]);
  }

  /** Where it stands for a gesture at t: where a hop under way at t lands (it points from there, not from where it left). */
  const settledAt = (t) => {
    const m = track.moves.find((q) => q.t0 <= t && t < q.t1 && (q.to[0] !== q.from[0] || q.to[1] !== q.from[1]));
    return m ? { x: m.to[0], y: m.to[1], facing: m.land } : whereAt(t);
  };

  /** What a beat draws, in the pen's order, each with what it looks at and whether its hands go to it, and until when. */
  const gesturesOf = (bt, bi) => {
    const out = [];
    let acted = false;
    for (const id of bt.draw) {
      if (id === "guide" || id === "title") continue;
      const e = els.get(id);
      const sp = span.get(id);
      if (!e || !sp) continue;
      const tbox = e.kind === "mark" ? e.targetBox ?? els.get(e.target).box : e.box;
      const tid = e.kind === "mark" ? e.target : id;
      // the beat's act goes to the first thing it draws; with no act, its hands go to each thing, a mark, or an idea's title
      const act = bt.act && !acted ? bt.act : null;
      if (act) acted = true;
      const hands = act ? AIMED.has(act) : !bt.act && (e.kind === "mark" || e.kind === "item" || e.kind === "region" || e.kind === "note");
      out.push({ id, e, tid, tbox, t: sp[0], act, hands });
    }
    // a gesture holds until the next one, or until the hands rest after the beat's drawing
    const beat = tl.beats[bi];
    const next = tl.beats[bi + 1];
    const rest = next ? Math.min(beat.draw1 + 0.7, next.draw0 - 0.05) : beat.draw1 + 0.7;
    const aimed = out.filter((x) => x.hands);
    aimed.forEach((x, i) => (x.until = aimed[i + 1]?.t ?? rest));
    out.forEach((x) => (x.until ??= x.t));
    return out;
  };

  // its steps: when something drawn earlier stands between it and what a beat draws, it steps (one small hop) to free
  // paper beside or under that thing, inside the shot, from where it sees the most of what the beat draws, the nearest
  // such place first. A step is its beat's: it leaves once the beat has begun (the last beat's picture seen whole and
  // still) and lands as the pen begins, and it never crosses what is drawn, for a body that covers a thing, even in
  // passing, hides it while the camera holds still on it: it hops over what is low enough, or goes round in two hops
  // by free paper, or does not go. One step a beat at most, never two within two seconds, never on its way between
  // ideas.
  const taken = [...els.values()].filter((e) => e.kind !== "guide").map((e) => pad(e.box, 18));
  const top = reachAbove(board.cast);
  const shotAt = (t) => {
    let shot = tl.camera[0]?.from ?? null;
    for (const k of tl.camera) if (t >= k.t0) shot = k.to;
    return shot;
  };
  const viewOf = (shot) => shot && { x: shot[0] - shot[2] / 2, y: shot[1] - (shot[2] * 9) / 32, w: shot[2], h: (shot[2] * 9) / 16 };
  // free paper: nothing drawn on it or right under its feet (it would seem to stand on that), inside the shot
  const drawnBoxes = [...els.values()].filter((e) => e.kind !== "guide" && e.kind !== "mark" && e.box).map((e) => e.box);
  const free = (q, view) => {
    const b = spotBox(q, g.h, M);
    const feet = feetBox(q, g.h, M);
    return taken.every((o) => !overlaps(b, o)) && drawnBoxes.every((o) => o.y < q.y - 4 || !overlaps(feet, o)) && (!view || holds(pad(view, -20), b)) && holds(pad(comp.extent, -10), b);
  };
  const placesBy = (tbox, shot) => {
    const view = viewOf(shot);
    const foot = tbox.y + tbox.h;
    const qs = [];
    for (const dx of [0.45, 0.75]) qs.push({ x: tbox.x - 30 - dx * g.h, y: foot, facing: 1, top }, { x: tbox.x + tbox.w + 30 + dx * g.h, y: foot, facing: -1, top });
    for (const dy of [0.35, 0.6]) {
      const y = foot + 40 + g.h * ((1 + top) * dy + 0.4);
      qs.push({ x: tbox.x + tbox.w / 2 - 0.45 * g.h, y, facing: 1, top }, { x: tbox.x + tbox.w / 2 + 0.45 * g.h, y, facing: -1, top });
    }
    if (view) {
      // at the edges of the shot: its left and right sides at the thing's foot, and its floor under the thing
      const m = 30;
      qs.push({ x: view.x + m + M.back * g.h, y: foot, facing: 1, top }, { x: view.x + view.w - m - M.back * g.h, y: foot, facing: -1, top });
      const floor = view.y + view.h - m;
      for (const dx of [-0.5, 0.5]) qs.push({ x: tbox.x + tbox.w / 2 + dx * g.h, y: floor, facing: dx < 0 ? 1 : -1, top });
    }
    // free paper, inside the shot, and on the board: the closing picture of the whole board holds it too
    return qs.filter((q) => free(q, view));
  };
  // how well a place serves a gesture: best when its finger reaches the thing along a clear line, still good when the
  // thing is out of reach but nothing is in the way, no good when something is
  const within = (q, tbox) => {
    const [sx, sy] = shoulder(q, facingTo(q, tbox.x + tbox.w / 2));
    const dx = Math.max(tbox.x - sx, 0, sx - (tbox.x + tbox.w));
    const dy = Math.max(tbox.y - sy, 0, sy - (tbox.y + tbox.h));
    return Math.hypot(dx, dy) <= g.rig.slot.reach * g.h + tip;
  };
  const serves = (q, x) => (inTheWay(q, x.tid, x.tbox, x.until) ? 0 : within(q, x.tbox) ? 2 : 1);
  // a hop's arc, at u of the way; and how high a hop from a to b must go so that its body passes over everything drawn
  // by t (null when no hop it may make does). What its body touches where it stands, at either end, is not in its way.
  const arcAt = (a, b, height, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - height * 4 * u * (1 - u), facing: Math.sign(b.x - a.x) || a.facing, top });
  const clearHop = (a, b, shot, t) => {
    // no higher than the shot has room for over either end: the arc is highest between them
    const ceiling = shot ? Math.min(room(a, shot), room(b, shot)) : 110;
    const base = Math.min(110, ceiling, 45 + 0.1 * Math.hypot(b.x - a.x, b.y - a.y));
    const ends = [spotBox({ ...a, top }, g.h, M), spotBox({ ...b, top }, g.h, M)];
    const shown = [...els.values()].filter((e) => e.kind !== "guide" && e.box && shownBy(e.id, t) && !ends.some((x) => overlaps(x, e.box)));
    for (const height of new Set([base, Math.min(STEP.clear, ceiling, base * 1.6), Math.min(STEP.clear, ceiling)])) {
      let clear = height >= base;
      for (let k = 1; k < 12 && clear; k++) clear = !shown.some((e) => overlaps(pad(spotBox(arcAt(a, b, height, k / 12), g.h, M), -8), e.box));
      if (clear) return height;
    }
    return null;
  };
  // free paper on the way round: places on a grid over the shot where nothing is drawn yet by t (it only touches down
  // there, so what is drawn later may go there)
  const waysIn = (shot, t) => {
    const view = viewOf(shot);
    const out = [];
    if (!view) return out;
    const drawn = [...els.values()].filter((e) => e.kind !== "guide" && e.box && shownBy(e.id, t)).map((e) => pad(e.box, 18));
    for (let i = 1; i < 16; i++) for (let j = 1; j < 10; j++) {
      const w = { x: view.x + (view.w * i) / 16, y: view.y + (view.h * j) / 10, facing: 1, top };
      const b = spotBox(w, g.h, M);
      if (drawn.every((o) => !overlaps(b, o)) && holds(pad(view, -20), b) && holds(pad(comp.extent, -10), b)) out.push(w);
    }
    return out;
  };
  /** The way from `at` to q that crosses nothing drawn by t: one hop, or two by free paper, the shortest; null when none. */
  const routeTo = (at, q, shot, t) => {
    const h = clearHop(at, q, shot, t);
    if (h != null) return { hops: [{ to: q, height: h }], len: Math.hypot(q.x - at.x, q.y - at.y) };
    let best = null;
    for (const w of waysIn(shot, t)) {
      const len = Math.hypot(w.x - at.x, w.y - at.y) + Math.hypot(q.x - w.x, q.y - w.y);
      if (best && len >= best.len) continue;
      const ha = clearHop(at, w, shot, t);
      const hb = ha == null ? null : clearHop(w, q, shot, t);
      if (hb != null) best = { hops: [{ to: w, height: ha }, { to: q, height: hb }], len };
    }
    return best;
  };
  const needs = new Map();
  let lastStep = -Infinity;
  board.beats.forEach((bt, bi) => {
    const gs = gesturesOf(bt, bi).filter((x) => x.hands);
    if (!gs.length) return;
    const beat = tl.beats[bi];
    const at = settledAt(gs[0].t);
    const sees = (q) => gs.reduce((a, x) => a + serves(q, x), 0);
    const here = sees(at);
    if (here === 2 * gs.length) return;
    // it may leave once the beat has begun and anything it was doing has ended; it lands just before the pen begins
    const busyTill = Math.max(beat.t0, ...track.moves.filter((m) => m.t0 < gs[0].t).map((m) => m.t1 + 0.1));
    if (busyTill < ready) return;
    const shot = shotAt(gs[0].t);
    let best = null;
    for (const x of gs) {
      for (const q of placesBy(x.tbox, shot)) {
        const n = sees(q);
        if (n <= here || (best && n < best.n)) continue;
        const route = routeTo(at, q, shot, gs[0].t);
        if (!route) continue;
        // fewer hops first, then the nearer
        if (!best || n > best.n || route.hops.length < best.route.hops.length || (route.hops.length === best.route.hops.length && route.len < best.route.len)) best = { q, n, route };
      }
    }
    if (!best) return;
    const { hops } = best.route;
    const time = hops.length === 1 ? STEP.time : STEP.hop * hops.length;
    const t1 = gs[0].t - 0.05;
    const t0 = t1 - time;
    if (Math.max(t0, busyTill) - lastStep < STEP.gap) return;
    if (t0 < busyTill) {
      needs.set(bi, busyTill - t0 + 0.02);
      if (!provisional) return;
    }
    let from = at;
    hops.forEach((hp, i) => {
      const a = t0 + (time * i) / hops.length;
      const b = t0 + (time * (i + 1)) / hops.length;
      const land = i === hops.length - 1 ? hp.to.facing : Math.sign(hops[i + 1].to.x - hp.to.x) || hp.to.facing;
      track.moves.push({ t0: a, t1: b, from: [from.x, from.y], to: [hp.to.x, hp.to.y], hops: 1, height: hp.height, facing: Math.sign(hp.to.x - from.x) || from.facing, land, step: true });
      track.bounces.push([a - 0.06, -0.45], [b, 0.6]);
      from = hp.to;
    });
    lastStep = t0;
  });
  // a trip to the next idea leaves from wherever it last stood
  track.moves.sort((a, b) => a.t0 - b.t0);
  let was = [start.x, start.y];
  for (const m of track.moves) {
    if (m.from[0] === m.to[0] && m.from[1] === m.to[1]) {
      // a hop where it stands
      m.from = [...was];
      m.to = [...was];
      continue;
    }
    if (!m.step && (m.from[0] !== was[0] || m.from[1] !== was[1])) {
      const dist = Math.hypot(m.to[0] - was[0], m.to[1] - was[1]);
      m.hops = Math.max(1, Math.min(3, Math.round(dist / 650)));
      m.height = Math.min(340, m.ceiling ?? 340, 80 + (0.18 * dist) / m.hops);
      m.facing = Math.sign(m.to[0] - was[0]) || m.facing;
      m.from = [...was];
    }
    was = m.to;
  }

  // its gestures: it looks at each thing as the pen draws it and, when the way is clear, points at it; past something in
  // the way it only looks, for a hand that crosses one thing to reach another seems to point at the first
  const blocked = [];
  board.beats.forEach((bt, bi) => {
    const beat = tl.beats[bi];
    track.feel.push([beat.t0, bt.feel ?? "happy"]);
    for (const x of gesturesOf(bt, bi)) {
      const { e, tid, tbox, t, act, hands, until } = x;
      const [cx, cy] = center(tbox);
      const at = settledAt(t);
      // it turns to face what is drawn behind it
      const facing = facingTo(at, cx);
      if (facing !== at.facing) track.turns.push([t, facing]);
      track.look.push([t, cx, cy]);
      const by = hands ? inTheWay(at, tid, tbox, until) : null;
      if (by) blocked.push({ t, id: tid, by, region: els.get(tid)?.region });
      const way = hands && !by ? reachTo(at, cx, cy, tbox, until) : Infinity;
      const most = Number.isFinite(way) ? [Math.round(way)] : []; // the page's track is JSON: no Infinity in it
      if (e.kind === "mark") {
        // something circled or underlined: surprise, a jolt, and a hand toward it
        track.feel.push([t, "surprised"]);
        track.bounces.push([t, 0.55]);
        track.feel.push([t + 1.4, bt.feel ?? "happy"]);
      }
      if (act) track.arms.push(by ? [t, "rest"] : [t, act, cx, cy, ...most]);
      else if (hands) track.arms.push(by ? [t, "rest"] : [t, e.kind === "mark" ? "present" : "point", cx, cy, ...most]);
    }
    // after its drawing, the hands go back to the hips and the eyes to the viewer (before the next beat begins)
    const next = tl.beats[bi + 1];
    if (!bt.act && next) track.arms.push([Math.min(beat.draw1 + 0.7, next.draw0 - 0.05), "rest"]);
    track.look.push([Math.max(beat.draw1 + 0.5, beat.t1 - 0.8), null]);
  });

  // its quirks: what its personality has it do on its own, in a quiet moment now and then (Stuart pushes his
  // glasses up before he explains): when its hands are at rest, nothing is pointed at and it is not on its way. The
  // quiet moments are the board's and kept in the track, whoever presents it, so a character cast in its place does
  // its own quirks there (act.mjs, personalize)
  const quirks = (g.rig.personality?.quirks ?? []).filter((q) => g.rig.poses[q]);
  track.quirks = [];
  {
    const rq = splitmix32((board.seed * 40503 + 7) >>> 0);
    let lastQuirk = -Infinity;
    tl.beats.slice(0, -1).forEach((beat) => {
      const q0 = beat.t0 + 0.15;
      const q1 = q0 + 1.0;
      if (q0 < ready + 2 || q0 - lastQuirk < 20) return;
      const before = track.arms.filter((key) => key[0] <= q0).sort((x, y) => x[0] - y[0]).at(-1);
      const busy = track.arms.some((key) => key[0] > q0 - 0.3 && key[0] < q1 + 0.3) || track.moves.some((m) => m.t0 < q1 + 0.2 && m.t1 > q0 - 0.2);
      if (busy || (before && before[1] !== "rest") || rq() < 0.45) return;
      track.quirks.push([q0, q1]);
      if (quirks.length) {
        track.arms.push([q0, quirks[(track.quirks.length - 1) % quirks.length]], [q1, "rest"]);
        track.look.push([q0, null]);
      }
      lastQuirk = q0;
    });
  }

  // the end of the explanation. With an outro to come, the goodbye is the outro's: here it turns to the whole
  // board and presents it, proud, as the camera pulls back to it. Without one, this is the goodbye: it cheers and
  // hops for joy.
  const end = tl.beats.at(-1).draw1 + 0.15;
  const at = whereAt(end);
  if (board.outro) {
    const ex = comp.extent;
    const [cx, cy] = [ex.x + ex.w / 2, ex.y + ex.h / 2];
    const side = Math.sign(cx - at.x);
    if (side && side !== at.facing && Math.abs(cx - at.x) > 0.3 * g.h) track.turns.push([end, side]);
    track.arms.push([end, "present", cx, cy]);
    track.look.push([end, cx, cy]);
    track.feel.push([end, "proud"]);
    track.bounces.push([end + 0.05, 0.45]);
    track.arms.push([end + 2.4, "rest"]);
    track.feel.push([end + 2.4, "happy"]);
  } else {
    track.arms.push([end, "cheer"]);
    track.feel.push([end, "proud"]);
    track.moves.push({ t0: end + 0.1, t1: end + 1.05, from: [at.x, at.y], to: [at.x, at.y], hops: 2, height: 55, facing: at.facing, land: at.facing });
    track.bounces.push([end + 1.05, 0.7]);
    track.arms.push([end + 2.6, "rest"]);
    track.feel.push([end + 2.6, "happy"]);
  }

  // blinks, at its own uneven pace
  const rng = splitmix32((board.seed * 2654435761) >>> 0);
  for (let t = alive + 1.6; t < tl.duration; t += 2.2 + rng() * 2.4) track.blinks.push(t);

  for (const list of [track.arms, track.feel, track.look, track.turns, track.bounces, track.leans, track.spins, track.caps]) list.sort((a, b) => a[0] - b[0]);
  track.moves.sort((a, b) => a.t0 - b.t0);
  // a guide drawn to another's slot is directed by the slot, and makes its gestures from its own shoulders: one its own
  // arm would not make cleanly (it would cross something, or its shorter finger stop beside another thing) is a look
  if (g.rig.contract !== g.rig.character) {
    const elements = [...els.entries()].filter(([, e]) => e.box).map(([id, e]) => ({ kind: e.kind, t0: span.get(id)?.[0] ?? Infinity, box: [e.box.x, e.box.y, e.box.w, e.box.h] }));
    const own = { h: g.h, hold: g.rig.hold, eyes: g.rig.eyes, shoulders: g.rig.shoulders, reach: g.rig.reach, poses: g.rig.poses, feelings: FEELINGS, motion: g.rig.motion, slot: { front: g.rig.slot.shoulders.front, reach: g.rig.slot.reach }, track };
    track.arms = keepClear(own, elements).track.arms;
  }
  return {
    id: "guide",
    h: g.h,
    rig: g.rig,
    hold: g.rig.hold,
    eyes: g.rig.eyes,
    shoulders: g.rig.shoulders,
    poses: g.rig.poses,
    feelings: FEELINGS,
    // what it is made of and how far it reaches, so a pose worked out here is the page's own
    motion: g.rig.motion,
    reach: g.rig.reach,
    track,
    blocked,
    needs,
  };
}

// how it comes alive, and how high: the ways every character can arrive live in act.mjs, so a page can play another
// character's own arrival when it casts one in its guide's place
export { INTRO_HEIGHT, hopHere } from "./act.mjs";
