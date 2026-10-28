// A character's look: the character drawn once, as data any board of its body
// can cast in place of its own guide while it plays (kit/act.mjs, recast). The
// board keeps its performance, which its body sets (kit/characters/index.mjs,
// CONTRACT): where the guide stands, how it hops, what it points at, what it
// feels. The look brings who does it: its body and face, its arms and hands,
// each costume it can wear as a part of its own (a board shows the ones it
// wears), and what it is made of. The board's accent is left open ("accent"),
// so a costume in the accent takes each board's own. One file per character,
// for every board of its body: scripts/look.mjs writes it.
import * as ink from "./ink.mjs";
import { rig, reachAbove, topOf } from "./rig.mjs";
import { CHARACTERS, characterOf, contractOf, outfitsOf } from "./characters/index.mjs";
import { SIZE, W } from "./compose.mjs";
import { hash32, splitmix32 } from "./rng.mjs";

/** The color a look leaves open for the board's own accent. */
export const ACCENT = "accent";
/** The order the kit dresses a guide in (rig.mjs, dress): a look keeps its costumes in it, so they are drawn as on any board. */
const DRESS = ["grad-cap", "hard-hat", "headphones", "party-hat", "crown", "beanie", "chef-hat", "hair-bow", "pencil-ear", "glasses", "bow-tie", "scarf", "star"];

const q = (v) => Math.round(v * 10) / 10;
const strokeOf = (s) => ({ part: s.part, n: s.n, w: q(s.w), c: s.c, l: { under: 1, shadow: 2 }[s.l] ?? 0, o: s.o, pts: s.pts.map(q) });
const handsOf = (r) => ({
  gloves: Object.fromEntries(Object.entries(r.gloves).map(([k, g]) => [k, { lines: g.lines.map((l) => l.map(q)), fill: g.fill.map((l) => l.map(q)), fillWidth: q(g.fillWidth) }])),
  gloveWidth: q(r.gloveWidth),
  ...(r.gloveFill ? { gloveFill: r.gloveFill } : {}),
});

/** A character (an id the kit has, or a module) drawn as its look: the same look on every board of its body. */
export function lookOf(character) {
  const C = characterOf({ character });
  const h = SIZE.guide * (C.size ?? 1);
  // one pen, the same for every variant, so its body is drawn the same with any costume on
  const pen = () => ink.pen(splitmix32(hash32(`look:${C.id}`)), { width: W.icon });
  const draw = (wear) => rig(pen(), h, ACCENT, { character, wear });
  const base = draw([]);
  // a character with no arms has no hands to change with what it wears
  const handsFor = (w) => (C.arm === false ? null : C.hands(w, {}));
  const plain = JSON.stringify(handsFor([]));
  const wearable = [...DRESS.filter((w) => C.wear?.includes(w)), ...Object.keys(C.costumes ?? {})];
  const wear = {};
  const hands = { plain: handsOf(base) };
  for (const w of wearable) {
    const r = draw([w]);
    // what dressing it adds comes after its body (rig.mjs draws the body, then dresses it)
    wear[w] = r.strokes.slice(base.strokes.length).map(strokeOf);
    if (JSON.stringify(handsFor([w])) !== plain) hands[w] = handsOf(r);
  }
  return {
    depict: "look",
    version: 1,
    id: C.id,
    name: C.name,
    ...(C.arm === false ? { armless: true } : {}),
    about: C.about ?? "",
    ...(C.credit ? { credit: C.credit } : {}),
    contract: contractOf(C),
    h: q(h),
    eyes: base.eyes.map((e) => e.map(q)),
    shoulders: { front: base.shoulders.front.map(q), back: base.shoulders.back.map(q) },
    poses: C.poses,
    motion: C.motion ?? {},
    // the parts that move on their own (a tail), its whole-body forms and its fidgets
    ...(base.swing ? { swing: Object.fromEntries(Object.entries(base.swing).map(([k, s]) => [k, { ...s, at: s.at.map(q) }])) } : {}),
    ...(base.forms ? { forms: base.forms } : {}),
    ...(base.views ? { views: Object.fromEntries(Object.entries(base.views).map(([k, v]) => [k, { ...v, eyes: v.eyes.map((e) => e.map(q)), hat: v.hat.map(q), wear: v.wear.map(q) }])) } : {}),
    ...(base.fidgets ? { fidgets: base.fidgets } : {}),
    ...(base.yaw != null ? { yaw: base.yaw } : {}),
    reach: C.reach ?? 0.36,
    capPivot: base.capPivot.map(q),
    // who it is: its own ways to arrive and to leave, its quirks, and its outfits (the costumes of each of its drawings)
    intros: C.personality?.intros ?? ["wave"],
    outros: C.personality?.outros ?? ["wave"],
    quirks: C.personality?.quirks ?? [],
    ...(C.personality?.shy ? { shy: C.personality.shy } : {}),
    ...(C.personality?.travel?.length ? { travel: C.personality.travel } : {}),
    // its own outfits, then the parts it can dress for (characters/index.mjs, ROLES)
    outfits: outfitsOf(C).map((o) => ({ name: o.name, wear: o.wear })),
    arm: { width: q(base.arm.width), hose: base.arm.hose.map(q), ...(base.arm.fill ? { fill: base.arm.fill, fillWidth: q(base.arm.fillWidth) } : {}) },
    armsAt: base.armsAt,
    strokes: base.strokes.map(strokeOf),
    wear,
    // how far above its head each costume reaches: a page puts one on only where the board kept the room
    tops: Object.fromEntries(wearable.map((w) => [w, Math.round(topOf(C, w) * 1000) / 1000])),
    hands,
  };
}

/** The box it takes on its spot at rest, in its own frame (its feet at 0, up negative): its drawing (the shadow on the floor left out) and its hands where its rest pose puts them. */
function restBox(character, h) {
  const C = characterOf({ character });
  const r = rig(ink.pen(splitmix32(7), { width: W.icon }), h, ACCENT, { character });
  let [x0, y0, x1] = [Infinity, Infinity, -Infinity];
  const take = (x, y) => ((x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)));
  for (const s of r.strokes) if (s.part !== "floor") for (let i = 0; i < s.pts.length; i += 2) take(s.pts[i], s.pts[i + 1]);
  const hand = C.arm === false ? 0 : C.hands([], {}).size * h * 1.3;
  for (const side of C.arm === false ? [] : ["front", "back"]) {
    const [u, v] = C.poses.rest[side].hand;
    take(u * h - hand, (v - 0.99) * h);
    take(u * h + hand, (v - 0.99) * h);
  }
  return { x0, x1, top: y0 };
}

/** How far forward its pointing finger reaches from its feet, in units of its height: its front shoulder, its arm and its finger. */
const forward = (C) => C.shoulders.front[0] + (C.reach ?? 0.36) + (C.tip ?? 0.13);

/**
 * Whether a character drawn to another's slot fits in it, so it can present any board made for it: on its spot, at
 * rest, its drawing no wider than the slot's paper on either side and no taller than the slot, a costume no higher
 * on it than on the slot's own character, and hands no bigger. Its shape is its own (round, narrow as a pencil, a
 * box) and so are its shoulders, arms and poses. A character with its own slot fits it by being it. Every problem at
 * once; how far it points beside the slot's own character is reachShare's.
 */
export function fitsContract(character) {
  const C = characterOf({ character });
  const id = contractOf(C);
  if (id === C.id) return [];
  const ref = CHARACTERS[id];
  if (!ref) return [`its slot, "${id}", is not one the kit has`];
  const out = [];
  const h = SIZE.guide * (ref.size ?? 1);
  const slack = 0.02 * h;
  const f = (v) => (v / h).toFixed(2);
  const box = restBox(character, h);
  const back = ref.measures.back * h;
  const front = ref.measures.front * h;
  if (box.x0 < -back - slack) out.push(`at rest it takes ${f(-box.x0)} of its height behind it, and ${ref.name}'s slot has ${f(back)}`);
  if (box.x1 > front + slack) out.push(`at rest it takes ${f(box.x1)} of its height in front of it, and ${ref.name}'s slot has ${f(front)}`);
  if (box.top < -h - slack) out.push(`it is drawn ${f(-box.top - h)} of its height taller than ${ref.name}'s slot`);
  const tops = (c, list) => Object.fromEntries(list.map((w) => [w, reachAbove({ character: c, wear: [w] })]));
  const refTops = tops(ref.id, [...(ref.wear ?? []), ...Object.keys(ref.costumes ?? {})]);
  const highest = Math.max(0, ...Object.values(refTops));
  for (const [w, top] of Object.entries(tops(character, [...(C.wear ?? []), ...Object.keys(C.costumes ?? {})]))) {
    const limit = refTops[w] ?? highest;
    if (top > limit + 0.02) out.push(`its ${w} reaches ${(top - limit).toFixed(2)} of its height higher than ${refTops[w] != null ? `${ref.name}'s` : `${ref.name}'s highest costume`}`);
  }
  const size = (c) => c.hands([], {}).size;
  if (C.arm !== false && size(C) > size(ref) * 1.25) out.push(`its hands are ${Math.round((size(C) / size(ref) - 1) * 100)}% bigger than ${ref.name}'s`);
  return out;
}

/**
 * How far it points beside the character whose slot it is drawn to, as a share (1 or more: as far or further). A
 * board is directed by the slot, so where a board has the slot's character point further than this one's finger
 * reaches, or along a line this one's arm would not keep clear, this one looks at the thing instead (act.mjs,
 * keepClear): a share under 1 means some of those gestures become looks.
 */
export function reachShare(character) {
  const C = characterOf({ character });
  const ref = CHARACTERS[contractOf(C)] ?? C;
  return forward(C) / forward(ref);
}
