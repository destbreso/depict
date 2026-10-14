#!/usr/bin/env node
// Looks at a board's page in a real browser: node scripts/check.mjs <page.html> [--out shots]
//
// Takes a picture of the board at the end of every beat (as the video shows
// it, 1920 x 1080), of the closing overview, and of the page itself with its
// controls; fails on any error the page logs. Read the pictures before
// handing the board over: the audit measures, the pictures show.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { needsWebSocketFlag, open } from "./chrome.mjs";

if (needsWebSocketFlag()) process.exit(0);
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const i = args.indexOf("--out");
if (!file) {
  console.error("usage: node scripts/check.mjs <page.html> [--out shots]");
  process.exit(2);
}
const name = path.basename(file).replace(/\.html$/, "");
const dir = path.resolve(i >= 0 ? args[i + 1] : path.join(path.dirname(file), "shots"));
fs.mkdirSync(dir, { recursive: true });
const url = pathToFileURL(path.resolve(file)).href;
const shots = [];
const problems = [];

const board = await open(`${url}?capture`, { width: 1920, height: 1080, scale: 1, wait: 300 });
const beats = await board.evaluate("depict.beats");
const duration = await board.evaluate("depict.duration");
for (const [n, b] of beats.entries()) {
  await board.evaluate(`depict.render(${Math.min(b.t1 - 0.05, b.draw1 + 0.3)}); new Promise(r => requestAnimationFrame(() => r()))`);
  shots.push(await board.shot(path.join(dir, `${name}-beat-${String(n + 1).padStart(2, "0")}.png`)));
}
await board.evaluate(`depict.render(${duration}); new Promise(r => requestAnimationFrame(() => r()))`);
shots.push(await board.shot(path.join(dir, `${name}-overview.png`)));
problems.push(...board.problems);
await board.close();

const pageView = await open(url, { width: 1280, height: 800, scale: 1, wait: 400 });
shots.push(await pageView.shot(path.join(dir, `${name}-page.png`)));
problems.push(...pageView.problems);
await pageView.close();

for (const s of shots) console.log(path.relative(process.cwd(), s));
if (problems.length) {
  console.error(`check failed: the page reported ${problems.length} problem${problems.length > 1 ? "s" : ""}`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`check passed: ${beats.length} beats and the overview pictured; read them before handing the board over`);
