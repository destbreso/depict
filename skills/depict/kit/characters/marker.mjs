// The marker: depict's own guide, a felt marker with its cap in the board's
// accent. A stiff barrel: it hops and lands with a firm squash, and its cap
// is its own part, so it can tip it. Drawn in its own frame: u across (its
// barrel is 0.33 wide), v down from the top of its cap (its feet at 0.99), both
// in units of its height.

/** The arms, for a figure facing right, in units of its height from the top of its head: where each hand is, how its hose bows on the way there, and the glove's shape. "point" is aimed by the player at a target. */
const POSES = {
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

export default {
  id: "marker",
  name: "the marker",
  about: "A felt marker with big eyes, white gloves, black shoes and its cap in the board's accent: depict's own guide, at home on any board.",
  // how much paper it takes, in units of its height from the point between its feet: behind it, in front of it, and to the tip of a pointing finger
  measures: { back: 0.32, front: 0.36, reach: 0.56 },
  shoulders: { front: [0.165, 0.6], back: [-0.165, 0.6] },
  arm: { width: 1.05 },
  reach: 0.36,
  capPivot: [0, 0.272],
  poses: POSES,
  // what it is made of: a stiff barrel, so the kit's own squash and stretch, and no wobble
  motion: {},
  // who it is: how it arrives and leaves (the seed picks one when the script does not say), and what it does on its own
  personality: {
    traits: "cheerful and quick, a presenter who points at everything it names",
    intros: ["wave", "hop", "spin", "bow", "tip", "jump"],
    outros: ["wave", "bow", "cheer", "salute", "tip", "spin"],
    quirks: [],
  },
  // what it can wear: every shared costume, each in the place it was made for
  wear: ["grad-cap", "hard-hat", "headphones", "party-hat", "crown", "beanie", "chef-hat", "glasses", "bow-tie", "scarf", "star", "hair-bow", "pencil-ear"],
  skins: ["plain", "blue", "green", "sand", "pink", "stripes", "dots"],
  anchors: {},
  hands: () => ({ size: 0.064, shapes: SHAPES, cuffs: true, knuckle: true, fill: "paper" }),

  /** Its body, face, legs and shadow, stroke by stroke in the order the pen draws them when it first appears. Returns its eyes' centers. */
  draw(k) {
    const { p, h, P, pts, W, fine, add, curve, rrect, closed, shape, disc, ink, accent, skin, colors } = k;
    const { PAPER, GREY, SKIN_TINTS } = colors;
    const cap = rrect(-0.185, 0, 0.185, 0.272, 0.115, 0.016);
    const barrel = rrect(-0.165, 0.272, 0.165, 0.87, 0.016, 0.075);
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
    k.arms(); // the arms and gloves are drawn here, between the legs and the color
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
    return { eyes };
  },
};

/** Its gloves' outlines, in units of the glove's size: (across, along), the wrist at along = -1. */
const SHAPES = {
  open: [[-0.62, -0.78], [-0.88, -0.1], [-0.86, 0.42], [-0.78, 0.95], [-0.5, 1.08], [-0.36, 0.62], [-0.22, 1.22], [0.08, 1.28], [0.14, 0.66], [0.3, 1.1], [0.56, 1.05], [0.62, 0.45], [0.92, 0.48], [1.18, 0.22], [0.96, -0.12], [0.62, -0.78]],
  fist: [[-0.6, -0.78], [-0.95, -0.15], [-0.85, 0.55], [-0.35, 0.92], [0.3, 0.92], [0.85, 0.6], [1.12, 0.22], [0.95, -0.2], [0.6, -0.78]],
  point: [[-0.6, -0.78], [-0.95, -0.12], [-0.82, 0.55], [-0.3, 0.78], [-0.26, 1.78], [0.0, 1.98], [0.26, 1.8], [0.28, 0.84], [0.85, 0.6], [1.12, 0.22], [0.95, -0.2], [0.6, -0.78]],
};
