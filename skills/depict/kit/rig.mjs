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
import { smooth } from "./geom.mjs";

const PAPER = "#fbfaf7";
const INK = "#1b1b19";
const GREY = "#8f8f88";
const DARK = "#34332f";
const STEEL = "#a9a59b";
const YELLOW = "#f2c94c";
const SAND = "#e2c48a";
const PINK = "#e98aa6";
const BLUE = "#8db4d4";
const GREEN = "#9cc9a3";

/**
 * What the guide can wear, hold and be made of, and the ways it arrives and
 * leaves. The script dresses it for the board's subject; the seed picks how it
 * arrives and leaves when the script does not say.
 */
export const HATS = ["grad-cap", "hard-hat", "headphones", "party-hat", "crown", "beanie", "chef-hat"];
export const WEAR = [...HATS, "glasses", "bow-tie", "scarf", "star", "hair-bow", "pencil-ear"];
export const HOLD = ["pointer", "book", "pencil", "ruler", "coin", "clock", "magnifier", "flag", "balloon", "wrench", "calculator", "lightbulb"];
export const SKINS = ["plain", "blue", "green", "sand", "pink", "stripes", "dots"];
export const INTROS = ["wave", "hop", "spin", "bow", "tip", "jump"];
export const OUTROS = ["wave", "bow", "cheer", "salute", "tip", "spin"];
const SKIN_TINTS = { blue: "#d3e3f0", green: "#d6ead8", sand: "#f4e6c4", pink: "#f5d9df" };
/** How far above its cap a hat reaches, in units of the guide's height: its spot keeps that paper free too. */
const HAT_TOP = { "grad-cap": 0.09, "hard-hat": 0.09, headphones: 0.07, "party-hat": 0.28, crown: 0.1, beanie: 0.11, "chef-hat": 0.26, "hair-bow": 0.04, "pencil-ear": 0.07 };
export const reachAbove = (cast = {}) => Math.max(0, ...(cast.wear ?? []).map((w) => HAT_TOP[w] ?? 0));

/** The feelings the guide shows, and the brows, mouth and eyes each one is made of. */
export const FEELINGS = {
  happy: { brows: "up", mouth: "smile", eyes: "open" },
  excited: { brows: "high", mouth: "smile", eyes: "open" },
  surprised: { brows: "high", mouth: "wow", eyes: "wide" },
  worried: { brows: "worried", mouth: "wavy", eyes: "open" },
  thinking: { brows: "quizzical", mouth: "side", eyes: "open", look: [0.4, -1] },
  proud: { brows: "up", mouth: "grin", eyes: "squint" },
  wink: { brows: "up", mouth: "grin", eyes: "wink" },
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
  salute: { front: { hand: [0.2, 0.25], bow: [0.44, 0.46], glove: "open" }, back: { hand: [-0.235, 0.715], bow: [-0.36, 0.6], glove: "fist" } },
  tip: { front: { hand: [0.07, 0.0], bow: [0.4, 0.3], glove: "fist" }, back: { hand: [-0.235, 0.715], bow: [-0.36, 0.6], glove: "fist" } },
  point: { front: { hand: [0.44, 0.5], bow: [0.32, 0.66], glove: "point" }, back: { hand: [-0.235, 0.715], bow: [-0.36, 0.6], glove: "fist" } },
};
export const ACTS = ["point", "wave", "cheer", "shrug", "scratch", "present", "rest"];

/** The guide's components, `h` tall, drawn with the pen `p` in the board's accent, dressed as `cast` says ({ wear, hold, skin }). */
export function rig(p, h, accent, cast = {}) {
  const { wear = [], hold = null, skin = "plain" } = cast;
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
  /** A closed shape in the figure's frame (or another), colored in under its outline. */
  const shape = (part, uv, color, { T = P, nib = h * 0.03, angle = -35, line = fine, opacity = 0.95, round = false } = {}) => {
    let flat = uv.flatMap(([u, v]) => T(u, v));
    if (round) flat = smooth([...flat, flat[0], flat[1]], 3);
    if (color) {
      const f = ink.fill(p, flat, { nib, angle, edge: 0.12 });
      add(part, "color", f.strokes, f.width, color, "under", opacity);
    }
    if (line) add(part, "outline", [ink.wobble(p, [...flat, flat[0], flat[1]], { amp: Math.min(0.8, 0.2 * line) })], line);
  };
  /** An open line in the figure's frame (or another). */
  const line = (part, uv, width, color = INK, T = P) => add(part, "outline", [ink.wobble(p, uv.flatMap(([u, v]) => T(u, v)), { amp: 0.35 })], width, color);
  const disc = (u, v, ru, rv = ru, n = 22) => Array.from({ length: n }, (_, k) => [u + Math.cos((2 * Math.PI * k) / n) * ru, v + Math.sin((2 * Math.PI * k) / n) * rv]);

  // its silhouette in paper (or its own color), under everything, so it hides what it passes in front of
  const solid = ink.fill(p, barrel.flatMap(([u, v]) => P(u, v)), { nib: h * 0.08, angle: 0, edge: 0.05 });
  add("body", "paper", solid.strokes, solid.width, SKIN_TINTS[skin] ?? PAPER, "under", 1);
  add("body", "outline", [ink.wobble(p, pts([-0.163, 0.276], [0.163, 0.276]), { amp: 0.4 })], fine); // its top, under the cap
  // the cap (its own component: it can be lifted and tipped), its rim and the clip; the barrel under it
  const capSolid = ink.fill(p, cap.flatMap(([u, v]) => P(u, v)), { nib: h * 0.06, angle: 0, edge: 0.05 });
  add("cap", "paper", capSolid.strokes, capSolid.width, PAPER, "under", 1);
  add("cap", "outline", [closed(cap)], W);
  add("cap", "outline", [ink.wobble(p, curve(P(-0.185, 0.222), P(0, 0.246), P(0.185, 0.222)), { amp: 0.5 })], fine);
  add("cap", "outline", [ink.wobble(p, pts([-0.1, 0.03], [-0.2, 0.045], [-0.214, 0.09], [-0.218, 0.262], [-0.203, 0.292], [-0.188, 0.268], [-0.186, 0.11]), { amp: 0.45 })], fine);
  add("body", "outline", [ink.wobble(p, pts(...barrel.slice(6, 22)), { amp: Math.min(1.2, 0.25 * W) })], W);

  // the eyes, each its own component so it can blink; the pupils (with their glints) move inside them
  const eyes = [];
  for (const [i, ex] of [-0.052, 0.072].entries()) {
    const [cx, cy] = P(ex, 0.415);
    eyes.push([cx, cy]);
    const white = ink.fill(p, disc(cx, cy, h * 0.05, h * 0.064).flat(), { nib: h * 0.03, angle: 0, edge: 0.05 });
    add(`eye${i}`, "white", white.strokes, white.width, PAPER, "under", 1);
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
  add("cap", "color", fillCap.strokes, fillCap.width, accent, "under", 0.95);
  const clipFill = ink.fill(p, pts([-0.212, 0.09], [-0.192, 0.09], [-0.19, 0.27], [-0.21, 0.27]), { nib: h * 0.022, angle: 80, edge: 0.1 });
  add("cap", "color", clipFill.strokes, clipFill.width, GREY, "under", 0.5);
  add("cap", "gloss", [ink.wobble(p, curve(P(0.045, 0.045), P(0.115, 0.04), P(0.145, 0.105)), { amp: 0.3 })], h * 0.016, PAPER);
  const shade = ink.fill(p, pts([-0.15, 0.3], [-0.105, 0.3], [-0.1, 0.84], [-0.15, 0.82]), { nib: h * 0.04, angle: 80 });
  add("body", "shade", shade.strokes, shade.width, GREY, "under", 0.22);
  // its skin: bands or dots in the accent on the barrel, below the face
  if (skin === "stripes") for (const [v0, v1] of [[0.69, 0.725], [0.765, 0.8]]) shape("body", [[-0.163, v0], [0.163, v0 - 0.004], [0.163, v1 - 0.004], [-0.163, v1]], accent, { nib: h * 0.02, angle: 0, line: 0, opacity: 0.85 });
  if (skin === "dots") for (const [u, v] of [[-0.1, 0.7], [0.07, 0.69], [0.112, 0.8], [-0.03, 0.785], [-0.118, 0.83]]) {
    const d = ink.dab(p, ...P(u - 0.007, v), ...P(u + 0.007, v), h * 0.032);
    add("body", "color", d.strokes, d.width, accent, "under", 0.8);
  }
  // the shadow on the floor: its own component, it stays on the ground when the guide jumps
  const floor = ink.dab(p, ...P(-0.2, 0.995), ...P(0.22, 0.995), h * 0.03);
  add("floor", "floor", floor.strokes, floor.width, "#d9d5ca", "shadow", 1);

  dress(wear, hold, { h, P, shape, line, disc, add, eyes, accent, fine, W, p });

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
    // the cap tips about the middle of its rim; what it holds sits in its back hand (a pointer, in its front one)
    capPivot: P(0, 0.272),
    hold,
  };
}

/**
 * The guide dressed for the board: what it wears on its cap ("hat", tipped
 * with the cap) and on its body ("wear"), and what it holds: upright in its
 * back hand ("held", in a frame whose origin is the hand), or, a pointer, in
 * its front fist ("pointer", x along the stick from the fist): along the arm
 * when it points, held up and out otherwise.
 */
function dress(wear, hold, { h, P, shape, line, disc, add, eyes, accent, fine, W, p }) {
  const has = (w) => wear.includes(w);
  const lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const dot = (part, T, u, v, d, color) => {
    const q = ink.dab(p, ...T(u - d * 0.1, v), ...T(u + d * 0.1, v), h * d);
    add(part, "color", q.strokes, q.width, color, "under", 0.95);
  };
  if (has("grad-cap")) {
    shape("hat", [[-0.15, 0.012], [0.15, 0.012], [0.157, 0.095], [-0.157, 0.095]], DARK, { angle: 0 });
    shape("hat", [[-0.29, -0.012], [0, -0.085], [0.29, -0.012], [0, 0.058]], DARK, { angle: -20 });
    line("hat", [[0, -0.014], [0.2, 0.002], [0.215, 0.1]], fine);
    dot("hat", P, 0.215, 0.125, 0.04, YELLOW);
  }
  if (has("hard-hat")) {
    shape("hat", disc(0, 0.075, 0.2, 0.16, 24).filter(([, v]) => v <= 0.0751), YELLOW, { nib: h * 0.04 });
    shape("hat", [[-0.258, 0.055], [0.258, 0.055], [0.252, 0.1], [-0.252, 0.1]], YELLOW, { nib: h * 0.02, angle: 0 });
    line("hat", [[0, -0.083], [0, 0.055]], fine);
    line("hat", [[-0.075, -0.065], [-0.085, 0.055]], fine);
    line("hat", [[0.075, -0.065], [0.085, 0.055]], fine);
  }
  if (has("headphones")) {
    add("hat", "outline", [ink.wobble(p, [P(-0.205, 0.17), P(-0.2, -0.03), P(0, -0.08), P(0.2, -0.03), P(0.205, 0.17)].flat(), { amp: 0.4 })], W * 1.3);
    for (const s of [-1, 1]) shape("hat", [[s * 0.172, 0.095], [s * 0.25, 0.105], [s * 0.255, 0.255], [s * 0.172, 0.27]], DARK, { round: true, nib: h * 0.025 });
  }
  if (has("party-hat")) {
    const L = [-0.115, 0.04];
    const R = [0.115, 0.04];
    const tip = [0.012, -0.275];
    shape("hat", [L, R, tip], YELLOW, { nib: h * 0.025 });
    for (const [f0, f1] of [[0.18, 0.32], [0.5, 0.64]]) shape("hat", [lerp(L, tip, f0), lerp(R, tip, f0), lerp(R, tip, f1), lerp(L, tip, f1)], accent, { nib: h * 0.018, angle: 0, line: 0, opacity: 0.85 });
    dot("hat", P, tip[0], tip[1], 0.055, accent);
  }
  if (has("crown")) {
    shape("hat", [[-0.175, 0.075], [-0.175, -0.05], [-0.09, 0.008], [0, -0.1], [0.09, 0.008], [0.175, -0.05], [0.175, 0.075]], YELLOW, { nib: h * 0.025 });
    line("hat", [[-0.175, 0.035], [0.175, 0.035]], fine);
    for (const [u, v] of [[-0.175, -0.05], [0, -0.1], [0.175, -0.05]]) dot("hat", P, u, v, 0.034, accent);
  }
  if (has("beanie")) {
    shape("hat", disc(0, 0.12, 0.205, 0.2, 26).filter(([, v]) => v <= 0.1201), BLUE, { nib: h * 0.04 });
    shape("hat", [[-0.215, 0.1], [0.215, 0.1], [0.215, 0.18], [-0.215, 0.18]], BLUE, { nib: h * 0.025, angle: 0 });
    for (const u of [-0.16, -0.08, 0, 0.08, 0.16]) line("hat", [[u, 0.112], [u, 0.17]], fine * 0.8);
    dot("hat", P, 0, -0.095, 0.075, accent);
  }
  if (has("chef-hat")) {
    shape("hat", [[-0.15, 0.02], [-0.24, -0.06], [-0.2, -0.19], [-0.07, -0.25], [0.06, -0.255], [0.19, -0.2], [0.245, -0.07], [0.15, 0.02]], "#ffffff", { round: true, nib: h * 0.04, opacity: 1 });
    shape("hat", [[-0.15, 0.01], [0.15, 0.01], [0.15, 0.1], [-0.15, 0.1]], "#ffffff", { angle: 0, opacity: 1 });
    line("hat", [[-0.06, -0.06], [-0.05, 0.0]], fine * 0.8);
    line("hat", [[0.06, -0.07], [0.055, 0.0]], fine * 0.8);
  }
  if (has("hair-bow")) {
    // on the far side of the cap from a pencil behind its ear
    shape("hat", [[-0.11, 0.03], [-0.175, -0.035], [-0.205, 0.0], [-0.2, 0.07], [-0.17, 0.095]], PINK, { nib: h * 0.018, round: true });
    shape("hat", [[-0.11, 0.03], [-0.045, -0.035], [-0.015, 0.0], [-0.02, 0.07], [-0.05, 0.095]], PINK, { nib: h * 0.018, round: true });
    dot("hat", P, -0.11, 0.03, 0.04, accent);
  }
  if (has("pencil-ear")) {
    shape("hat", [[0.142, -0.02], [0.176, -0.034], [0.272, 0.19], [0.238, 0.204]], YELLOW, { nib: h * 0.016, angle: 20 });
    shape("hat", [[0.238, 0.204], [0.272, 0.19], [0.268, 0.25]], SAND, { nib: h * 0.012, angle: 20 });
    shape("hat", [[0.142, -0.02], [0.176, -0.034], [0.164, -0.066], [0.13, -0.052]], PINK, { nib: h * 0.012, angle: 20 });
  }
  if (has("glasses")) {
    for (const [cx, cy] of eyes) add("wear", "outline", ink.ellipse(p, cx, cy, h * 0.062, h * 0.077, { overshoot: 0.04 }), h * 0.014);
    const [a, b] = eyes;
    add("wear", "outline", [ink.wobble(p, [a[0] + h * 0.06, a[1] - h * 0.012, (a[0] + b[0]) / 2, a[1] - h * 0.026, b[0] - h * 0.06, b[1] - h * 0.012], { amp: 0.3 })], h * 0.013);
    add("wear", "outline", [ink.wobble(p, [a[0] - h * 0.062, a[1] - h * 0.01, ...P(-0.165, 0.395)], { amp: 0.3 })], h * 0.012);
    add("wear", "outline", [ink.wobble(p, [b[0] + h * 0.062, b[1] - h * 0.01, ...P(0.165, 0.395)], { amp: 0.3 })], h * 0.012);
  }
  if (has("bow-tie")) {
    shape("wear", [[0, 0.655], [-0.088, 0.618], [-0.093, 0.716], [0, 0.682]], accent, { nib: h * 0.02 });
    shape("wear", [[0.022, 0.655], [0.11, 0.618], [0.115, 0.716], [0.022, 0.682]], accent, { nib: h * 0.02 });
    shape("wear", [[-0.006, 0.646], [0.028, 0.646], [0.03, 0.69], [-0.008, 0.69]], accent, { nib: h * 0.014, angle: 0 });
  }
  if (has("scarf")) {
    shape("wear", [[-0.174, 0.612], [0.174, 0.598], [0.178, 0.674], [-0.174, 0.69]], accent, { nib: h * 0.024, angle: 0 });
    shape("wear", [[0.048, 0.664], [0.108, 0.658], [0.142, 0.842], [0.086, 0.852]], accent, { nib: h * 0.02, angle: 75 });
    for (const v of [0.72, 0.78]) line("wear", [[0.06 + (v - 0.66) * 0.18, v], [0.118 + (v - 0.66) * 0.18, v - 0.005]], fine * 0.9, PAPER);
    for (const f of [0.0, 0.5, 1.0]) line("wear", [lerp([0.088, 0.852], [0.142, 0.842], f), lerp([0.09, 0.878], [0.146, 0.868], f)], fine * 0.8);
  }
  if (has("star")) {
    const star = Array.from({ length: 10 }, (_, k) => {
      const a = -Math.PI / 2 + (Math.PI * k) / 5;
      const rr = k % 2 ? 0.022 : 0.052;
      return [0.08 + Math.cos(a) * rr, 0.76 + Math.sin(a) * rr];
    });
    shape("wear", star, YELLOW, { nib: h * 0.014 });
  }
  if (!hold) return;
  if (hold === "pointer") {
    // a teacher's pointer in its front fist, along the arm
    const T = (x, y) => [x * h, y * h];
    shape("pointer", [[0.0, -0.012], [0.27, -0.006], [0.27, 0.006], [0.0, 0.012]], SAND, { T, nib: h * 0.012, angle: 0 });
    dot("pointer", T, 0.268, 0, 0.022, INK);
    return;
  }
  // anything else upright in its back hand: the origin is the hand, y down
  const T = (u, v) => [u * h, v * h];
  const S = (uv, color, o = {}) => shape("held", uv, color, { T, nib: h * 0.022, ...o });
  const L = (uv, width = fine, color = INK) => line("held", uv, width, color, T);
  ({
    book: () => {
      S([[-0.075, -0.275], [0.068, -0.275], [0.068, -0.03], [-0.075, -0.03]], accent, { angle: 0 });
      L([[-0.054, -0.272], [-0.054, -0.034]]);
      S([[-0.028, -0.225], [0.042, -0.225], [0.042, -0.185], [-0.028, -0.185]], PAPER, { angle: 0, nib: h * 0.012 });
    },
    pencil: () => {
      S([[-0.022, -0.26], [0.022, -0.26], [0.022, 0.07], [-0.022, 0.07]], YELLOW, { angle: 0, nib: h * 0.016 });
      S([[-0.022, -0.26], [0.022, -0.26], [0, -0.33]], SAND, { nib: h * 0.012 });
      dot("held", T, 0, -0.322, 0.018, INK);
      S([[-0.024, 0.07], [0.024, 0.07], [0.024, 0.1], [-0.024, 0.1]], STEEL, { angle: 0, nib: h * 0.01 });
      S([[-0.022, 0.1], [0.022, 0.1], [0.02, 0.135], [-0.02, 0.135]], PINK, { angle: 0, nib: h * 0.012 });
      L([[-0.007, -0.25], [-0.007, 0.064]], fine * 0.7);
    },
    ruler: () => {
      S([[-0.032, -0.38], [0.032, -0.38], [0.032, 0.08], [-0.032, 0.08]], SAND, { angle: 0, nib: h * 0.02 });
      for (let k = 0; k <= 11; k++) L([[0.032, -0.36 + k * 0.038], [k % 2 ? 0.014 : -0.004, -0.36 + k * 0.038]], fine * 0.7);
    },
    coin: () => {
      S(disc(0.02, -0.095, 0.066), YELLOW, { nib: h * 0.03 });
      add("held", "outline", ink.ellipse(p, ...T(0.02, -0.095), h * 0.046, h * 0.046, { overshoot: 0.04 }), fine * 0.8);
      dot("held", T, -0.005, -0.125, 0.016, PAPER);
    },
    clock: () => {
      for (const s of [-1, 1]) S(disc(s * 0.062, -0.238, 0.034, 0.03), accent, { nib: h * 0.016 });
      S(disc(0, -0.155, 0.092), PAPER, { nib: h * 0.03, line: W * 0.8 });
      L([[0, -0.155], [0, -0.215]], fine * 1.1);
      L([[0, -0.155], [0.045, -0.155]], fine * 1.1);
      for (const [u, v] of [[0, -0.235], [0.08, -0.155], [0, -0.075], [-0.08, -0.155]]) dot("held", T, u, v, 0.012, INK);
      L([[-0.05, -0.08], [-0.066, -0.048]], fine);
      L([[0.05, -0.08], [0.066, -0.048]], fine);
    },
    magnifier: () => {
      L([[0, -0.11], [0, 0.065]], h * 0.034, DARK);
      S(disc(0, -0.19, 0.082), BLUE, { nib: h * 0.03, line: W, opacity: 0.35 });
      add("held", "outline", [ink.wobble(p, [...T(-0.04, -0.235), ...T(-0.055, -0.2)], { amp: 0.2 })], fine, PAPER);
    },
    flag: () => {
      L([[0, 0.07], [0, -0.37]], fine * 1.3);
      S([[0, -0.37], [0.17, -0.318], [0, -0.265]], accent, { nib: h * 0.018 });
    },
    balloon: () => {
      L([[0, 0], [0.025, -0.12], [-0.01, -0.24], [0.02, -0.36]], fine * 0.8);
      S(disc(0.02, -0.47, 0.086, 0.106, 26), accent, { nib: h * 0.035, line: fine * 1.2 });
      S([[0.008, -0.362], [0.032, -0.362], [0.02, -0.38]], accent, { nib: h * 0.01 });
      dot("held", T, -0.012, -0.515, 0.022, PAPER);
    },
    wrench: () => {
      S([[-0.019, -0.2], [0.019, -0.2], [0.021, 0.065], [-0.021, 0.065]], STEEL, { angle: 0, nib: h * 0.014 });
      S([[-0.055, -0.205], [-0.062, -0.29], [-0.026, -0.322], [-0.02, -0.268], [0.02, -0.268], [0.026, -0.322], [0.062, -0.29], [0.055, -0.205]], STEEL, { nib: h * 0.016 });
    },
    calculator: () => {
      S([[-0.072, -0.275], [0.072, -0.275], [0.072, -0.02], [-0.072, -0.02]], "#c4c0b5", { angle: 0, nib: h * 0.03 });
      S([[-0.052, -0.252], [0.052, -0.252], [0.052, -0.198], [-0.052, -0.198]], GREEN, { angle: 0, nib: h * 0.014 });
      for (const v of [-0.165, -0.115, -0.065]) for (const u of [-0.042, 0, 0.042]) S([[u - 0.013, v - 0.013], [u + 0.013, v - 0.013], [u + 0.013, v + 0.013], [u - 0.013, v + 0.013]], PAPER, { angle: 0, nib: h * 0.008, line: fine * 0.7 });
    },
    lightbulb: () => {
      S(disc(0, -0.205, 0.078), YELLOW, { nib: h * 0.03 });
      S([[-0.034, -0.138], [0.034, -0.138], [0.03, -0.085], [-0.03, -0.085]], STEEL, { angle: 0, nib: h * 0.012 });
      for (const v of [-0.12, -0.103]) L([[-0.032, v], [0.032, v]], fine * 0.7);
      L([[-0.018, -0.17], [-0.008, -0.215], [0.008, -0.19], [0.018, -0.215]], fine * 0.8);
      for (const [a, b] of [[[0.098, -0.26], [0.13, -0.282]], [[-0.098, -0.26], [-0.13, -0.282]], [[0, -0.3], [0, -0.338]]]) L([a, b], fine * 1.1, accent);
    },
  })[hold]?.();
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
