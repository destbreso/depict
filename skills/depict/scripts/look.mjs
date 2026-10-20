#!/usr/bin/env node
// A character's look, the one file that lets it present any board made for its body:
//   node scripts/look.mjs <character> [--out <file>]
// <character> is a built-in one (marker, stuart) or a character module of your
// own (path/to/character.mjs). It is checked first, as scripts/character.mjs
// checks it, and, when it is drawn to another's body (`contract`), that its
// drawing keeps to that body. The look is the character drawn once: its body
// and face, its arms and hands, each costume it can wear apart (a board shows
// the ones it wears) and what it is made of. A board's page casts it in place
// of its own guide as it plays (`depict.cast(look)`, or a host's message
// `{ depict: "cast", look }`), with no board built again: see
// references/characters.md, "Characters that share a body".
// The file is JSON (<id>.look.json by default), or, when --out ends in .js, a
// script that puts the look in window.depictLooks[<id>], for a page opened
// from the disk, where nothing can be fetched.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CHARACTERS, checkCharacter, contractOf, resolve } from "../kit/characters/index.mjs";
import { fitsContract, lookOf } from "../kit/look.mjs";

const args = process.argv.slice(2);
const who = args.find((a) => !a.startsWith("--"));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
if (!who) {
  console.error("usage: node scripts/look.mjs <character: marker, stuart or path/to/character.mjs> [--out <file.look.json | file.look.js>]");
  process.exit(2);
}
const C = CHARACTERS[who] ?? (await import(pathToFileURL(path.resolve(who)).href)).default;
const problems = [...checkCharacter(C), ...fitsContract(C)];
if (problems.length) {
  console.error(`${C?.id ?? who} is not ready to be a guide:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
const look = lookOf(C);
const out = path.resolve(opt("out") ?? `${C.id}.look.json`);
const json = JSON.stringify(look);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, out.endsWith(".js") ? `(window.depictLooks = window.depictLooks || {})[${JSON.stringify(look.id)}] = ${json};\n` : json + "\n");
const R = resolve(C);
const body = contractOf(R) === R.id ? "its own body" : `${CHARACTERS[contractOf(R)].name}'s body`;
const costumes = Object.keys(look.wear);
console.log(`${path.relative(process.cwd(), out)}: ${look.name}, ${body} (${look.h} tall), ${costumes.length} costumes (${costumes.join(", ") || "none"}), ${Math.round(fs.statSync(out).size / 1024)} kB`);
