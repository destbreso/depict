// The guide's rig: the marker character as components the player can move
// one by one. Everything is drawn once, by the same hand as the board, in the
// figure's own coordinates: the origin between its feet, x toward the way it
// faces, y down, one unit a board unit. The player places the figure, flips
// it, squashes it as it lands, blinks its eyes, moves its pupils, swaps its
// brows and mouth for the feeling, and bends its rubber-hose arms to wherever
// its hands go, frame by frame. The arms and gloves are not strokes here but
// what the player needs to draw them: the shoulders, the hose's wobble, and
// each glove's outline in a frame of its own (x from the wrist out through the
// fingers, y toward the thumb).
import * as ink from "./ink.mjs";

const PAPER = "#fbfaf7";
const INK = "#1b1b19";
const GREY = "#8f8f88";

/** The feelings the guide shows, and the brows, mouth and eyes each one is made of. */
export const FEELINGS = {
  happy: { brows: "up", mouth: "smile", eyes: "open" },
  excited: { brows: "high", mouth: "smile", eyes: "open" },
  surprised: { brows: "high", mouth: "wow", eyes: "wide" },
  worried: { brows: "worried", mouth: "wavy", eyes: "open" },
  thinking: { brows: "quizzical", mouth: "side", eyes: "open", look: [0.4, -1] },
  proud: { brows: "up", mouth: "grin", eyes: "squint" },
  sad: { brows: "sad", mouth: "frown", eyes: "open" },
};

/**
 * Poses for the arms, for a figure facing right, in units of its height
 * from the top of its head: where each hand is, how its hose bows on the way
 * there, and the glove's shape. "point" is aimed by the player at a target.
 */
export const POSES = {
  rest: { front: { hand: [0.235, 0.715], bow: [0.36, 0.6], glove: "fist" }, back: { hand: [-0.235, 0.715], bow: [-0.36, 0.6], glove: "fist" } },
  present: { front: { hand: [0.44, 0.47], bow: [0.32, 0.66], glove: "point" }, back: { hand: [-0.235, 0.715], bow: [-0.36, 0.6], glove: "fist" } },
  wave: { front: { hand: [0.33, 0.2], bow: [0.4, 0.5], glove: "open" }, back: { hand: [-0.235, 0.715], bow: [-0.36, 0.6], glove: "fist" } },
  cheer: { front: { hand: [0.34, 0.15], bow: [0.43, 0.45], glove: "open" }, back: { hand: [-0.34, 0.15], bow: [-0.43, 0.45], glove: "open" } },
  shrug: { front: { hand: [0.37, 0.47], bow: [0.33, 0.7], glove: "open" }, back: { hand: [-0.37, 0.47], bow: [-0.33, 0.7], glove: "open" } },
  scratch: { front: { hand: [0.2, 0.1], bow: [0.44, 0.42], glove: "fist" }, back: { hand: [-0.235, 0.715], bow: [-0.36, 0.6], glove: "fist" } },
  point: { front: { hand: [0.44, 0.5], bow: [0.32, 0.66], glove: "point" }, back: { hand: [-0.235, 0.715], bow: [-0.36, 0.6], glove: "fist" } },
};
export const ACTS = ["point", "wave", "cheer", "shrug", "scratch", "present", "rest"];

/** The guide's components, `h` tall, drawn with the pen `p` in the board's accent. */
export function rig(p, h, accent) {
  const P = (u, v) => [u * h, (v - 0.99) * h];
  const pts = (...uv) => uv.flatMap(([u, v]) => P(u, v));
  const W = h * 0.019; // the outline's nib
  const fine = h * 0.015;
  const strokes = [];
  let order = 0;
  /** A stroke of a component, in the order the pen draws it when the guide first appears. */
  const add = (part, role, lines, width, color = INK, layer = "ink", opacity = 1) => {
    for (const pts_ of lines) strokes.push({ part, role, pts: pts_, w: width, c: color, l: layer, o: opacity, n: order++ });
  };
  const curve = (a, c, b, n = 14) => {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s = 1 - t;
      out.push(s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]);
    }
    return out;
  };
  const rrect = (u0, v0, u1, v1, r, rb = r) => {
    const out = [];
    const arc = (cu, cv, rr, a0, a1) => {
      for (let i = 0; i <= 6; i++) {
        const a = a0 + ((a1 - a0) * i) / 6;
        out.push([cu + Math.cos(a) * rr, cv + Math.sin(a) * rr]);
      }
    };
    arc(u1 - r, v0 + r, r, -Math.PI / 2, 0);
    arc(u1 - rb, v1 - rb, rb, 0, Math.PI / 2);
    arc(u0 + rb, v1 - rb, rb, Math.PI / 2, Math.PI);
    arc(u0 + r, v0 + r, r, Math.PI, Math.PI * 1.5);
    return out;
  };
  const closed = (uv) => {
    const flat = uv.flatMap(([u, v]) => P(u, v));
    return ink.wobble(p, [...flat, flat[0] + p.off(1), flat[1] + p.off(1), flat[2], flat[3]], { amp: Math.min(1.2, 0.25 * W) });
  };
  const cap = rrect(-0.185, 0, 0.185, 0.272, 0.115, 0.016);
  const barrel = rrect(-0.165, 0.272, 0.165, 0.87, 0.016, 0.075);

  // its silhouette in paper, under everything, so it hides what it passes in front of
  const solid = ink.fill(p, [...cap.slice(0, 8), ...barrel.slice(6, 22)].flatMap(([u, v]) => P(u, v)), { nib: h * 0.08, angle: 0, edge: 0.05 });
  add("body", "paper", solid.strokes, solid.width, PAPER, "under", 1);
  // the cap, its rim and the clip; the barrel under it
  add("body", "outline", [closed(cap)], W);
  add("body", "outline", [ink.wobble(p, curve(P(-0.185, 0.222), P(0, 0.246), P(0.185, 0.222)), { amp: 0.5 })], fine);
  add("body", "outline", [ink.wobble(p, pts([-0.1, 0.03], [-0.2, 0.045], [-0.214, 0.09], [-0.218, 0.262], [-0.203, 0.292], [-0.188, 0.268], [-0.186, 0.11]), { amp: 0.45 })], fine);
  add("body", "outline", [ink.wobble(p, pts(...barrel.slice(6, 22)), { amp: Math.min(1.2, 0.25 * W) })], W);

  // the eyes, each its own component so it can blink; the pupils (with their glints) move inside them
  const eyes = [];
  for (const [i, ex] of [-0.052, 0.072].entries()) {
    const [cx, cy] = P(ex, 0.415);
    eyes.push([cx, cy]);
    add(`eye${i}`, "eye", ink.ellipse(p, cx, cy, h * 0.053, h * 0.067, { overshoot: 0.05 }), fine);
    const [px, py] = [cx, cy + h * 0.008];
    const pupil = ink.dab(p, px, py - h * 0.013, px, py + h * 0.013, h * 0.055);
    add(`pupil${i}`, "pupil", pupil.strokes, pupil.width);
    const shine = ink.dab(p, px - h * 0.013, py - h * 0.018, px - h * 0.011, py - h * 0.015, h * 0.017);
    add(`pupil${i}`, "shine", shine.strokes, shine.width, PAPER);
    // eyes closed in a happy squint: an arc that bows up
    add(`squint${i}`, "eye", [ink.wobble(p, curve([cx - h * 0.045, cy + h * 0.012], [cx, cy - h * 0.05], [cx + h * 0.045, cy + h * 0.012]), { amp: 0.3 })], h * 0.02);
  }
  // brows, one pair per mood
  const brow = (ex, lift, tilt) => ink.wobble(p, curve(P(ex - 0.045, 0.34 - lift + tilt), P(ex + 0.012, 0.318 - lift * 1.4), P(ex + 0.068, 0.338 - lift - tilt)), { amp: 0.4 });
  const browSets = {
    up: [brow(-0.064, 0.008, 0), brow(0.06, 0.008, 0)],
    high: [brow(-0.064, 0.034, 0), brow(0.06, 0.034, 0)],
    worried: [brow(-0.064, 0.012, -0.014), brow(0.06, 0.012, 0.014)],
    quizzical: [brow(-0.064, 0.0, 0.006), brow(0.06, 0.03, -0.01)],
    sad: [brow(-0.064, 0.0, -0.016), brow(0.06, 0.0, 0.016)],
  };
  for (const [name, lines] of Object.entries(browSets)) add(`brows:${name}`, "brow", lines, h * 0.02);
  // mouths, one per mood
  const smile = [...curve(P(-0.058, 0.512), P(0.012, 0.514), P(0.08, 0.506)), ...curve(P(0.08, 0.506), P(0.012, 0.615), P(-0.058, 0.512)).slice(2)];
  const inside = ink.fill(p, smile, { nib: h * 0.03, angle: 8 });
  add("mouth:smile", "mouth", inside.strokes, inside.width);
  add("mouth:smile", "mouth", [ink.wobble(p, smile, { amp: 0.4 })], fine);
  const tongue = ink.dab(p, ...P(-0.01, 0.55), ...P(0.032, 0.55), h * 0.026);
  add("mouth:smile", "tongue", tongue.strokes, tongue.width, "#e46f5c");
  add("mouth:grin", "mouth", [ink.wobble(p, curve(P(-0.058, 0.512), P(0.012, 0.584), P(0.082, 0.508)), { amp: 0.4 })], h * 0.018);
  add("mouth:wow", "mouth", ink.ellipse(p, ...P(0.014, 0.548), h * 0.03, h * 0.04, { overshoot: 0.05 }), h * 0.018);
  add("mouth:wavy", "mouth", [ink.wobble(p, pts([-0.05, 0.548], [-0.02, 0.536], [0.012, 0.55], [0.045, 0.536], [0.075, 0.548]), { amp: 0.3 })], h * 0.017);
  add("mouth:side", "mouth", [ink.wobble(p, curve(P(-0.018, 0.548), P(0.032, 0.541), P(0.072, 0.526)), { amp: 0.4 })], h * 0.017);
  add("mouth:frown", "mouth", [ink.wobble(p, curve(P(-0.05, 0.56), P(0.014, 0.518), P(0.078, 0.56)), { amp: 0.4 })], h * 0.018);
  for (const cx of [-0.104, 0.122]) {
    const blush = ink.dab(p, ...P(cx - 0.018, 0.5), ...P(cx + 0.018, 0.5), h * 0.036);
    add("body", "cheek", blush.strokes, blush.width, accent, "under", 0.4);
  }
  // legs and shoes
  for (const [hip, heel] of [[-0.08, -0.13], [0.065, 0.05]]) {
    add("body", "leg", [ink.wobble(p, pts([hip, 0.865], [hip + 0.004, 0.915], [heel + 0.022, 0.952]), { amp: 0.4 })], W * 1.02);
    const shoe = ink.dab(p, ...P(heel - 0.008, 0.968), ...P(heel + 0.086, 0.968), h * 0.062);
    add("body", "shoe", shoe.strokes, shoe.width);
    const shine = ink.dab(p, ...P(heel + 0.03, 0.954), ...P(heel + 0.06, 0.952), h * 0.012);
    add("body", "shine", shine.strokes, shine.width, PAPER);
  }
  const armsAt = order;
  order += 4; // the arms and gloves are drawn here, between the legs and the color
  // the color last: the cap in the accent, the clip in grey, a gloss and a shade for its roundness
  const fillCap = ink.fill(p, cap.flatMap(([u, v]) => P(u, v)), { nib: h * 0.05, angle: -32 });
  add("body", "color", fillCap.strokes, fillCap.width, accent, "under", 0.95);
  const clipFill = ink.fill(p, pts([-0.212, 0.09], [-0.192, 0.09], [-0.19, 0.27], [-0.21, 0.27]), { nib: h * 0.022, angle: 80, edge: 0.1 });
  add("body", "color", clipFill.strokes, clipFill.width, GREY, "under", 0.5);
  add("body", "gloss", [ink.wobble(p, curve(P(0.045, 0.045), P(0.115, 0.04), P(0.145, 0.105)), { amp: 0.3 })], h * 0.016, PAPER);
  const shade = ink.fill(p, pts([-0.15, 0.3], [-0.105, 0.3], [-0.1, 0.84], [-0.15, 0.82]), { nib: h * 0.04, angle: 80 });
  add("body", "shade", shade.strokes, shade.width, GREY, "under", 0.22);
  // the shadow on the floor: its own component, it stays on the ground when the guide jumps
  const floor = ink.dab(p, ...P(-0.2, 0.995), ...P(0.22, 0.995), h * 0.03);
  add("floor", "floor", floor.strokes, floor.width, "#d9d5ca", "shadow", 1);

  // the gloves, in a frame of their own, in units of the board
  const r = h * 0.064;
  const shapes = {
    open: [[-0.62, -0.78], [-0.88, -0.1], [-0.86, 0.42], [-0.78, 0.95], [-0.5, 1.08], [-0.36, 0.62], [-0.22, 1.22], [0.08, 1.28], [0.14, 0.66], [0.3, 1.1], [0.56, 1.05], [0.62, 0.45], [0.92, 0.48], [1.18, 0.22], [0.96, -0.12], [0.62, -0.78]],
    fist: [[-0.6, -0.78], [-0.95, -0.15], [-0.85, 0.55], [-0.35, 0.92], [0.3, 0.92], [0.85, 0.6], [1.12, 0.22], [0.95, -0.2], [0.6, -0.78]],
    point: [[-0.6, -0.78], [-0.95, -0.12], [-0.82, 0.55], [-0.3, 0.78], [-0.26, 1.78], [0.0, 1.98], [0.26, 1.8], [0.28, 0.84], [0.85, 0.6], [1.12, 0.22], [0.95, -0.2], [0.6, -0.78]],
  };
  // (across, along) in units of r becomes (x along the arm, y across toward the thumb)
  const G = (a, b) => [b * r, a * r];
  const gloves = {};
  for (const [kind, outline] of Object.entries(shapes)) {
    const lines = [ink.wobble(p, smoothOpen(outline.flatMap(([a, b]) => G(a, b))), { amp: 0.25 })];
    lines.push(ink.wobble(p, [...G(-0.72, -0.62), ...G(0, -0.5), ...G(0.72, -0.62)], { amp: 0.2 }));
    lines.push(ink.wobble(p, [...G(-0.66, -0.98), ...G(0, -0.9), ...G(0.66, -0.98)], { amp: 0.2 }));
    if (kind === "fist") lines.push(ink.wobble(p, [...G(-0.2, 0.3), ...G(0.45, 0.42)], { amp: 0.15 }));
    // and a paper fill, so a glove in front of the body hides the line behind it
    const fill = ink.fill(p, outline.flatMap(([a, b]) => G(a, b)), { nib: r * 0.5, angle: 0, edge: 0.05 });
    gloves[kind] = { lines, fill: fill.strokes, fillWidth: fill.width };
  }
  // the hose's own wobble: a fixed sideways jitter along it, so an arm drawn anew every frame keeps its hand
  const hose = Array.from({ length: 19 }, () => p.off(Math.min(1.4, 0.3 * W)));
  return {
    h,
    strokes,
    armsAt,
    eyes,
    shoulders: { front: P(0.165, 0.6), back: P(-0.165, 0.6) },
    arm: { width: W * 1.05, hose },
    gloves,
    gloveWidth: fine * 1.05,
    // what a pose's hand and bow are, in the figure's frame
    at: (u, v) => P(u, v),
  };
}

/** Catmull-Rom through the points, open at its ends (the glove's wrist). */
function smoothOpen(pts) {
  const n = pts.length / 2;
  const Q = (i) => [pts[2 * Math.max(0, Math.min(n - 1, i))], pts[2 * Math.max(0, Math.min(n - 1, i)) + 1]];
  const out = [pts[0], pts[1]];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = Q(i - 1);
    const [x1, y1] = Q(i);
    const [x2, y2] = Q(i + 1);
    const [x3, y3] = Q(i + 2);
    for (let j = 1; j <= 5; j++) {
      const t = j / 5;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3),
        0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3),
      );
    }
  }
  return out;
}
