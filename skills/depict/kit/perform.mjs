// The guide's performance, written from the timeline: it comes alive once it
// is drawn (each board its own way: a wave, a hop, a spin, a bow, a tip of its
// cap, a jump), presents the title while it is written, looks at and
// points to each new thing as the pen draws it, turns to face what is behind
// it, is surprised when something is marked, hops to the next idea while the
// camera flies there, and presents the whole board at the end (or, with no
// outro to say goodbye, cheers). A beat can set how it feels
// (`feel`) and what it does (`act`). Blinks come at the guide's own uneven
// pace, from the board's seed.
import { splitmix32 } from "./rng.mjs";
import { FEELINGS, POSES } from "./rig.mjs";

/** The actor for the page: its rig and its track. */
export function perform(board, comp, tl, appear) {
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
  // it points at the middle of a thing, and its hand stops where the tip of its glove (or of its pointer) would reach the
  // first thing in the way, the thing itself included: a finger that lands on the words hides them
  const solid = [...els.values()].filter((e) => e.kind === "item" || e.kind === "note" || e.kind === "region" || e.kind === "title");
  const tip = 0.13 * g.h + (g.rig.hold === "pointer" ? 0.27 * g.h : 0) + 12;
  const reachTo = (at, px, py, also) => {
    const sx = at.x + at.facing * 0.165 * g.h;
    const sy = at.y - 0.39 * g.h;
    const d = Math.hypot(px - sx, py - sy) || 1;
    const [ux, uy] = [(px - sx) / d, (py - sy) / d];
    const boxes = [...solid.map((e) => e.box), ...(also ? [also] : [])];
    for (let r = 0; r <= 0.36 * g.h + tip; r += 5) {
      const [qx, qy] = [sx + ux * r, sy + uy * r];
      if (boxes.some((b) => qx > b.x - 6 && qx < b.x + b.w + 6 && qy > b.y - 6 && qy < b.y + b.h + 6)) return Math.max(0.05 * g.h, r - tip);
    }
    return Infinity;
  };

  // its trips: when the camera flies to another idea, the guide hops there, landing as the camera arrives
  let here = start;
  for (const k of tl.camera) {
    const to = k.region != null ? spotOf.get(k.region) : null;
    if (!to || to === here) continue;
    const dx = to.x - here.x;
    const dist = Math.hypot(dx, to.y - here.y);
    // a few big leaps rather than many small ones, timed to land just as the camera arrives
    const hops = Math.max(1, Math.min(3, Math.round(dist / 650)));
    const t0 = k.t0 + 0.08;
    const t1 = Math.max(t0 + 0.42 * hops, k.t1 + 0.2);
    track.moves.push({ t0, t1, from: [here.x, here.y], to: [to.x, to.y], hops, height: Math.min(340, 80 + (0.18 * dist) / hops), facing: Math.sign(dx) || here.facing, land: to.facing });
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
  track.look.push([alive, null]);
  // the title: it presents it as it is written
  const title = span.get("title");
  if (title) {
    const tb = els.get("title").box;
    track.arms.push([Math.max(title[0] + 0.4, ready), "present", tb.x + Math.min(tb.w * 0.25, 320), tb.y + tb.h * 0.5]);
    track.look.push([title[0], tb.x + tb.w * 0.4, tb.y + tb.h / 2]);
  }

  /** Where it stands for a gesture at t: where a hop under way at t lands (it points from there, not from where it left). */
  const settledAt = (t) => {
    const m = track.moves.find((q) => q.t0 <= t && t < q.t1 && (q.to[0] !== q.from[0] || q.to[1] !== q.from[1]));
    return m ? { x: m.to[0], y: m.to[1], facing: m.land } : whereAt(t);
  };

  board.beats.forEach((bt, bi) => {
    const beat = tl.beats[bi];
    track.feel.push([beat.t0, bt.feel ?? "happy"]);
    let acted = false;
    for (const id of bt.draw) {
      if (id === "guide" || id === "title") continue;
      const e = els.get(id);
      const sp = span.get(id);
      if (!e || !sp) continue;
      const tbox = e.kind === "mark" ? e.targetBox ?? els.get(e.target).box : e.box;
      const [cx, cy] = center(tbox);
      const at = settledAt(sp[0]);
      const [px, py] = [cx, cy];
      const way = reachTo(at, px, py, tbox);
      const most = Number.isFinite(way) ? [Math.round(way)] : []; // the page's track is JSON: no Infinity in it
      // it turns to face what is drawn behind it
      const side = Math.sign(cx - at.x);
      if (side && side !== at.facing && Math.abs(cx - at.x) > 0.3 * g.h) track.turns.push([sp[0], side]);
      track.look.push([sp[0], cx, cy]);
      if (bt.act && !acted) {
        track.arms.push([sp[0], bt.act, px, py, ...most]);
        acted = true;
      } else if (e.kind === "mark") {
        // something circled or underlined: surprise, a jolt, and a hand toward it
        track.feel.push([sp[0], "surprised"]);
        track.bounces.push([sp[0], 0.55]);
        track.feel.push([sp[0] + 1.4, bt.feel ?? "happy"]);
        if (!bt.act) track.arms.push([sp[0], "present", px, py, ...most]);
      } else if (!bt.act && (e.kind === "item" || e.kind === "region" || e.kind === "note")) {
        track.arms.push([sp[0], "point", px, py, ...most]);
      }
    }
    // after its drawing, the hands go back to the hips and the eyes to the viewer (before the next beat begins)
    const next = tl.beats[bi + 1];
    if (!bt.act && next) track.arms.push([Math.min(beat.draw1 + 0.7, next.draw0 - 0.05), "rest"]);
    track.look.push([Math.max(beat.draw1 + 0.5, beat.t1 - 0.8), null]);
  });

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
  return {
    id: "guide",
    h: g.h,
    rig: g.rig,
    hold: g.rig.hold,
    eyes: g.rig.eyes,
    shoulders: g.rig.shoulders,
    poses: POSES,
    feelings: FEELINGS,
    track,
  };
}

/** How high it goes in the intros that leave the ground: the opening shot makes room for it. */
export const INTRO_HEIGHT = { hop: 95, spin: 125, jump: 175 };

/** A hop where it stands. */
export const hopHere = (at, t0, t1, height) => ({ t0, t1, from: [at.x, at.y], to: [at.x, at.y], hops: 1, height, facing: at.facing, land: at.facing });

/**
 * The ways it comes alive once it is drawn. Each writes its keys from `a`,
 * the moment it is complete, and returns when it is ready to present the title.
 */
const INTROS = {
  wave: (k, a) => {
    k.bounces.push([a + 0.02, 1.1]);
    k.arms.push([a, "wave"]);
    return a + 1.2;
  },
  hop: (k, a, at) => {
    k.bounces.push([a, -0.6]);
    k.moves.push(hopHere(at, a + 0.1, a + 0.62, INTRO_HEIGHT.hop));
    k.bounces.push([a + 0.62, 0.9]);
    k.arms.push([a, "cheer"], [a + 0.7, "wave"]);
    return a + 1.5;
  },
  spin: (k, a, at) => {
    k.bounces.push([a, -0.6]);
    k.moves.push(hopHere(at, a + 0.1, a + 0.82, INTRO_HEIGHT.spin));
    k.spins.push([a + 0.12, a + 0.8, 1]);
    k.bounces.push([a + 0.82, 1.0]);
    k.arms.push([a, "cheer"], [a + 0.9, "wave"]);
    k.feel.push([a, "excited"], [a + 1.4, "happy"]);
    return a + 1.7;
  },
  bow: (k, a) => {
    k.arms.push([a, "rest"]);
    k.leans.push([a + 0.08, a + 1.0, 24]);
    k.feel.push([a + 0.08, "proud"], [a + 1.0, "happy"]);
    k.bounces.push([a + 1.0, 0.45]);
    k.arms.push([a + 1.0, "wave"]);
    return a + 1.9;
  },
  tip: (k, a) => {
    k.arms.push([a, "tip"]);
    k.caps.push([a + 0.2, a + 1.05, 0.075, 14]);
    k.feel.push([a + 0.2, "proud"], [a + 1.05, "happy"]);
    k.arms.push([a + 1.1, "wave"]);
    return a + 1.9;
  },
  jump: (k, a, at) => {
    k.bounces.push([a, -0.8]);
    k.moves.push(hopHere(at, a + 0.14, a + 0.78, INTRO_HEIGHT.jump));
    k.bounces.push([a + 0.78, 1.05]);
    k.arms.push([a + 0.1, "cheer"], [a + 0.86, "wave"]);
    k.feel.push([a, "excited"], [a + 1.4, "happy"]);
    return a + 1.7;
  },
};
