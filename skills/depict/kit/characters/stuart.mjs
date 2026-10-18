// Stuart: created by Niki, age 7, who drew him in three pictures: in his
// green elf hat and mittens, waving with his arms out, and with a spider on
// his head for Halloween, his mouth open. A fuzzy pink brain with round
// glasses, rosy cheeks, a little "w" of a mouth, short salmon arms and legs and
// black shoes, drawn here as she drew him: his lines made even and his face
// given every feeling a guide needs. He is soft: he squashes deep when he
// lands, bounces, and wobbles on like a jelly. Drawn in his own frame: u
// across, v down from the top of his head (his feet at 0.99), both in units of
// his height.

const BRAIN = "#d27ad5"; // its pink, from her drawing
const LIGHT = "#ecb5ee";
const SHADE = "#a94fb0";
const LIMB = "#f2a690"; // its arms, hands and legs
const BLUSH = "#f2789b";
const ELF = "#4fa65d"; // the elf hat and the mittens
const BAND = "#c0392b";

/** Where its hands go in each pose, facing right, in units of its height: its arms are short and come out of its sides. */
const POSES = {
  rest: { front: { hand: [0.505, 0.665], bow: [0.51, 0.575], glove: "fist" }, back: { hand: [-0.505, 0.665], bow: [-0.51, 0.575], glove: "fist" } },
  present: { front: { hand: [0.66, 0.42], bow: [0.565, 0.5], glove: "point" }, back: { hand: [-0.505, 0.665], bow: [-0.51, 0.575], glove: "fist" } },
  wave: { front: { hand: [0.6, 0.27], bow: [0.62, 0.42], glove: "open" }, back: { hand: [-0.505, 0.665], bow: [-0.51, 0.575], glove: "fist" } },
  cheer: { front: { hand: [0.59, 0.27], bow: [0.63, 0.42], glove: "open" }, back: { hand: [-0.59, 0.27], bow: [-0.63, 0.42], glove: "open" } },
  shrug: { front: { hand: [0.665, 0.44], bow: [0.565, 0.54], glove: "open" }, back: { hand: [-0.665, 0.44], bow: [-0.565, 0.54], glove: "open" } },
  scratch: { front: { hand: [0.46, 0.24], bow: [0.6, 0.38], glove: "fist" }, back: { hand: [-0.505, 0.665], bow: [-0.51, 0.575], glove: "fist" } },
  salute: { front: { hand: [0.4, 0.31], bow: [0.585, 0.42], glove: "open" }, back: { hand: [-0.505, 0.665], bow: [-0.51, 0.575], glove: "fist" } },
  tip: { front: { hand: [0.42, 0.16], bow: [0.6, 0.34], glove: "fist" }, back: { hand: [-0.505, 0.665], bow: [-0.51, 0.575], glove: "fist" } },
  point: { front: { hand: [0.67, 0.46], bow: [0.565, 0.51], glove: "point" }, back: { hand: [-0.505, 0.665], bow: [-0.51, 0.575], glove: "fist" } },
  // its own: one finger pushing its glasses up by the rim, before it explains
  glasses: { front: { hand: [0.37, 0.39], bow: [0.56, 0.49], glove: "point" }, back: { hand: [-0.505, 0.665], bow: [-0.51, 0.575], glove: "fist" } },
};

/** The outline of its brain, as Niki drew it: round, about as wide as the whole figure is tall, three quarters of its height, a little flatter underneath and fuzzy all round, as (u, v) points. */
function outline(bumps = 30, fuzz = 0.017) {
  const pts = [];
  const n = bumps * 6;
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // a superellipse, a little fuller than an ellipse, its lower half a little flatter
    const e = 2.25;
    const k = Math.pow(Math.pow(Math.abs(c), e) + Math.pow(Math.abs(s), e), -1 / e);
    const bump = fuzz * (0.5 + 0.5 * Math.cos(bumps * a));
    pts.push([(0.46 * k + bump) * c, 0.375 + ((s > 0 ? 0.345 : 0.36) * k + bump) * s]);
  }
  return pts;
}

/** A mitten for every hand shape: a rounded mitt with its thumb, held open, closed or pointing. */
const MITTENS = {
  open: [[-0.62, -0.8], [-0.95, -0.15], [-0.98, 0.5], [-0.7, 1.05], [-0.1, 1.2], [0.45, 1.05], [0.62, 0.5], [0.95, 0.62], [1.22, 0.28], [0.98, -0.18], [0.62, -0.8]],
  fist: [[-0.62, -0.8], [-0.95, -0.12], [-0.9, 0.55], [-0.45, 0.92], [0.3, 0.92], [0.82, 0.6], [1.05, 0.2], [0.92, -0.22], [0.62, -0.8]],
  point: [[-0.62, -0.8], [-0.95, -0.12], [-0.82, 0.62], [-0.32, 1.5], [0.05, 1.72], [0.36, 1.48], [0.5, 0.82], [0.88, 0.58], [1.08, 0.2], [0.92, -0.22], [0.62, -0.8]],
};

export default {
  id: "stuart",
  name: "Stuart",
  about: "Stuart, a fuzzy pink brain with round glasses, rosy cheeks, a little w of a mouth, short salmon arms and legs and black shoes: soft, bouncy and curious. Created by Niki, age 7.",
  credit: { by: "Niki", age: 7, note: "Created by Niki, age 7, who drew him in three pictures: in his green elf hat and mittens, waving with his arms out, and with a spider on his head for Halloween." },
  // his size beside the marker: as wide as he is tall, he stands a little shorter so he takes about as much paper as he needs
  size: 0.76,
  measures: { back: 0.57, front: 0.57, reach: 0.84 },
  shoulders: { front: [0.445, 0.5], back: [-0.445, 0.5] },
  // its arms are limbs with a color of their own: an ink outline, salmon inside
  arm: { width: 2.7, fill: LIMB, fillWidth: 1.85 },
  reach: 0.21,
  tip: 0.1,
  capPivot: [0.02, 0.05],
  poses: POSES,
  // what it is made of: soft and elastic, so it squashes deep, stretches tall, bounces, and wobbles on like a jelly
  motion: { squash: 1.5, stretch: 1.4, freq: 10, damp: 3.2, jelly: 1, breath: 1.8, breathPeriod: 2.2 },
  personality: {
    traits: "curious, cheerful and a little nerdy: it thinks with its whole body, bounces when it is happy, wobbles like a jelly when it lands, and pushes its glasses up before it explains",
    intros: ["bounce", "jiggle", "hop", "wave", "spin"],
    outros: ["bounce", "wave", "cheer", "spin", "bow"],
    quirks: ["glasses"],
  },
  // shared costumes it can wear (its glasses are its own, and it has no neck for a scarf), each in its place on it
  wear: ["grad-cap", "hard-hat", "headphones", "party-hat", "crown", "beanie", "chef-hat", "bow-tie", "star", "hair-bow", "pencil-ear"],
  skins: ["plain"],
  anchors: {
    hat: { s: 1.45, du: 0.02, dv: 0.0 },
    neck: { s: 1.15, du: -0.012, dv: -0.03 },
    chest: { s: 1.1, du: 0.24, dv: -0.15 },
    hair: { s: 1.3, du: -0.19, dv: 0.07 },
    ear: { s: 1.1, du: 0.21, dv: 0.08 },
  },
  // its own costumes, from Niki's drawing
  costumes: {
    "elf-hat": {
      hat: true,
      top: 0.27,
      draw: ({ h, shape, line, ink, add, p, slot, fine, colors }) => {
        const H = slot("hat");
        // a green cone leaning a little, a white pompom on its tip, and a red band with black stripes at its brim
        shape("hat", [[-0.165, 0.045], [0.16, 0.035], [0.07, -0.12], [0.04, -0.2], [0.0, -0.215], [-0.05, -0.15]], ELF, { T: H, round: true, nib: h * 0.03 });
        const pom = Array.from({ length: 30 }, (_, k) => {
          const a = (2 * Math.PI * k) / 30;
          const r = 0.052 + 0.009 * Math.cos(9 * a);
          return [0.005 + r * Math.cos(a), -0.225 + r * Math.sin(a)];
        });
        shape("hat", pom, "#ffffff", { T: H, nib: h * 0.03, opacity: 1 });
        shape("hat", [[-0.18, 0.025], [0.175, 0.015], [0.18, 0.075], [-0.182, 0.085]], BAND, { T: H, nib: h * 0.02, angle: 0 });
        for (const u of [-0.13, -0.075, -0.02, 0.035, 0.09, 0.14]) line("hat", [[u, 0.03], [u + 0.006, 0.075]], fine * 0.9, colors.INK, H);
      },
    },
    mittens: { draw: () => {} }, // his hands become green mittens (see hands)
    // a spider sitting on his head, for Halloween: a round black body, two eyes and eight bent legs
    spider: {
      hat: true,
      top: 0.05,
      draw: ({ h, shape, line, slot, fine, colors, ink, add, p }) => {
        const H = slot("hat");
        const [cx, cy] = [0.15, 0.0];
        for (const s of [-1, 1])
          for (let k = 0; k < 4; k++)
            line("hat", [[cx + s * 0.035, cy - 0.016 + k * 0.012], [cx + s * 0.085, cy - 0.05 + k * 0.022], [cx + s * 0.108, cy + 0.022 + k * 0.02]], fine * 1.25, colors.INK, H);
        const body = Array.from({ length: 22 }, (_, k) => [cx + 0.052 * Math.cos((2 * Math.PI * k) / 22), cy + 0.047 * Math.sin((2 * Math.PI * k) / 22)]);
        shape("hat", body, colors.INK, { T: H, nib: h * 0.03, opacity: 1 });
        for (const u of [-0.016, 0.016]) {
          const eye = ink.dab(p, ...H(cx + u - 0.002, cy - 0.008), ...H(cx + u + 0.002, cy - 0.008), h * 0.026);
          add("hat", "color", eye.strokes, eye.width, colors.PAPER, "under", 1);
          const dot = ink.dab(p, ...H(cx + u, cy - 0.006), ...H(cx + u + 0.001, cy - 0.006), h * 0.011);
          add("hat", "outline", dot.strokes, dot.width, colors.INK);
        }
      },
    },
  },
  // the costumes of each of Niki's other drawings, worn together: what his presentations wear
  outfits: [
    { name: "winter", wear: ["elf-hat", "mittens"] },
    { name: "Halloween", wear: ["spider"] },
  ],
  hands: (wear = [], colors) =>
    wear.includes("mittens")
      ? { size: 0.056, shapes: MITTENS, cuffs: true, knuckle: false, fill: ELF }
      : { size: 0.05, shapes: HANDS, cuffs: false, knuckle: true, fill: LIMB },

  /** Its body, face, legs and shadow, stroke by stroke in the order the pen draws them when it first appears. */
  draw(k) {
    const { p, h, P, pts, W, fine, add, curve, shape, line, disc, ink, colors } = k;
    const { PAPER, INK } = colors;
    // its brain: the fuzzy outline first, then the folds on its top
    const edge = outline();
    const flat = edge.flatMap(([u, v]) => P(u, v));
    add("body", "outline", [ink.wobble(p, [...flat, flat[0], flat[1], flat[2], flat[3]], { amp: Math.min(0.9, 0.2 * W) })], W);
    for (const fold of [
      [[0.03, 0.105], [0.08, 0.075], [0.13, 0.1], [0.18, 0.072], [0.24, 0.095]],
      [[0.12, 0.165], [0.17, 0.14], [0.22, 0.163], [0.28, 0.142]],
      [[-0.33, 0.13], [-0.28, 0.1], [-0.23, 0.125], [-0.18, 0.1]],
    ])
      add("body", "fold", [ink.wobble(p, smoothLine(fold.flatMap(([u, v]) => P(u, v))), { amp: 0.3 })], fine * 0.95);

    // its round glasses, part of it: two big lenses far apart and the long bridge between them
    const lens = [[-0.245, 0.42], [0.245, 0.42]];
    const R = 0.112;
    for (const [u, v] of lens) add("body", "glasses", ink.ellipse(p, ...P(u, v), h * R, h * R, { overshoot: 0.05 }), W * 0.95);
    line("body", [[-0.133, 0.418], [0, 0.405], [0.133, 0.418]], W * 0.85);

    // its eyes, each its own component so it can blink: white inside the lens, a big pupil with two glints
    const eyes = [];
    lens.forEach(([u, v], i) => {
      const [cx, cy] = P(u, v);
      eyes.push([cx, cy]);
      // the white, one round dab that fills the lens (wide-eyed, it grows to the lens and no further)
      const white = ink.dab(p, cx - h * 0.002, cy, cx + h * 0.002, cy, h * 0.19);
      add(`eye${i}`, "white", white.strokes, white.width, PAPER, "under", 1);
      const [px, py] = [cx + (i ? -1 : 1) * h * 0.008, cy + h * 0.008];
      const pupil = ink.dab(p, px, py - h * 0.016, px, py + h * 0.016, h * 0.078);
      add(`pupil${i}`, "pupil", pupil.strokes, pupil.width, INK);
      const shine = ink.dab(p, px - h * 0.018, py - h * 0.02, px - h * 0.014, py - h * 0.016, h * 0.024);
      add(`pupil${i}`, "shine", shine.strokes, shine.width, PAPER);
      const spark = ink.dab(p, px + h * 0.016, py + h * 0.016, px + h * 0.017, py + h * 0.017, h * 0.011);
      add(`pupil${i}`, "shine", spark.strokes, spark.width, PAPER);
      // eyes closed in a happy squint: an arc that bows up, inside the lens
      add(`squint${i}`, "eye", [ink.wobble(p, curve([cx - h * 0.06, cy + h * 0.02], [cx, cy - h * 0.06], [cx + h * 0.06, cy + h * 0.02]), { amp: 0.3 })], h * 0.022);
    });
    // brows only when a feeling needs them, small and thin over the lenses (she drew none: a happy brain shows none)
    const brow = (u, lift, tilt) => ink.wobble(p, curve(P(u - 0.065, 0.282 - lift + tilt), P(u, 0.258 - lift * 1.3), P(u + 0.065, 0.282 - lift - tilt)), { amp: 0.35 });
    const browSets = {
      high: [brow(-0.245, 0.03, 0), brow(0.245, 0.03, 0)],
      worried: [brow(-0.245, 0.012, -0.02), brow(0.245, 0.012, 0.02)],
      quizzical: [brow(-0.245, 0.0, 0.008), brow(0.245, 0.034, -0.012)],
      sad: [brow(-0.245, 0.0, -0.022), brow(0.245, 0.0, 0.022)],
    };
    for (const [name, lines] of Object.entries(browSets)) add(`brows:${name}`, "brow", lines, h * 0.018);

    // its mouths, one per feeling: the little w she drew, and the open one when it is surprised
    const MV = 0.6;
    const w = (half, dip) => [...curve(P(-half, MV - 0.008), P(-half / 2, MV - 0.008 + dip), P(0, MV)), ...curve(P(0, MV), P(half / 2, MV - 0.008 + dip), P(half, MV - 0.008)).slice(2)];
    add("mouth:smile", "mouth", [ink.wobble(p, w(0.065, 0.06), { amp: 0.3 })], h * 0.02);
    add("mouth:grin", "mouth", [ink.wobble(p, w(0.085, 0.072), { amp: 0.3 })], h * 0.021);
    const open = disc(0, MV + 0.02, 0.05, 0.058, 22);
    const inside = ink.fill(p, open.flatMap(([u, v]) => P(u, v)), { nib: h * 0.03, angle: 8 });
    add("mouth:wow", "mouth", inside.strokes, inside.width, INK);
    const tooth = ink.dab(p, ...P(-0.014, MV - 0.022), ...P(0.014, MV - 0.022), h * 0.024);
    add("mouth:wow", "tooth", tooth.strokes, tooth.width, PAPER);
    const tongue = ink.dab(p, ...P(-0.016, MV + 0.05), ...P(0.018, MV + 0.05), h * 0.03);
    add("mouth:wow", "tongue", tongue.strokes, tongue.width, "#e46f5c");
    add("mouth:wavy", "mouth", [ink.wobble(p, pts([-0.06, MV + 0.008], [-0.03, MV - 0.006], [0, MV + 0.008], [0.03, MV - 0.006], [0.06, MV + 0.008]), { amp: 0.3 })], h * 0.019);
    add("mouth:side", "mouth", [ink.wobble(p, curve(P(-0.015, MV + 0.006), P(0.04, MV + 0.006), P(0.078, MV - 0.016)), { amp: 0.35 })], h * 0.019);
    add("mouth:frown", "mouth", [ink.wobble(p, curve(P(-0.06, MV + 0.024), P(0, MV - 0.016), P(0.06, MV + 0.024)), { amp: 0.35 })], h * 0.02);

    // its legs: short and thin, as she drew them, and its big round black shoes
    for (const [hip, toe] of [[-0.185, -1], [0.185, 1]]) {
      shape("body", [[hip - 0.026, 0.7], [hip + 0.026, 0.7], [hip + 0.03 + toe * 0.012, 0.9], [hip - 0.03 + toe * 0.012, 0.9]], LIMB, { nib: h * 0.02, angle: 80, line: W * 0.8, opacity: 1 });
      const sx = hip + toe * 0.03;
      const shoe = ink.dab(p, ...P(sx - 0.05, 0.935), ...P(sx + 0.05, 0.935), h * 0.105);
      add("body", "shoe", shoe.strokes, shoe.width, INK);
      const shine = ink.dab(p, ...P(sx + toe * 0.02 - 0.018, 0.912), ...P(sx + toe * 0.02 + 0.018, 0.91), h * 0.016);
      add("body", "shine", shine.strokes, shine.width, PAPER);
    }
    k.arms(); // the arms and hands are drawn here, between the legs and the color

    // the color last: its pink in marker, a gloss where the light falls and a shade along its underside
    // inside its fuzzy line: the marker's strokes end half a nib in, so its pink stays within the outline
    const fill = ink.fill(p, flat, { nib: h * 0.05, angle: -32, edge: 0.6 });
    add("body", "color", fill.strokes, fill.width, BRAIN, "under", 0.95);
    add("body", "gloss", [ink.wobble(p, curve(P(-0.36, 0.3), P(-0.33, 0.15), P(-0.2, 0.09)), { amp: 0.4 })], h * 0.03, LIGHT, "under", 0.85);
    add("body", "shade", [ink.wobble(p, curve(P(0.05, 0.69), P(0.3, 0.665), P(0.41, 0.53)), { amp: 0.4 })], h * 0.035, SHADE, "under", 0.4);
    // rosy cheeks, over its color, each with a sparkle
    for (const u of [-0.375, 0.375]) {
      const blush = ink.dab(p, ...P(u - 0.025, 0.535), ...P(u + 0.025, 0.535), h * 0.062);
      add("body", "cheek", blush.strokes, blush.width, BLUSH, "under", 0.75);
      const dot = ink.dab(p, ...P(u + 0.016, 0.524), ...P(u + 0.019, 0.524), h * 0.011);
      add("body", "shine", dot.strokes, dot.width, PAPER, "under", 0.95);
    }

    // the shadow on the floor: its own component, it stays on the ground when the guide jumps
    const floor = ink.dab(p, ...P(-0.38, 0.995), ...P(0.38, 0.995), h * 0.036);
    add("floor", "floor", floor.strokes, floor.width, "#d9d5ca", "shadow", 1);
    return { eyes };
  },
};

/** Its hands: small, round and salmon, the same three shapes as a glove (open, a fist, pointing), in units of the hand's size. */
const HANDS = {
  open: [[-0.62, -0.78], [-0.88, -0.1], [-0.86, 0.42], [-0.74, 0.92], [-0.48, 1.0], [-0.34, 0.6], [-0.2, 1.12], [0.08, 1.16], [0.14, 0.62], [0.3, 1.02], [0.54, 0.98], [0.6, 0.42], [0.9, 0.46], [1.12, 0.2], [0.94, -0.12], [0.62, -0.78]],
  fist: [[-0.6, -0.78], [-0.95, -0.15], [-0.85, 0.55], [-0.35, 0.92], [0.3, 0.92], [0.85, 0.6], [1.08, 0.22], [0.95, -0.2], [0.6, -0.78]],
  point: [[-0.6, -0.78], [-0.95, -0.12], [-0.82, 0.55], [-0.3, 0.78], [-0.26, 1.62], [0.0, 1.8], [0.26, 1.64], [0.28, 0.84], [0.85, 0.6], [1.08, 0.22], [0.95, -0.2], [0.6, -0.78]],
};

/** A smooth line through the points (a fold of the brain). */
function smoothLine(pts) {
  const out = [];
  const n = pts.length / 2;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0, x1, y1] = [pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3]];
    for (let j = 0; j < 6; j++) {
      const t = j / 6;
      out.push(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * (i % 2 ? 1 : -1) * 0.6);
    }
  }
  out.push(pts[pts.length - 2], pts[pts.length - 1]);
  return out;
}
