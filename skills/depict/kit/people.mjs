// People, in the same cartoon hand as the guide: a big round head with
// eyes that look where the figure faces, hair colored in, a shirt in one of
// the board's tints, rubber-hose arms with round mitten hands, and black
// shoes. A small nose on one side says which way the figure faces; the
// brows and the mouth carry how it feels. Drawn the way a cartoonist would:
// head, hair, face, shirt, arms, legs, shoes, then the color.
import * as ink from "./ink.mjs";

const PAPER = "#fbfaf7";
const INK = "#1b1b19";

/** Shirts, muted so the board's one accent still stands out ("accent" is the board's own). */
export const TINTS = { blue: "#8db4d4", green: "#9cc9a3", sand: "#e9cf8e", pink: "#e6a8b6", grey: "#c4c0b5", accent: null, none: null };

/**
 * Poses, for a figure facing right, in units of its height from the top of
 * its head: each hand, and where its hose of an arm bows on the way there;
 * each foot.
 */
const POSES = {
  stand: { front: { hand: [0.2, 0.66], bow: [0.22, 0.52] }, back: { hand: [-0.2, 0.66], bow: [-0.22, 0.52] }, feet: [[0.07, 0.955], [-0.07, 0.955]] },
  wave: { front: { hand: [0.3, 0.16], bow: [0.34, 0.38] }, back: { hand: [-0.2, 0.66], bow: [-0.22, 0.52] }, feet: [[0.07, 0.955], [-0.07, 0.955]] },
  point: { front: { hand: [0.44, 0.4], bow: [0.3, 0.48] }, back: { hand: [-0.2, 0.66], bow: [-0.22, 0.52] }, feet: [[0.07, 0.955], [-0.07, 0.955]] },
  think: { front: { hand: [0.085, 0.36], bow: [0.34, 0.56] }, back: { hand: [-0.2, 0.66], bow: [-0.22, 0.52] }, feet: [[0.07, 0.955], [-0.07, 0.955]] },
  cheer: { front: { hand: [0.3, 0.06], bow: [0.36, 0.3] }, back: { hand: [-0.3, 0.06], bow: [-0.36, 0.3] }, feet: [[0.1, 0.955], [-0.1, 0.955]] },
  shrug: { front: { hand: [0.33, 0.38], bow: [0.3, 0.56] }, back: { hand: [-0.33, 0.38], bow: [-0.3, 0.56] }, feet: [[0.07, 0.955], [-0.07, 0.955]] },
  walk: { front: { hand: [0.24, 0.6], bow: [0.25, 0.47] }, back: { hand: [-0.22, 0.6], bow: [-0.25, 0.47] }, feet: [[0.17, 0.95], [-0.15, 0.94]] },
  hold: { front: { hand: [0.3, 0.52], bow: [0.26, 0.6] }, back: { hand: [0.2, 0.55], bow: [0.02, 0.62] }, feet: [[0.07, 0.955], [-0.07, 0.955]] },
};
export const POSE_NAMES = Object.keys(POSES);
export const FACES = ["happy", "sad", "surprised", "worried", "neutral", "angry"];
export const HAIRS = ["none", "short", "long", "bun", "curly"];
export const HATS = ["none", "chef", "cap"];

/** A quadratic curve through a middle control point, as a polyline. */
const curve = (a, c, b, n = 10) => {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = 1 - t;
    out.push(s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]);
  }
  return out;
};

/**
 * A character's parts, its top-center at (x, y) and `h` units tall: a list of
 * { role, strokes, width, color, layer, opacity } in drawing order. Its box
 * is about { x - 0.45h, y, 0.9h, h } (a pointing arm reaches further).
 */
export function person(p, x, y, h, { pose = "stand", face = "happy", facing = "right", hair = "short", shirt = "blue", hat = "none", accent = "#c43f0a" } = {}) {
  const f = facing === "left" ? -1 : 1;
  const P = (u, v) => [x + f * u * h, y + v * h];
  const pts = (...uv) => uv.flatMap(([u, v]) => P(u, v));
  const W = h * 0.02;
  const fine = h * 0.016;
  const parts = [];
  const add = (role, strokes, width, color = INK, layer = "ink", opacity = 1) => parts.push({ role, strokes, width, color, layer, opacity });

  // the head (under a hat, only the part the hat leaves showing)
  const [hx, hy] = P(0, 0.17);
  const hr = 0.162 * h;
  if (hat === "none") add("outline", ink.ellipse(p, hx, hy, hr, hr * 1.02, { overshoot: 0.06 }), W);
  else {
    const face = [];
    for (let i = 0; i <= 24; i++) {
      const a = -Math.PI * 0.12 + (Math.PI * 1.24 * i) / 24;
      face.push(hx + Math.cos(a) * hr, hy + Math.sin(a) * hr * 1.02);
    }
    add("outline", [ink.wobble(p, face, { amp: 0.6 })], W);
  }
  // hair, colored in solid later: a cap over the crown with a few tufts across the forehead, and what else the style has
  const arcUV = (r, a0, a1, n = 16) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / n;
      return [(Math.cos(a) * r) / h, 0.17 + (Math.sin(a) * r) / h];
    });
  const hairShapes = [];
  if (hair === "short" || hair === "bun" || hair === "long") {
    const crown = arcUV(hr * 1.07, Math.PI * 0.97, Math.PI * 2.03);
    hairShapes.push([...crown, [0.155, 0.12], [0.1, 0.07], [0.055, 0.092], [-0.005, 0.062], [-0.06, 0.085], [-0.125, 0.08], [-0.168, 0.15]]);
  }
  if (hair === "long") hairShapes.push([[-0.17, 0.12], [-0.2, 0.3], [-0.19, 0.44], [-0.12, 0.45], [-0.135, 0.22]], [[0.165, 0.13], [0.19, 0.3], [0.18, 0.42], [0.12, 0.4], [0.14, 0.22]]);
  if (hair === "bun") hairShapes.push(arcUV(h * 0.075, 0, Math.PI * 2, 12).map(([u, v]) => [u, v - 0.2]));
  if (hair === "curly") {
    const out = [];
    for (let i = 0; i <= 30; i++) {
      const a = Math.PI * 0.95 + (Math.PI * 1.1 * i) / 30;
      const r = hr * (1.1 + 0.07 * Math.sin(i * 2.2));
      out.push([(Math.cos(a) * r) / h, 0.17 + (Math.sin(a) * r) / h]);
    }
    hairShapes.push([...out, [0.12, 0.09], [0.0, 0.07], [-0.12, 0.09]]);
  }
  for (const shape of hairShapes) add("outline", [ink.wobble(p, pts(...shape, shape[0]), { amp: 0.5 })], fine);
  // a hat says who the figure is: a chef's toque, or a cap with its peak toward the way it faces
  const hatShapes = [];
  if (hat === "chef") {
    const band = [[-0.152, 0.13], [-0.148, 0.03], [0.148, 0.03], [0.152, 0.13]];
    add("outline", [ink.wobble(p, pts(...band, [-0.152, 0.13]), { amp: 0.5 })], W);
    const puff = [[-0.15, 0.035], [-0.21, -0.03], [-0.19, -0.13], [-0.1, -0.16], [-0.03, -0.215], [0.06, -0.2], [0.11, -0.15], [0.2, -0.12], [0.215, -0.03], [0.15, 0.035]];
    add("outline", ink.blob(p, pts(...puff), { overshoot: 0.02 }), W);
    for (const u of [-0.07, 0.0, 0.07]) add("outline", [ink.wobble(p, pts([u, 0.045], [u + 0.004, 0.115]), { amp: 0.2 })], fine * 0.8);
  } else if (hat === "cap") {
    const crown = arcUV(hr * 1.06, Math.PI * 0.98, Math.PI * 2.02);
    hatShapes.push([...crown, [0.17, 0.155], [-0.17, 0.155]]);
    add("outline", [ink.wobble(p, pts(...hatShapes[0], hatShapes[0][0]), { amp: 0.5 })], W);
    add("outline", [ink.wobble(p, pts([0.15, 0.15], [0.3, 0.17], [0.31, 0.19], [0.15, 0.185]), { amp: 0.4 })], W);
  }

  // the face: black bean eyes set toward the way it faces, each with a glint; a small nose on that side; brows and a mouth by the feeling
  const eyeH = face === "surprised" ? 0.026 : 0.02;
  for (const ex of [-0.035, 0.07]) {
    const [px, py] = P(ex, 0.205);
    const eye = ink.dab(p, px, py - h * eyeH * 0.55, px, py + h * eyeH * 0.55, h * 0.036);
    add("pupil", eye.strokes, eye.width);
    const shine = ink.dab(p, px - f * h * 0.006, py - h * 0.011, px - f * h * 0.005, py - h * 0.009, h * 0.011);
    add("shine", shine.strokes, shine.width, PAPER);
  }
  add("face", [ink.wobble(p, pts([0.108, 0.226], [0.13, 0.248], [0.106, 0.258]), { amp: 0.3 })], fine * 0.9);
  // brows: raised for surprise, the inner ends up for worry and sadness, down for anger
  const [lift, tilt] = { happy: [0.004, 0], sad: [0, 0.016], surprised: [0.024, 0], worried: [0.012, 0.018], neutral: [0, 0], angry: [-0.006, -0.02] }[face] ?? [0, 0];
  for (const [cx, inside] of [[-0.035, "b"], [0.07, "a"]]) {
    const base = 0.158 - lift;
    const a = [cx - 0.034, base - (inside === "a" ? tilt : 0)];
    const b = [cx + 0.034, base - (inside === "b" ? tilt : 0)];
    const m = [cx, base - 0.01 - tilt * 0.5];
    add("brow", [ink.wobble(p, curve(P(...a), P(...m), P(...b)), { amp: 0.3 })], h * 0.017);
  }
  const mx = 0.03;
  const mouths = {
    happy: () => add("mouth", [ink.wobble(p, curve(P(mx - 0.05, 0.268), P(mx + 0.01, 0.318), P(mx + 0.062, 0.262)), { amp: 0.3 })], h * 0.017),
    sad: () => add("mouth", [ink.wobble(p, curve(P(mx - 0.045, 0.298), P(mx + 0.01, 0.258), P(mx + 0.055, 0.298)), { amp: 0.3 })], h * 0.016),
    surprised: () => add("mouth", ink.ellipse(p, ...P(mx + 0.008, 0.285), h * 0.02, h * 0.027, { overshoot: 0.05 }), h * 0.015),
    worried: () => add("mouth", [ink.wobble(p, pts([mx - 0.045, 0.292], [mx - 0.015, 0.28], [mx + 0.015, 0.294], [mx + 0.05, 0.282]), { amp: 0.3 })], h * 0.015),
    neutral: () => add("mouth", [ink.wobble(p, pts([mx - 0.035, 0.285], [mx + 0.045, 0.283]), { amp: 0.3 })], h * 0.015),
    angry: () => add("mouth", [ink.wobble(p, curve(P(mx - 0.045, 0.298), P(mx + 0.01, 0.272), P(mx + 0.055, 0.298)), { amp: 0.3 })], h * 0.017),
  };
  (mouths[face] ?? mouths.happy)();
  for (const cx of [-0.085, 0.14]) {
    const blush = ink.dab(p, ...P(cx - 0.014, 0.262), ...P(cx + 0.014, 0.262), h * 0.03);
    add("cheek", blush.strokes, blush.width, accent, "under", 0.32);
  }

  // the shirt: shoulders under the head, a little flare at the hem
  const shirtPts = pts([-0.09, 0.332], [0.09, 0.332], [0.148, 0.37], [0.165, 0.52], [0.16, 0.655], [0.0, 0.672], [-0.16, 0.655], [-0.165, 0.52], [-0.148, 0.37]);
  const shirtLine = ink.blob(p, shirtPts, { overshoot: 0.06 })[0];
  add("outline", [shirtLine], W);

  // arms: hoses from the shoulders to round mitten hands
  const pose_ = POSES[pose] ?? POSES.stand;
  for (const side of ["back", "front"]) {
    const arm = pose_[side];
    const sh = side === "front" ? [0.13, 0.37] : [-0.13, 0.37];
    add("arm", [ink.wobble(p, curve(P(...sh), P(...arm.bow), P(...arm.hand), 16), { amp: 0.5 })], W * 1.05);
    const [cx, cy] = P(...arm.hand);
    const r = h * 0.048;
    add("hand", ink.ellipse(p, cx, cy, r, r * 0.95, { overshoot: 0.05 }), fine);
  }
  // legs, and black shoes that point the way it faces
  for (const [i, [fu, fv]] of pose_.feet.entries()) {
    const hip = i === 0 ? [0.06, 0.66] : [-0.06, 0.66];
    add("leg", [ink.wobble(p, curve(P(...hip), P((hip[0] + fu) / 2, 0.8), P(fu, fv - 0.02), 10), { amp: 0.4 })], W * 1.2);
    const shoe = ink.dab(p, ...P(fu - 0.025, fv), ...P(fu + 0.06, fv + 0.002), h * 0.045);
    add("shoe", shoe.strokes, shoe.width);
  }

  // a chef's jacket: two rows of buttons, and a knotted neckerchief in the accent
  let kerchief = null;
  if (hat === "chef") {
    for (const [u, v] of [[-0.05, 0.46], [0.05, 0.46], [-0.05, 0.56], [0.05, 0.56]]) {
      const b = ink.dab(p, ...P(u - 0.004, v), ...P(u + 0.004, v), h * 0.02);
      add("outline", b.strokes, b.width);
    }
    kerchief = pts([-0.085, 0.33], [0.085, 0.33], [0.035, 0.375], [0.012, 0.43], [-0.015, 0.43], [-0.035, 0.375]);
    add("outline", [ink.wobble(p, [...kerchief, kerchief[0], kerchief[1]], { amp: 0.3 })], fine);
  }
  // a shadow on the floor under the feet, so the figure stands on something
  const floor = ink.dab(p, ...P(-0.2, 0.988), ...P(0.22, 0.988), h * 0.03);
  add("floor", floor.strokes, floor.width, "#d9d5ca", "shadow", 1);

  // the color last: the hair colored in, the shirt in its tint
  if (kerchief) {
    const fill = ink.fill(p, kerchief, { nib: h * 0.022, angle: 70, edge: 0.15 });
    add("fill", fill.strokes, fill.width, accent, "under", 0.92);
  }
  for (const shape of hairShapes) {
    const fill = ink.fill(p, pts(...shape), { nib: h * 0.03, angle: -20, edge: 0.15 });
    add("fill", fill.strokes, fill.width, INK, "under", 0.92);
  }
  for (const shape of hatShapes) {
    const fill = ink.fill(p, pts(...shape), { nib: h * 0.035, angle: -20 });
    add("fill", fill.strokes, fill.width, accent, "under", 0.9);
  }
  const tint = shirt === "accent" ? accent : TINTS[shirt];
  if (tint) {
    const fill = ink.fill(p, shirtPts, { nib: h * 0.05, angle: -35 });
    add("fill", fill.strokes, fill.width, tint, "under", 0.9);
  }
  return parts;
}
