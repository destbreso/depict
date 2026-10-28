// A shy character: once it has arrived it takes its shy pose a moment before it presents (it glances away), its first
// quiet moment is shy too, and then its quirks take turns; on its own boards and cast into another's alike.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stump } from "./fixtures.mjs";
import pencil from "../skills/depict/examples/friends/pencil.mjs";
import { checkCharacter } from "../skills/depict/kit/characters/index.mjs";
import { quirkAt, recast, SHY_TIME } from "../skills/depict/kit/act.mjs";
import { lookOf } from "../skills/depict/kit/look.mjs";
import { normalize } from "../skills/depict/kit/model.mjs";
import { compose } from "../skills/depict/kit/compose.mjs";
import { time } from "../skills/depict/kit/timeline.mjs";
import { hand } from "../skills/depict/kit/fonts.mjs";
import { sceneOf } from "../skills/depict/kit/page.mjs";

const shyOne = { ...stump, id: "shy-one", personality: { ...stump.personality, intros: ["hop"], shy: "glance", quirks: ["glance"] } };
const build = (guide) => {
  const { board, errors } = normalize({ title: "A shy board", guide, regions: [{ id: "r", title: "Two things", items: [{ id: "a", icon: "cpu", label: "One" }, { id: "b", icon: "database", label: "Two" }] }], beats: [{ say: "Here is the first thing.", draw: ["title", "a"] }, { say: "And here is the second one.", draw: ["r", "b"] }] });
  assert.deepEqual(errors, []);
  const comp = compose(board, hand(board.hand));
  const tl = time(board, comp);
  return sceneOf(board, comp, tl);
};

test("a shy character names a pose of its own as its shy one", () => {
  assert.deepEqual(checkCharacter(shyOne), []);
  assert.match(checkCharacter({ ...shyOne, personality: { ...shyOne.personality, shy: "hide" } }).join("\n"), /personality\.shy/);
  assert.equal(lookOf(shyOne).shy, "glance");
});

test("its first quiet moment is shy, and its quirks take turns after it", () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => quirkAt(i, ["balance", "pointe"], "glance")), ["glance", "balance", "pointe", "balance"]);
  assert.deepEqual([0, 1, 2].map((i) => quirkAt(i, ["sit", "curl"], null)), ["sit", "curl", "sit"], "as before, for one that is not shy");
});

test("once it has arrived it glances away before it presents the title", () => {
  const A = build({ character: shyOne }).actors[0];
  const [at, pose] = A.track.intro.shy;
  assert.equal(pose, "glance");
  assert.ok(A.track.arms.some((k) => k[0] === at && k[1] === "glance"));
  const present = A.track.arms.find((k) => k[1] === "present");
  assert.ok(present[0] >= at + SHY_TIME - 1e-9, "it presents once its shy moment is over");
});

test("cast into a board, a shy look glances as it arrives there, and one that is not shy does not", () => {
  const S = build({ character: "stuart", intro: "hop" });
  const B = recast(S.actors[0], lookOf({ ...shyOne, contract: "stuart" }), [...S.palette], S.elements);
  assert.equal(B.track.intro.shy[1], "glance");
  assert.ok(B.track.arms.some((k) => k[1] === "glance"));
  const own = build({ character: { ...shyOne, contract: "stuart" } });
  const P = recast(own.actors[0], lookOf(pencil), [...own.palette], own.elements);
  assert.ok(!P.track.arms.some((k) => k[1] === "glance" && Math.abs(k[0] - own.actors[0].track.intro.shy[0]) < 1e-9), "the board's guide's shy glance goes with it");
});
