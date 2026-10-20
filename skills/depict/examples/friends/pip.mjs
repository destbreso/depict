// Pip: a little rain cloud in yellow rain boots, a friend of Stuart's. It is
// drawn to Stuart's body (`contract: "stuart"`): the same height, the same
// paper taken, its arms from the same shoulders, as long, and its hands where
// his go in every pose. That body is Stuart's alone to set, so this module
// leaves it out and draws only Pip's look: its puffy outline, its face, its
// legs and boots, its colors, and what it is made of. So Pip can present any
// board made for Stuart, cast in as the board plays, and Stuart any made for
// Pip. Drawn in its own frame: u across, v down from the top of its head (its
// feet at 0.99), both in units of its height.

const CLOUD = "#d3ebfc"; // its blue, a summer sky's cloud
const LIGHT = "#ffffff";
const SHADE = "#8fbfe6";
const LIMB = "#a9d0ee"; // its arms, hands and legs, a shade deeper than its body
const BOOT = "#f2c94c";
const BOOT_DARK = "#c99a1c";
const BLUSH = "#f2789b";

/** The outline of a cloud: round, puffs all along its top and sides, a softer edge underneath, as (u, v) points; it keeps inside Stuart's outline. */
function outline() {
  const pts = [];
  const n = 240;
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const e = 2.2;
    const k = Math.pow(Math.pow(Math.abs(c), e) + Math.pow(Math.abs(s), e), -1 / e);
    // puffs: round bumps, big on its top, smaller toward its underside
    const puff = Math.abs(Math.cos(4.5 * a));
    const up = s < 0 ? 1 : 0.35;
    const bump = 0.042 * up * Math.sqrt(puff);
    pts.push([(0.435 * k + bump) * c, 0.38 + ((s > 0 ? 0.33 : 0.34) * k + bump) * s]);
  }
  return pts;
}

/** Its hands: small, round and cloud blue, the same three shapes as a glove (open, a fist, pointing), in units of the hand's size. */
const HANDS = {
  open: [[-0.62, -0.78], [-0.88, -0.1], [-0.86, 0.42], [-0.74, 0.92], [-0.48, 1.0], [-0.34, 0.6], [-0.2, 1.12], [0.08, 1.16], [0.14, 0.62], [0.3, 1.02], [0.54, 0.98], [0.6, 0.42], [0.9, 0.46], [1.12, 0.2], [0.94, -0.12], [0.62, -0.78]],
  fist: [[-0.6, -0.78], [-0.95, -0.15], [-0.85, 0.55], [-0.35, 0.92], [0.3, 0.92], [0.85, 0.6], [1.08, 0.22], [0.95, -0.2], [0.6, -0.78]],
  point: [[-0.6, -0.78], [-0.95, -0.12], [-0.82, 0.55], [-0.3, 0.78], [-0.26, 1.62], [0.0, 1.8], [0.26, 1.64], [0.28, 0.84], [0.85, 0.6], [1.08, 0.22], [0.95, -0.2], [0.6, -0.78]],
};

export default {
  id: "pip",
  name: "Pip",
  about: "Pip, a little rain cloud in yellow rain boots: soft, airy and a little dreamy. A friend of Stuart's, drawn to his body, so it can present any board made for him.",
  // Stuart's body: its size, the paper it takes, its shoulders, its reach and its poses are his (kit/characters/index.mjs, CONTRACT)
  contract: "stuart",
  arm: { width: 2.7, fill: LIMB, fillWidth: 1.85 },
  capPivot: [0.0, 0.05],
  // what it is made of: a cloud, softer and slower than a brain: it squashes gently, drifts as it settles and breathes deep
  motion: { squash: 1.2, stretch: 1.25, freq: 6.5, damp: 2.4, jelly: 0.7, breath: 2.4, breathPeriod: 3.4 },
  personality: {
    traits: "gentle, dreamy and a little shy: it settles slowly after a hop, sways like a cloud on the wind, and takes deep slow breaths while it waits",
    intros: ["hop", "wave", "spin", "bounce"],
    outros: ["wave", "bow", "spin", "cheer"],
    // its own: in a quiet moment it rests its cheek on its hand and daydreams
    quirks: ["dream"],
  },
  // the pose of its quirk, beside Stuart's own poses, which it shares (a pose it gives joins them)
  poses: {
    dream: { front: { hand: [0.3, 0.56], bow: [0.56, 0.63], glove: "open" }, back: { hand: [-0.505, 0.665], bow: [-0.51, 0.575], glove: "fist" } },
  },
  // the shared costumes it can wear, in the places Stuart has for them (its head is where his is); it has no neck for a scarf
  wear: ["grad-cap", "hard-hat", "headphones", "party-hat", "crown", "beanie", "chef-hat", "glasses", "bow-tie", "star", "pencil-ear"],
  skins: ["plain"],
  // its own costume: a little bat that sits on its head, for Halloween
  costumes: {
    bat: {
      hat: true,
      top: 0.08,
      draw: ({ h, shape, slot, colors, ink, add, p, disc }) => {
        const H = slot("hat");
        const [cx, cy] = [-0.13, -0.012];
        // its wings, each scalloped along its lower edge, then its round body with two ears, and its eyes
        for (const s of [-1, 1])
          shape("hat", [[cx + s * 0.025, cy - 0.012], [cx + s * 0.07, cy - 0.06], [cx + s * 0.112, cy - 0.034], [cx + s * 0.098, cy - 0.008], [cx + s * 0.08, cy + 0.002], [cx + s * 0.062, cy - 0.006], [cx + s * 0.042, cy + 0.01]], colors.INK, { T: H, nib: h * 0.02, opacity: 1 });
        shape("hat", disc(cx, cy, 0.034, 0.03, 20), colors.INK, { T: H, nib: h * 0.024, opacity: 1 });
        for (const s of [-1, 1]) shape("hat", [[cx + s * 0.008, cy - 0.024], [cx + s * 0.03, cy - 0.022], [cx + s * 0.022, cy - 0.048]], colors.INK, { T: H, nib: h * 0.01, opacity: 1 });
        for (const s of [-1, 1]) {
          const eye = ink.dab(p, ...H(cx + s * 0.012 - 0.002, cy - 0.006), ...H(cx + s * 0.012 + 0.002, cy - 0.006), h * 0.016);
          add("hat", "color", eye.strokes, eye.width, colors.PAPER, "under", 1);
        }
      },
    },
  },
  // the costumes of each occasion, worn together, by the names Stuart's have: a board that dresses Stuart for winter
  // or Halloween dresses Pip in its own
  outfits: [
    { name: "winter", wear: ["beanie"] },
    { name: "Halloween", wear: ["bat"] },
  ],
  hands: () => ({ size: 0.05, shapes: HANDS, cuffs: false, knuckle: true, fill: LIMB }),

  /** Its body, face, legs and shadow, stroke by stroke in the order the pen draws them when it first appears. */
  draw(k) {
    const { p, h, P, pts, W, fine, add, curve, shape, disc, ink, colors } = k;
    const { PAPER, INK } = colors;
    // the cloud: its puffy outline first
    const edge = outline();
    const flat = edge.flatMap(([u, v]) => P(u, v));
    add("body", "outline", [ink.wobble(p, [...flat, flat[0], flat[1], flat[2], flat[3]], { amp: Math.min(0.9, 0.2 * W) })], W);

    // its eyes, each its own component so it can blink: a white oval with its outline, a big pupil with two glints
    const eyes = [];
    for (const [i, u] of [[0, -0.155], [1, 0.155]]) {
      const [cx, cy] = P(u, 0.4);
      eyes.push([cx, cy]);
      const white = ink.dab(p, cx, cy - h * 0.012, cx, cy + h * 0.012, h * 0.115);
      add(`eye${i}`, "white", white.strokes, white.width, PAPER, "under", 1);
      add(`eye${i}`, "eye", ink.ellipse(p, cx, cy, h * 0.058, h * 0.07, { overshoot: 0.05 }), fine * 1.1);
      const [px, py] = [cx + (i ? -1 : 1) * h * 0.006, cy + h * 0.01];
      const pupil = ink.dab(p, px, py - h * 0.014, px, py + h * 0.014, h * 0.068);
      add(`pupil${i}`, "pupil", pupil.strokes, pupil.width, INK);
      const shine = ink.dab(p, px - h * 0.016, py - h * 0.018, px - h * 0.012, py - h * 0.014, h * 0.022);
      add(`pupil${i}`, "shine", shine.strokes, shine.width, PAPER);
      const spark = ink.dab(p, px + h * 0.014, py + h * 0.014, px + h * 0.015, py + h * 0.015, h * 0.01);
      add(`pupil${i}`, "shine", spark.strokes, spark.width, PAPER);
      // eyes closed in a happy squint: an arc that bows up
      add(`squint${i}`, "eye", [ink.wobble(p, curve([cx - h * 0.05, cy + h * 0.018], [cx, cy - h * 0.05], [cx + h * 0.05, cy + h * 0.018]), { amp: 0.3 })], h * 0.02);
    }
    // brows only when a feeling needs them, small and thin over the eyes
    const brow = (u, lift, tilt) => ink.wobble(p, curve(P(u - 0.055, 0.29 - lift + tilt), P(u, 0.27 - lift * 1.3), P(u + 0.055, 0.29 - lift - tilt)), { amp: 0.35 });
    const browSets = {
      high: [brow(-0.155, 0.03, 0), brow(0.155, 0.03, 0)],
      worried: [brow(-0.155, 0.012, -0.02), brow(0.155, 0.012, 0.02)],
      quizzical: [brow(-0.155, 0.0, 0.008), brow(0.155, 0.034, -0.012)],
      sad: [brow(-0.155, 0.0, -0.022), brow(0.155, 0.0, 0.022)],
    };
    for (const [name, lines] of Object.entries(browSets)) add(`brows:${name}`, "brow", lines, h * 0.017);

    // its mouths, one per feeling: a small soft smile, and a round o when it is surprised
    const MV = 0.555;
    add("mouth:smile", "mouth", [ink.wobble(p, curve(P(-0.055, MV - 0.01), P(0, MV + 0.045), P(0.055, MV - 0.01)), { amp: 0.3 })], h * 0.019);
    add("mouth:grin", "mouth", [ink.wobble(p, curve(P(-0.075, MV - 0.014), P(0, MV + 0.065), P(0.075, MV - 0.014)), { amp: 0.3 })], h * 0.021);
    const open = disc(0, MV + 0.015, 0.04, 0.05, 22);
    const inside = ink.fill(p, open.flatMap(([u, v]) => P(u, v)), { nib: h * 0.028, angle: 8 });
    add("mouth:wow", "mouth", inside.strokes, inside.width, INK);
    const tongue = ink.dab(p, ...P(-0.012, MV + 0.04), ...P(0.014, MV + 0.04), h * 0.026);
    add("mouth:wow", "tongue", tongue.strokes, tongue.width, "#e46f5c");
    add("mouth:wavy", "mouth", [ink.wobble(p, pts([-0.055, MV + 0.008], [-0.027, MV - 0.006], [0, MV + 0.008], [0.027, MV - 0.006], [0.055, MV + 0.008]), { amp: 0.3 })], h * 0.018);
    add("mouth:side", "mouth", [ink.wobble(p, curve(P(-0.015, MV + 0.006), P(0.035, MV + 0.008), P(0.07, MV - 0.014)), { amp: 0.35 })], h * 0.018);
    add("mouth:frown", "mouth", [ink.wobble(p, curve(P(-0.055, MV + 0.024), P(0, MV - 0.014), P(0.055, MV + 0.024)), { amp: 0.35 })], h * 0.019);

    // its legs, short and thin, and its yellow rain boots, each with a darker sole and a glint
    for (const [hip, toe] of [[-0.17, -1], [0.17, 1]]) {
      shape("body", [[hip - 0.024, 0.7], [hip + 0.024, 0.7], [hip + 0.026, 0.84], [hip - 0.026, 0.84]], LIMB, { nib: h * 0.02, angle: 80, line: W * 0.8, opacity: 1 });
      const bx = hip + toe * 0.022;
      shape("body", [[bx - 0.06, 0.825], [bx + 0.06, 0.825], [bx + 0.065 + toe * 0.02, 0.965], [bx - 0.065 + toe * 0.02, 0.965]], BOOT, { nib: h * 0.03, angle: 0, line: W * 0.85, opacity: 1, round: true });
      shape("body", [[bx - 0.07 + toe * 0.02, 0.952], [bx + 0.07 + toe * 0.02, 0.952], [bx + 0.068 + toe * 0.02, 0.985], [bx - 0.068 + toe * 0.02, 0.985]], BOOT_DARK, { nib: h * 0.014, angle: 0, line: W * 0.7, opacity: 1 });
      const glint = ink.dab(p, ...P(bx - toe * 0.03, 0.86), ...P(bx - toe * 0.03, 0.9), h * 0.014);
      add("body", "shine", glint.strokes, glint.width, PAPER);
    }
    k.arms(); // the arms and hands are drawn here, between the legs and the color

    // the color last: its blue in marker, white where the light falls and a deeper blue along its underside
    const fill = ink.fill(p, flat, { nib: h * 0.05, angle: -32, edge: 0.6 });
    add("body", "color", fill.strokes, fill.width, CLOUD, "under", 0.95);
    add("body", "gloss", [ink.wobble(p, curve(P(-0.33, 0.27), P(-0.3, 0.13), P(-0.15, 0.07)), { amp: 0.4 })], h * 0.035, LIGHT, "under", 0.9);
    add("body", "shade", [ink.wobble(p, curve(P(-0.2, 0.69), P(0.15, 0.71), P(0.38, 0.55)), { amp: 0.4 })], h * 0.04, SHADE, "under", 0.45);
    // rosy cheeks
    for (const u of [-0.3, 0.3]) {
      const blush = ink.dab(p, ...P(u - 0.022, 0.5), ...P(u + 0.022, 0.5), h * 0.055);
      add("body", "cheek", blush.strokes, blush.width, BLUSH, "under", 0.6);
    }

    // the shadow on the floor: its own component, it stays on the ground when the guide jumps
    const floor = ink.dab(p, ...P(-0.36, 0.995), ...P(0.36, 0.995), h * 0.034);
    add("floor", "floor", floor.strokes, floor.width, "#d9d5ca", "shadow", 1);
    return { eyes };
  },
};
