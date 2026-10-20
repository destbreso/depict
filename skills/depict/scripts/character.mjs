#!/usr/bin/env node
// Looks at a character before it presents a board:
//   node scripts/character.mjs <character> --out <folder> [--wear a,b] [--hold thing]
// <character> is a built-in one (marker, stuart) or a character module of your
// own (path/to/character.mjs, made as references/characters.md says). Checks it,
// then writes into <folder>: <id>-sheet.svg and .png (every feeling, pose and
// costume side by side) and <id>-test-1.html to -3.html, short boards it
// presents, each in other clothes and arriving and leaving its own ways, to
// watch it move: how it comes alive, points, steps aside, hops between ideas,
// feels, and says goodbye. Fails on any problem in the character. With
// DEPICT_BLOCKED=1 it also prints, for each test, what stood in the way of each
// thing the guide only looked at.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { needsWebSocketFlag, open } from "./chrome.mjs";
import { CHARACTERS, checkCharacter, resolve } from "../kit/characters/index.mjs";
import { fitsContract } from "../kit/look.mjs";
import { sheet } from "../kit/sheet.mjs";
import { normalize } from "../kit/model.mjs";
import { compose } from "../kit/compose.mjs";
import { time } from "../kit/timeline.mjs";
import { hand } from "../kit/fonts.mjs";
import { page, sceneOf } from "../kit/page.mjs";
import { audit, report } from "../kit/audit.mjs";
import { HOLD } from "../kit/rig.mjs";

if (needsWebSocketFlag()) process.exit();
const args = process.argv.slice(2);
const which = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
if (!which || !opt("out")) {
  console.error("usage: node scripts/character.mjs <marker | stuart | path/to/character.mjs> --out <folder> [--wear a,b] [--hold thing]");
  process.exit(2);
}
const raw = CHARACTERS[which] ?? (await import(pathToFileURL(path.resolve(which)).href)).default;
// its module, and, for a character drawn to another's body, that its drawing keeps to that body
const problems = [...checkCharacter(raw), ...fitsContract(raw)];
if (problems.length) {
  console.error(`${which}: ${problems.length} problem${problems.length > 1 ? "s" : ""} to fix:`);
  for (const m of problems) console.error(`  - ${m}`);
  process.exit(1);
}
const out = path.resolve(opt("out"));
fs.mkdirSync(out, { recursive: true });
// the character as the kit sees it (one drawn to another's body has that body), and as a board names it
const C = resolve(raw);
const character = CHARACTERS[raw.id] === raw ? raw.id : raw;
const own = Object.keys(C.costumes ?? {});
const shared = (C.wear ?? []).filter((w) => w !== "glasses");
const asked = opt("wear") ? opt("wear").split(",") : null;
const holding = opt("hold");

// the sheet: every feeling, every pose, and its costumes (its own first)
const cast = (wear = []) => ({ character, wear });
const feels = ["happy", "excited", "surprised", "worried", "thinking", "proud", "wink", "sad"];
const poses = ["rest", "point", "present", "wave", "cheer", "shrug", "scratch", "salute", ...(C.personality?.quirks ?? []).filter((q) => C.poses[q])];
const hats = shared.filter((w) => ["grad-cap", "hard-hat", "headphones", "party-hat", "crown", "beanie", "chef-hat"].includes(w));
// its outfits (the costumes of each of the drawings it came from, worn together), or its own costumes in one
const outfits = C.outfits?.length ? C.outfits : own.length ? [{ name: own.join(" + "), wear: own.filter((w) => !C.costumes[w].hat || w === own.find((x) => C.costumes[x].hat)) }] : [];
const dressed = [
  ...outfits.map((o, i) => ({ label: `${o.name}: ${o.wear.join(" + ")}`, wear: o.wear, pose: i ? "rest" : "wave", feel: i ? "surprised" : "happy" })),
  ...(asked ? [{ label: asked.join(" + "), wear: asked, hold: holding }] : []),
  ...hats.slice(0, 4).map((w, i) => ({ label: w + (i === 1 ? " + book" : ""), wear: [w], hold: i === 1 ? "book" : null })),
  ...(shared.includes("bow-tie") ? [{ label: "bow-tie + pencil", wear: ["bow-tie"], hold: "pencil" }] : []),
  { label: "pointer", wear: [], hold: "pointer", pose: "point" },
].slice(0, 9);
const rows = [
  { title: "feelings", cells: feels.map((f) => ({ label: f, cast: cast(), feel: f })) },
  { title: "poses", cells: poses.map((p) => ({ label: p, cast: cast(), pose: p })) },
  { title: "costumes", cells: dressed.map((d) => ({ label: d.label, cast: cast(d.wear), pose: d.pose, feel: d.feel, hold: d.hold })) },
];
const svgFile = path.join(out, `${C.id}-sheet.svg`);
const named = C.name.charAt(0).toUpperCase() + C.name.slice(1);
const svg = sheet(rows, { title: `${named}${C.credit ? `, ${C.credit.note.split(":")[0].replace(/^Created/, "created")}` : ""}` });
fs.writeFileSync(svgFile, svg);
const [, W, H] = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/).map(Number);
const s = await open(svgFile, { width: Math.ceil(W), height: Math.ceil(H), scale: 1, wait: 300 });
const png = path.join(out, `${C.id}-sheet.png`);
await s.shot(png, { x: 0, y: 0, w: W, h: H });
await s.close();
console.log(`${path.relative(process.cwd(), png)}: ${feels.length} feelings, ${poses.length} poses, ${dressed.length} costumes`);

// the tests: a short board it presents, three times, each in other clothes and with other ways to arrive and leave
const intros = C.personality.intros;
const outros = C.personality.outros;
const props = HOLD.filter((x) => x !== "pointer");
// as it is first, then in each of its outfits, then in a shared hat holding something, three in all
const looks = [{ wear: asked ?? [], hold: holding }, ...outfits.map((o) => ({ wear: o.wear, hold: null })), { wear: hats.slice(0, 1), hold: "book" }, { wear: hats.slice(-1), hold: props[2] }].slice(0, 3);
const variants = looks.map((v, i) => ({ ...v, intro: intros[i % intros.length], outro: outros[i % outros.length] }));
const icon = (id, name, label) => ({ id, icon: name, label, size: "large" });
const test = (v, n) => ({
  title: `Meet ${C.name}`,
  accent: "#c43f0a",
  seed: 11 + n,
  guide: { character, wear: v.wear, ...(v.hold ? { hold: v.hold } : {}), intro: v.intro, outro: v.outro },
  regions: [
    {
      // a staircase, so its finger has a clear way to each one from beside them
      id: "row",
      title: "Things to point at",
      layout: "grid",
      items: [
        { id: "circle", sketch: [{ d: "M50 10 C72 10 90 28 90 50 C90 72 72 90 50 90 C28 90 10 72 10 50 C10 28 28 10 50 10 Z", fill: "blue" }], label: "A circle", at: [0, 0] },
        { id: "square", sketch: [{ d: "M14 14 H86 V86 H14 Z", fill: "yellow" }], label: "A square", at: [1, 0.55] },
        { id: "triangle", sketch: [{ d: "M50 10 L90 86 H10 Z", fill: "green" }], label: "A triangle", at: [2, 1.1] },
      ],
    },
    { id: "feel", title: "How it feels", layout: "grid", items: [{ ...icon("happy", "smile", "Happy"), at: [0, 0] }, { ...icon("wow", "zap", "Excited"), at: [1, 0.55] }, { ...icon("worry", "cloud-rain", "Worried"), at: [2, 0] }, { ...icon("idea", "lightbulb", "Thinking"), at: [3, 0.55] }] },
    { id: "moves", title: "How it moves", items: [icon("shrug", "circle-help", "A shrug"), icon("bye", "hand", "A wave")] },
  ],
  beats: [
    { say: `Hello! I'm ${C.name}.`, draw: ["title"] },
    { say: "Here is a circle.", draw: ["row", "circle"] },
    { say: "A square comes next.", draw: ["square"] },
    { say: "And a triangle, at the end of the row.", draw: ["triangle"], feel: "excited" },
    { say: "Look at that triangle!", draw: [{ note: "three sides", near: "triangle", side: "below" }], mark: [{ circle: "triangle" }] },
    { say: "Now, how it feels. Happy!", draw: ["feel", "happy"] },
    { say: "Excited!", draw: ["wow"], act: "cheer", feel: "excited" },
    { say: "A little worried.", draw: ["worry"], feel: "worried" },
    { say: "And thinking hard.", draw: ["idea"], act: "scratch", feel: "thinking" },
    { say: "Got it! Proud of that one.", draw: [{ note: "an idea", near: "idea", side: "below" }], mark: [{ underline: "idea" }], feel: "proud" },
    { say: "Then, how it moves. A shrug.", draw: ["moves", "shrug"], act: "shrug", feel: "worried" },
    { say: "And a wave, to say goodbye.", draw: ["bye"], act: "wave" },
  ],
});
for (const [i, v] of variants.entries()) {
  const { board, errors } = normalize(test(v, i + 1));
  if (errors.length) {
    console.error(`test ${i + 1}: ${errors.join("; ")}`);
    process.exit(1);
  }
  const comp = compose(board, hand(board.hand));
  const tl = time(board, comp);
  const file = path.join(out, `${C.id}-test-${i + 1}.html`);
  fs.writeFileSync(file, page(board, sceneOf(board, comp, tl)));
  const verdict = report(audit(board, comp, tl));
  const g = tl.actors[0];
  if (process.env.DEPICT_BLOCKED) for (const b of g.blocked) console.error(`  test ${i + 1} ${b.t.toFixed(1)}s ${b.id} <- ${b.by}`);
  const steps = g.track.moves.filter((m) => m.step).length;
  const dress = [...board.cast.wear, ...(board.cast.hold ? [`holding a ${board.cast.hold}`] : [])].join(", ") || "as it is";
  console.log(`${path.relative(process.cwd(), file)}: ${dress}; comes alive with a ${board.cast.intro}, says goodbye with a ${board.cast.outro}; ${steps} steps aside, ${g.blocked.length} looks; ${verdict.ok ? "audit passed" : "audit FAILED"}`);
}
