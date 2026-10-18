#!/usr/bin/env node
// An animated GIF of a board, or of moments of several boards in a row, for a
// place that cannot play the page itself (a README on GitHub, a post):
//   node scripts/gif.mjs <page.html>[@<from>-<to>] [<page.html>@<from>-<to> ...] --out <file.gif> [--width 640] [--fps 12]
// Each page plays from <from> to <to> seconds (the whole board when no range
// is given), at the board's own speed, frames rendered with the page's own
// depict.render(t) in headless Chrome, so the GIF shows exactly what the page
// does. Needs Chrome and ffmpeg. Keep it short: a GIF of ten or fifteen
// seconds at 640 wide stays a few megabytes.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { needsWebSocketFlag, open } from "./chrome.mjs";

if (needsWebSocketFlag()) process.exit();
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = opt("out");
const width = Number(opt("width", 640));
const fps = Number(opt("fps", 12));
const parts = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!out || !parts.length) {
  console.error("usage: node scripts/gif.mjs <page.html>[@from-to] ... --out <file.gif> [--width 640] [--fps 12]");
  process.exit(2);
}
if (spawnSync("ffmpeg", ["-version"]).status !== 0) {
  console.error("gif.mjs needs ffmpeg on the PATH");
  process.exit(1);
}
const frames = fs.mkdtempSync(path.join(os.tmpdir(), "depict-gif-"));
let n = 0;
for (const part of parts) {
  const [, file, a, b] = part.match(/^(.*?)(?:@([\d.]+)-([\d.]+))?$/);
  if (!fs.existsSync(file)) {
    console.error(`no page at ${file}`);
    process.exit(1);
  }
  const s = await open(pathToFileURL(path.resolve(file)).href + "?capture", { width: 1920, height: 1080, scale: width / 1920, wait: 600 });
  const [duration, speed] = await s.evaluate("[window.depict.duration, window.depict.speed]");
  const from = a != null ? Number(a) : 0;
  const to = b != null ? Number(b) : duration;
  // the board's own pace: a child's board, at half speed, takes twice as long on screen
  const step = speed / fps;
  for (let t = from; t <= to + 1e-9; t += step) {
    await s.evaluate(`window.depict.render(${t.toFixed(4)}), true`);
    await s.shot(path.join(frames, `${String(n++).padStart(5, "0")}.png`));
  }
  await s.close();
}
// one palette for the whole GIF, and a light dither, so it stays small and looks like the page
const r = spawnSync(
  "ffmpeg",
  ["-loglevel", "error", "-y", "-framerate", String(fps), "-i", path.join(frames, "%05d.png"), "-vf", `split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, "-loop", "0", out],
  { encoding: "utf8" },
);
fs.rmSync(frames, { recursive: true, force: true });
if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(1);
}
console.log(`${path.relative(process.cwd(), out)}: ${n} frames, ${(n / fps).toFixed(1)} s, ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
