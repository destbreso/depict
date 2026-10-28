// A character's model sheet: the guide drawn still, as the page would draw it
// at one moment, in each of its feelings, its poses and its costumes, side by
// side on one sheet of paper. It is how a character made from a drawing is
// looked at before it presents a board (scripts/character.mjs).
import * as ink from "./ink.mjs";
import { rig, FEELINGS } from "./rig.mjs";
import { actorAt, hosePath } from "./act.mjs";
import { splitmix32 } from "./rng.mjs";

const PAPERC = "#fbfaf7";
const INKC = "#1b1b19";

/** The guide `cast` names, in one pose and one feeling, as SVG in its own frame (its feet at the origin), `h` tall. */
export function figure(cast, { pose = "rest", feel = "happy", look = null, h = 300, seed = 3, accent = "#c43f0a", hold = cast.hold ?? null, form = null } = {}) {
  const pen = ink.pen(splitmix32((seed * 7919 + 13) >>> 0), { width: 4 });
  const R = rig(pen, h, accent, { ...cast, hold });
  const actor = {
    h,
    ...(R.armless ? { armless: true } : {}),
    eyes: R.eyes,
    shoulders: R.shoulders,
    poses: R.poses,
    feelings: FEELINGS,
    motion: {},
    reach: R.reach,
    hold: R.hold,
    track: { start: [0, 0, 1], appear: [-1, -1], moves: [], turns: [], arms: [[0, pose, ...(pose === "point" || pose === "present" ? [h * 0.95, -h * 0.55] : [])]], feel: [[0, feel]], look: look ? [[0, ...look]] : [], bounces: [], blinks: [], leans: [], spins: [], caps: [] },
  };
  const st = actorAt(actor, 1);
  const F = FEELINGS[feel] ?? FEELINGS.happy;
  const d = (pts) => {
    let out = `M${pts[0].toFixed(1)} ${pts[1].toFixed(1)}`;
    for (let i = 2; i < pts.length; i += 2) out += `L${pts[i].toFixed(1)} ${pts[i + 1].toFixed(1)}`;
    return out;
  };
  const path = (pts, w, c, o = 1) => `<path d="${d(pts)}" stroke="${c}" stroke-width="${w.toFixed(2)}" stroke-opacity="${o}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const shown = (part) => {
    const m = /^(brows|mouth):(\w+)$/.exec(part);
    if (m) return (m[1] === "brows" ? F.brows : F.mouth) === m[2];
    if (/^squint\d$/.test(part)) return F.eyes === "squint" || (F.eyes === "wink" && part === "squint1");
    if (/^(eye|pupil)(\d)$/.test(part)) {
      const i = part.at(-1);
      return !(F.eyes === "squint" || (F.eyes === "wink" && i === "1"));
    }
    return true;
  };
  const layer = (strokes, under) => strokes.filter((s) => (s.l === "under") === under && s.l !== "shadow").map((s) => path(s.pts, s.w, s.c, s.o)).join("");
  const parts = (pred) => R.strokes.filter((s) => pred(s.part) && shown(s.part));
  const facePart = (p) => /^(eye|pupil|squint|brows:|mouth:)/.test(p);
  const eyeT = (i) => {
    const [cx, cy] = R.eyes[i] ?? [0, 0];
    const wide = F.eyes === "wide" ? 1.12 : 1;
    return `translate(${cx} ${cy}) scale(${wide}) translate(${-cx} ${-cy})`;
  };
  const face = R.strokes
    .filter((s) => facePart(s.part) && shown(s.part))
    .map((s) => {
      const m = /^(eye|pupil)(\d)$/.exec(s.part);
      const p = path(s.pts, s.w, s.c, s.o);
      if (!m) return p;
      const inner = m[1] === "pupil" ? `<g transform="translate(${st.look[0]} ${st.look[1]})">${p}</g>` : p;
      return `<g transform="${eyeT(Number(m[2]))}">${inner}</g>`;
    })
    .join("");
  const gloveSvg = (side, arm) => {
    if (R.armless) return "";
    const kind = side === "front" && R.hold === "pointer" ? "fist" : arm.glove;
    const gl = R.gloves[kind];
    const ang = (Math.atan2(arm.hand[1] - arm.bow[1], arm.hand[0] - arm.bow[0]) * 180) / Math.PI;
    const fill = R.gloveFill ?? PAPERC;
    return `<g transform="translate(${arm.hand[0]} ${arm.hand[1]}) rotate(${ang}) scale(1 ${side === "front" ? 1 : -1})">${gl.fill.map((f) => path(f, gl.fillWidth, fill)).join("")}${gl.lines.map((l) => path(l, R.gloveWidth, INKC)).join("")}</g>`;
  };
  const armSvg = (side) => {
    if (R.armless) return "";
    const arm = st[side];
    const pts = hosePath(R.shoulders[side], arm.bow, arm.hand, R.arm.hose);
    return path(pts, R.arm.width, INKC) + (R.arm.fill ? path(pts, R.arm.fillWidth, R.arm.fill) : "");
  };
  const group = (pred) => layer(parts(pred), true) + layer(parts(pred), false);
  const pointer =
    R.hold === "pointer"
      ? (() => {
          const ang = (Math.atan2(st.front.hand[1] - st.front.bow[1], st.front.hand[0] - st.front.bow[0]) * 180) / Math.PI;
          return `<g transform="translate(${st.front.hand[0]} ${st.front.hand[1]}) rotate(${st.front.glove === "point" ? ang : -62})">${group((p) => p === "pointer")}</g>`;
        })()
      : "";
  const held = R.hold && R.hold !== "pointer" ? `<g transform="translate(${st.back.hand[0]} ${st.back.hand[1]}) rotate(-6)">${group((p) => p === "held")}</g>` : "";
  const floor = R.strokes.filter((s) => s.part === "floor").map((s) => path(s.pts, s.w, s.c, s.o)).join("");
  // its body's gesture, as the page leans and bends it (a character with no arms shows things this way)
  const body = st.lean || st.skew ? `rotate(${(st.lean * st.facing).toFixed(2)}) skewX(${(-st.skew).toFixed(2)}) ` : "";
  // a whole-body form it has taken (sitting, curled up): that drawing alone, on its shadow
  if (form) return floor + `<g transform="scale(${st.facing * st.sx} ${st.sy})">${R.strokes.filter((s) => s.part === `form:${form}`).map((s) => path(s.pts, s.w, s.c, s.o)).join("")}</g>`;
  return (
    floor +
    `<g transform="${body}scale(${st.facing * st.sx} ${st.sy})">` +
    armSvg("back") +
    gloveSvg("back", st.back) +
    group((p) => Boolean(R.swing?.[p])) +
    group((p) => p === "body") +
    group((p) => p === "cap" || p === "hat") +
    face +
    group((p) => p === "wear") +
    armSvg("front") +
    pointer +
    gloveSvg("front", st.front) +
    held +
    "</g>"
  );
}

/** A sheet of rows of the guide, each cell a label and a figure: [{ title, cells: [{ label, cast, pose, feel, hold }] }]. */
export function sheet(rows, { h = 260, cell = 360, title = "" } = {}) {
  const pad = 40;
  const rowH = h * 1.75;
  const cols = Math.max(...rows.map((r) => r.cells.length));
  const W = pad * 2 + cols * cell;
  const H = pad * 2 + 70 + rows.length * (rowH + 60);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let y = pad + 50;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${PAPERC}"/>`;
  out += `<text x="${pad}" y="${pad + 20}" font-family="system-ui, sans-serif" font-size="30" font-weight="700" fill="${INKC}">${esc(title)}</text>`;
  for (const r of rows) {
    out += `<text x="${pad}" y="${y + 24}" font-family="system-ui, sans-serif" font-size="22" font-weight="600" fill="#6b6a64">${esc(r.title)}</text>`;
    r.cells.forEach((c, i) => {
      const cx = pad + i * cell + cell / 2;
      const feet = y + 40 + rowH - 40;
      out += `<g transform="translate(${cx} ${feet})">${figure(c.cast, { pose: c.pose, feel: c.feel, hold: c.hold, h, look: c.look, form: c.form })}</g>`;
      out += `<text x="${cx}" y="${feet + 44}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="19" fill="${INKC}">${esc(c.label)}</text>`;
    });
    y += rowH + 60;
  }
  return out + "</svg>";
}
