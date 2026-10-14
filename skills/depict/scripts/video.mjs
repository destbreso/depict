#!/usr/bin/env node
// A board's page as a video: node scripts/video.mjs <page.html> [--out board.mp4] [--fps 30] [--speed 1]
//
// The page draws itself as a pure function of time, so each frame is
// depict.render(t) and a screenshot; ffmpeg encodes them. The file is 16:9 at
// 1920 x 1080, H.264 in studio-range yuv420p with Rec. 709 tags, a silent
// AAC track and the index first: the form social sites take without
// re-encoding problems (LinkedIn drops files with an ICC profile, full-range
// color or no audio track, without an error). Needs Chrome and ffmpeg.
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { needsWebSocketFlag, open } from "./chrome.mjs";

if (needsWebSocketFlag()) process.exit(0);
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
if (!file) {
  console.error("usage: node scripts/video.mjs <page.html> [--out board.mp4] [--fps 30] [--speed 1]");
  process.exit(2);
}
if (spawnSync("ffmpeg", ["-version"]).status !== 0) {
  console.error("ffmpeg is needed for a video (https://ffmpeg.org); the page itself needs nothing");
  process.exit(1);
}
const fps = Number(opt("fps", 30));
const out = path.resolve(opt("out", file.replace(/\.html$/, "") + ".mp4"));
const page = await open(`${path.resolve(file)}`.replace(/^/, "file://") + "?capture", { width: 1920, height: 1080, scale: 1, wait: 400 });
const duration = await page.evaluate("depict.duration");
// a video plays at the board's own speed (a child's board at half speed) unless --speed says otherwise
const speed = Number(opt("speed", await page.evaluate("depict.speed || 1")));
const frames = Math.ceil((duration / speed) * fps);
// prettier-ignore
const ff = spawn("ffmpeg", [
  "-loglevel", "error", "-y",
  "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
  "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
  "-map", "0:v", "-map", "1:a", "-shortest", "-map_metadata", "-1",
  // screenshots are sRGB: convert with the Rec. 709 matrix into studio range, and say so
  "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709",
  "-c:v", "libx264", "-preset", "veryslow", "-tune", "animation", "-crf", "23", "-g", String(fps * 2), "-profile:v", "high", "-level", "4.0",
  "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
  "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
  "-movflags", "+faststart+write_colr",
  out,
], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((resolve) => ff.on("close", resolve));
const started = Date.now();
for (let f = 0; f <= frames; f++) {
  await page.evaluate(`depict.render(${((f / fps) * speed).toFixed(4)}); new Promise(r => requestAnimationFrame(() => r()))`);
  const shot = await page.send("Page.captureScreenshot", { format: "png" });
  if (!ff.stdin.write(Buffer.from(shot.data, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % (fps * 10) === 0) process.stdout.write(`\r${Math.round((100 * f) / frames)}%`);
}
ff.stdin.end();
const code = await done;
await page.close();
if (code !== 0) {
  console.error("ffmpeg failed");
  process.exit(1);
}
const mb = (Number(spawnSync("stat", ["-f", "%z", out]).stdout) || 0) / 1e6;
console.log(`\r${path.relative(process.cwd(), out)}: ${frames} frames at ${fps} fps, ${(duration / speed).toFixed(1)} s, ${mb ? mb.toFixed(1) + " MB, " : ""}made in ${Math.round((Date.now() - started) / 1000)} s`);
