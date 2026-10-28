#!/usr/bin/env node
// Revisits a character: how it looks and moves now, kept so a later version can be held against it, and its drawing
// and its motion keep improving without losing its look (references/characters.md, Revisiting a character):
//   node scripts/revisit.mjs <character> --out <folder> [--against <folder of an earlier revisit>]
// Writes into <folder> what scripts/character.mjs writes (its model sheet and three test boards), a contact sheet of
// each test board (a frame every two seconds, <id>-test-N-frames.png), the guide close up in each of those frames
// (<id>-test-N-guide.png) and revisit.json (a fingerprint of the sheet
// and of every frame, every half second of each board's clock). With --against, says what changed since then (the
// sheet, and which frames of which test) and writes <id>-then-now.png: the sheet and each test's frames, then and now,
// side by side. Needs Chrome, as character.mjs does.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { needsWebSocketFlag, open } from "./chrome.mjs";

if (needsWebSocketFlag()) process.exit();
const args = process.argv.slice(2);
const which = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const opt = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : null);
if (!which || !opt("out")) {
  console.error("usage: node scripts/revisit.mjs <marker | stuart | path/to/character.mjs> --out <folder> [--against <folder>]");
  process.exit(2);
}
const out = path.resolve(opt("out"));
const here = path.dirname(fileURLToPath(import.meta.url));
// its sheet and its test boards, exactly as scripts/character.mjs makes them
const made = spawnSync(process.execPath, [path.join(here, "character.mjs"), which, "--out", out], { stdio: "inherit" });
if (made.status !== 0) process.exit(made.status ?? 1);
const sheet = fs.readdirSync(out).find((f) => f.endsWith("-sheet.png"));
const id = sheet.replace(/-sheet\.png$/, "");
const hash = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
const STEP = 0.5;
const EVERY = 2;

/** A page of pictures in a grid (columns of `width` px, each with its caption), as a PNG. */
async function grid(items, file, { columns, width }) {
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#fbfaf7;font:600 16px system-ui,sans-serif;color:#1b1b19}.g{display:grid;grid-template-columns:repeat(${columns},${width}px);gap:10px}figure{margin:0}img{width:${width}px;display:block;border:1px solid #ddd}figcaption{padding:4px 0}</style><div class="g">${items.map((x) => `<figure><img src="${x.src}"><figcaption>${x.caption}</figcaption></figure>`).join("")}</div>`;
  const page = file.replace(/\.png$/, ".html");
  fs.writeFileSync(page, html);
  const s = await open(pathToFileURL(page).href, { width: columns * (width + 10) + 32, height: 400, scale: 1, wait: 400 });
  const [w, h] = await s.evaluate("[document.documentElement.scrollWidth, document.documentElement.scrollHeight]");
  await s.shot(file, { x: 0, y: 0, w, h });
  await s.close();
  fs.rmSync(page);
}

const record = { character: id, sheet: hash(fs.readFileSync(path.join(out, sheet))), tests: {} };
for (const test of fs.readdirSync(out).filter((f) => /-test-\d+\.html$/.test(f)).sort()) {
  const s = await open(pathToFileURL(path.join(out, test)).href + "?capture", { width: 960, height: 540, scale: 1, wait: 600 });
  const duration = await s.evaluate("window.depict.duration");
  const frames = [];
  const kept = [];
  const close = [];
  for (let t = 0, i = 0; t <= duration + 1e-9; t += STEP, i++) {
    await s.evaluate(`window.depict.render(${t.toFixed(3)}), true`);
    const shot = await s.send("Page.captureScreenshot", { format: "png" });
    const buf = Buffer.from(shot.data, "base64");
    frames.push(hash(buf));
    if (i % Math.round(EVERY / STEP) === 0) {
      kept.push({ src: `data:image/png;base64,${shot.data}`, caption: `${t.toFixed(0)} s` });
      // the guide close up, as large as the frame's height allows round it
      const box = await s.evaluate(`(() => { const g = document.querySelector(".dp-guide"); if (!g || g.style.display === "none") return null; const r = g.getBoundingClientRect(); return r.width ? [r.left, r.top, r.width, r.height] : null; })()`);
      if (box) {
        const side = Math.min(540, Math.max(box[2], box[3]) * 1.5 + 24);
        const [x, y] = [Math.max(0, Math.min(960 - side, box[0] + box[2] / 2 - side / 2)), Math.max(0, Math.min(540 - side, box[1] + box[3] / 2 - side / 2))];
        const zoom = await s.send("Page.captureScreenshot", { format: "png", clip: { x, y, width: side, height: side, scale: 240 / side } });
        close.push({ src: `data:image/png;base64,${zoom.data}`, caption: `${t.toFixed(0)} s` });
      }
    }
  }
  await s.close();
  record.tests[test] = { duration, step: STEP, frames };
  await grid(kept, path.join(out, test.replace(/\.html$/, "-frames.png")), { columns: 6, width: 320 });
  if (close.length) await grid(close, path.join(out, test.replace(/\.html$/, "-guide.png")), { columns: 8, width: 240 });
  console.log(`${path.relative(process.cwd(), path.join(out, test))}: ${frames.length} frames kept, its contact sheet beside it`);
}
fs.writeFileSync(path.join(out, "revisit.json"), JSON.stringify(record, null, 1));

const against = opt("against") && path.resolve(opt("against"));
if (against) {
  const then = JSON.parse(fs.readFileSync(path.join(against, "revisit.json"), "utf8"));
  const lines = [`${id}: then (${path.relative(process.cwd(), against)}) and now (${path.relative(process.cwd(), out)})`];
  lines.push(`  its sheet: ${then.sheet === record.sheet ? "the same" : "changed"}`);
  for (const [test, now] of Object.entries(record.tests)) {
    const was = then.tests[test];
    if (!was) {
      lines.push(`  ${test}: new`);
      continue;
    }
    const changed = now.frames.map((f, i) => (f !== was.frames[i] ? i * STEP : null)).filter((t) => t != null);
    const length = was.frames.length === now.frames.length ? "" : `, ${was.duration} s then and ${now.duration} s now`;
    lines.push(`  ${test}: ${changed.length ? `${changed.length} of ${now.frames.length} frames changed, from ${changed[0]} s to ${changed.at(-1)} s` : "every frame the same"}${length}`);
  }
  console.log(lines.join("\n"));
  const pairs = [[sheet, "its sheet"], ...Object.keys(record.tests).flatMap((t) => [[t.replace(/\.html$/, "-guide.png"), `${t.replace(/\.html$/, "")}, the guide`], [t.replace(/\.html$/, "-frames.png"), t.replace(/\.html$/, "")]]).filter(([f]) => fs.existsSync(path.join(out, f)) && fs.existsSync(path.join(against, f)))];
  const items = pairs.flatMap(([f, what]) => [
    { src: pathToFileURL(path.join(against, f)).href, caption: `${what}, then` },
    { src: pathToFileURL(path.join(out, f)).href, caption: `${what}, now` },
  ]);
  await grid(items, path.join(out, `${id}-then-now.png`), { columns: 2, width: 900 });
  console.log(`${path.relative(process.cwd(), path.join(out, `${id}-then-now.png`))}: then and now, side by side`);
}
