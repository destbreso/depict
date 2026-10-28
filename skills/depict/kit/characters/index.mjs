// The characters a board can be presented by. The marker is depict's own and
// the default; each other one is a module of its own here, made the way
// references/characters.md describes (from a drawing, as often as not). A
// board can also bring its own: `guide: { character: <a module like these> }`.
//
// Every board keeps a place for its guide, the slot of its contract: how tall
// it stands, the paper it takes beside each idea, the room over its head for a
// hat, and how far its pointing finger reaches. A board is laid out, and the
// guide's performance worked out, by that slot, so it is the same board
// whoever presents it. A character's contract is its own slot unless it names
// another's: a friend of Stuart's says `contract: "stuart"`, stands as tall as
// he does, and has a body of its own (round, narrow as a pencil, anything)
// that fits in his slot and reaches as far (kit/look.mjs, fitsContract).
// Characters of one contract are interchangeable: any of them can present a
// board made for it, cast in as it plays from one file of its own, its look
// (kit/look.mjs, scripts/look.mjs), with no board built again.
import marker from "./marker.mjs";
import stuart from "./stuart.mjs";
import { GESTURES } from "../act.mjs";

export const CHARACTERS = { marker, stuart };

/** The poses every character has: its hands' for one with arms, its body's for one without (GESTURES). */
const POSE_NAMES = ["rest", "present", "wave", "cheer", "shrug", "scratch", "salute", "tip", "point"];
/** What a pose's body may say (act.mjs, bodyOf): how the whole figure leans, bends, stretches and looks. */
const BODY_KEYS = ["lean", "bend", "stretch", "look", "aim", "sway", "pulse", "pivot", "turn", "shift", "ease"];

/** What every character of a contract shares: its height, so the slot's height (`size`, beside the marker's). */
export const SHARED = ["size"];
/** Its body, its own when it says it and its contract's when it does not: the paper it takes, its shoulders, its reach, its finger and its poses. */
export const BODY = ["measures", "shoulders", "reach", "tip", "poses"];
/** What else a character drawn to another's slot takes from it when it does not say its own: where costumes sit on it, what a hat tips about, its arms and its hands. */
const DEFAULTS = ["anchors", "capPivot", "arm", "hands"];

/**
 * The outfits every character has from the shared costumes, by the part it plays on a board: a board can dress its
 * guide by the part (`outfit: "builder"`) and each character wears its own for it, its own outfit of that name when
 * it has one (its drawings' tool belt), or the shared costumes it can wear.
 */
export const ROLES = { builder: ["hard-hat"], scholar: ["grad-cap"], chef: ["chef-hat"], party: ["party-hat"], royal: ["crown"], music: ["headphones"], formal: ["bow-tie"] };

/** A character's outfits: its own (the costumes of each of its drawings, worn together), then the parts it can dress for. */
export function outfitsOf(C) {
  const own = C.outfits ?? [];
  const named = new Set(own.map((o) => o.name.toLowerCase()));
  const can = (w) => (C.wear ?? []).includes(w) || Boolean(C.costumes?.[w]);
  return [...own, ...Object.entries(ROLES).filter(([name, wear]) => !named.has(name) && wear.every(can)).map(([name, wear]) => ({ name, wear }))];
}

/** The contract a character keeps: its own slot, or the one it is drawn to. */
export const contractOf = (c) => c?.contract ?? c?.id;

const resolved = new WeakMap();
/** A character with no arms (`arm: false`): it shows things with its eyes and its whole body. */
export const armlessOf = (c) => c?.arm === false;
/**
 * A character as the kit uses it: one drawn to another's slot stands as tall, and has the other's body and defaults
 * where it says nothing of its own. One with no arms takes none of the other's hands or hand poses: its poses are its
 * body's, the kit's own (GESTURES) where it says nothing of its own.
 */
export function resolve(c) {
  if (!c || typeof c !== "object") return c;
  const armless = armlessOf(c);
  if (!armless && (!c.contract || c.contract === c.id)) return c;
  if (resolved.has(c)) return resolved.get(c);
  const ref = c.contract && c.contract !== c.id ? CHARACTERS[c.contract] : null;
  if (!ref && !armless) return c;
  const own = (k) => c[k] === undefined && ref?.[k] !== undefined;
  const handed = (k) => !armless || (k !== "poses" && k !== "hands");
  const defaults = Object.fromEntries([...BODY, ...DEFAULTS].filter((k) => own(k) && handed(k)).map((k) => [k, ref[k]]));
  const shared = Object.fromEntries(SHARED.filter((k) => ref?.[k] !== undefined).map((k) => [k, ref[k]]));
  // poses it gives join the ones it takes: a friend adds its own (a quirk's) without saying again those it shares
  const body = Object.fromEntries(Object.entries(GESTURES).map(([k, g]) => [k, { body: g }]));
  const poses = armless ? { poses: { ...body, ...c.poses } } : c.poses && ref.poses ? { poses: { ...ref.poses, ...c.poses } } : {};
  const out = { ...defaults, ...c, ...poses, ...shared };
  resolved.set(c, out);
  return out;
}

/** The character a cast names: a built-in one by its id, one a board brings, or the marker. */
export function characterOf(cast = {}) {
  const c = cast.character;
  if (c && typeof c === "object") return resolve(c);
  return CHARACTERS[c ?? "marker"] ?? marker;
}

/** The character whose slot a board keeps for its guide: the one its contract names (the guide itself, when it keeps its own). */
export function slotOf(cast = {}) {
  const C = characterOf(cast);
  const id = contractOf(C);
  return id !== C.id && CHARACTERS[id] ? CHARACTERS[id] : C;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** What a character module must say, checked before a board is built with it: every problem at once. */
export function checkCharacter(raw) {
  const out = [];
  const need = (k, ok, what) => {
    if (!ok) out.push(`"${k}" ${what}`);
  };
  // a character drawn to another's slot: a slot the kit has, and as tall as it (whether its body fits: look.mjs)
  if (raw?.contract != null && raw.contract !== raw.id) {
    const ref = CHARACTERS[raw.contract];
    need("contract", typeof raw.contract === "string" && ref, `names the slot it is drawn to: ${Object.keys(CHARACTERS).join(" or ")}`);
    if (ref) for (const k of SHARED) if (raw[k] !== undefined && !same(raw[k], ref[k])) out.push(`"${k}" is the slot's: it stands as tall as ${ref.name}; leave it out`);
  }
  const c = resolve(raw);
  const num = (v) => Number.isFinite(v);
  const pair = (v) => Array.isArray(v) && v.length === 2 && v.every(num);
  need("id", typeof c.id === "string" && /^[a-z][a-z0-9-]*$/.test(c.id), "is a short lowercase name");
  need("name", typeof c.name === "string", "is how a sentence names it");
  need("measures", c.measures && ["back", "front", "reach"].every((k) => num(c.measures[k]) && c.measures[k] > 0 && c.measures[k] < 1.5), "gives back, front and reach, in units of its height");
  need("shoulders", c.shoulders && pair(c.shoulders.front) && pair(c.shoulders.back), "gives front and back as [u, v]");
  const armless = armlessOf(c);
  need("arm", armless || (c.arm && num(c.arm.width) && (c.arm.fill == null || num(c.arm.fillWidth))), "gives its width (and fillWidth with a fill), or is false for a character with no arms");
  need("capPivot", pair(c.capPivot), "is the [u, v] its hat tips about");
  for (const pose of POSE_NAMES) {
    const P = c.poses?.[pose];
    if (armless) need(`poses.${pose}`, P && !P.front && !P.back, "is its body's, with no hands: a character with no arms leans, bends and looks (body)");
    else need(`poses.${pose}`, P && ["front", "back"].every((s) => P[s] && pair(P[s].hand) && pair(P[s].bow) && ["open", "fist", "point"].includes(P[s].glove)), "gives each hand's hand, bow and glove");
  }
  // what a pose's body does: how the whole figure leans, bends, stretches and looks while the pose lasts
  const pulse = (v) => Array.isArray(v) && v.length === 2 && v.every(num) && v[1] > 0;
  for (const [name, P] of Object.entries(c.poses ?? {})) {
    const B = P?.body;
    if (B == null) continue;
    const ok =
      typeof B === "object" &&
      Object.keys(B).every((k) => BODY_KEYS.includes(k)) &&
      ["lean", "bend", "stretch", "aim", "turn"].every((k) => B[k] == null || num(B[k])) &&
      (B.ease == null || (num(B.ease) && B.ease > 0)) &&
      (B.look == null || pair(B.look)) &&
      (B.pivot == null || pair(B.pivot)) &&
      (B.shift == null || pair(B.shift)) &&
      (B.turn == null || B.pivot != null) &&
      (B.sway == null || pulse(B.sway)) &&
      (B.pulse == null || pulse(B.pulse));
    need(`poses.${name}.body`, ok, `says only ${BODY_KEYS.join(", ")}: lean, bend, aim and turn in degrees (a turn about its pivot, [u, v]), stretch a share of its height, look as [x, y], shift as [du, dv], sway and pulse as [how much, seconds], ease in seconds`);
  }
  need("personality", c.personality && Array.isArray(c.personality.intros) && c.personality.intros.length && Array.isArray(c.personality.outros) && c.personality.outros.length, "lists its intros and outros");
  need("wear", Array.isArray(c.wear), "lists the shared costumes it can wear");
  need("skins", Array.isArray(c.skins) && c.skins.includes("plain"), "lists its skins, plain among them");
  need("hands", armless || typeof c.hands === "function", "returns its hands' shapes for what it wears");
  const wearable = [...(c.wear ?? []), ...Object.keys(c.costumes ?? {})];
  for (const o of c.outfits ?? []) need(`outfits.${o.name}`, o.name && Array.isArray(o.wear) && o.wear.every((w) => wearable.includes(w)), "is a name and things it can wear");
  need("draw", typeof c.draw === "function", "draws its body and face and returns its eyes");
  for (const [part, s] of Object.entries(c.swing ?? {}))
    need(`swing.${part}`, /^[a-z][a-z0-9-]*$/.test(part) && s && pair(s.pivot) && (s.deg == null || num(s.deg)) && (s.period == null || (num(s.period) && s.period > 0)) && (s.sides == null || (num(s.sides) && s.sides >= 2)) && (s.while == null || s.while === "wag" || Boolean(c.fidgets?.[s.while])), "gives the [u, v] it turns about (pivot), and how far (deg), how fast (period), how often it changes sides (sides, seconds) and, for a part that moves only during a fidget, which (while)");
  for (const [name, f] of Object.entries(c.fidgets ?? {}))
    need(`fidgets.${name}`, /^[a-z][a-z0-9-]*$/.test(name) && name !== "wag" && f && (f.time == null || (num(f.time) && f.time > 0)) && (f.look == null || f.look === "around"), "gives how long it lasts (time) and whether it looks around (look: \"around\")");
  need("forms", c.forms == null || (Array.isArray(c.forms) && c.forms.every((f) => /^[a-z][a-z0-9-]*$/.test(f) && !POSE_NAMES.includes(f))), "lists the names of its whole-body forms (drawn as form:<name>), none a pose's name");
  // its other views, each drawn in draw() inside k.view(name, ...), and the poses taken in them
  const views = c.views ?? {};
  need("views", c.views == null || (typeof c.views === "object" && Object.entries(views).every(([v, o]) => /^[a-z][a-z0-9-]*$/.test(v) && !(c.forms ?? []).includes(v) && o && (o.hat == null || pair(o.hat)) && (o.wear == null || pair(o.wear)) && (o.middle == null || num(o.middle)))), "names its other views, each { hat, wear } (where its costumes move to, [du, dv]) and its middle, none a form's name");
  for (const [name, P] of Object.entries(c.poses ?? {})) if (P?.view != null) need(`poses.${name}.view`, Object.hasOwn(views, P.view), `is one of its views (${Object.keys(views).join(", ") || "it has none"})`);
  for (const q of c.personality?.quirks ?? []) need(`personality.quirks.${q}`, Boolean(c.poses?.[q]) || (c.forms ?? []).includes(q) || Boolean(c.fidgets?.[q]), "is one of its poses, its forms or its fidgets");
  return out;
}
