// The page: one standalone HTML file with the board, its timeline and the
// player inlined. No network, no dependencies: open it in any browser, or
// capture it frame by frame for a video.
import fs from "node:fs";

const read = (f) => fs.readFileSync(new URL(f, import.meta.url), "utf8");

/** The camera functions and the guide's performance, inlined as plain functions. */
const cameraSource = () => read("./camera.mjs").replace(/^export /gm, "");
const actSource = () => read("./act.mjs").replace(/^export /gm, "");

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * The scene as the page carries it: strokes delta-encoded in half units with
 * their times in milliseconds, elements with their boxes and beats, and the
 * camera's flights.
 */
export function sceneOf(board, comp, tl) {
  const palette = [];
  const color = (c) => {
    let i = palette.indexOf(c);
    if (i < 0) i = palette.push(c) - 1;
    return i;
  };
  const elIds = [...comp.elements.keys()];
  const elIndex = new Map(elIds.map((id, i) => [id, i]));
  const strokes = tl.strokes.map((s) => {
    const a = [Math.round(s.t0 * 1000), Math.round(s.t1 * 1000), Math.round(s.width * 10), color(s.color), { under: 1, shadow: 2 }[s.layer] ?? 0, Math.round(s.opacity * 100), elIndex.get(s.el)];
    let px = 0;
    let py = 0;
    for (let i = 0; i < s.pts.length; i += 2) {
      const x = Math.round(s.pts[i] * 2);
      const y = Math.round(s.pts[i + 1] * 2);
      a.push(x - px, y - py);
      px = x;
      py = y;
    }
    return a;
  });
  const firstAt = new Map();
  for (const s of tl.strokes) if (!firstAt.has(s.el)) firstAt.set(s.el, s.t0);
  const r = (v) => Math.round(v * 10) / 10;
  return {
    title: board.title,
    mode: board.mode,
    palette,
    duration: r(tl.duration * 100) / 100,
    strokes,
    elements: elIds.map((id) => {
      const e = comp.elements.get(id);
      const item = e.kind === "item" ? board.regions.flatMap((g) => g.items).find((x) => x.id === id) : null;
      return { id, kind: e.kind, beat: e.beat ?? 0, t0: r(firstAt.get(id) ?? 0), box: [r(e.box.x), r(e.box.y), r(e.box.w), r(e.box.h)], ...(item?.figureUrl ? { figure: item.figureUrl, label: item.label || item.id } : {}) };
    }),
    beats: tl.beats.map((b, i) => ({ say: keepSums(b.say), t0: r(b.t0 * 100) / 100, t1: r(b.t1 * 100) / 100, draw0: r(b.draw0 * 100) / 100, draw1: r(b.draw1 * 100) / 100, still: r(b.still * 100) / 100, ...(board.beats[i].open ? { open: elIds.indexOf(board.beats[i].open) } : {}) })),
    camera: tl.camera.map((k) => ({ t0: r(k.t0 * 100) / 100, t1: r(k.t1 * 100) / 100, from: k.from.map(r), to: k.to.map(r), ...(k.pan ? { pan: 1 } : {}) })),
    overview: tl.overview.map(r),
    sheets: board.mode === "slides" ? [...comp.sheets.values()].map((f) => [r(f.x), r(f.y), r(f.w), r(f.h)]) : [],
    actors: (tl.actors ?? []).map((a) => actorOf(a, color)),
    explore: r(tl.explore * 100) / 100,
    speed: board.speed ?? 1,
    outro: tl.outro ? { iris: Object.fromEntries(Object.entries(tl.outro.iris).map(([k, v]) => [k, r(v * 1000) / 1000])), card: tl.outro.card.map((s) => ({ t0: r(s.t0 * 1000) / 1000, t1: r(s.t1 * 1000) / 1000, w: r(s.width), c: color(s.color), pts: s.pts.map(r) })) } : null,
  };
}

/** A caption breaks between words, never inside a sum: the spaces either side of + - × ÷ = < > hold together (10 + 10 = 20 stays on one line). */
const keepSums = (text) =>
  String(text)
    .replace(/ ([+\-\u2212\u00d7\u00f7=<>]) /g, "\u00a0$1\u00a0")
    .replace(/(\d) (?=\p{L})/gu, "$1\u00a0");

/** An actor as the page carries it: its rig's strokes in its own frame (with when each is drawn as it first appears), its gloves, and its track. */
function actorOf(a, color) {
  const q = (v) => Math.round(v * 10) / 10;
  const pts = (list) => list.map(q);
  const rg = a.rig;
  return {
    h: a.h,
    // who it is, the body it has, and what it wears on this board: a look of the same body can be cast in its place
    character: rg.character,
    contract: rg.contract,
    // the slot it was directed by: the shoulder and reach its gestures were worked out with
    slot: { front: rg.slot.shoulders.front.map(q), reach: rg.slot.reach },
    wear: rg.wear,
    outfit: rg.outfit,
    accent: color(rg.accent),
    eyes: rg.eyes.map((e) => e.map(q)),
    shoulders: { front: rg.shoulders.front.map(q), back: rg.shoulders.back.map(q) },
    poses: a.poses,
    feelings: a.feelings,
    track: a.track,
    strokes: rg.strokes.map((s) => ({ part: s.part, t0: Math.round(s.t0 * 1000) / 1000, t1: Math.round(s.t1 * 1000) / 1000, w: q(s.w), c: color(s.c), l: { under: 1, shadow: 2 }[s.l] ?? 0, o: s.o, pts: pts(s.pts) })),
    arm: { width: q(rg.arm.width), hose: rg.arm.hose.map(q), ...(rg.arm.fill ? { fill: color(rg.arm.fill), fillWidth: q(rg.arm.fillWidth) } : {}) },
    gloves: Object.fromEntries(Object.entries(rg.gloves).map(([k, g]) => [k, { lines: g.lines.map(pts), fill: g.fill.map(pts), fillWidth: q(g.fillWidth) }])),
    gloveWidth: q(rg.gloveWidth),
    ...(rg.gloveFill ? { gloveFill: color(rg.gloveFill) } : {}),
    reveal: rg.reveal,
    capPivot: rg.capPivot.map(q),
    hold: rg.hold,
    // what it is made of, and how far its arm reaches: the pose of every frame follows from them
    ...(Object.keys(rg.motion ?? {}).length ? { motion: rg.motion } : {}),
    ...(rg.reach !== 0.36 ? { reach: rg.reach } : {}),
  };
}

const CSS = `
:root{--dp-paper:#fbfaf7;--dp-ink:#1b1b19;--dp-room:#e9e6dd;--dp-muted:#6b6a64;--dp-accent:ACCENT;color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--dp-room);color:var(--dp-ink);font:15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
.dp{--dp-reserve:200px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:100%;padding:16px;outline:none}
.dp-frame{position:relative;width:min(100%,calc((100vh - var(--dp-reserve))*16/9));aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:var(--dp-paper);box-shadow:0 18px 50px rgba(40,36,24,.18),0 0 0 1px rgba(40,36,24,.08)}
.dp-board,.dp-stage{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;user-select:none}
.dp-paper{fill:var(--dp-paper)}
.slides .dp-paper{fill:var(--dp-room)}
.dp-sheet{fill:var(--dp-paper);stroke:rgba(40,36,24,.12);stroke-width:2}
.dp-hover{fill:rgba(242,201,76,.16);stroke:rgba(196,63,10,.35);stroke-width:2;stroke-dasharray:8 6;pointer-events:none}
.dp-under{width:min(100%,calc((100vh - var(--dp-reserve))*16/9));min-height:calc(2 * 1.35 * clamp(15px,1.7vw,24px) + 12px);display:flex;align-items:flex-start;justify-content:center;text-align:center}
.child .dp-under{min-height:calc(2 * 1.35 * clamp(17px,2.1vw,30px) + 12px)}
.dp-caption{max-width:46em;padding:2px 8px;color:var(--dp-ink);font-size:clamp(15px,1.7vw,24px);line-height:1.35;opacity:0;transition:opacity .25s;text-wrap:balance}
.dp-caption.on{opacity:1}
.child .dp-caption{font-size:clamp(17px,2.1vw,30px)}
.child{--dp-reserve:212px}
.child .dp-bar{gap:12px}
.child .dp-bar button,.child .dp-bar select{height:44px;min-width:44px;border-radius:12px;font-size:17px}
.child .dp-track{height:44px}
.child .dp-start button{font-size:clamp(16px,1.6vw,21px)}
.dp.fresh .dp-caption,.dp.ended .dp-caption{display:none}
.dp-start{display:none}
.dp.fresh .dp-start{display:flex}
.dp-start button{display:flex;align-items:center;gap:.6em;padding:.65em 1.2em .65em 1em;border:0;border-radius:999px;background:var(--dp-ink);color:var(--dp-paper);font:600 clamp(14px,1.3vw,18px)/1 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer}
.dp-start button::before{content:"";width:0;height:0;border-left:.8em solid currentColor;border-top:.5em solid transparent;border-bottom:.5em solid transparent}
.dp-hint{display:none;padding-top:4px;color:var(--dp-muted);font-size:clamp(13px,1.2vw,16px)}
.dp.ended:not(.fresh) .dp-hint{display:block}
.dp-bar{display:flex;align-items:center;gap:10px;width:min(100%,calc((100vh - var(--dp-reserve))*16/9));padding:6px 4px}
.dp-bar button,.dp-bar select{height:34px;min-width:34px;border:1px solid rgba(40,36,24,.18);border-radius:8px;background:var(--dp-paper);color:var(--dp-ink);font:inherit;cursor:pointer}
.dp-bar button:focus-visible,.dp-bar select:focus-visible,.dp-scrub:focus-visible{outline:2px solid var(--dp-accent);outline-offset:2px}
.dp-play::before{content:"";display:inline-block;border-left:11px solid currentColor;border-top:7px solid transparent;border-bottom:7px solid transparent;margin-left:3px}
.dp.playing .dp-play::before{border:0;width:10px;height:12px;margin:0;background:linear-gradient(90deg,currentColor 35%,transparent 35% 65%,currentColor 65%)}
.dp-track{position:relative;flex:1;height:34px;display:flex;align-items:center}
.dp-scrub{width:100%;accent-color:var(--dp-ink);cursor:pointer}
.dp-ticks{position:absolute;left:0;right:0;top:4px;height:6px;pointer-events:none}
.dp-ticks i{position:absolute;width:2px;height:6px;background:rgba(40,36,24,.35);border-radius:1px}
.dp-time{font-variant-numeric:tabular-nums;color:var(--dp-muted);min-width:88px;text-align:right}
.dp-live{position:absolute;inset:0;z-index:5;background:#fff;border-radius:14px;overflow:hidden;transform-origin:0 0;transition:transform .55s cubic-bezier(.2,.75,.2,1),opacity .35s;box-shadow:0 0 0 2px var(--dp-accent)}
.dp-live[hidden]{display:none}
.dp-live iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.dp-live-bar{position:absolute;top:10px;right:10px;z-index:2;display:flex;align-items:center;gap:8px}
.dp-live-bar span{padding:.3em .7em;border-radius:999px;background:rgba(251,250,247,.94);color:var(--dp-muted);font-size:13px;box-shadow:0 0 0 1px rgba(40,36,24,.12)}
.dp-live-bar button{height:32px;padding:0 .8em;border:0;border-radius:999px;background:var(--dp-ink);color:var(--dp-paper);font:600 13px system-ui,sans-serif;cursor:pointer}
.capture .dp{padding:0}
.capture .dp-frame{width:100vw;height:100vh;border-radius:0;box-shadow:none}
.capture .dp-bar,.capture .dp-under{display:none!important}
.embed,.embed body{background:transparent}
.nostart .dp-start{display:none!important}
.embed .dp.fresh .dp-board,.embed .dp.fresh .dp-stage,.embed .dp.playing .dp-board,.embed .dp.playing .dp-stage{touch-action:pan-y}
@media (max-width:640px){.dp-time{display:none}.dp-speed{display:none}}
`;

/** The whole page, as a string. */
export function page(board, scene) {
  const css = CSS.replace("ACCENT", board.accent);
  // how long it takes to watch, at the board's own speed (a child's board plays at half speed: twice as long)
  const whole = Math.round(scene.duration / (scene.speed || 1));
  const mins = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  return `<!doctype html>
<html lang="${esc(board.lang ?? "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(board.title)}</title>
<meta name="description" content="${esc(board.beats.map((b) => b.say).join(" ").slice(0, 280))}">
<meta name="generator" content="depict">
<style>${css}</style>
<script>{const q=new URLSearchParams(location.search);if(q.has("capture"))document.documentElement.classList.add("capture");if(q.has("embed"))document.documentElement.classList.add("embed");if(q.has("nostart"))document.documentElement.classList.add("nostart")}</script>
</head>
<body>
<div class="dp${board.audience === "child" ? " child" : ""}" tabindex="0">
  <div class="dp-frame">
    <div class="dp-board"></div>
    <div class="dp-live" hidden><div class="dp-live-bar"><span class="dp-live-name"></span><button type="button" class="dp-live-close">Back to the board</button></div></div>
  </div>
  <div class="dp-bar">
    <button type="button" class="dp-prev" aria-label="Previous sentence">&#8249;</button>
    <button type="button" class="dp-play" aria-label="Play"></button>
    <button type="button" class="dp-next" aria-label="Next sentence">&#8250;</button>
    <div class="dp-track"><div class="dp-ticks"></div><input class="dp-scrub" type="range" min="0" step="0.01" value="0" aria-label="Time"></div>
    <span class="dp-time"></span>
    <select class="dp-speed" aria-label="Speed">${[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((v) => `<option value="${v}"${v === 1 ? " selected" : ""}>${v}&times;</option>`).join("")}</select>
  </div>
  <div class="dp-under">
    <div class="dp-caption" aria-live="polite"></div>
    <div class="dp-hint">Drag and zoom the board. Tap any part to hear it again.</div>
    <div class="dp-start"><button type="button" class="dp-go">Watch it drawn · ${mins}</button></div>
  </div>
  <noscript><p>This board plays with JavaScript. Its explanation: ${esc(board.beats.map((b) => b.say).join(" "))}</p></noscript>
</div>
<script>
const SCENE = ${JSON.stringify(scene)};
${cameraSource()}
${actSource()}
${read("./player.js")}
document.querySelector(".dp-go").addEventListener("click", () => { document.querySelector(".dp").classList.remove("fresh"); depict.seek(0); depict.play(); });
</script>
</body>
</html>
`;
}
