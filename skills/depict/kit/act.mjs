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
 * What the body of a character with no arms does in each pose, the kit's own (a character may say its own, `body` on
 * a pose): it shows a thing by bending toward it and looking at it (aim, in degrees), waves by rocking (sway: degrees
 * and seconds a rock), cheers by stretching up and bobbing (pulse: a share of its height and seconds a bob), shrugs
 * by sinking a little, thinks leaning back, and nods for a salute or a bow. Lean and bend are degrees toward where it
 * faces, stretch a share of its height (less than 0 sinks), look the pupils' [x, y] (each -1 to 1).
 */
export const GESTURES = {
  rest: {},
  point: { aim: 9 },
  present: { aim: 7, stretch: 0.03 },
  wave: { sway: [7, 0.46] },
  cheer: { stretch: 0.05, pulse: [0.035, 0.42] },
  shrug: { stretch: -0.06, bend: -3 },
  scratch: { lean: -4, bend: -5, look: [0.4, -1] },
  salute: { lean: 7 },
  tip: { lean: 12 },
};

/**
 * What its body does for an arms key [t, pose, tx, ty] at time t (null when the pose says nothing of its body): how
 * far it leans about its feet and bends its top (degrees toward where it faces), how much it stretches, and where it
 * looks. Aimed at a thing, it bends toward it from its middle, stretching up to one above it and sinking to one below.
 */
export function bodyOf(actor, key, x, y, facing, t) {
  const [t0, pose, tx, ty] = key;
  const P = actor.poses?.[pose];
  const B = P?.body ?? (actor.armless ? GESTURES[pose] ?? GESTURES.rest : null);
  if (!B) return null;
  const h = actor.h;
  let lean = B.lean ?? 0;
  let bend = B.bend ?? 0;
  let stretch = B.stretch ?? 0;
  let look = B.look ?? null;
  if (B.aim && tx != null) {
    const mid = (0.99 - (actor.views?.[P?.view]?.middle ?? actor.motion?.middle ?? 0.5)) * h;
    const dx = (tx - x) * facing;
    const dy = ty - (y - mid);
    const l = Math.hypot(dx, dy) || 1;
    bend += B.aim * (dx / l);
    lean += B.aim * 0.3 * (dx / l);
    stretch -= 0.05 * (dy / l);
  }
  const d = Math.max(0, t - t0);
  // a rise: the whole figure turns about a point of its own (onto its toe, its tip) and moves meanwhile; a sway then
  // rocks it about that point, as it balances there
  let turn = B.turn ?? 0;
  const pivot = B.pivot ? [B.pivot[0] * h, (B.pivot[1] - 0.99) * h] : null;
  const shift = B.shift ? [B.shift[0] * h, B.shift[1] * h] : [0, 0];
  if (B.sway) {
    const s = B.sway[0] * Math.sin((2 * Math.PI * d) / B.sway[1]);
    if (pivot) turn += s;
    else lean += s;
  }
  if (B.pulse) stretch += B.pulse[0] * Math.abs(Math.sin((Math.PI * d) / B.pulse[1]));
  return { lean, bend, stretch, look, turn, pivot, shift, ease: B.ease };
}

const mixBody = (a, b, u) => ({
  lean: a.lean + (b.lean - a.lean) * u,
  bend: a.bend + (b.bend - a.bend) * u,
  stretch: a.stretch + (b.stretch - a.stretch) * u,
  look: u < 0.5 ? a.look : b.look,
  // rising and coming down about the point of the one that turns
  turn: a.turn + (b.turn - a.turn) * u,
  pivot: b.pivot ?? a.pivot,
  shift: [a.shift[0] + (b.shift[0] - a.shift[0]) * u, a.shift[1] + (b.shift[1] - a.shift[1]) * u],
});
const STILL = { lean: 0, bend: 0, stretch: 0, look: null, turn: 0, pivot: null, shift: [0, 0] };

/** A body's gesture laid onto a frame's state: it leans, bends its top toward where it faces, stretches, looks. */
export function applyBody(st, b, h) {
  if (!b) return st;
  st.lean += b.lean;
  if (b.bend) st.skew = (st.skew || 0) + b.bend * st.facing;
  if (b.stretch) {
    st.sy *= 1 + b.stretch;
    st.sx *= 1 - 0.6 * b.stretch;
  }
  if (b.look) st.look = [b.look[0] * 0.018 * h, b.look[1] * 0.014 * h];
  if ((b.turn && b.pivot) || b.shift?.[0] || b.shift?.[1]) st.rise = { turn: b.turn ?? 0, pivot: b.pivot ?? [0, 0], shift: b.shift ?? [0, 0] };
  return st;
}

/**
 * The state of an actor at time t: { x, y, facing, lift, sx, sy, lean,
 * front, back, feel, look, blink, cap, shown }. Hands are { hand, bow, glove } in
 * the figure's own frame (x toward the way it faces, y down, origin between
 * its feet); `look` is the pupils' offset in that frame. A solid character (`yaw`)
 * is seen in the drawing of the angle it has turned to (solidTurn); `flat` leaves
 * that out, for the view and the way it faces that its turns go between.
 */
export function actorAt(actor, t, flat = false) {
  const tr = actor.track;
  const h = actor.h;
  // where it is: on its spot, or on its way to the next one, hopping
  let x = tr.start[0];
  let y = tr.start[1];
  let facing = tr.start[2];
  let lift = 0;
  let air = 0;
  let settled = -Infinity; // when it last landed
  // how it travels on the move under way, when it is not a hop (a flip, a roll, a slide, on tiptoe), and how far into it
  let going = null;
  let trip = 0;
  for (const m of tr.moves) {
    const way = m.way ?? (actor.travel ? travelOf(actor, m, trip) : null);
    if (actor.travel && (m.from[0] !== m.to[0] || m.from[1] !== m.to[1])) trip++;
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
    if (way && way !== "hop") {
      going = { way, u, s, phase, dist: Math.hypot(m.to[0] - m.from[0], m.to[1] - m.from[1]) };
      // a roll keeps to the ground, rising only as far as its body needs to turn over; a slide never leaves it;
      // on tiptoe it takes many quick little steps
      if (way === "roll") {
        going.deg = 360 * (m.turns ?? Math.max(1, Math.round(going.dist / (2.2 * h)))) * s;
        air = 0;
        lift = (actor.motion?.roll ?? 0.25) * h * Math.abs(Math.sin((going.deg * Math.PI) / 180));
      } else if (way === "slide") {
        air = 0;
        lift = 0;
      } else if (way === "tiptoe") {
        const n = Math.max(3, Math.round(going.dist / (0.3 * h)));
        const q = (u * n) % 1;
        air = 4 * q * (1 - q);
        lift = 0.05 * h * air;
      }
    }
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
  // the view it is seen in: the one its pose is taken in (facing the viewer, at rest as it stands), held as long as the
  // pose lasts; between two views it turns, narrowing to its edge and back, the drawing changing at its edge
  let view = null;
  if (actor.views) {
    const viewOf = (key) => (key && actor.poses?.[key[1]]?.view) || null;
    view = viewOf(cur);
    const was = viewOf(prev);
    const d = cur ? t - cur[0] : Infinity;
    // (a solid character turns by rotating instead: solidTurn)
    if (prev && was !== view && d < VIEW_TURN && actor.yaw == null) {
      const u = d / VIEW_TURN;
      turnScale *= Math.max(0.06, Math.abs(Math.cos(Math.PI * u)));
      if (u < 0.5) view = was;
    }
  }
  // its body's gesture: a character with no arms shows things with its whole body (and any pose may move a body too)
  let body = null;
  const bodied = (key) => key && actor.poses?.[key[1]]?.body;
  if (actor.armless || bodied(cur) || bodied(prev)) {
    const bodyAt = (key) => bodyOf(actor, key ?? [0, "rest"], x, y, facing, t) ?? STILL;
    body = bodyAt(cur);
    if (prev) {
      // into a pose over its own time (a slow rise onto its toe), or out of one over that one's
      const was = bodyAt(prev);
      const b = easeInOut(clamp01((t - cur[0]) / Math.max(body.ease ?? 0.24, was.ease ?? 0.24)));
      if (b < 1) body = mixBody(was, body, b);
    }
  }
  // what it feels, and where it looks
  const feelKey = lastAt(tr.feel, t);
  const feel = feelKey ? feelKey[1] : "happy";
  const lookKey = lastAt(tr.look, t);
  let look = [0, 0];
  const override = (actor.feelings[feel] ?? {}).look;
  if (override) look = [override[0] * 0.018 * h, override[1] * 0.014 * h];
  else if (lookKey && lookKey[1] === "dir") look = [lookKey[2] * 0.018 * h, lookKey[3] * 0.014 * h];
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
  // a whole-body form it has taken (sitting, curled up), or standing
  const formKey = lastAt(tr.forms ?? [], t);
  const form = formKey ? formKey[1] : null;
  // a fidget going on (its ears twitch, its tail wags), and how far into it: the parts that swing with it say how
  let fidget = null;
  for (const [f0, f1, name] of tr.fidgets ?? []) if (t >= f0 && t < f1) fidget = { name, e: envelope((t - f0) / (f1 - f0), 0.2) };
  // a slide leans back into it; on tiptoe it rises into its tiptoe pose, when it has one
  if (going?.way === "slide") lean -= 6 * envelope(going.u, 0.25);
  if (going?.way === "tiptoe" && actor.poses?.tiptoe) {
    const e = envelope(going.u, 0.2);
    const b = bodyOf(actor, [0, "tiptoe"], x, y, facing, t) ?? STILL;
    body = mixBody(body ?? STILL, { ...b, look: body?.look ?? null }, e);
  }
  const st = { x, y, facing, lift, air, sx: sx * turnScale, sy, lean, skew, front, back, feel, look, blink, cap, form, fidget, shown: t >= tr.appear[0] };
  if (view) st.view = view;
  // a flip turns it over in the air, about its middle, once each hop; a roll turns it over along the ground
  if (going?.way === "flip" || going?.way === "roll") {
    st.roll = going.way === "flip" ? 360 * easeInOut(going.phase) : going.deg;
    st.rollAt = -(0.99 - (actor.views?.[view]?.middle ?? actor.motion?.middle ?? 0.5)) * h;
  }
  // a feeling that says where it looks (thinking) wins over where its body looks
  if (body) applyBody(st, override ? { ...body, look: null } : body, h);
  if (actor.yaw != null && !flat) solidTurn(actor, t, st);
  return st;
}

/** The angle a solid character's drawing is seen from in a view (null: standing), facing right (1) or left (-1). */
const yawOf = (actor, view, facing) => {
  const y = view ? actor.views?.[view]?.yaw ?? actor.yaw : actor.yaw;
  return facing > 0 ? y : 180 - y;
};
/**
 * The angle a solid character is seen from at t: the angle of its view and the way it faces, and, within VIEW_TURN of
 * a change of either, on its way there from the angle it was seen from then (itself perhaps on its way), eased.
 */
function seenFrom(actor, t, depth = 0) {
  const target = (u) => {
    const s = actorAt(actor, u, true);
    return yawOf(actor, s.view ?? null, s.facing);
  };
  const now = target(t);
  const tr = actor.track;
  // the moments its view or the way it faces can change: a move begins or ends, it turns, it takes a pose
  const at = [];
  for (const m of tr.moves) at.push(m.t0, m.t1);
  for (const k of tr.turns ?? []) at.push(k[0]);
  for (const k of tr.arms) at.push(k[0]);
  const near = at.filter((c) => c <= t && c > t - VIEW_TURN).sort((a, b) => b - a);
  // the latest of them that changed the angle it turns to, and the angle it was seen from just before
  for (const c of near) {
    if (Math.abs(target(c - 1e-4) - now) < 1e-6) continue;
    const was = depth < 3 ? seenFrom(actor, c - 1e-4, depth + 1) : target(c - 1e-4);
    return was + (now - was) * easeInOut(clamp01((t - c) / VIEW_TURN));
  }
  return now;
}
/**
 * A character drawn from a modelled shape (`yaw`: the angle its standing view is seen from, its side 0 and facing the
 * viewer 90, and each view's own) turns by rotating it, never by narrowing it to its edge: at each moment of a turn,
 * to face the other way or into another view, it is seen in the drawing of the nearest angle it has (its views, the
 * in-between ones among them, each facing either way, a drawing facing left being its mirror), so its volume shows all
 * the way round. When that drawing is mirrored against the way it faces (`mirror`), what is in its own frame turns
 * with it: its eyes look the same way, and it flips over the same way.
 */
export function solidTurn(actor, t, st) {
  const yaw = seenFrom(actor, t);
  let best = null;
  const drawings = [[actor.yaw, null], ...Object.entries(actor.views ?? {}).filter(([, v]) => v.yaw != null && v.pitch == null).map(([k, v]) => [v.yaw, k])];
  for (const [y, v] of drawings)
    for (const sign of [st.facing, -st.facing]) {
      const d = Math.abs((sign > 0 ? y : 180 - y) - yaw);
      if (!best || d < best.d - 1e-9) best = { d, v, sign };
    }
  if (best.v) st.view = best.v;
  else delete st.view;
  st.yaw = yaw;
  if (best.sign !== st.facing) {
    st.mirror = best.sign;
    if (st.look) st.look = [-st.look[0], st.look[1]];
    if (st.roll) st.roll = -st.roll;
  }
  return solidRise(actor, st);
}

/**
 * A solid character rising onto a point of itself (a rise: `turn` degrees about its `pivot`) is drawn risen: it is
 * seen in the drawing of the nearest angle it has risen to (`views.<name>: { yaw, pitch, pivot }`, its drawing at that
 * yaw at 0, each placed by the character standing on its own point), turned only by what is left, about that
 * drawing's point (the pose's own for the drawing at 0); the pose's shift is the drawings' to make.
 */
export function solidRise(actor, st) {
  const r = st.rise;
  if (!r || !r.turn || actor.yaw == null) return st;
  const at = st.view ? actor.views?.[st.view]?.yaw ?? actor.yaw : actor.yaw;
  let pick = { pitch: 0, view: st.view ?? null, pivot: r.pivot };
  for (const [k, v] of Object.entries(actor.views ?? {}))
    if (v.pitch != null && Math.abs(v.yaw - at) < 0.5 && Math.abs(v.pitch - r.turn) < Math.abs(pick.pitch - r.turn) - 1e-9) pick = { pitch: v.pitch, view: k, pivot: [v.pivot[0] * actor.h, (v.pivot[1] - 0.99) * actor.h] };
  if (pick.pitch === 0 && !Object.values(actor.views ?? {}).some((v) => v.pitch != null && Math.abs(v.yaw - at) < 0.5)) return st;
  if (pick.view) st.view = pick.view;
  st.rise = { turn: r.turn - pick.pitch, pivot: pick.pivot, shift: [0, 0] };
  return st;
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
  // a character with no arms has no hands to place: its body shows things (bodyOf)
  if (actor.armless) return { front: { hand: [0, 0], bow: [0, 0], glove: "open" }, back: { hand: [0, 0], bow: [0, 0], glove: "open" } };
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
export const INTRO_HEIGHT = { hop: 95, spin: 125, jump: 175, bounce: 110, flip: 60, roll: 30 };

/** The ways a character can travel from one place to another (personality.travel); a hop is every character's. */
export const TRAVEL = ["hop", "flip", "roll", "slide", "tiptoe"];
/**
 * How a character travels on a move: a move that says its way (an arrival's flip) goes that way; a trip between ideas
 * goes each of its own ways in turn, from the board's seed, and a step around the drawing only the ways that leave the
 * ground (a hop, a flip), so it still passes over what is drawn. Null for a hop where it stands, or a character with
 * no ways of its own.
 */
export function travelOf(actor, m, k) {
  const ways = actor.travel;
  if (!ways?.length || (m.from[0] === m.to[0] && m.from[1] === m.to[1])) return null;
  const pool = m.step ? ways.filter((w) => w === "hop" || w === "flip") : ways;
  return pool.length ? pool[(k + (actor.track.intro?.seed ?? 0)) % pool.length] : null;
}

/** How long it takes to turn from one view of it to another (facing the viewer, at rest on its side), in seconds. */
export const VIEW_TURN = 0.32;

/** How long a shy character keeps its shy pose once it has arrived, before it presents, in seconds. */
export const SHY_TIME = 1.2;
/** A shy character's shy pose (personality.shy on a character, shy on a look), when it has the pose. */
export const shyOf = (C) => {
  const shy = C?.personality ? C.personality.shy : C?.shy;
  return shy && C.poses?.[shy] ? shy : null;
};
/** The shortest a shy moment is, when the board has it set off soon after it arrives, in seconds. */
export const SHY_MIN = 0.6;
/** How soon after its shy moment it may set off and still present the title first, in seconds. */
export const SHY_SOON = 0.35;
/**
 * A shy character's hello is its shy pose: where its arrival (its keys in k from `from`) would wave hello, it glances
 * away instead, for SHY_TIME or until just before it next sets off on one of `moves`, and never less than SHY_MIN.
 * Writes the pose into k.arms and returns the moment, [start, end, when it next sets off]: it is ready to present once
 * it is over, and presents nothing when it sets off at once.
 */
export function shyHello(k, from, ready, pose, moves) {
  const wave = k.arms.filter((x) => x[0] >= from - 1e-9 && x[1] === "wave").at(-1);
  const start = wave ? wave[0] : ready;
  if (wave) k.arms.splice(k.arms.indexOf(wave), 1);
  let next = Infinity;
  for (const m of moves) if (m.t0 - 0.12 > start + 1e-9 && (m.from[0] !== m.to[0] || m.from[1] !== m.to[1])) next = Math.min(next, m.t0 - 0.12);
  const end = Math.max(start + SHY_MIN, Math.min(start + SHY_TIME, next - 0.05));
  k.arms.push([start, pose]);
  return [start, end, next];
}
/** Nothing cuts a shy moment [s0, s1] short: the gesture of the moment in it waits until it is over, and the rest go. */
export function keepShy(track, [s0, s1, pose]) {
  const inside = track.arms.filter((x) => x[0] > s0 + 1e-9 && x[0] < s1 - 1e-9 && x[1] !== pose).sort((a, b) => a[0] - b[0]);
  if (!inside.length) return;
  track.arms = track.arms.filter((x) => !inside.includes(x));
  if (!track.arms.some((x) => Math.abs(x[0] - s1) < 0.01)) track.arms.push([s1, ...inside.at(-1).slice(1)]);
}

/** The quirk of the i-th quiet moment: a shy character's shy pose first, then its quirks in turn. */
export const quirkAt = (i, quirks, shy) => (shy && i === 0 ? shy : quirks.length ? quirks[(i - (shy ? 1 : 0)) % quirks.length] : null);

/** How long a form taken in a quiet moment is held at most, in seconds (a cat sits a while, then gets up). */
export const FORM_TIME = 2.8;

/** When the quiet that begins at t ends: its hands next move, it next steps or hops, or `cap` seconds on. */
export function quietTill(track, t, cap) {
  let end = t + cap;
  for (const key of track.arms) if (key[0] > t + 0.01 && key[0] < end) end = key[0];
  for (const m of track.moves) if (m.t0 > t && m.t0 < end) end = m.t0;
  return end;
}

/**
 * A quirk of a character's own in a quiet moment [q0, q1] of a board: a pose of its hands (Stuart pushes his glasses
 * up), a form it takes for as long as the moment stays quiet (a cat sits, or curls up into a ball), or a fidget (its
 * ears twitch while it looks around). C is its rig or its look. Returns whether it did one.
 */
export function quirk(track, name, q0, q1, C) {
  if (C.forms?.includes(name)) {
    const end = quietTill(track, q0, FORM_TIME) - 0.15;
    if (end - q0 < 1.6) return false;
    (track.forms ??= []).push([q0, name], [end, null]);
    return true;
  }
  const f = C.fidgets?.[name];
  if (f) {
    const end = Math.min(q0 + (f.time ?? 1.6), quietTill(track, q0, 3) - 0.1);
    (track.fidgets ??= []).push([q0, end, name]);
    if (f.look === "around") track.look.push([q0, "dir", -1, -0.3], [q0 + (end - q0) * 0.4, "dir", 1, -0.4], [q0 + (end - q0) * 0.75, "dir", 0, 0.6], [end, null]);
    return true;
  }
  if (C.poses?.[name]) {
    // a pose of its own for a moment, or for as long as it says while the moment stays quiet (balancing on its tip)
    const hold = C.poses[name].hold;
    const end = hold ? Math.max(q1, quietTill(track, q0, hold) - 0.1) : q1;
    track.arms.push([q0, name], [end, "rest"]);
    track.look.push([q0, null]);
    return true;
  }
  return false;
}

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
  // a cat's hello: it rubs against you, swaying side to side with its eyes shut in pleasure, then waves
  rub: (k, a) => {
    k.arms.push([a, "rest"]);
    k.leans.push([a + 0.05, a + 0.5, -12], [a + 0.5, a + 0.95, 12], [a + 0.95, a + 1.35, -9]);
    k.feel.push([a + 0.05, "proud"], [a + 1.4, "happy"]);
    (k.fidgets ??= []).push([a, a + 1.4, "wag"]);
    k.bounces.push([a + 1.35, 0.4]);
    k.arms.push([a + 1.4, "wave"]);
    return a + 2.1;
  },
  // a flip: it crouches, springs up, turns over once in the air about its middle, lands in a pose, and waves
  flip: (k, a, at) => {
    k.bounces.push([a, -0.9]);
    k.moves.push({ ...hopHere(at, a + 0.12, a + 0.86, INTRO_HEIGHT.flip), way: "flip" });
    k.bounces.push([a + 0.86, 1.15]);
    k.arms.push([a + 0.05, "cheer"], [a + 1.6, "wave"]);
    k.feel.push([a, "excited"], [a + 1.9, "happy"]);
    return a + 2.3;
  },
  // a roll: it tucks in and turns over along the ground where it stands, then waves
  roll: (k, a, at) => {
    k.bounces.push([a, -0.6]);
    k.moves.push({ ...hopHere(at, a + 0.1, a + 1.0, INTRO_HEIGHT.roll), way: "roll" });
    k.bounces.push([a + 1.0, 0.8]);
    k.arms.push([a, "rest"], [a + 1.15, "wave"]);
    k.feel.push([a, "excited"], [a + 1.6, "happy"]);
    return a + 1.9;
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
  // a cat's goodbye: it waves its tail, turns away and walks off a few soft steps as the circle closes, ending well
  // inside the circle (the circle is round where it stood: a few steps, its tail and all still in it)
  stroll: (k, t, fly, iris, at) => {
    k.arms.push([t + 0.15, "wave"], [t + fly - 0.7, "rest"]);
    (k.fidgets ??= []).push([t + 0.15, iris.hold + 0.4, "wag"]);
    k.turns.push([t + fly - 0.65, -at.facing]);
    k.moves.push({ t0: t + fly - 0.55, t1: iris.hold + 0.3, from: [at.x, at.y], to: [at.x - at.facing * 0.12 * (iris.r ?? 160), at.y], hops: 3, height: 4, facing: -at.facing, land: -at.facing });
  },
  // a flip, and it leaves: it waves, turns away and flips off a little way, still inside the closing circle
  flip: (k, t, fly, iris, at) => {
    k.arms.push([t + 0.15, "wave"], [t + fly - 0.75, "cheer"]);
    k.turns.push([t + fly - 0.7, -at.facing]);
    k.moves.push({ t0: t + fly - 0.6, t1: t + fly + 0.15, from: [at.x, at.y], to: [at.x - at.facing * 0.14 * (iris.r ?? 160), at.y], hops: 1, height: 70, facing: -at.facing, land: -at.facing, way: "flip" });
    k.bounces.push([t + fly + 0.15, 0.9]);
    k.feel.push([t + 0.15, "excited"]);
  },
  // a roll, and it leaves: it waves, turns away and rolls off a little way as the circle closes
  roll: (k, t, fly, iris, at) => {
    k.arms.push([t + 0.15, "wave"], [t + fly - 0.75, "rest"]);
    k.turns.push([t + fly - 0.7, -at.facing]);
    k.moves.push({ t0: t + fly - 0.6, t1: iris.hold + 0.2, from: [at.x, at.y], to: [at.x - at.facing * 0.14 * (iris.r ?? 160), at.y], hops: 1, height: 0, facing: -at.facing, land: -at.facing, way: "roll", turns: 1 });
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
const WAITING = /^brows:(?!up$)|^mouth:(?!smile$)|^squint|^form:|^@/;
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
export function drawOn(strokes, armsAt, h, t0, t1, armless = false) {
  const items = [];
  for (const s of strokes) if (!WAITING.test(s.part)) items.push({ n: s.n, s, len: lengthOf(s.pts) * (s.l === 0 ? 1 : 0.3) });
  if (!armless) ["armBack", "gloveBack", "armFront", "gloveFront"].forEach((name, i) => items.push({ n: armsAt + i, name, len: name.startsWith("arm") ? 0.42 * h : 0.5 * h }));
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
  // a character with no arms crosses nothing to show a thing: it looks at it and bends toward it where it stands
  if (!S || A.armless) return A;
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
  // every list an arrival or a goodbye may write to, whether or not the board's own guide used it (a guide that never
  // turned has no turns; a cat's goodbye turns it away)
  const LISTS = ["arms", "feel", "look", "bounces", "spins", "leans", "caps", "turns", "fidgets", "forms"];
  for (const key of LISTS) k[key] = tuples(track[key]);
  const blank = () => ({ moves: [], ...Object.fromEntries(LISTS.map((key) => [key, []])) });
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
  // a shy one takes its shy pose once it has arrived, before it presents; the board's own guide's shyness goes
  const shy = shyOf(look);
  if (arrive && INTROS[arrive.kind]) {
    const high = INTRO_HEIGHT[arrive.kind] ?? 0;
    const kind = choose(arrive, look.intros || [], (x) => INTROS[x] && (INTRO_HEIGHT[x] ?? 0) <= high);
    if (kind !== arrive.kind || shy || arrive.shy) {
      const was = blank();
      let ready0 = INTROS[arrive.kind](was, arrive.at, arrive.from);
      if (arrive.shy?.length > 2) {
        // its hello was its shy pose, in place of its wave
        shyHello(was, arrive.at, ready0, arrive.shy[1], k.moves);
        ready0 = arrive.shy[2];
      } else if (arrive.shy) {
        was.arms.push([arrive.shy[0], arrive.shy[1]]);
        ready0 += SHY_TIME;
      }
      take(was);
      const now = blank();
      let ready1 = INTROS[kind](now, arrive.at, arrive.from);
      let moment = null;
      if (shy) {
        moment = shyHello(now, arrive.at, ready1, shy, k.moves);
        ready1 = moment[1];
      }
      put(now);
      // it presents the title once it is ready, its own arrival done
      if (arrive.title != null) {
        const [a, b] = [Math.max(arrive.title, ready0), Math.max(arrive.title, ready1)];
        for (const key of k.arms) if (key[1] === "present" && Math.abs(key[0] - a) < 1e-9) key[0] = b;
        // a shy one that sets off as soon as its shy moment is over presents nothing on the way
        if (moment && moment[2] - b < SHY_SOON) k.arms = k.arms.filter((key) => !(key[1] === "present" && Math.abs(key[0] - b) < 1e-9));
      }
      k.intro = { ...arrive, kind, shy: shy ? [moment[0], shy, moment[1]] : undefined };
      if (moment) keepShy(k, [moment[0], moment[1], shy]);
    }
  }
  const leave = track.outro;
  if (leave && OUTROS[leave.kind]) {
    const kind = choose(leave, look.outros || [], (x) => Boolean(OUTROS[x]));
    if (kind !== leave.kind) {
      const iris = { hold: leave.hold, r: (look.h ?? 240) * 0.66 };
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
  // the board's guide's forms and fidgets are its own; this one takes its own in the same quiet moments
  k.forms = [];
  k.fidgets = (k.fidgets || []).filter((f) => f[2] === "wag" && (look.swing || look.forms));
  if (quiet.length) {
    const mine = (look.quirks || []).filter((q) => look.poses[q] || look.forms?.includes(q) || look.fidgets?.[q]);
    const at = new Set(quiet.flatMap(([a, b]) => [a, b]));
    k.arms = k.arms.filter((x) => !at.has(x[0]));
    k.look = k.look.filter((x) => x[1] !== "dir");
    quiet.forEach(([a, b], i) => {
      const name = quirkAt(i, mine, shy);
      if (name) quirk(k, name, a, b, look);
    });
  }
  for (const key of ["arms", "feel", "look", "bounces", "spins", "leans", "caps", "forms"]) k[key].sort((a, b) => a[0] - b[0]);
  k.moves.sort((a, b) => a.t0 - b.t0);
  return k;
}

/**
 * The days of the year a guide can dress for, in the viewer's own calendar, from [month, day] to [month, day]: the
 * holidays first, then the seasons. A host that asks for today's outfit (`outfit: "today"`) has a character wear its
 * own outfit for the first of them it has one for, and its board's dress on any other day; any other name is the
 * host's own (a school's sports day, a birthday).
 */
export const OCCASIONS = [
  { name: "New Year", from: [12, 31], to: [1, 1] },
  { name: "Valentine's Day", from: [2, 10], to: [2, 14] },
  { name: "St. Patrick's Day", from: [3, 14], to: [3, 17] },
  { name: "Fourth of July", from: [7, 1], to: [7, 4] },
  { name: "Halloween", from: [10, 18], to: [10, 31] },
  { name: "Christmas", from: [12, 1], to: [12, 26] },
  { name: "winter", from: [12, 1], to: [2, 29] },
  { name: "summer", from: [6, 21], to: [8, 31] },
];

/** The occasions of a day, most particular first: Thanksgiving's week (the fourth Thursday of November), a holiday, a season. */
export function occasionsOn(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const key = m * 100 + d;
  const within = ([m0, d0], [m1, d1]) => (m0 * 100 + d0 <= m1 * 100 + d1 ? key >= m0 * 100 + d0 && key <= m1 * 100 + d1 : key >= m0 * 100 + d0 || key <= m1 * 100 + d1);
  const out = OCCASIONS.filter((o) => within(o.from, o.to)).map((o) => o.name);
  const thursday = 1 + ((4 - new Date(date.getFullYear(), 10, 1).getDay() + 7) % 7) + 21;
  if (m === 11 && d >= thursday - 3 && d <= thursday + 1) out.unshift("Thanksgiving");
  return out;
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
 * and its open accent is the board's; `elements` are the page's; `dress` is what the host asks it to wear:
 * { outfit } by name, or "today" for the day's occasion, with { date } to say another day.
 */
export function recast(A, look, palette, elements = [], dress = {}) {
  const color = (c) => {
    if (c === "accent") return A.accent;
    let i = palette.indexOf(c);
    if (i < 0) i = palette.push(c) - 1;
    return i;
  };
  const copy = (s) => ({ part: s.part, n: s.n, w: s.w, c: color(s.c), l: s.l, o: s.o, pts: s.pts });
  const strokes = look.strokes.map(copy);
  let next = Math.max(look.armsAt + 3, ...strokes.map((s) => s.n)) + 1;
  // what it wears: an outfit the host asks for (today's: its Halloween in October), when it has one; else, for an
  // outfit the board's guide wears (its winter, a builder's), its own outfit of that name; else the costumes the board
  // wears that it has. A costume goes on only where the board kept the room over its head; each is drawn in its turn
  // after its body, as a board dresses a guide
  const find = (n) => n != null && (look.outfits || []).find((o) => o.name.toLowerCase() === String(n).toLowerCase());
  // `outfit: false` asks for its own clothes: nothing of the board's dress either (a host whose child has not given it
  // an outfit, say)
  const plain = dress.outfit === false;
  const asked = dress.outfit === "today" ? occasionsOn(dress.date ? new Date(dress.date) : new Date()) : dress.outfit != null && !plain ? [dress.outfit] : [];
  const room = (w) => A.top == null || (look.tops?.[w] ?? 0) <= A.top + 0.02;
  const wearing = (kit) => Object.keys(look.wear || {}).filter((w) => (kit ? kit.wear : A.wear || []).includes(w) && room(w));
  const day = asked.map(find).find(Boolean);
  // the day's outfit when it fits on this board, else the board's own dress
  const fits = day ? wearing(day) : [];
  const wears = plain ? [] : fits.length ? fits : wearing(find(A.outfit));
  const worn = plain ? null : fits.length ? day.name : find(A.outfit) ? find(A.outfit).name : null;
  for (const w of wears) for (const s of look.wear[w]) strokes.push({ ...copy(s), n: next++ });
  // what it holds is the board's: drawn in its hand's own frame, so the same in any hand, and drawn last (a character
  // with no arms holds nothing)
  if (!look.armless) for (const s of A.strokes) if (s.part === "held" || s.part === "pointer") strokes.push({ ...s, n: next++ });
  const [t0, t1] = drawnIn(A);
  const reveal = drawOn(strokes, look.armsAt, A.h, t0, t1, look.armless);
  const hands = look.hands[wears.find((w) => look.hands[w]) ?? "plain"];
  // its own arrival, goodbye and quirks; and any pose it does not have (another's quirk) rests
  const played = personalize(A.track, look);
  const has = (pose) => OWN_POSES.includes(pose) || (look.quirks || []).includes(pose);
  const track = { ...played, arms: played.arms.map((k) => (has(k[1]) && look.poses[k[1]] ? k : [k[0], "rest"])) };
  return keepClear({
    ...A,
    character: look.id,
    // a character with no arms holds nothing, and one with arms cast where one without was has its arms again
    armless: look.armless ? true : undefined,
    ...(look.armless ? { hold: null } : {}),
    // what it wears on this board, and the outfit that is, if any
    dressed: { outfit: worn, wear: wears },
    eyes: look.eyes,
    shoulders: look.shoulders,
    poses: look.poses,
    motion: look.motion,
    swing: look.swing,
    forms: look.forms,
    fidgets: look.fidgets,
    views: look.views,
    // a character drawn from a modelled shape turns by rotating it; any other, as a drawing does
    yaw: look.yaw,
    travel: look.travel,
    // what it does when it is tapped comes from its own quirks and ways to arrive
    quirks: look.quirks,
    intros: look.intros,
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
