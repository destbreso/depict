#!/usr/bin/env node
// Builds a series of boards that belong together (a course, a set of lessons,
// one board per article) and the gallery they are picked from:
//   node scripts/series.mjs <folder>            every board
//   node scripts/series.mjs <folder> <id> ...   only those
//   --no-check                                  skip the browser pictures (faster; the gallery keeps the last ones)
// The folder holds boards/<id>/board.mjs, each a board script that may also
// export `meta` (anything the series wants to know about it: its order, its
// group, a link). An optional <folder>/series.mjs says how the gallery reads:
//   export default {
//     title: "Second grade math", intro: "Pick a picture to watch it drawn.",
//     look: "pick",                         // big tiles to choose from (for a child), or "review": cards with what the audit said
//     order: (meta, id) => meta.order,      // a number; the rest after, by the number in their id
//     group: (meta) => meta.topic,          // sections, in the order they first come
//     note: (meta, board) => meta.code,     // the small line under a title (default: its length and beats)
//     link: (meta) => ({ href, text }),     // a link on its card, or null
//   };
// Each board is built with the audit into <folder>/site/<id>.html; the check
// pictures every beat into <folder>/shots/<id>/ and its closing overview
// becomes site/<id>.png, and its cover site/<id>-cover.png: a frame of its own
// film, the end of the beat where its first picture is complete and the camera
// still holds on it (the beat that ends as the camera first flies on), the guide
// beside it; a board's meta can name another beat (`cover: 4`). A whole board is
// too small to read on a tile; its first picture, close, is what a child picks.
// site/report.json keeps what every build said (put
// together when it is written, so two builds running at once both keep theirs)
// and site/index.html is the gallery. Fails when any board fails.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const here = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith("--"));
if (!folder || !fs.existsSync(path.join(folder, "boards"))) {
  console.error("usage: node scripts/series.mjs <folder with boards/<id>/board.mjs> [id ...] [--no-check]");
  process.exit(2);
}
const root = path.resolve(folder);
const check = !args.includes("--no-check");
const cfgFile = path.join(root, "series.mjs");
const cfg = fs.existsSync(cfgFile) ? (await import(pathToFileURL(cfgFile).href)).default : {};
const metaOf = async (id) => {
  const file = path.join(root, "boards", id, "board.mjs");
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  return { meta: mod.meta ?? {}, title: mod.default?.title };
};
const numberIn = (id) => Number(id.match(/(\d+)(?!.*\d)/)?.[1] ?? Infinity);
const found = fs.readdirSync(path.join(root, "boards")).filter((d) => fs.existsSync(path.join(root, "boards", d, "board.mjs")));
const metas = new Map(await Promise.all(found.map(async (id) => [id, await metaOf(id)])));
const rank = (id) => {
  const n = cfg.order?.(metas.get(id).meta, id);
  return Number.isFinite(n) ? n : 1e6 + (Number.isFinite(numberIn(id)) ? numberIn(id) : 1e5);
};
const all = [...found].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
const chosen = args.filter((a, i) => a !== folder && !a.startsWith("--") && i > args.indexOf(folder));
for (const id of chosen) if (!all.includes(id)) {
  console.error(`no board "${id}" in ${path.relative(process.cwd(), path.join(root, "boards"))}`);
  process.exit(2);
}
const ids = chosen.length ? chosen : all;
const site = path.join(root, "site");
fs.mkdirSync(site, { recursive: true });

const report = {};
let failed = 0;
for (const id of ids) {
  const board = path.join(root, "boards", id, "board.mjs");
  const out = path.join(site, `${id}.html`);
  const b = spawnSync(process.execPath, [path.join(here, "build.mjs"), board, "--out", out, "--audit"], { encoding: "utf8" });
  const text = (b.stdout + b.stderr).trim();
  const ok = b.status === 0;
  if (!ok) failed++;
  const m = text.split("\n")[0].match(/: (\d+) beats, (\d+:\d+)/);
  const findings = text.split("\n").filter((l) => /^\s+(problem|warning) /.test(l)).map((l) => l.trim());
  const { meta, title } = metas.get(id);
  report[id] = { id, title: meta.title ?? title, meta, beats: m ? Number(m[1]) : null, length: m ? m[2] : null, ok, findings, built: new Date().toISOString().slice(0, 10) };
  console.log(`${ok ? "ok  " : "FAIL"} ${id}${m ? `  ${m[1]} beats, ${m[2]}` : ""}  ${findings.length ? `${findings.length} findings` : "clean"}`);
  if (!ok) console.log(text.split("\n").map((l) => `     ${l}`).join("\n"));
  if (ok && check) {
    const shots = path.join(root, "shots", id);
    const c = spawnSync(process.execPath, [path.join(here, "check.mjs"), out, "--out", shots], { encoding: "utf8" });
    if (c.status !== 0) {
      failed++;
      report[id].ok = false;
      console.log(`     check failed:\n${c.stdout}${c.stderr}`);
    } else {
      fs.copyFileSync(path.join(shots, `${id}-overview.png`), path.join(site, `${id}.png`));
      const beat = coverBeat(out, metas.get(id).meta);
      const shot = beat && path.join(shots, `${id}-beat-${String(beat).padStart(2, "0")}.png`);
      if (shot && fs.existsSync(shot)) fs.copyFileSync(shot, path.join(site, `${id}-cover.png`));
    }
  }
}

/** The beat whose last frame is a board's cover: its meta's `cover`, or the last beat that ends before the camera's second flight. */
function coverBeat(page, meta) {
  if (meta?.cover) return meta.cover;
  const line = fs.readFileSync(page, "utf8").split("\n").find((l) => l.startsWith("const SCENE = "));
  if (!line) return null;
  const scene = JSON.parse(line.slice("const SCENE = ".length).replace(/;\s*$/, ""));
  const flights = scene.camera.map((k) => k.t0).sort((a, b) => a - b);
  if (flights.length < 2) return null;
  const i = scene.beats.findLastIndex((b) => b.t1 <= flights[1] + 1e-6);
  return i >= 0 ? i + 1 : null;
}

// other builds may have written meanwhile: put only what this one built over what is there now
const reportFile = path.join(site, "report.json");
const fresh = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, "utf8")) : {};
for (const id of ids) fresh[id] = report[id];
fs.writeFileSync(reportFile, JSON.stringify(fresh, null, 2) + "\n");
fs.writeFileSync(path.join(site, "index.html"), gallery(all.map((id) => fresh[id]).filter(Boolean)));
console.log(`${path.relative(process.cwd(), path.join(site, "index.html"))}: ${all.length} boards${failed ? `, ${failed} failing` : ""}`);
process.exit(failed ? 1 : 0);

/** The gallery: big tiles to pick from, or cards that say what the audit found; in sections when the series groups its boards. */
function gallery(boards) {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const pick = cfg.look === "pick";
  const title = cfg.title ?? path.basename(root);
  // what each board says about itself is read from the board, never from an older report
  const metaOf = (b) => metas.get(b.id)?.meta ?? {};
  const groups = [];
  for (const b of boards) {
    const name = cfg.group?.(metaOf(b)) ?? "";
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, boards: [] }));
    g.boards.push(b);
  }
  const note = (b) => cfg.note?.(metaOf(b), b) ?? `${b.length ?? ""} · ${b.beats ?? ""} beats`;
  const card = (b) => {
    const link = cfg.link?.(metaOf(b));
    if (pick)
      return `<a class="tile${b.ok ? "" : " bad"}" href="${esc(b.id)}.html">
  <img src="${esc(b.id)}${fs.existsSync(path.join(site, `${b.id}-cover.png`)) ? "-cover" : ""}.png" alt="" loading="lazy">
  <span class="name">${esc(metaOf(b).title ?? b.title)}</span>
  <span class="note">${esc(note(b))}</span>
</a>`;
    const warnings = b.findings.filter((f) => f.startsWith("warning")).length;
    const problems = b.findings.filter((f) => f.startsWith("problem")).length;
    return `<article class="card${b.ok ? "" : " bad"}">
  <a class="pic" href="${esc(b.id)}.html"><img src="${esc(b.id)}.png" alt="The finished board for ${esc(b.title)}" loading="lazy"></a>
  <div class="txt">
    <h2><a href="${esc(b.id)}.html">${esc(metaOf(b).title ?? b.title)}</a></h2>
    <p class="meta">${esc(note(b))}${link ? ` · <a href="${esc(link.href)}">${esc(link.text)}</a>` : ""}</p>
    <p class="audit">${problems ? `${problems} problems, ` : ""}${warnings ? `${warnings} warnings` : "audit clean"}</p>
  </div>
</article>`;
  };
  const section = (g) => `<section>
${g.name ? `<h2 class="group">${esc(g.name)}</h2>\n` : ""}<div class="grid">
${g.boards.map(card).join("\n")}
</div>
</section>`;
  return `<!doctype html>
<html lang="${esc(cfg.lang ?? "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--paper:#fbfaf7;--ink:#1b1b19;--muted:#6b6a64;--line:rgba(40,36,24,.14);--accent:#c43f0a;color-scheme:light}
*{box-sizing:border-box}
body{margin:0;background:${pick ? "#f4efe2" : "#efece4"};color:var(--ink);font:${pick ? "18px/1.45" : "16px/1.5"} system-ui,-apple-system,"Segoe UI",sans-serif}
header{max-width:1200px;margin:0 auto;padding:36px 16px 4px}
h1{margin:0;font-size:${pick ? 34 : 28}px}
header p{margin:6px 0 0;color:var(--muted);max-width:70ch}
main{max-width:1200px;margin:0 auto;padding:8px 16px 48px}
.group{margin:28px 0 12px;font-size:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(${pick ? 280 : 340}px,1fr));gap:${pick ? 16 : 18}px;margin-top:16px}
.tile{display:flex;flex-direction:column;background:var(--paper);border-radius:16px;overflow:hidden;text-decoration:none;color:inherit;box-shadow:0 0 0 1px rgba(40,36,24,.12),0 6px 18px rgba(40,36,24,.08);transition:transform .15s}
.tile:hover,.tile:focus-visible{transform:translateY(-3px);outline:none;box-shadow:0 0 0 3px var(--accent)}
.tile.bad,.card.bad{box-shadow:0 0 0 3px var(--accent)}
.tile img,.pic img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#fff}
.name{padding:10px 14px 0;font-weight:700;font-size:20px}
.note{padding:2px 14px 12px;color:var(--muted);font-size:13px}
.card{background:var(--paper);border-radius:12px;overflow:hidden;box-shadow:0 0 0 1px var(--line),0 8px 24px rgba(40,36,24,.08)}
.txt{padding:12px 14px 14px}
.card h2{margin:0 0 4px;font-size:17px}
.card h2 a{color:inherit;text-decoration:none}
.meta,.audit{margin:0;color:var(--muted);font-size:13px}
.meta a{color:var(--accent)}
@media (prefers-reduced-motion: reduce){.tile{transition:none}}
</style>
</head>
<body>
<header>
<h1>${esc(title)}</h1>
${cfg.intro ? `<p>${esc(cfg.intro)}</p>` : ""}
</header>
<main>
${groups.map(section).join("\n")}
</main>
</body>
</html>
`;
}
