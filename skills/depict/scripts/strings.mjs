#!/usr/bin/env node
// The table of translations of a board, to fill in: node scripts/strings.mjs <board.mjs | folder> --lang es
// For a board (or every boards/<id>/board.mjs of a folder), writes strings.<lang>.json beside it: every text it draws
// or says, in the order its script has them, each with its translation, the ones already written kept, a new text
// empty, a text no longer on the board dropped. Then says how many are still to translate. scripts/build.mjs --lang
// builds a board from its table, and fails while a text has no translation.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { stringsOf } from "../kit/strings.mjs";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const langAt = args.indexOf("--lang");
const lang = langAt >= 0 ? args[langAt + 1] : null;
if (!target || !lang || !/^[a-z]{2}(-[A-Z]{2})?$/.test(lang)) {
  console.error("usage: node scripts/strings.mjs <board.mjs | folder with boards/<id>/board.mjs> --lang <es, pt-BR, ...>");
  process.exit(2);
}
const at = path.resolve(target);
const files = fs.statSync(at).isDirectory()
  ? fs
      .readdirSync(path.join(at, "boards"))
      .map((id) => path.join(at, "boards", id, "board.mjs"))
      .filter((f) => fs.existsSync(f))
  : [at];

let todo = 0;
for (const file of files) {
  const { default: board, meta } = await import(pathToFileURL(file).href);
  // a lesson only planned has nothing drawn yet
  if (meta?.status === "planned" || !board?.beats) continue;
  const out = path.join(path.dirname(file), `strings.${lang}.json`);
  const had = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")).strings ?? {} : {};
  const texts = stringsOf(board);
  const strings = Object.fromEntries(texts.map((s) => [s, had[s] ?? ""]));
  const missing = texts.filter((s) => !strings[s]?.trim()).length;
  const dropped = Object.keys(had).filter((s) => !(s in strings)).length;
  fs.writeFileSync(out, JSON.stringify({ lang, strings }, null, 2) + "\n");
  todo += missing;
  const name = path.relative(process.cwd(), out);
  console.log(`${name}: ${texts.length} texts, ${missing ? `${missing} to translate` : "all translated"}${dropped ? `, ${dropped} no longer on the board dropped` : ""}`);
}
if (files.length > 1) console.log(`${todo ? `${todo} texts to translate` : "every text translated"} into "${lang}"`);
