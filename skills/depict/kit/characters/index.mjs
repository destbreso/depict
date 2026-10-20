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

export const CHARACTERS = { marker, stuart };

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
/** A character as the kit uses it: one drawn to another's slot stands as tall, and has the other's body and defaults where it says nothing of its own. */
export function resolve(c) {
  if (!c || typeof c !== "object" || !c.contract || c.contract === c.id) return c;
  if (resolved.has(c)) return resolved.get(c);
  const ref = CHARACTERS[c.contract];
  if (!ref) return c;
  const own = (k) => c[k] === undefined && ref[k] !== undefined;
  const defaults = Object.fromEntries([...BODY, ...DEFAULTS].filter(own).map((k) => [k, ref[k]]));
  const shared = Object.fromEntries(SHARED.filter((k) => ref[k] !== undefined).map((k) => [k, ref[k]]));
  // poses it gives join the ones it takes: a friend adds its own (a quirk's) without saying again those it shares
  const poses = c.poses && ref.poses ? { poses: { ...ref.poses, ...c.poses } } : {};
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
  need("arm", c.arm && num(c.arm.width) && (c.arm.fill == null || num(c.arm.fillWidth)), "gives its width (and fillWidth with a fill)");
  need("capPivot", pair(c.capPivot), "is the [u, v] its hat tips about");
  for (const pose of ["rest", "present", "wave", "cheer", "shrug", "scratch", "salute", "tip", "point"]) {
    const P = c.poses?.[pose];
    need(`poses.${pose}`, P && ["front", "back"].every((s) => P[s] && pair(P[s].hand) && pair(P[s].bow) && ["open", "fist", "point"].includes(P[s].glove)), "gives each hand's hand, bow and glove");
  }
  need("personality", c.personality && Array.isArray(c.personality.intros) && c.personality.intros.length && Array.isArray(c.personality.outros) && c.personality.outros.length, "lists its intros and outros");
  need("wear", Array.isArray(c.wear), "lists the shared costumes it can wear");
  need("skins", Array.isArray(c.skins) && c.skins.includes("plain"), "lists its skins, plain among them");
  need("hands", typeof c.hands === "function", "returns its hands' shapes for what it wears");
  const wearable = [...(c.wear ?? []), ...Object.keys(c.costumes ?? {})];
  for (const o of c.outfits ?? []) need(`outfits.${o.name}`, o.name && Array.isArray(o.wear) && o.wear.every((w) => wearable.includes(w)), "is a name and things it can wear");
  need("draw", typeof c.draw === "function", "draws its body and face and returns its eyes");
  return out;
}
