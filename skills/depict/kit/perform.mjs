// The guide's performance, written from the timeline: it comes alive once it
// is drawn, waves hello, presents the title while it is written, looks at and
// points to each new thing as the pen draws it, turns to face what is behind
// it, is surprised when something is marked, hops to the next idea while the
// camera flies there, and cheers at the end. A beat can set how it feels
// (`feel`) and what it does (`act`). Blinks come at the guide's own uneven
// pace, from the board's seed.
import { splitmix32 } from "./rng.mjs";
import { stretch } from "./road.mjs";
import { FEELINGS, POSES } from "./rig.mjs";

/** The actor for the page: its rig and its track. */
export function perform(board, comp, tl, appear) {
  const g = comp.guide;
  const els = comp.elements;
  const spotOf = new Map(g.spots.map((s) => [s.region, s]));
  const start = g.spots[0];
  const track = { start: [start.x, start.y, start.facing], appear, moves: [], turns: [], arms: [], feel: [[0, "happy"]], look: [], bounces: [], blinks: [] };
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

  // on a board with a road, a trip follows the road: down onto it, along it, and off at the next spot
  const road = g.road;
  const nearest = (q) => {
    let best = 0;
    let d = Infinity;
    for (let k = 0; k < road.pts.length / 2; k++) {
      const e = Math.hypot(road.pts[2 * k] - q.x, road.pts[2 * k + 1] - q.y);
      if (e < d) {
        d = e;
        best = road.cum[k];
      }
    }
    return best;
  };
  const tripPath = (a, b) => {
    if (!road) return null;
    const sa = a.s ?? nearest(a);
    const sb = b.s ?? nearest(b);
    let mid = stretch(road.pts, road.cum, Math.min(sa, sb), Math.max(sa, sb));
    if (sb < sa) {
      const rev = [];
      for (let k = mid.length / 2 - 1; k >= 0; k--) rev.push(mid[2 * k], mid[2 * k + 1]);
      mid = rev;
    }
    // walking on the road's top edge
    const lift = road.width / 2 - 6;
    const on = mid.map((v, i) => (i % 2 ? v - lift : v));
    return [a.x, a.y, ...on, b.x, b.y];
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
    const path = tripPath(here, to);
    track.moves.push({ t0, t1, from: [here.x, here.y], to: [to.x, to.y], hops: path ? Math.max(hops, 2) : hops, height: Math.min(path ? 200 : 340, 80 + (0.18 * dist) / hops), facing: Math.sign(dx) || here.facing, land: to.facing, ...(path ? { path } : {}) });
    track.bounces.push([t0 - 0.1, -0.7]); // it crouches before it jumps
    track.bounces.push([t1, 0.85]);
    track.arms.push([t0 - 0.12, "cheer"]);
    here = to;
  }
  /** Where the guide is at time t, and which way it faces (before any turn). */
  const whereAt = (t) => {
    let at = { x: start.x, y: start.y, facing: start.facing };
    for (const m of track.moves) if (m.t1 <= t) at = { x: m.to[0], y: m.to[1], facing: m.land };
    return at;
  };

  // it comes alive: a springy bounce, and a wave hello
  track.bounces.push([alive + 0.02, 1.1]);
  track.arms.push([alive, "wave"]);
  track.look.push([alive, null]);
  // the title: it presents it as it is written
  const title = span.get("title");
  if (title) {
    const tb = els.get("title").box;
    track.arms.push([Math.max(title[0] + 0.4, alive + 1.2), "present", tb.x + Math.min(tb.w * 0.25, 320), tb.y + tb.h * 0.5]);
    track.look.push([title[0], tb.x + tb.w * 0.4, tb.y + tb.h / 2]);
  }

  board.beats.forEach((bt, bi) => {
    const beat = tl.beats[bi];
    track.feel.push([beat.t0, bt.feel ?? "happy"]);
    let acted = false;
    for (const id of bt.draw) {
      if (id === "guide" || id === "title") continue;
      const e = els.get(id);
      const sp = span.get(id);
      if (!e || !sp || e.kind === "story") continue;
      const [cx, cy] = center(e.kind === "mark" ? e.targetBox ?? els.get(e.target).box : e.box);
      const at = whereAt(sp[0]);
      // it turns to face what is drawn behind it
      const side = Math.sign(cx - at.x);
      if (side && side !== at.facing && Math.abs(cx - at.x) > 0.3 * g.h) track.turns.push([sp[0], side]);
      track.look.push([sp[0], cx, cy]);
      if (bt.act && !acted) {
        track.arms.push([sp[0], bt.act, cx, cy]);
        acted = true;
      } else if (e.kind === "mark") {
        // something circled or underlined: surprise, a jolt, and a hand toward it
        track.feel.push([sp[0], "surprised"]);
        track.bounces.push([sp[0], 0.55]);
        track.feel.push([sp[0] + 1.4, bt.feel ?? "happy"]);
        if (!bt.act) track.arms.push([sp[0], "present", cx, cy]);
      } else if (!bt.act && (e.kind === "item" || e.kind === "region" || e.kind === "note")) {
        track.arms.push([sp[0], "point", cx, cy]);
      }
    }
    // after its drawing, the hands go back to the hips and the eyes to the viewer (before the next beat begins)
    const next = tl.beats[bi + 1];
    if (!bt.act && next) track.arms.push([Math.min(beat.draw1 + 0.7, next.draw0 - 0.05), "rest"]);
    track.look.push([Math.max(beat.draw1 + 0.5, beat.t1 - 0.8), null]);
  });

  // the end: it cheers and hops for joy
  const end = tl.beats.at(-1).draw1 + 0.15;
  const at = whereAt(end);
  track.arms.push([end, "cheer"]);
  track.feel.push([end, "proud"]);
  track.moves.push({ t0: end + 0.1, t1: end + 1.05, from: [at.x, at.y], to: [at.x, at.y], hops: 2, height: 55, facing: at.facing, land: at.facing });
  track.bounces.push([end + 1.05, 0.7]);
  track.arms.push([end + 2.6, "rest"]);
  track.feel.push([end + 2.6, "happy"]);

  // blinks, at its own uneven pace
  const rng = splitmix32((board.seed * 2654435761) >>> 0);
  for (let t = alive + 1.6; t < tl.duration; t += 2.2 + rng() * 2.4) track.blinks.push(t);

  for (const list of [track.arms, track.feel, track.look, track.turns, track.bounces]) list.sort((a, b) => a[0] - b[0]);
  track.moves.sort((a, b) => a.t0 - b.t0);
  return {
    id: "guide",
    h: g.h,
    rig: g.rig,
    eyes: g.rig.eyes,
    shoulders: g.rig.shoulders,
    poses: POSES,
    feelings: FEELINGS,
    track,
  };
}
