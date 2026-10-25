#!/usr/bin/env node
// Builds a board's page: node scripts/build.mjs <board.mjs> [--out page.html] [--audit] [--lang es]
// Writes <board>.html next to the script (or --out) and prints what it made;
// --audit prints every finding and fails on a problem. --lang builds it in another language, from the table of
// translations beside it (strings.<lang>.json, made with scripts/strings.mjs): composed again with those words, and
// failing on any text it has no translation for.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { normalize } from "../kit/model.mjs";
import { compose } from "../kit/compose.mjs";
import { time } from "../kit/timeline.mjs";
import { hand } from "../kit/fonts.mjs";
import { page, sceneOf } from "../kit/page.mjs";
import { audit, report } from "../kit/audit.mjs";
import { readTable, translate } from "../kit/strings.mjs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: node scripts/build.mjs <board.mjs> [--out page.html]");
  process.exit(2);
}
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const src = path.resolve(file);
const lang = opt("lang");
let { default: input } = await import(pathToFileURL(src).href);
if (lang) {
  const tableFile = path.join(path.dirname(src), `strings.${lang}.json`);
  if (!fs.existsSync(tableFile)) {
    console.error(`${path.basename(src)}: no translations into "${lang}" (${path.relative(process.cwd(), tableFile)}): make them with scripts/strings.mjs`);
    process.exit(1);
  }
  const { board: words, missing } = translate(input, readTable(fs.readFileSync(tableFile, "utf8"), lang));
  if (missing.length) {
    console.error(`${path.basename(src)}: ${missing.length} text${missing.length > 1 ? "s" : ""} with no translation into "${lang}":`);
    for (const m of missing.slice(0, 20)) console.error(`  - ${JSON.stringify(m)}`);
    process.exit(1);
  }
  input = words;
}
const { board, errors } = normalize(input);
if (lang) board.lang = lang;
if (errors.length) {
  console.error(`${path.basename(src)}: ${errors.length} problem${errors.length > 1 ? "s" : ""} to fix:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
// a live part's figure is a Dissect page next to the board (or a URL); the page links to it relative to where it is written
const out = path.resolve(opt("out") ?? src.replace(/(\.board)?\.m?js$/, "") + (lang ? `.${lang}` : "") + ".html");
for (const it of board.regions.flatMap((r) => r.items)) {
  if (!it.figure) continue;
  if (/^https?:\/\//.test(it.figure)) it.figureUrl = it.figure;
  else {
    const abs = path.resolve(path.dirname(src), it.figure);
    if (!fs.existsSync(abs)) {
      console.error(`${path.basename(src)}: item "${it.id}": no figure at ${path.relative(process.cwd(), abs)}`);
      process.exit(1);
    }
    it.figureUrl = path.relative(path.dirname(out), abs).split(path.sep).join("/");
  }
}
const comp = compose(board, hand(board.hand));
const tl = time(board, comp);
const scene = sceneOf(board, comp, tl);
const html = page(board, scene);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
const findings = audit(board, comp, tl);
const verdict = report(findings);
const fmt = (s) => {
  const r = Math.round(s);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
};
// its length is how long it takes to watch, at its own speed
console.log(`${path.relative(process.cwd(), out)}: ${board.beats.length} beats, ${fmt(tl.duration / (board.speed ?? 1))}, ${tl.strokes.length} strokes, ${(html.length / 1024).toFixed(0)} KB`);
if (args.includes("--audit") || !verdict.ok) {
  console.log(verdict.text);
  if (args.includes("--audit") && !verdict.ok) process.exit(1);
}
