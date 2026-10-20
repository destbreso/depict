// The pencil: created by Niki, age 7, who drew it: a sharpened pencil standing
// on its own two feet, its point up. A black lead at the tip, the sharpened
// wood in lemon yellow with a white glint and a zigzag edge, an orange body
// with four lines down it, two big eyes with black pupils and white glints
// between the lines, little pink cheeks and a small u of a smile, short thick
// pink arms, a silver band wider than the body, a pink eraser, and short pink
// legs whose feet turn out. Drawn here as she drew it, its lines made even and
// standing up straight (her drawing leans a little), and given every feeling a
// guide needs. It is drawn to Stuart's slot (`contract: "stuart"`): as tall as
// him, narrower, and with its own short arms from its own narrow sides, so it
// can present any board made for him, cast in as the board plays; where one of
// his gestures is out of its short reach it looks at the thing instead. Drawn
// in its own frame: u across, v down from its tip, both in units of its height.

const LEAD = "#2b2a28";
const WOOD = "#f4e24a"; // the sharpened wood, lemon yellow in her drawing
const PAINT = "#f4a331"; // its body's orange
const BAND = "#bfbfbc"; // the silver band
const BAND_DARK = "#8e8e8a";
const ERASER = "#f3c8e3";
const LIMB = "#e6a0d6"; // its arms, legs and feet, pink
const CHEEK = "#f5b3d2";

/** Where its hands go in each pose, facing right, in units of its height: its arms are short and come out of its narrow sides. */
const POSES = {
  rest: { front: { hand: [0.215, 0.535], bow: [0.185, 0.495], glove: "fist" }, back: { hand: [-0.215, 0.535], bow: [-0.185, 0.495], glove: "fist" } },
  present: { front: { hand: [0.33, 0.38], bow: [0.245, 0.41], glove: "point" }, back: { hand: [-0.215, 0.51], bow: [-0.185, 0.47], glove: "fist" } },
  wave: { front: { hand: [0.28, 0.24], bow: [0.255, 0.36], glove: "open" }, back: { hand: [-0.215, 0.51], bow: [-0.185, 0.47], glove: "fist" } },
  cheer: { front: { hand: [0.27, 0.24], bow: [0.255, 0.36], glove: "open" }, back: { hand: [-0.27, 0.24], bow: [-0.255, 0.36], glove: "open" } },
  shrug: { front: { hand: [0.3, 0.38], bow: [0.215, 0.44], glove: "open" }, back: { hand: [-0.3, 0.38], bow: [-0.215, 0.44], glove: "open" } },
  scratch: { front: { hand: [0.13, 0.2], bow: [0.255, 0.32], glove: "fist" }, back: { hand: [-0.215, 0.51], bow: [-0.185, 0.47], glove: "fist" } },
  salute: { front: { hand: [0.1, 0.31], bow: [0.245, 0.36], glove: "open" }, back: { hand: [-0.215, 0.51], bow: [-0.185, 0.47], glove: "fist" } },
  tip: { front: { hand: [0.06, 0.08], bow: [0.225, 0.26], glove: "fist" }, back: { hand: [-0.215, 0.51], bow: [-0.185, 0.47], glove: "fist" } },
  point: { front: { hand: [0.34, 0.44], bow: [0.25, 0.455], glove: "point" }, back: { hand: [-0.215, 0.51], bow: [-0.185, 0.47], glove: "fist" } },
};

/** Its hands: the round pink ends of its short arms, as she drew them; a mitt for open, a ball for a fist, and one short finger to point. In units of the hand's size. */
const HANDS = {
  open: [[-0.62, -0.8], [-0.95, -0.15], [-0.98, 0.5], [-0.7, 1.05], [-0.1, 1.2], [0.45, 1.05], [0.62, 0.5], [0.95, 0.62], [1.22, 0.28], [0.98, -0.18], [0.62, -0.8]],
  fist: [[-0.62, -0.8], [-0.95, -0.12], [-0.9, 0.55], [-0.45, 0.92], [0.3, 0.92], [0.82, 0.6], [1.05, 0.2], [0.92, -0.22], [0.62, -0.8]],
  point: [[-0.62, -0.8], [-0.95, -0.12], [-0.82, 0.62], [-0.32, 1.5], [0.05, 1.72], [0.36, 1.48], [0.5, 0.82], [0.88, 0.58], [1.08, 0.2], [0.92, -0.22], [0.62, -0.8]],
};

export default {
  id: "pencil",
  name: "the pencil",
  about: "The pencil, a sharpened pencil with its point up, an orange body with four lines down it, big eyes, a little u of a smile, short pink arms, a silver band and a pink eraser on short pink legs. Created by Niki, age 7.",
  credit: { by: "Niki", age: 7, note: "Created by Niki, age 7, who drew it: a sharpened pencil standing on its own two feet, its point up." },
  // Stuart's slot: as tall as him; its body, its narrow shape, its shoulders, its short arms and its poses are its own
  contract: "stuart",
  measures: { back: 0.29, front: 0.29, reach: 0.58 },
  shoulders: { front: [0.135, 0.475], back: [-0.135, 0.475] },
  // its arms are thick pink limbs: an ink outline, pink inside
  arm: { width: 2.6, fill: LIMB, fillWidth: 1.75 },
  // its short arms stretch a little when it points, as a cartoon's do, and no further
  reach: 0.28,
  tip: 0.1,
  capPivot: [0.0, 0.06],
  poses: POSES,
  // what it is made of: wood, so it stands firm, squashes a little when it lands and is still at once
  motion: {},
  personality: {
    traits: "bright and tidy: it stands up straight, hops quick and lands firm, like a pencil set down on a desk",
    intros: ["hop", "wave", "spin", "bow", "jump"],
    outros: ["wave", "bow", "salute", "spin", "cheer"],
    quirks: [],
  },
  // the shared costumes that sit well on a pencil: a hat on its point, a bow tie and a star on its body
  wear: ["grad-cap", "hard-hat", "party-hat", "crown", "beanie", "chef-hat", "bow-tie", "star"],
  skins: ["plain"],
  anchors: {
    hat: { s: 0.72, du: 0.0, dv: 0.085 },
    neck: { s: 0.8, du: 0.0, dv: 0.0 },
    chest: { s: 0.7, du: 0.004, dv: 0.05 },
  },
  hands: () => ({ size: 0.045, shapes: HANDS, cuffs: false, knuckle: false, fill: LIMB }),

  /** Its body, face, legs and shadow, stroke by stroke in the order the pen draws them when it first appears. */
  draw(k) {
    const { p, h, P, pts, W, fine, add, curve, shape, line, disc, rrect, ink, colors } = k;
    const { PAPER, INK } = colors;
    // its point: the lead, then the sharpened wood with its glint
    shape("body", [[-0.135, 0.25], [0.135, 0.25], [0.033, 0.058], [-0.033, 0.058]], WOOD, { nib: h * 0.03, angle: 70, line: W * 0.9, opacity: 1 });
    shape("body", [[-0.033, 0.06], [0.033, 0.06], [0.0, 0.0]], LEAD, { nib: h * 0.02, angle: 70, line: W * 0.9, opacity: 1 });
    add("body", "glint", [ink.wobble(p, pts([0.045, 0.085], [0.088, 0.19]), { amp: 0.3 })], h * 0.012, PAPER, "under", 0.85);
    // its body: the paint ends in a zigzag where it was sharpened, five teeth up into the wood
    const zig = [];
    for (let i = 0; i <= 10; i++) zig.push([-0.135 + i * 0.027, i % 2 ? 0.205 : 0.25]);
    shape("body", [[-0.135, 0.672], ...zig, [0.135, 0.672]], PAINT, { nib: h * 0.04, angle: 80, line: W, opacity: 1 });
    // the four lines down it, and its own glint on the right
    for (const [u, end] of [[-0.085, 0.63], [-0.028, 0.6], [0.028, 0.6], [0.085, 0.63]]) line("body", [[u, 0.255], [u + 0.003, (0.255 + end) / 2], [u - 0.002, end]], fine);
    add("body", "glint", [ink.wobble(p, pts([0.112, 0.29], [0.112, 0.37]), { amp: 0.3 })], h * 0.014, "#fff4e6", "under", 0.9);

    // its eyes, each its own component so it can blink: a white circle and its outline, a big black pupil, two glints
    const eyes = [];
    for (const [i, u] of [[0, -0.056], [1, 0.056]]) {
      const [cx, cy] = P(u, 0.4);
      eyes.push([cx, cy]);
      const white = ink.dab(p, cx, cy - h * 0.004, cx, cy + h * 0.004, h * 0.06);
      add(`eye${i}`, "white", white.strokes, white.width, PAPER, "under", 1);
      add(`eye${i}`, "eye", ink.ellipse(p, cx, cy, h * 0.031, h * 0.033, { overshoot: 0.05 }), fine * 1.1);
      const [px, py] = [cx + (i ? -1 : 1) * h * 0.004, cy + h * 0.005];
      const pupil = ink.dab(p, px, py - h * 0.007, px, py + h * 0.007, h * 0.038);
      add(`pupil${i}`, "pupil", pupil.strokes, pupil.width, INK);
      const shine = ink.dab(p, px - h * 0.009, py - h * 0.011, px - h * 0.007, py - h * 0.009, h * 0.014);
      add(`pupil${i}`, "shine", shine.strokes, shine.width, PAPER);
      const spark = ink.dab(p, px + h * 0.009, py + h * 0.01, px + h * 0.0095, py + h * 0.0105, h * 0.007);
      add(`pupil${i}`, "shine", spark.strokes, spark.width, PAPER);
      // eyes closed in a happy squint
      add(`squint${i}`, "eye", [ink.wobble(p, curve([cx - h * 0.028, cy + h * 0.009], [cx, cy - h * 0.028], [cx + h * 0.028, cy + h * 0.009]), { amp: 0.25 })], h * 0.013);
    }
    // brows only when a feeling needs them, small and thin over the eyes (she drew none)
    const brow = (u, lift, tilt) => ink.wobble(p, curve(P(u - 0.028, 0.35 - lift + tilt), P(u, 0.339 - lift * 1.3), P(u + 0.028, 0.35 - lift - tilt)), { amp: 0.25 });
    const browSets = {
      high: [brow(-0.056, 0.016, 0), brow(0.056, 0.016, 0)],
      worried: [brow(-0.056, 0.006, -0.01), brow(0.056, 0.006, 0.01)],
      quizzical: [brow(-0.056, 0.0, 0.004), brow(0.056, 0.018, -0.006)],
      sad: [brow(-0.056, 0.0, -0.011), brow(0.056, 0.0, 0.011)],
    };
    for (const [name, lines] of Object.entries(browSets)) add(`brows:${name}`, "brow", lines, h * 0.011);

    // its mouths, one per feeling: the small u she drew, and a little o when it is surprised
    const MV = 0.458;
    add("mouth:smile", "mouth", [ink.wobble(p, curve(P(-0.02, MV - 0.006), P(0, MV + 0.022), P(0.02, MV - 0.006)), { amp: 0.2 })], h * 0.011);
    add("mouth:grin", "mouth", [ink.wobble(p, curve(P(-0.028, MV - 0.008), P(0, MV + 0.03), P(0.028, MV - 0.008)), { amp: 0.2 })], h * 0.012);
    const open = disc(0, MV + 0.006, 0.014, 0.018, 18);
    const inside = ink.fill(p, open.flatMap(([u, v]) => P(u, v)), { nib: h * 0.014, angle: 8 });
    add("mouth:wow", "mouth", inside.strokes, inside.width, INK);
    add("mouth:wavy", "mouth", [ink.wobble(p, pts([-0.022, MV + 0.004], [-0.011, MV - 0.003], [0, MV + 0.004], [0.011, MV - 0.003], [0.022, MV + 0.004]), { amp: 0.2 })], h * 0.01);
    add("mouth:side", "mouth", [ink.wobble(p, curve(P(-0.006, MV + 0.004), P(0.016, MV + 0.005), P(0.03, MV - 0.008)), { amp: 0.2 })], h * 0.01);
    add("mouth:frown", "mouth", [ink.wobble(p, curve(P(-0.02, MV + 0.012), P(0, MV - 0.008), P(0.02, MV + 0.012)), { amp: 0.2 })], h * 0.011);

    // the silver band, wider than its body, with the lines of its rings, and the pink eraser under it
    shape("body", rrect(-0.162, 0.668, 0.162, 0.785, 0.018), BAND, { nib: h * 0.03, angle: 0, line: W, opacity: 1 });
    for (const v of [0.7, 0.726, 0.752]) line("body", [[-0.14, v], [0.14, v + 0.002]], fine * 0.7, BAND_DARK);
    shape("body", rrect(-0.142, 0.785, 0.142, 0.878, 0.012, 0.02), ERASER, { nib: h * 0.028, angle: 10, line: W, opacity: 1 });
    // its short pink legs, and its round pink feet turned out
    for (const s of [-1, 1]) {
      shape("body", [[s * 0.1 - 0.021, 0.876], [s * 0.1 + 0.021, 0.876], [s * 0.1 + 0.022, 0.955], [s * 0.1 - 0.022, 0.955]], LIMB, { nib: h * 0.02, angle: 80, line: W * 0.8, opacity: 1 });
      shape("body", disc(s * 0.128, 0.966, 0.058, 0.025, 20), LIMB, { nib: h * 0.024, angle: 0, line: W * 0.85, opacity: 1 });
    }
    k.arms(); // the arms and hands are drawn here, after its legs

    // its little pink cheeks, each with its own outline, under its eyes and to the side
    for (const s of [-1, 1]) shape("body", disc(s * 0.1, 0.452, 0.019, 0.013, 16), CHEEK, { nib: h * 0.014, angle: 0, line: fine * 0.85, opacity: 1 });

    // the shadow on the floor: its own component, it stays on the ground when the guide jumps
    const floor = ink.dab(p, ...P(-0.22, 0.995), ...P(0.22, 0.995), h * 0.034);
    add("floor", "floor", floor.strokes, floor.width, "#d9d5ca", "shadow", 1);
    return { eyes };
  },
};
