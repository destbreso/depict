// The guide's rig: a character as components the player can move one by one.
// The characters themselves (their bodies, faces, poses, what they are made of
// and who they are) live in ./characters; this file draws any of them with the
// same pen, dresses it and readies its arms and hands. Everything is drawn once, by the same hand as the board, in the
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
import { PLACES, characterOf, contractOf, slotOf } from "./characters/index.mjs";

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
/** Every way a guide can arrive and leave; each character has its own few (its personality), and a soft one bounces and jiggles. */
export const INTROS = ["wave", "hop", "spin", "bow", "tip", "jump", "bounce", "jiggle", "rub", "flip", "roll"];
export const OUTROS = ["wave", "bow", "cheer", "salute", "tip", "spin", "bounce", "stroll", "flip", "roll"];
const SKIN_TINTS = { blue: "#d3e3f0", green: "#d6ead8", sand: "#f4e6c4", pink: "#f5d9df" };
/** How far above the top of the marker's cap a costume reaches, in units of the guide's height: its spot keeps that paper free too. */
const HAT_TOP = { "grad-cap": 0.09, "hard-hat": 0.09, headphones: 0.07, "party-hat": 0.28, crown: 0.1, beanie: 0.11, "chef-hat": 0.26, "hair-bow": 0.04, "pencil-ear": 0.07 };
/**
 * How far above the top of its head what the guide wears reaches, for its character: a shared costume sits in the
 * character's own place for it, and a character's own costume says its height. A board keeps that paper free over
 * its slot, so for a guide drawn to another's slot, as much as the slot's own character would need in the same
 * costume, whichever is higher: any character of the contract fits under it. A board that keeps room for costumes
 * its guide may be dressed in as it plays (`room`, a page that dresses it) keeps the highest of those too.
 */
export const reachAbove = (cast = {}) => {
  const C = characterOf(cast);
  const S = slotOf(cast);
  const wears = (X, w) => (X.wear ?? []).includes(w) || Boolean(X.costumes?.[w]);
  return Math.max(0, ...[...(cast.wear ?? []), ...(cast.room ?? [])].map((w) => Math.max(wears(C, w) ? topOf(C, w) : 0, S !== C && wears(S, w) ? topOf(S, w) : 0)));
};
/** How far above the top of its head a costume reaches on a character, in units of its height. */
export const topOf = (C, w) => {
  // in a view that moves its costumes (facing the viewer, its head higher), as high as it reaches in any of them
  const hat = C.costumes?.[w] ? Boolean(C.costumes[w].hat) : PLACES[w] === "hat";
  const moved = Object.values(C.views ?? {}).map((o) => (hat ? o.hat : o.wear)?.[1] ?? 0);
  if (C.costumes?.[w]) return (C.costumes[w].top ?? 0) - Math.min(0, ...moved);
  const a = C.anchors?.[PLACES[w]];
  return (HAT_TOP[w] == null ? 0 : a ? HAT_TOP[w] * a.s - a.dv : HAT_TOP[w]) - (HAT_TOP[w] == null ? 0 : Math.min(0, ...moved));
};

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
/** The marker's measures, in units of its height, from the point between its feet: how far it reaches back and forward (a pointing finger); every character has its own. */
export const GUIDE = { back: 0.32, reach: 0.56, front: 0.36 };

/** The paper the guide takes on a spot, at rest (hands on its hips), facing either way, for a character's measures. */
export const spotBox = (q, h, m = GUIDE) => ({ x: q.x - (q.facing > 0 ? m.back : m.front) * h, y: q.y - h * (1 + (q.top ?? 0)), w: (m.back + m.front) * h, h: h * (1 + (q.top ?? 0)) });

/** The paper right under its feet at q: a thing there is what it seems to stand on, as on a shelf. */
export const feetBox = (q, h, m = GUIDE) => {
  const b = spotBox(q, h, m);
  return { x: b.x + b.w * 0.2, y: q.y, w: b.w * 0.6, h: 0.25 * h };
};

/** The marker's poses: every character has its own, for its own body (references/characters.md). */
export const POSES = characterOf({}).poses;
export const ACTS = ["point", "wave", "cheer", "shrug", "scratch", "present", "rest"];

/** The guide's components, `h` tall, drawn with the pen `p` in the board's accent: the character `cast` names, dressed as it says ({ character, wear, hold, skin }). */
/** Whether a point [u, v] is inside a closed outline of [u, v] points (even-odd). */
function insideUV([u, v], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i];
    const [uj, vj] = poly[j];
    if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) inside = !inside;
  }
  return inside;
}

export function rig(p, h, accent, cast = {}) {
  const { wear = [], skin = "plain" } = cast;
  const C = characterOf(cast);
  // a character with no arms (`arm: false`) shows things with its eyes and its body, and holds nothing
  const armless = C.arm === false;
  const hold = armless ? null : cast.hold ?? null;
  const P = (u, v) => [u * h, (v - 0.99) * h];
  const pts = (...uv) => uv.flatMap(([u, v]) => P(u, v));
  const W = h * 0.019; // the outline's nib
  const fine = h * 0.015;
  const strokes = [];
  let order = 0;
  let armsAt = 0;
  // the view being drawn: what is drawn inside k.view(name, ...) is that view's, its parts named @<name>:<part>
  let prefix = "";
  /** A stroke of a component, in the order the pen draws it when the guide first appears. */
  const add = (part, role, lines, width, color = INK, layer = "ink", opacity = 1) => {
    for (const pts_ of lines) strokes.push({ part: prefix + part, role, pts: pts_, w: width, c: color, l: layer, o: opacity, n: order++ });
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
  /**
   * A closed shape in the figure's frame (or another), colored in under its outline. `behind` lists the shapes that
   * stand in front of this one (as [u, v] outlines): its outline is left out where it runs inside them, so a leg
   * under a body or a body under a head joins it with no seam, only the silhouette drawn (every outline of a part
   * lies over every fill of it, so an overlap would otherwise show its line through the shape in front).
   */
  const shape = (part, uv, color, { T = P, nib = h * 0.03, angle = -35, line = fine, opacity = 0.95, round = false, behind = null } = {}) => {
    let flat = uv.flatMap(([u, v]) => T(u, v));
    if (round) flat = smooth([...flat, flat[0], flat[1]], 3);
    if (color) {
      const f = ink.fill(p, flat, { nib, angle, edge: 0.12 });
      add(part, "color", f.strokes, f.width, color, "under", opacity);
    }
    if (!line) return;
    if (!behind?.length) {
      add(part, "outline", [ink.wobble(p, [...flat, flat[0], flat[1]], { amp: Math.min(0.8, 0.2 * line) })], line);
      return;
    }
    // the outline, finely, kept only where it is outside every shape in front
    const loop = [...uv, uv[0]];
    const dense = [];
    for (let i = 0; i < loop.length - 1; i++) for (let k = 0; k < 6; k++) dense.push([loop[i][0] + ((loop[i + 1][0] - loop[i][0]) * k) / 6, loop[i][1] + ((loop[i + 1][1] - loop[i][1]) * k) / 6]);
    dense.push(loop[0]);
    const runs = [];
    let run = [];
    for (const q of dense) {
      if (behind.some((poly) => insideUV(q, poly))) {
        if (run.length > 1) runs.push(run);
        run = [];
      } else run.push(q);
    }
    if (run.length > 1) runs.push(run);
    // a run that closes the loop joins the first one
    if (runs.length > 1 && !behind.some((poly) => insideUV(dense[0], poly))) runs[0] = [...runs.pop(), ...runs[0]];
    for (const r of runs) add(part, "outline", [ink.wobble(p, r.flatMap(([u, v]) => T(u, v)), { amp: Math.min(0.8, 0.2 * line) })], line);
  };
  /** An open line in the figure's frame (or another). */
  const line = (part, uv, width, color = INK, T = P) => add(part, "outline", [ink.wobble(p, uv.flatMap(([u, v]) => T(u, v)), { amp: 0.35 })], width, color);
  const disc = (u, v, ru, rv = ru, n = 22) => Array.from({ length: n }, (_, k) => [u + Math.cos((2 * Math.PI * k) / n) * ru, v + Math.sin((2 * Math.PI * k) / n) * rv]);
  /** A place on the character, for a costume made for the marker: scaled about the marker's frame and moved, or the marker's own frame. */
  const slot = (name) => {
    const a = C.anchors?.[name];
    return !a ? P : (u, v) => P(u * a.s + a.du, v * a.s + a.dv);
  };
  const colors = { PAPER, INK, GREY, DARK, STEEL, YELLOW, SAND, PINK, BLUE, GREEN, SKIN_TINTS };
  /** Another view of it (facing the viewer, at rest on its side): its body and face drawn in `draw`, which returns { eyes }. */
  const seen = {};
  const view = (name, draw) => {
    prefix = `@${name}:`;
    const out = draw() ?? {};
    prefix = "";
    seen[name] = out.eyes ?? [];
    return out;
  };
  const kit = { p, h, accent, skin, wear, P, pts, W, fine, add, curve, rrect, closed, shape, line, disc, slot, ink, smooth, colors, view, arms: () => ((armsAt = order), (order += 4)) };

  // its body, face, legs and shadow, as the character draws them
  const { eyes } = C.draw(kit);
  dress(wear, hold, { ...kit, eyes, slot }, C);

  // its hands, in a frame of their own, in units of the board: white gloves, bare hands, mittens, as the character says
  const hands = armless ? { size: 0, shapes: {}, fill: "paper" } : C.hands(wear, colors);
  const r = h * hands.size;
  // (across, along) in units of r becomes (x along the arm, y across toward the thumb)
  const G = (a, b) => [b * r, a * r];
  const gloves = {};
  for (const [kind, outline] of Object.entries(hands.shapes)) {
    const lines = [ink.wobble(p, smoothOpen(outline.flatMap(([a, b]) => G(a, b))), { amp: 0.25 })];
    if (hands.cuffs) {
      lines.push(ink.wobble(p, [...G(-0.72, -0.62), ...G(0, -0.5), ...G(0.72, -0.62)], { amp: 0.2 }));
      lines.push(ink.wobble(p, [...G(-0.66, -0.98), ...G(0, -0.9), ...G(0.66, -0.98)], { amp: 0.2 }));
    }
    if (kind === "fist" && hands.knuckle) lines.push(ink.wobble(p, [...G(-0.2, 0.3), ...G(0.45, 0.42)], { amp: 0.15 }));
    // and a fill, so a hand in front of the body hides the line behind it
    const fill = ink.fill(p, outline.flatMap(([a, b]) => G(a, b)), { nib: r * 0.5, angle: 0, edge: 0.05 });
    gloves[kind] = { lines, fill: fill.strokes, fillWidth: fill.width };
  }
  // the hose's own wobble: a fixed sideways jitter along it, so an arm drawn anew every frame keeps its hand
  const hose = armless ? [] : Array.from({ length: 19 }, () => p.off(Math.min(1.4, 0.3 * W)));
  const [su, sv] = C.shoulders.front;
  const [bu, bv] = C.shoulders.back;
  // the slot the board keeps for it: the paper, the shoulders and the reach it is laid out and directed by (its own,
  // or those of the character whose slot it is drawn to)
  const S = slotOf(cast);
  const kept = { measures: S.measures, shoulders: { front: P(...S.shoulders.front), back: P(...S.shoulders.back) }, reach: S.reach ?? 0.36 };
  return {
    h,
    character: C.id,
    ...(armless ? { armless: true } : {}),
    // the body it has (any character of the same contract can be cast in its place), what it wears and the accent
    contract: contractOf(C),
    slot: kept,
    wear,
    outfit: cast.outfit ?? null,
    // the room the board keeps over its head for what it wears, in units of its height
    top: reachAbove(cast),
    accent,
    strokes,
    armsAt,
    eyes,
    shoulders: { front: P(su, sv), back: P(bu, bv) },
    arm: armless ? { width: 0, hose } : { width: W * C.arm.width, hose, ...(C.arm.fill ? { fill: C.arm.fill, fillWidth: W * C.arm.fillWidth } : {}) },
    gloves,
    gloveWidth: fine * 1.05,
    ...(hands.fill !== "paper" ? { gloveFill: hands.fill } : {}),
    // what a pose's hand and bow are, in the figure's frame
    at: (u, v) => P(u, v),
    // the cap (or the hat) tips about its middle; what it holds sits in its back hand (a pointer, in its front one)
    capPivot: P(...C.capPivot),
    hold,
    measures: C.measures,
    poses: C.poses,
    motion: C.motion ?? {},
    reach: C.reach ?? 0.36,
    personality: C.personality,
    // the parts that move on their own (a tail): what each turns about, in the figure's frame, and how it moves
    ...(C.swing ? { swing: Object.fromEntries(Object.entries(C.swing).map(([part, s]) => [part, { at: P(...s.pivot), deg: s.deg ?? 10, period: s.period ?? 1.6, ...(s.sides ? { sides: s.sides } : {}), ...(s.while ? { while: s.while } : {}) }])) } : {}),
    // the whole-body forms it can take in place of standing (a cat sits, curls up into a ball), drawn as form:<name>
    ...(C.forms?.length ? { forms: [...C.forms] } : {}),
    // its other views (facing the viewer, at rest as it stands): their eyes, where costumes move to on each, its middle
    ...(C.views ? { views: Object.fromEntries(Object.entries(C.views).map(([v, o]) => [v, { eyes: seen[v] ?? [], hat: [(o.hat?.[0] ?? 0) * h, (o.hat?.[1] ?? 0) * h], wear: [(o.wear?.[0] ?? 0) * h, (o.wear?.[1] ?? 0) * h], ...(o.middle != null ? { middle: o.middle } : {}), ...(o.yaw != null ? { yaw: o.yaw } : {}), ...(o.between ? { between: true } : {}) }])) } : {}),
    // a character drawn from a modelled shape: the angle its standing view is seen from (it turns by rotating)
    ...(C.yaw != null ? { yaw: C.yaw } : {}),
    // the fidgets of its own it does in a quiet moment (its ears twitch while it looks around)
    ...(C.fidgets ? { fidgets: C.fidgets } : {}),
  };
}

/**
 * The guide dressed for the board: what it wears on its cap ("hat", tipped
 * with the cap) and on its body ("wear"), and what it holds: upright in its
 * back hand ("held", in a frame whose origin is the hand), or, a pointer, in
 * its front fist ("pointer", x along the stick from the fist): along the arm
 * when it points, held up and out otherwise.
 */
function dress(wear, hold, k, C) {
  const { h, P, shape, line, disc, add, eyes, accent, fine, W, p, slot } = k;
  // each shared costume in the character's own place for it (the marker's own frame, for the marker)
  const H = slot("hat");
  const N = slot("neck");
  const B = slot("chest");
  const R = slot("hair");
  const E = slot("ear");
  const has = (w) => wear.includes(w);
  const lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const dot = (part, T, u, v, d, color) => {
    const q = ink.dab(p, ...T(u - d * 0.1, v), ...T(u + d * 0.1, v), h * d);
    add(part, "color", q.strokes, q.width, color, "under", 0.95);
  };
  if (has("grad-cap")) {
    shape("hat", [[-0.15, 0.012], [0.15, 0.012], [0.157, 0.095], [-0.157, 0.095]], DARK, { T: H, angle: 0 });
    shape("hat", [[-0.29, -0.012], [0, -0.085], [0.29, -0.012], [0, 0.058]], DARK, { T: H, angle: -20 });
    line("hat", [[0, -0.014], [0.2, 0.002], [0.215, 0.1]], fine, INK, H);
    dot("hat", H, 0.215, 0.125, 0.04, YELLOW);
  }
  if (has("hard-hat")) {
    shape("hat", disc(0, 0.075, 0.2, 0.16, 24).filter(([, v]) => v <= 0.0751), YELLOW, { T: H, nib: h * 0.04 });
    shape("hat", [[-0.258, 0.055], [0.258, 0.055], [0.252, 0.1], [-0.252, 0.1]], YELLOW, { T: H, nib: h * 0.02, angle: 0 });
    line("hat", [[0, -0.083], [0, 0.055]], fine, INK, H);
    line("hat", [[-0.075, -0.065], [-0.085, 0.055]], fine, INK, H);
    line("hat", [[0.075, -0.065], [0.085, 0.055]], fine, INK, H);
  }
  if (has("headphones")) {
    add("hat", "outline", [ink.wobble(p, [H(-0.205, 0.17), H(-0.2, -0.03), H(0, -0.08), H(0.2, -0.03), H(0.205, 0.17)].flat(), { amp: 0.4 })], W * 1.3);
    for (const s of [-1, 1]) shape("hat", [[s * 0.172, 0.095], [s * 0.25, 0.105], [s * 0.255, 0.255], [s * 0.172, 0.27]], DARK, { T: H, round: true, nib: h * 0.025 });
  }
  if (has("party-hat")) {
    const L = [-0.115, 0.04];
    const R = [0.115, 0.04];
    const tip = [0.012, -0.275];
    shape("hat", [L, R, tip], YELLOW, { T: H, nib: h * 0.025 });
    for (const [f0, f1] of [[0.18, 0.32], [0.5, 0.64]]) shape("hat", [lerp(L, tip, f0), lerp(R, tip, f0), lerp(R, tip, f1), lerp(L, tip, f1)], accent, { T: H, nib: h * 0.018, angle: 0, line: 0, opacity: 0.85 });
    dot("hat", H, tip[0], tip[1], 0.055, accent);
  }
  if (has("crown")) {
    shape("hat", [[-0.175, 0.075], [-0.175, -0.05], [-0.09, 0.008], [0, -0.1], [0.09, 0.008], [0.175, -0.05], [0.175, 0.075]], YELLOW, { T: H, nib: h * 0.025 });
    line("hat", [[-0.175, 0.035], [0.175, 0.035]], fine, INK, H);
    for (const [u, v] of [[-0.175, -0.05], [0, -0.1], [0.175, -0.05]]) dot("hat", H, u, v, 0.034, accent);
  }
  if (has("beanie")) {
    shape("hat", disc(0, 0.12, 0.205, 0.2, 26).filter(([, v]) => v <= 0.1201), BLUE, { T: H, nib: h * 0.04 });
    shape("hat", [[-0.215, 0.1], [0.215, 0.1], [0.215, 0.18], [-0.215, 0.18]], BLUE, { T: H, nib: h * 0.025, angle: 0 });
    for (const u of [-0.16, -0.08, 0, 0.08, 0.16]) line("hat", [[u, 0.112], [u, 0.17]], fine * 0.8, INK, H);
    dot("hat", H, 0, -0.095, 0.075, accent);
  }
  if (has("chef-hat")) {
    shape("hat", [[-0.15, 0.02], [-0.24, -0.06], [-0.2, -0.19], [-0.07, -0.25], [0.06, -0.255], [0.19, -0.2], [0.245, -0.07], [0.15, 0.02]], "#ffffff", { T: H, round: true, nib: h * 0.04, opacity: 1 });
    shape("hat", [[-0.15, 0.01], [0.15, 0.01], [0.15, 0.1], [-0.15, 0.1]], "#ffffff", { T: H, angle: 0, opacity: 1 });
    line("hat", [[-0.06, -0.06], [-0.05, 0.0]], fine * 0.8, INK, H);
    line("hat", [[0.06, -0.07], [0.055, 0.0]], fine * 0.8, INK, H);
  }
  if (has("hair-bow")) {
    // on the far side of the cap from a pencil behind its ear
    shape("hat", [[-0.11, 0.03], [-0.175, -0.035], [-0.205, 0.0], [-0.2, 0.07], [-0.17, 0.095]], PINK, { T: R, nib: h * 0.018, round: true });
    shape("hat", [[-0.11, 0.03], [-0.045, -0.035], [-0.015, 0.0], [-0.02, 0.07], [-0.05, 0.095]], PINK, { T: R, nib: h * 0.018, round: true });
    dot("hat", R, -0.11, 0.03, 0.04, accent);
  }
  if (has("pencil-ear")) {
    shape("hat", [[0.142, -0.02], [0.176, -0.034], [0.272, 0.19], [0.238, 0.204]], YELLOW, { T: E, nib: h * 0.016, angle: 20 });
    shape("hat", [[0.238, 0.204], [0.272, 0.19], [0.268, 0.25]], SAND, { T: E, nib: h * 0.012, angle: 20 });
    shape("hat", [[0.142, -0.02], [0.176, -0.034], [0.164, -0.066], [0.13, -0.052]], PINK, { T: E, nib: h * 0.012, angle: 20 });
  }
  if (has("glasses")) {
    for (const [cx, cy] of eyes) add("wear", "outline", ink.ellipse(p, cx, cy, h * 0.062, h * 0.077, { overshoot: 0.04 }), h * 0.014);
    const [a, b] = eyes;
    add("wear", "outline", [ink.wobble(p, [a[0] + h * 0.06, a[1] - h * 0.012, (a[0] + b[0]) / 2, a[1] - h * 0.026, b[0] - h * 0.06, b[1] - h * 0.012], { amp: 0.3 })], h * 0.013);
    add("wear", "outline", [ink.wobble(p, [a[0] - h * 0.062, a[1] - h * 0.01, ...P(-0.165, 0.395)], { amp: 0.3 })], h * 0.012);
    add("wear", "outline", [ink.wobble(p, [b[0] + h * 0.062, b[1] - h * 0.01, ...P(0.165, 0.395)], { amp: 0.3 })], h * 0.012);
  }
  if (has("bow-tie")) {
    shape("wear", [[0, 0.655], [-0.088, 0.618], [-0.093, 0.716], [0, 0.682]], accent, { T: N, nib: h * 0.02 });
    shape("wear", [[0.022, 0.655], [0.11, 0.618], [0.115, 0.716], [0.022, 0.682]], accent, { T: N, nib: h * 0.02 });
    shape("wear", [[-0.006, 0.646], [0.028, 0.646], [0.03, 0.69], [-0.008, 0.69]], accent, { T: N, nib: h * 0.014, angle: 0 });
  }
  if (has("scarf")) {
    shape("wear", [[-0.174, 0.612], [0.174, 0.598], [0.178, 0.674], [-0.174, 0.69]], accent, { T: N, nib: h * 0.024, angle: 0 });
    shape("wear", [[0.048, 0.664], [0.108, 0.658], [0.142, 0.842], [0.086, 0.852]], accent, { T: N, nib: h * 0.02, angle: 75 });
    for (const v of [0.72, 0.78]) line("wear", [[0.06 + (v - 0.66) * 0.18, v], [0.118 + (v - 0.66) * 0.18, v - 0.005]], fine * 0.9, PAPER, N);
    for (const f of [0.0, 0.5, 1.0]) line("wear", [lerp([0.088, 0.852], [0.142, 0.842], f), lerp([0.09, 0.878], [0.146, 0.868], f)], fine * 0.8, INK, N);
  }
  if (has("star")) {
    const star = Array.from({ length: 10 }, (_, k) => {
      const a = -Math.PI / 2 + (Math.PI * k) / 5;
      const rr = k % 2 ? 0.022 : 0.052;
      return [0.08 + Math.cos(a) * rr, 0.76 + Math.sin(a) * rr];
    });
    shape("wear", star, YELLOW, { T: B, nib: h * 0.014 });
  }
  for (const w of wear) C.costumes?.[w]?.draw?.(k);
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
