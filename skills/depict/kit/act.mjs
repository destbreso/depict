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

// ------------------------------------------------------------------ the ways it arrives and leaves

/** How high it goes in the intros that leave the ground: the opening shot makes room for it. */
export const INTRO_HEIGHT = { hop: 95, spin: 125, jump: 175, bounce: 110 };

/** A hop where it stands. */
export const hopHere = (at, t0, t1, height) => ({ t0, t1, from: [at.x, at.y], to: [at.x, at.y], hops: 1, height, facing: at.facing, land: at.facing });

/**
 * The ways it comes alive once it is drawn. Each writes its keys from `a`,
 * the moment it is complete, and returns when it is ready to present the title.
 */
export const INTROS = {
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
  // a soft body's: it squashes deep, springs up, lands and bounces once more, wobbling on, and waves
  bounce: (k, a, at) => {
    k.bounces.push([a, -0.9]);
    k.moves.push(hopHere(at, a + 0.1, a + 0.66, INTRO_HEIGHT.bounce));
    k.bounces.push([a + 0.66, 1.2]);
    k.moves.push(hopHere(at, a + 0.74, a + 1.06, INTRO_HEIGHT.bounce * 0.35));
    k.bounces.push([a + 1.06, 0.8]);
    k.arms.push([a, "cheer"], [a + 1.12, "wave"]);
    k.feel.push([a, "excited"], [a + 1.6, "happy"]);
    return a + 2.0;
  },
  // it shakes itself awake like a jelly, arms out, then waves
  jiggle: (k, a) => {
    k.bounces.push([a, 1.1], [a + 0.32, -0.8], [a + 0.62, 0.6]);
    k.arms.push([a, "shrug"], [a + 0.95, "wave"]);
    k.feel.push([a, "excited"], [a + 1.5, "happy"]);
    return a + 1.9;
  },
};

/** The ways the guide says goodbye as the camera comes in on it: keys from `t`, the camera arriving at `t + fly`, the circle closing after `iris.hold`. */
export const OUTROS = {
  wave: (k, t) => k.arms.push([t + 0.15, "wave"]),
  bow: (k, t, fly, iris) => {
    k.arms.push([t + 0.15, "wave"], [t + fly - 0.15, "rest"]);
    k.leans.push([t + fly - 0.1, iris.hold + 0.08, 26]);
    k.feel.push([t + fly - 0.1, "proud"]);
  },
  cheer: (k, t, fly, iris, at) => {
    k.arms.push([t + 0.15, "cheer"]);
    k.moves.push(hopHere(at, t + fly - 0.5, t + fly + 0.08, 85));
    k.bounces.push([t + fly + 0.08, 0.8]);
    k.feel.push([t + 0.15, "excited"]);
  },
  salute: (k, t, fly) => {
    k.arms.push([t + 0.15, "wave"], [t + fly - 0.3, "salute"]);
    k.feel.push([t + fly - 0.3, "proud"]);
  },
  tip: (k, t, fly, iris) => {
    k.arms.push([t + 0.15, "wave"], [t + fly - 0.3, "tip"]);
    k.caps.push([t + fly - 0.15, iris.hold + 0.15, 0.075, 14]);
    k.feel.push([t + fly - 0.15, "proud"]);
  },
  spin: (k, t, fly, iris, at) => {
    k.moves.push(hopHere(at, t + fly - 0.7, t + fly + 0.05, 115));
    k.spins.push([t + fly - 0.68, t + fly + 0.03, 1]);
    k.bounces.push([t + fly + 0.05, 0.85]);
    k.arms.push([t + 0.15, "cheer"], [t + fly + 0.1, "wave"]);
  },
  // a soft body's goodbye: two happy bounces, the second smaller, wobbling on as the circle closes
  bounce: (k, t, fly, iris, at) => {
    k.arms.push([t + 0.15, "cheer"]);
    k.moves.push(hopHere(at, t + fly - 0.75, t + fly - 0.3, 75));
    k.bounces.push([t + fly - 0.3, 1.0]);
    k.moves.push(hopHere(at, t + fly - 0.22, t + fly + 0.06, 32));
    k.bounces.push([t + fly + 0.06, 0.7]);
    k.feel.push([t + 0.15, "excited"]);
  },
};

// ------------------------------------------------------------------ casting another guide

/** The poses every character has; any other is a quirk's (Stuart's glasses), and a character without that quirk rests instead. */
const OWN_POSES = ["rest", "present", "wave", "cheer", "shrug", "scratch", "salute", "tip", "point"];
/** The brows, mouths and closed eyes of the other feelings: ready when the guide is drawn, hidden until needed. */
const WAITING = /^brows:(?!up$)|^mouth:(?!smile$)|^squint/;
const lengthOf = (pts) => {
  let l = 0;
  for (let i = 2; i < pts.length; i += 2) l += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  return l;
};

/**
 * When each stroke of a guide is drawn as it first appears, in its drawing order, between t0 and t1 (the span the
 * board gave its own guide): its outline, face, arms and gloves (four strokes the page draws from the pose), legs
 * and color, each for a time in proportion to its length, as the timeline times a guide (timeline.mjs, drawGuide).
 * Sets t0 and t1 on each stroke and returns the arms' and gloves' spans.
 */
export function drawOn(strokes, armsAt, h, t0, t1) {
  const items = [];
  for (const s of strokes) if (!WAITING.test(s.part)) items.push({ n: s.n, s, len: lengthOf(s.pts) * (s.l === 0 ? 1 : 0.3) });
  ["armBack", "gloveBack", "armFront", "gloveFront"].forEach((name, i) => items.push({ n: armsAt + i, name, len: name.startsWith("arm") ? 0.42 * h : 0.5 * h }));
  items.sort((a, b) => a.n - b.n);
  const total = items.reduce((a, x) => a + x.len, 0) || 1;
  const lift = 0.015;
  const room = Math.max(0.3, t1 - t0 - lift * items.length);
  let at = t0;
  const reveal = {};
  for (const x of items) {
    const d = (room * x.len) / total;
    if (x.s) {
      x.s.t0 = at;
      x.s.t1 = at + d;
    } else reveal[x.name] = [at, at + d];
    at += d + lift;
  }
  for (const s of strokes) if (WAITING.test(s.part)) s.t0 = s.t1 = at;
  return reveal;
}

/** The span a board gave its guide to be drawn in as it first appears. */
function drawnIn(A) {
  let a = Infinity;
  let b = -Infinity;
  for (const s of A.strokes) if (!WAITING.test(s.part) && s.t1 > s.t0) (a = Math.min(a, s.t0)), (b = Math.max(b, s.t1));
  for (const k in A.reveal || {}) (a = Math.min(a, A.reveal[k][0])), (b = Math.max(b, A.reveal[k][1]));
  return [a, b + 0.015];
}

/**
 * A board is directed by its slot: the gestures it has its guide make were worked out with the slot's shoulders
 * and reach. A guide with a body of its own (narrower, with shorter arms) makes them from its own shoulders: where
 * its arm on the way to a thing would cross something the slot's would not, or its finger, out of its reach, would
 * stop in the air beside another thing or with another ahead of it, it looks at the thing instead of pointing, its
 * hands at rest. A is the guide as a page carries it, with `slot` ({ front, reach }); elements are the page's
 * ({ kind, t0, box: [x, y, w, h] }).
 */
export function keepClear(A, elements) {
  const S = A.slot;
  if (!S) return A;
  const reach = (A.reach ?? 0.36) * A.h;
  if (S.front[0] === A.shoulders.front[0] && S.front[1] === A.shoulders.front[1] && Math.abs(S.reach * A.h - reach) < 0.5) return A;
  const h = A.h;
  const tip = 0.13 * h + (A.hold === "pointer" ? 0.27 * h : 0) + 12;
  const solid = elements.filter((e) => e.box && (e.kind === "item" || e.kind === "note" || e.kind === "region" || e.kind === "title"));
  const near = (b, x, y, m) => x > b[0] - m && x < b[0] + b[2] + m && y > b[1] - m && y < b[1] + b[3] + m;
  const holds = (o, b) => o[0] <= b[0] && o[1] <= b[1] && o[0] + o[2] >= b[0] + b[2] && o[1] + o[3] >= b[1] + b[3];
  // what is in the way from a shoulder to the point it aims at: on the line, and, out of reach, by the finger or ahead of it
  const blockers = (sx, sy, arm, tx, ty, tbox, others) => {
    const found = new Set();
    const d = Math.hypot(tx - sx, ty - sy) || 1;
    for (let r = 0; r < d; r += 6) {
      const x = sx + ((tx - sx) * r) / d;
      const y = sy + ((ty - sy) * r) / d;
      if (tbox && near(tbox, x, y, 6)) break;
      for (const o of others) if (near(o.box, x, y, 6)) found.add(o);
    }
    const full = arm + tip;
    if (d > full) {
      const [ux, uy] = [(tx - sx) / d, (ty - sy) / d];
      const [x, y] = [sx + ux * full, sy + uy * full];
      for (const o of others) {
        const b = o.box;
        const px = b[0] + b[2] / 2 - x;
        const py = b[1] + b[3] / 2 - y;
        const along = px * ux + py * uy;
        const across = Math.abs(px * uy - py * ux);
        if (near(b, x, y, 0.12 * h) || (along > 0 && along < d - full && across < 0.21 * along + Math.hypot(b[2], b[3]) / 2)) found.add(o);
      }
    }
    return found;
  };
  const arms = A.track.arms.map((k) => {
    if (k[1] !== "point" || k.length < 4) return k;
    const [t, , tx, ty] = k;
    const st = actorAt(A, t + 0.05);
    const at = (sh) => [st.x + st.facing * sh[0], st.y + sh[1]];
    const shown = solid.filter((e) => e.t0 <= t + 0.05);
    // the thing it points at: the smallest thing drawn round the point it aims at (and whatever frames it is not in the way)
    const target = shown.filter((e) => near(e.box, tx, ty, 2)).sort((a, b) => a.box[2] * a.box[3] - b.box[2] * b.box[3])[0];
    const tbox = target ? target.box : null;
    const others = shown.filter((e) => e !== target && !(tbox && holds(e.box, tbox)));
    const mine = blockers(...at(A.shoulders.front), reach, tx, ty, tbox, others);
    if (!mine.size) return k;
    const theirs = blockers(...at(S.front), S.reach * h, tx, ty, tbox, others);
    for (const o of mine) if (!theirs.has(o)) return [t, "rest"];
    return k;
  });
  return { ...A, track: { ...A.track, arms } };
}

/**
 * A guide's track for another character, who is who it is: it comes alive its own way, says goodbye its own way, and
 * does its own quirks in the board's quiet moments. The board's own way is kept when it is one of this character's
 * too; otherwise the board's seed picks among its own, and an arrival never leaves the ground higher than the board's
 * own did (the opening shot made room for that one). Everything else (where it goes, what it points at and feels) is
 * the board's.
 */
export function personalize(track, look) {
  const tuples = (list) => (list || []).map((x) => [...x]);
  const k = { ...track, moves: (track.moves || []).map((m) => ({ ...m })) };
  for (const key of ["arms", "feel", "look", "bounces", "spins", "leans", "caps"]) k[key] = tuples(track[key]);
  const blank = () => ({ moves: [], arms: [], feel: [], look: [], bounces: [], spins: [], leans: [], caps: [] });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const take = (made) => {
    for (const key in made) for (const e of made[key]) {
      const i = k[key].findIndex((x) => same(x, e));
      if (i >= 0) k[key].splice(i, 1);
    }
  };
  const put = (made) => {
    for (const key in made) k[key].push(...made[key]);
  };
  const choose = (old, own, fits) => {
    if (own.includes(old.kind)) return old.kind;
    const fit = own.filter(fits);
    return fit.length ? fit[old.seed % fit.length] : old.kind;
  };
  const arrive = track.intro;
  if (arrive && INTROS[arrive.kind]) {
    const high = INTRO_HEIGHT[arrive.kind] ?? 0;
    const kind = choose(arrive, look.intros || [], (x) => INTROS[x] && (INTRO_HEIGHT[x] ?? 0) <= high);
    if (kind !== arrive.kind) {
      const was = blank();
      const ready0 = INTROS[arrive.kind](was, arrive.at, arrive.from);
      take(was);
      const now = blank();
      const ready1 = INTROS[kind](now, arrive.at, arrive.from);
      put(now);
      // it presents the title once it is ready, its own arrival done
      if (arrive.title != null) {
        const [a, b] = [Math.max(arrive.title, ready0), Math.max(arrive.title, ready1)];
        for (const key of k.arms) if (key[1] === "present" && Math.abs(key[0] - a) < 1e-9) key[0] = b;
      }
      k.intro = { ...arrive, kind };
    }
  }
  const leave = track.outro;
  if (leave && OUTROS[leave.kind]) {
    const kind = choose(leave, look.outros || [], (x) => Boolean(OUTROS[x]));
    if (kind !== leave.kind) {
      const iris = { hold: leave.hold };
      const was = blank();
      OUTROS[leave.kind](was, leave.t, leave.fly, iris, leave.at);
      take(was);
      const now = blank();
      OUTROS[kind](now, leave.t, leave.fly, iris, leave.at);
      put(now);
      k.outro = { ...leave, kind };
    }
  }
  // its own quirks in the quiet moments: the board's guide's go, and this one's own come, if it has any
  const quiet = track.quirks || [];
  if (quiet.length) {
    const mine = (look.quirks || []).filter((q) => look.poses[q]);
    const at = new Set(quiet.flatMap(([a, b]) => [a, b]));
    k.arms = k.arms.filter((x) => !at.has(x[0]));
    quiet.forEach(([a, b], i) => {
      if (mine.length) k.arms.push([a, mine[i % mine.length]], [b, "rest"]);
    });
  }
  for (const key of ["arms", "feel", "look", "bounces", "spins", "leans", "caps"]) k[key].sort((a, b) => a[0] - b[0]);
  k.moves.sort((a, b) => a.t0 - b.t0);
  return k;
}

/** Why a look cannot present a board in place of its guide A, or null when it can. */
export function castProblem(A, look) {
  if (!look || look.depict !== "look" || look.version !== 1) return "that is not a character's look (scripts/look.mjs makes one)";
  if (!A.contract) return "this board was built before characters had bodies to share: build it again to cast another guide in it";
  if (look.contract !== A.contract) return `${look.name} has ${look.contract}'s body and this board's guide has ${A.contract}'s: a character presents only the boards made for its body`;
  if (Math.abs(look.h - A.h) > 0.5) return `${look.name} is drawn ${look.h} tall and this board's guide ${Math.round(A.h * 10) / 10}: make its look again with this board's kit`;
  return null;
}

/**
 * The guide A of a board, played by another character of its body: the board's own performance (where it stands,
 * how it hops, what it points at and feels), the costumes the board puts on it that this character can wear, and
 * what it holds; this character's body, face, arms and hands, drawn as it first appears in the span A was, and
 * moving as its own material does. A pose of a quirk it does not have (Stuart's glasses) becomes rest, and a gesture
 * its own arm would not make cleanly becomes a look (keepClear). `palette` is the page's: the look's colors join it,
 * and its open accent is the board's; `elements` are the page's.
 */
export function recast(A, look, palette, elements = []) {
  const color = (c) => {
    if (c === "accent") return A.accent;
    let i = palette.indexOf(c);
    if (i < 0) i = palette.push(c) - 1;
    return i;
  };
  const copy = (s) => ({ part: s.part, n: s.n, w: s.w, c: color(s.c), l: s.l, o: s.o, pts: s.pts });
  const strokes = look.strokes.map(copy);
  let next = Math.max(look.armsAt + 3, ...strokes.map((s) => s.n)) + 1;
  // what it wears: for an outfit the board's guide wears (its winter, its Halloween), its own outfit of that name;
  // otherwise the costumes the board wears that it has; each in its turn after its body, as a board dresses a guide
  const kit = A.outfit && (look.outfits || []).find((o) => o.name === A.outfit);
  const wears = Object.keys(look.wear || {}).filter((w) => (kit ? kit.wear : A.wear || []).includes(w));
  for (const w of wears) for (const s of look.wear[w]) strokes.push({ ...copy(s), n: next++ });
  // what it holds is the board's: drawn in its hand's own frame, so the same in any hand, and drawn last
  for (const s of A.strokes) if (s.part === "held" || s.part === "pointer") strokes.push({ ...s, n: next++ });
  const [t0, t1] = drawnIn(A);
  const reveal = drawOn(strokes, look.armsAt, A.h, t0, t1);
  const hands = look.hands[wears.find((w) => look.hands[w]) ?? "plain"];
  // its own arrival, goodbye and quirks; and any pose it does not have (another's quirk) rests
  const played = personalize(A.track, look);
  const has = (pose) => OWN_POSES.includes(pose) || (look.quirks || []).includes(pose);
  const track = { ...played, arms: played.arms.map((k) => (has(k[1]) && look.poses[k[1]] ? k : [k[0], "rest"])) };
  return keepClear({
    ...A,
    character: look.id,
    eyes: look.eyes,
    shoulders: look.shoulders,
    poses: look.poses,
    motion: look.motion,
    reach: look.reach,
    capPivot: look.capPivot,
    arm: { width: look.arm.width, hose: look.arm.hose, ...(look.arm.fill ? { fill: color(look.arm.fill), fillWidth: look.arm.fillWidth } : {}) },
    gloves: hands.gloves,
    gloveWidth: hands.gloveWidth,
    gloveFill: hands.gloveFill ? color(hands.gloveFill) : undefined,
    strokes: strokes.map(({ n, ...s }) => s),
    reveal,
    track,
  }, elements);
}
