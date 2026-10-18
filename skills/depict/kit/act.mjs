// The guide's performance, as a pure function of time: where it stands, how
// it hops, how it squashes and stretches, where its hands go, what it feels,
// where it looks, when it blinks. The timeline writes the track (perform.mjs);
// the page evaluates it every frame, so playing, scrubbing and capturing a
// video show the same performance. This file has no imports: the page
// inlines it as it is.

const easeInOut = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
const clamp01 = (u) => Math.max(0, Math.min(1, u));
/** Up over the first share of a span, held, and down over its last: how a bow or a tipped cap comes and goes. */
const envelope = (u, edge = 0.3) => easeInOut(clamp01(Math.min(u, 1 - u) / edge));
const lastAt = (keys, t) => {
  let k = null;
  for (const key of keys) {
    if (key[0] <= t) k = key;
    else break;
  }
  return k;
};

/**
 * The state of an actor at time t: { x, y, facing, lift, sx, sy, lean,
 * front, back, feel, look, blink, cap, shown }. Hands are { hand, bow, glove } in
 * the figure's own frame (x toward the way it faces, y down, origin between
 * its feet); `look` is the pupils' offset in that frame.
 */
export function actorAt(actor, t) {
  const tr = actor.track;
  const h = actor.h;
  // where it is: on its spot, or on its way to the next one, hopping
  let x = tr.start[0];
  let y = tr.start[1];
  let facing = tr.start[2];
  let lift = 0;
  let air = 0;
  let settled = -Infinity; // when it last landed
  for (const m of tr.moves) {
    if (t < m.t0) break;
    if (t >= m.t1) {
      x = m.to[0];
      y = m.to[1];
      facing = m.land;
      settled = m.t1;
      continue;
    }
    const u = (t - m.t0) / (m.t1 - m.t0);
    const s = easeInOut(u) * 0.35 + u * 0.65;
    if (m.path) {
      // along its way, at the same share of its length
      const q = along(m.path, s);
      x = q[0];
      y = q[1];
      facing = q[2] || m.facing;
    } else {
      x = m.from[0] + (m.to[0] - m.from[0]) * s;
      y = m.from[1] + (m.to[1] - m.from[1]) * s;
      facing = m.facing;
    }
    const phase = (u * m.hops) % 1;
    air = 4 * phase * (1 - phase);
    lift = m.height * air;
  }
  // a turn to face something, when it came after the last landing
  const turn = lastAt(tr.turns, t);
  if (turn && turn[0] >= settled && !(lift > 0)) facing = turn[1];
  // squash and stretch: stretched in the air, and a springy squash after each landing or jolt. What it is made of
  // says how much: a stiff barrel squashes a little and is still at once; a soft body squashes deep and wobbles on
  // like a jelly (its motion: squash and stretch as multiples, the wobble's frequency, how fast it dies, its breath)
  const mo = actor.motion ?? {};
  const soft = mo.squash ?? 1;
  const freq = mo.freq ?? 13;
  const damp = mo.damp ?? 5.5;
  const window = mo.damp ? Math.min(3, 6.6 / mo.damp) : 1.2;
  let squash = 0;
  for (const [tb, strength] of tr.bounces) {
    if (t < tb) break;
    const d = t - tb;
    if (d < window) squash += strength * Math.exp(-damp * d) * Math.cos(freq * d);
  }
  const breath = Math.sin((2 * Math.PI * t) / (mo.breathPeriod ?? 2.7));
  const stretch = lift > 0 ? (0.09 * air - 0.03) * (mo.stretch ?? 1) : 0;
  const deep = mo.breath ?? 1;
  const sy = (1 - 0.13 * soft * squash + stretch) * (1 + 0.011 * deep * breath);
  const sx = (1 + 0.11 * soft * squash - stretch * 0.6) * (1 - 0.005 * deep * breath);
  // a soft body's top sways over its feet like a jelly on a plate (its skew, in degrees, top toward +x when positive):
  // it lags as it sets off, sloshes on past its feet when it lands, and sways a little on its own
  let skew = 0;
  if (mo.jelly) {
    for (const m of tr.moves) {
      const dir = Math.sign(m.to[0] - m.from[0]);
      if (!dir) continue;
      const d0 = t - m.t0;
      const d1 = t - m.t1;
      if (d0 > 0 && t < m.t1) skew -= dir * mo.jelly * 6 * Math.exp(-4 * d0) * Math.sin(9 * d0);
      if (d1 > 0 && d1 < 2.5) skew += dir * mo.jelly * 9 * Math.exp(-2.6 * d1) * Math.sin(10 * d1);
    }
    for (const [tb, strength] of tr.bounces) {
      if (t < tb) break;
      const d = t - tb;
      if (d < 2) skew += mo.jelly * 3.2 * strength * Math.exp(-3 * d) * Math.sin(11 * d + 0.6);
    }
    skew += mo.jelly * 1.4 * Math.sin((2 * Math.PI * t) / 3.4);
  }
  let lean = lift > 0 ? 7 * air : 0; // leaning into the hop, in degrees
  // a bow: the whole figure leans forward about its feet, and back up
  for (const [t0, t1, deg] of tr.leans ?? []) if (t >= t0 && t < t1) lean += deg * envelope((t - t0) / (t1 - t0));
  // a spin: it turns round where it is, narrowing to its edge and back, as a drawing turns
  let turnScale = 1;
  for (const [t0, t1, turns] of tr.spins ?? []) {
    if (t < t0 || t >= t1) continue;
    const c = Math.cos(2 * Math.PI * turns * easeInOut((t - t0) / (t1 - t0)));
    turnScale = Math.max(0.05, Math.abs(c));
    if (c < 0) facing = -facing;
  }
  // its cap, lifted off and tipped, and put back
  let cap = { lift: 0, angle: 0 };
  for (const [t0, t1, up, deg] of tr.caps ?? []) {
    if (t < t0 || t >= t1) continue;
    const e = envelope((t - t0) / (t1 - t0), 0.35);
    cap = { lift: up * e, angle: deg * e };
  }
  // the arms: the pose of the moment, eased in from the one before
  let cur = null;
  let prev = null;
  for (const key of tr.arms) {
    if (key[0] > t) break;
    prev = cur;
    cur = key;
  }
  const poseOf = (key) => armsFor(actor, key, x, y, facing, t);
  const a = cur ? poseOf(cur) : poseOf([0, "rest"]);
  let front = a.front;
  let back = a.back;
  if (prev) {
    const b = easeInOut(clamp01((t - cur[0]) / 0.24));
    if (b < 1) {
      const p = poseOf(prev);
      front = mixHand(p.front, a.front, b);
      back = mixHand(p.back, a.back, b);
    }
  }
  // what it feels, and where it looks
  const feelKey = lastAt(tr.feel, t);
  const feel = feelKey ? feelKey[1] : "happy";
  const lookKey = lastAt(tr.look, t);
  let look = [0, 0];
  const override = (actor.feelings[feel] ?? {}).look;
  if (override) look = [override[0] * 0.018 * h, override[1] * 0.014 * h];
  else if (lookKey && lookKey[1] != null) {
    const eye = actor.eyes[0];
    const dx = (lookKey[1] - x) * facing - eye[0];
    const dy = lookKey[2] - (y - lift) - eye[1];
    const l = Math.hypot(dx, dy) || 1;
    look = [(dx / l) * 0.018 * h, (dy / l) * 0.014 * h];
  }
  // blinking: a quick close and open
  let blink = 0;
  for (const tb of tr.blinks) {
    if (tb > t) break;
    if (t - tb < 0.16) blink = Math.sin((Math.PI * (t - tb)) / 0.16);
  }
  return { x, y, facing, lift, air, sx: sx * turnScale, sy, lean, skew, front, back, feel, look, blink, cap, shown: t >= tr.appear[0] };
}

/** The point a share u of the way along a polyline, and which way it is heading there (left or right). */
function along(pts, u) {
  let total = 0;
  for (let i = 2; i < pts.length; i += 2) total += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  let left = total * Math.max(0, Math.min(1, u));
  for (let i = 2; i < pts.length; i += 2) {
    const d = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
    if (left <= d || i === pts.length - 2) {
      const t = d ? Math.min(1, left / d) : 1;
      const dx = pts[i] - pts[i - 2];
      return [pts[i - 2] + dx * t, pts[i - 1] + (pts[i + 1] - pts[i - 1]) * t, Math.abs(dx) > 1e-6 ? Math.sign(dx) : 0];
    }
    left -= d;
  }
  return [pts[pts.length - 2], pts[pts.length - 1], 0];
}

/** The hands for an arms key [t, pose, tx, ty]: the pose's own, or a hand aimed at the target (in board units). */
function armsFor(actor, key, x, y, facing, t) {
  const [t0, pose, tx, ty] = key;
  const most = key[4] ?? Infinity; // how far the arm may reach before something in its way
  const P = actor.poses[pose] ?? actor.poses.rest;
  const at = ([u, v]) => [u * actor.h, (v - 0.99) * actor.h];
  const hand = (side) => ({ hand: at(P[side].hand), bow: at(P[side].bow), glove: P[side].glove });
  const front = hand("front");
  const back = hand("back");
  if ((pose === "point" || pose === "present") && tx != null) {
    // the front arm reaches toward the target from its shoulder: as far as an arm goes, and never back over its own head
    const sh = actor.shoulders.front;
    let dx = (tx - x) * facing - sh[0];
    let dy = ty - y - sh[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    if (dx < 0.25) {
      dx = 0.25;
      dy = Math.sign(dy || 1) * Math.sqrt(1 - dx * dx);
    }
    // as far as an arm goes, and never past the thing pointed at (less a pointer's length, when it holds one)
    const reach = Math.max(0.05 * actor.h, Math.min((actor.reach ?? 0.36) * actor.h, most, l - (actor.hold === "pointer" ? 0.27 * actor.h : 0)));
    const hx = sh[0] + dx * reach;
    const hy = sh[1] + dy * reach;
    // the hose sags a little under the line from shoulder to hand
    const nx = -dy;
    const ny = dx;
    const sag = ny > 0 ? 1 : -1;
    front.hand = [hx, hy];
    front.bow = [(sh[0] + hx) / 2 + nx * sag * 0.07 * actor.h, (sh[1] + hy) / 2 + ny * sag * 0.07 * actor.h];
    front.glove = "point";
  }
  if (pose === "wave") {
    // the hand swings side to side
    const w = Math.sin(2 * Math.PI * 2.4 * (t - t0));
    front.hand = [front.hand[0] + w * 0.055 * actor.h, front.hand[1] + Math.abs(w) * 0.012 * actor.h];
    front.bow = [front.bow[0] + w * 0.03 * actor.h, front.bow[1]];
  }
  if (pose === "cheer") {
    const w = Math.sin(2 * Math.PI * 1.8 * (t - t0));
    front.hand = [front.hand[0] + w * 0.02 * actor.h, front.hand[1] - Math.abs(w) * 0.02 * actor.h];
    back.hand = [back.hand[0] - w * 0.02 * actor.h, back.hand[1] - Math.abs(w) * 0.02 * actor.h];
  }
  if (pose === "scratch") {
    const w = Math.sin(2 * Math.PI * 3 * (t - t0));
    front.hand = [front.hand[0] + w * 0.012 * actor.h, front.hand[1] + w * 0.008 * actor.h];
  }
  return { front, back };
}

const mixHand = (a, b, u) => ({
  hand: [a.hand[0] + (b.hand[0] - a.hand[0]) * u, a.hand[1] + (b.hand[1] - a.hand[1]) * u],
  bow: [a.bow[0] + (b.bow[0] - a.bow[0]) * u, a.bow[1] + (b.bow[1] - a.bow[1]) * u],
  glove: u < 0.5 ? a.glove : b.glove,
});

/** A rubber-hose arm from the shoulder through its bow to the hand, as a polyline with the hose's own fixed wobble. */
export function hosePath(sh, bow, hand, wobble) {
  const n = wobble.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const s = 1 - t;
    const x = s * s * sh[0] + 2 * s * t * bow[0] + t * t * hand[0];
    const y = s * s * sh[1] + 2 * s * t * bow[1] + t * t * hand[1];
    // the direction along the curve, for the sideways wobble
    const dx = 2 * s * (bow[0] - sh[0]) + 2 * t * (hand[0] - bow[0]);
    const dy = 2 * s * (bow[1] - sh[1]) + 2 * t * (hand[1] - bow[1]);
    const l = Math.hypot(dx, dy) || 1;
    const w = wobble[i] * Math.sin(Math.PI * t);
    out.push(x - (dy / l) * w, y + (dx / l) * w);
  }
  return out;
}
