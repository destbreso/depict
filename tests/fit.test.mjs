// A costume is drawn only on a character whose body it fits: a hat needs a head to sit on, a bow tie a neck. A
// character says where each shared costume it wears sits on its own body (anchors), never takes those places from the
// slot it is drawn to, and wears none of them when it lists none.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stump } from "./fixtures.mjs";
import pip from "../skills/depict/examples/friends/pip.mjs";
import pencil from "../skills/depict/examples/friends/pencil.mjs";
import { CHARACTERS, checkCharacter, outfitsOf, resolve } from "../skills/depict/kit/characters/index.mjs";
import { lookOf } from "../skills/depict/kit/look.mjs";
import { normalize } from "../skills/depict/kit/model.mjs";

const { wear, anchors, ...bare } = stump;
// a shoe: no head, no neck, nothing of the shared costumes; a ribbon of its own on its strap
const shoe = { ...bare, id: "shoe", name: "Shoe", costumes: { ribbon: { top: 0, draw: ({ shape }) => shape("wear", [[0, 0.6], [0.05, 0.62], [0, 0.64]], "#f39a4a") } } };
const tiny = (guide) => ({ title: "One thing", guide, regions: [{ id: "r", title: "A thing", items: [{ id: "a", icon: "cpu", label: "One" }] }], beats: [{ say: "Here is one thing.", draw: ["title", "r", "a"] }] });

test("every shipped character, and every friend in the examples, has a place on its body for each costume it wears", () => {
  for (const c of [...Object.values(CHARACTERS), pip, pencil, stump]) assert.deepEqual(checkCharacter(c), [], c.id);
});

test("a costume listed without its place on the body is refused, whatever slot it is drawn to", () => {
  const hatted = { ...shoe, wear: ["party-hat", "bow-tie", "glasses"] };
  const said = checkCharacter(hatted).join("\n");
  assert.match(said, /party-hat, which needs a head to sit on/);
  assert.match(said, /bow-tie, which needs a neck/);
  assert.doesNotMatch(said, /glasses/, "glasses sit over its eyes, and every character has eyes");
  // the slot's character has a head for a hat; a character drawn to his slot does not take it from him
  assert.equal(resolve(shoe).anchors, undefined);
  assert.ok(CHARACTERS.stuart.anchors.hat);
  // given a place of its own, the hat is its to wear
  assert.deepEqual(checkCharacter({ ...hatted, wear: ["party-hat"], anchors: { hat: { s: 0.8, du: 0, dv: 0.3 } } }), []);
});

test("a character that lists no shared costumes wears none of them, only its own", () => {
  assert.deepEqual(checkCharacter(shoe), []);
  assert.deepEqual(outfitsOf(shoe), [], "no part to dress for: no hard hat, no mortarboard, no crown on a shoe");
  assert.match(normalize(tiny({ character: shoe, wear: ["crown"] })).errors.join("\n"), /wears "crown": it can wear ribbon/);
  assert.match(normalize(tiny({ character: shoe, outfit: "builder" })).errors.join("\n"), /outfit "builder": it has none/);
  assert.deepEqual(normalize(tiny({ character: shoe, wear: ["ribbon"] })).errors, []);
  assert.deepEqual(Object.keys(lookOf(shoe).wear), ["ribbon"], "its look carries its ribbon and nothing of the shared costumes");
});
