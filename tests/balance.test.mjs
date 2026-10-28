// A quirk held a while: a pose of its own that says how long it holds it (balancing on its tip while it thinks or
// waits), held while the moment stays quiet; and the poses of its own, which a beat can ask for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stump } from "./fixtures.mjs";
import { checkCharacter } from "../skills/depict/kit/characters/index.mjs";
import { quirk } from "../skills/depict/kit/act.mjs";
import { normalize } from "../skills/depict/kit/model.mjs";

const balancer = { ...stump, id: "balancer", poses: { ...stump.poses, balance: { hold: 2.4, body: { pivot: [0, 0.99], sway: [4, 1.2] } } }, personality: { ...stump.personality, quirks: ["balance"] } };

test("a pose held a while is a pose, and its hold is a time", () => {
  assert.deepEqual(checkCharacter(balancer), []);
  assert.match(checkCharacter({ ...balancer, poses: { balance: { hold: -1 } } }).join("\n"), /poses\.balance\.hold/);
});

test("a quirk holds its pose for as long as it says while the moment stays quiet, and no longer", () => {
  const track = { arms: [[0, "rest"], [9, "point"]], moves: [], look: [] };
  assert.equal(quirk(track, "balance", 2, 3, balancer), true);
  assert.deepEqual(track.arms.slice(-2), [[2, "balance"], [2 + 2.4 - 0.1, "rest"]]);
  // the next gesture comes sooner: it balances until just before it
  const short = { arms: [[0, "rest"], [3.6, "point"]], moves: [], look: [] };
  quirk(short, "balance", 2, 3, balancer);
  assert.deepEqual(short.arms.slice(-2), [[2, "balance"], [3.5, "rest"]]);
  // a pose that says no hold is the moment's, as before
  const glance = { arms: [[0, "rest"], [9, "point"]], moves: [], look: [] };
  quirk(glance, "glance", 2, 3, balancer);
  assert.deepEqual(glance.arms.slice(-2), [[2, "glance"], [3, "rest"]]);
});

test("a beat can ask for a pose of its own", () => {
  const board = (act) => ({ title: "Balance", guide: { character: balancer }, regions: [{ id: "r", items: [{ id: "a", icon: "cpu", label: "One" }] }], beats: [{ say: "Watch me.", draw: ["title", "r", "a"], act }] });
  assert.deepEqual(normalize(board("balance")).errors, []);
  assert.match(normalize(board("dance")).errors.join("\n"), /act "dance"/);
});
