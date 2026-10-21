// The timeline: when every stroke is drawn, and where the camera is. Each
// beat flies the camera to its shot if it needs a new one, draws its
// elements in order (each part, each stroke, at the pen's speed, with the
// short lifts a hand makes between strokes), and then holds at least as long
// as its sentence takes to read. The board ends on a held overview.
import { cumulative, union, pad } from "./geom.mjs";
import { flight, flightTime, pan, shotOf, shotSafe } from "./camera.mjs";
import { perform, hopHere } from "./perform.mjs";
import { actorAt, OUTROS } from "./act.mjs";
import { hash32 } from "./rng.mjs";

/** The pen, in board units per second, and its pauses, in seconds. */
export const PACE = {
  line: 1350, // shapes and arrows
  icon: 1500,
  write: 1400, // handwriting at a label's size: about 14 letters a second
  flick: 2600, // underlines: a quick flick of the pen
  mark: 1800, // circling, boxing, crossing out
  highlight: 2400,
  fill: 4200, // coloring in with a broad nib: fills and shadows
  fillMax: 0.9, // a fill never takes longer than this
  iconMax: 1.7, // an icon never takes longer than this
  figureMax: 2.0, // nor a character or a sketch
  guideMax: 1.8, // the guide is quick: a hello, not the subject
  lift: 0.035, // between strokes of one part
  part: 0.12, // between parts of one element
  element: 0.28, // between elements
  hold: 0.55, // after a beat's drawing
  still: 0.3, // of the hold, the beat's picture whole and nothing moving on: its picture is taken here
  regionHold: 0.7, // more when the next beat moves to another region
  readBase: 0.5, // a caption takes readBase + chars / readRate seconds to read
  readRate: 16,
  overviewHold: 2.8, // the whole board, held, before the outro
};


/**
 * The shot an element is drawn in. The camera follows what is being drawn:
 * an item, a title or a note is shot in its own region (in slides, its own
 * sheet); a bridge between two regions in the pull-back that shows both; a
 * mark wherever its target is.
 */
function shotFor(board, comp, e) {
  const slides = board.mode === "slides";
  const target = e.kind === "mark" ? comp.elements.get(e.target) : e;
  const frame = (r) => (slides ? comp.sheets.get(r) : comp.regions.find((x) => x.id === r).frame);
  // the opening: the guide and the title, close
  if (!slides && comp.opening && (e.kind === "title" || e.id === "guide")) return shotSafe(comp.opening);
  if (target.bridge) {
    const both = union(frame(target.joins[0]), frame(target.joins[1]));
    return slides ? shotOf(pad(both, 60)) : shotSafe(pad(both, 40));
  }
  return slides ? shotOf(frame(target.region)) : shotSafe(pad(frame(target.region), 40));
}

/**
 * When each of the guide's strokes is drawn as it first appears, in its
 * drawing order: its outline, face, arms and gloves (four strokes the page
 * draws from the pose), legs and color, each for a time in proportion to its
 * length. The brows and mouths of the other feelings, and the closed eyes,
 * are ready the moment it is done and wait, hidden, until they are needed.
 * Returns the span [t0, t1].
 */
function drawGuide(r, t0, t1) {
  const shown = (s) => !/^brows:(?!up$)|^mouth:(?!smile$)|^squint|^form:/.test(s.part);
  const len = (pts) => cumulative(pts).at(-1) * 1;
  const items = [];
  for (const s of r.strokes.filter(shown)) items.push({ n: s.n, s, len: len(s.pts) * (s.l === "ink" ? 1 : 0.3) });
  // the arms and gloves, at their place in the order: hose, glove, hose, glove
  const arm = 0.42 * r.h;
  const glove = 0.5 * r.h;
  ["armBack", "gloveBack", "armFront", "gloveFront"].forEach((name, i) => items.push({ n: r.armsAt + i, name, len: name.startsWith("arm") ? arm : glove }));
  items.sort((a, b) => a.n - b.n);
  const total = items.reduce((a, x) => a + x.len, 0) || 1;
  const lift = 0.015;
  const room = Math.max(0.3, t1 - t0 - lift * items.length);
  let at = t0;
  r.reveal = {};
  for (const x of items) {
    const d = (room * x.len) / total;
    if (x.s) Object.assign(x.s, { t0: at, t1: at + d });
    else r.reveal[x.name] = [at, at + d];
    at += d + lift;
  }
  for (const s of r.strokes) if (!shown(s)) Object.assign(s, { t0: at, t1: at });
  return [t0, at];
}

const same = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1 && Math.abs(a[2] - b[2]) < 1;

/**
 * Times the board. Returns { strokes, beats, camera, duration, overview }:
 * strokes in drawing order with t0 and t1; beats with their span and shot;
 * camera keys (flights between shots). Every element keeps the shot it was
 * drawn in, for the audit. A beat whose guide steps to a new place before the
 * pen begins gets the moment its step takes: the board is timed again with it.
 */
export function time(board, comp) {
  const lead = new Map();
  let tl;
  for (let pass = 0; pass < 3; pass++) {
    tl = run(board, comp, lead, pass < 2);
    const needs = tl.actors[0]?.needs;
    if (!needs?.size || pass === 2) break;
    for (const [bi, s] of needs) lead.set(bi, (lead.get(bi) ?? 0) + s);
  }
  if (board.outro) outro(board, comp, tl);
  return tl;
}

/** One timing of the board, with `lead` seconds (by beat index) before a beat's pen begins. */
function run(board, comp, lead, provisional) {
  // a child reads more slowly than an adult: longer holds, more time per caption, a little more between things
  const P = PACE;
  const cellsOf = new Map(board.regions.filter((r) => r.layout === "cells" || r.layout === "stack").flatMap((r) => r.items.filter((it) => it.under == null).map((it) => [it.id, r.id])));
  const sameCells = (a, b) => cellsOf.has(a) && cellsOf.get(a) === cellsOf.get(b);
  const strokes = [];
  const beats = [];
  const camera = [];
  const slides = board.mode === "slides";
  let t = 0;
  let shot = null;
  let toward = null; // the region the next flight goes to, for the guide to hop there
  let appear = null;
  const go = (next) => {
    if (!shot) {
      shot = next;
      return;
    }
    if (same(shot, next)) return;
    // slides slide in sideways when both shots are sheets of one size; anything else flies
    const sidestep = slides && Math.abs(shot[2] - next[2]) < 1;
    const dur = sidestep ? 0.75 : flightTime(flight(shot, next).S);
    camera.push({ t0: t, t1: t + dur, from: shot, to: next, pan: sidestep, region: toward });
    t += dur;
    shot = next;
  };
  /** Draws all of an element's strokes between t0 and t1, each for a time in proportion to its length (fills count for less: a broad nib moves fast). */
  const drawWithin = (e, bi, t0, t1, lift = P.lift) => {
    const all = e.parts.flatMap((part) => part.strokes.map((pts) => ({ part, pts, len: cumulative(pts).at(-1) * (part.layer === "ink" ? 1 : 0.3) })));
    const total = all.reduce((a, x) => a + x.len, 0) || 1;
    // the pen lifts between the parts of a thing; within a part (a dashed line, a fill) it barely leaves the paper
    const lifts = all.reduce((a, x, i) => a + (i > 0 ? x_lift(all, i, lift) : 0), 0);
    const room = Math.max(0.1, t1 - t0 - lifts);
    // every stroke gets a sliver of time, and the rest goes by length, so the whole fits the span
    const base = Math.min(0.006, room / all.length / 2);
    const spare = room - base * all.length;
    let at = t0;
    all.forEach(({ part, pts, len }, i) => {
      if (i > 0) at += x_lift(all, i, lift);
      const d = base + (spare * len) / total;
      strokes.push({ el: e.id, role: part.role, pts, t0: at, t1: at + d, width: part.width, color: part.color, layer: part.layer, opacity: part.opacity, beat: bi });
      at += d;
    });
    if (e.kind) e.beat = bi;
    return at;
  };
  const x_lift = (all, i, lift) => (all[i].part !== all[i - 1].part ? lift : 0.002);
  board.beats.forEach((beat, bi) => {
    const start = t;
    let drawStart = null;
    beat.draw.forEach((id, ei) => {
      const e = comp.elements.get(id);
      const next = shotFor(board, comp, e);
      // a pause between things (the cells of one array follow each other quickly), then the camera moves if the next one is elsewhere
      if (ei > 0) t += sameCells(beat.draw[ei - 1], id) ? 0.06 : P.element;
      toward = e.joins ? null : e.region;
      go(next);
      e.shot = next;
      // the moment the guide's step takes, once the camera is there
      if (ei === 0) t += lead.get(bi) ?? 0;
      drawStart ??= t;
      e.beat = bi;
      if (e.kind === "guide") {
        // the guide is drawn in one go, quickly, stroke by stroke: the same hello on every board
        appear = drawGuide(comp.guide.rig, t, t + P.guideMax);
        t = appear[1];
        return;
      }
      const gestures = new Set(); // the parts of a picture drawn as one gesture
      e.parts.forEach((part, pi) => {
        if (gestures.has(part)) return;
        if (part.group === "figure") {
          // a sketch or a character: its lines and its color in one go, quickly
          const run = [];
          for (let j = pi; j < e.parts.length && e.parts[j].group === "figure"; j++) run.push(e.parts[j]);
          run.forEach((q) => gestures.add(q));
          if (pi > 0) t += P.part;
          const natural = run.reduce((a, q) => a + q.strokes.reduce((b, pts) => b + cumulative(pts).at(-1), 0) / (q.layer === "ink" ? P.icon : P.fill), 0);
          t = drawWithin({ id, parts: run }, bi, t, t + Math.min(P.figureMax, natural + 0.3), 0.02);
          return;
        }
        if (pi > 0) t += P.part;
        // handwriting keeps the same pace per letter at any size: bigger letters, a faster pen;
        // secondary text (notes, an arrow's label) goes faster, so it never holds up the sentence
        const secondary = part.write && part.size < 30 && !(e.bridge && part.role === "label") ? 1.3 : 1;
        const speed =
          part.role === "fill" || part.role === "shadow" || part.role === "swash" ? P.fill
          : part.layer === "under" ? P.highlight
          : part.write ? P.write * (part.size / 32) * secondary
          : part.role === "underline" ? P.flick
          : part.role === "mark" ? P.mark
          : part.role === "icon" || part.role === "character" || part.role === "sketch" ? P.icon
          : P.line * (e.scale ?? 1);
        const lens = part.strokes.map((pts) => cumulative(pts));
        const total = lens.reduce((a, c) => a + c[c.length - 1], 0);
        // a picture is drawn faster when it would otherwise take too long (the lifts between its strokes count)
        const most = e.kind === "guide" ? P.guideMax : part.role === "icon" ? P.iconMax : P.figureMax;
        const lifts = P.lift * (part.strokes.length - 1);
        const picture = ["icon", "character", "sketch"].includes(part.role);
        const coloring = part.role === "fill" || part.role === "shadow" || part.role === "swash";
        const k = picture && total / speed + lifts > most ? total / speed / Math.max(0.4, most - lifts) : coloring && total / speed > P.fillMax ? total / speed / P.fillMax : 1;
        part.strokes.forEach((pts, si) => {
          if (si > 0) t += P.lift;
          const len = lens[si][lens[si].length - 1];
          const d = Math.max(0.03, len / speed / k);
          strokes.push({ el: id, role: part.role, pts, t0: t, t1: t + d, width: part.width, color: part.color, layer: part.layer, opacity: part.opacity, beat: bi });
          t += d;
        });
      });
    });
    drawStart ??= t;
    const drawEnd = t;
    const read = P.readBase + beat.say.length / P.readRate;
    // more of a pause when the next sentence takes the camera somewhere else
    const nextBeat = board.beats[bi + 1];
    const moves = nextBeat?.draw.length && !same(shot, shotFor(board, comp, comp.elements.get(nextBeat.draw[0])));
    t = Math.max(drawEnd + P.hold, drawStart + read) + (moves ? P.regionHold : 0);
    beats.push({ say: beat.say, t0: start, draw0: drawStart, draw1: drawEnd, still: Math.min(drawEnd + P.still, t - 0.05), t1: t, shot });
  });
  // the overview: the whole board, held
  const overview = shotOf(comp.extent);
  const S = flight(shot, overview).S;
  const dur = flightTime(S) * 1.2;
  camera.push({ t0: t, t1: t + dur, from: shot, to: overview });
  const explore = t + dur; // the board complete: where the page rests when the film is over
  t = explore + P.overviewHold;
  const result = { strokes, beats, camera, duration: t, overview, first: beats[0].shot, actors: [], explore };
  if (appear) result.actors.push(perform(board, comp, result, appear, { provisional }));
  return result;
}

/**
 * The outro: the camera comes in on the guide, who says goodbye its own way
 * (a wave, a bow, a cheer, a salute, a tip of its cap, a spin) and winks while
 * a circle closes on it, as old cartoons end; then the board's title is
 * written on the dark and held. The page plays it and then goes back to the
 * whole board to explore; a video ends on the title.
 */
function outro(board, comp, tl) {
  let t = tl.duration;
  const A = tl.actors[0];
  const st = A ? actorAt(A, t) : null;
  const h = A ? A.h : 0;
  const cx = st ? st.x : tl.overview[0];
  const cy = st ? st.y - h * 0.55 : tl.overview[1];
  const close = [cx, cy + h * 0.06, Math.max(h * 3.4, 1000)];
  const fly = Math.max(0.9, flightTime(flight(tl.overview, close).S) * 0.8);
  tl.camera.push({ t0: t, t1: t + fly, from: tl.overview, to: close });
  const start = t;
  t += fly;
  const iris = { t0: t, hold: t + 0.85, close: t + 1.85, t1: t + 2.17, cx, cy, r: h ? h * 0.66 : 260 };
  if (A) {
    A.track.feel.push([start + 0.15, "happy"]);
    A.track.look.push([start + 0.15, null]);
    OUTROS[board.cast?.outro ?? "wave"](A.track, start, fly, iris, { x: st.x, y: st.y, facing: st.facing });
    // how it said goodbye: a character cast in its place says it its own way (act.mjs, personalize)
    A.track.outro = { kind: board.cast?.outro ?? "wave", t: start, fly, hold: iris.hold, at: { x: st.x, y: st.y, facing: st.facing }, seed: hash32(`${board.seed}:${board.title}:outro`) };
    A.track.feel.push([iris.hold + 0.1, "wink"]);
    A.track.bounces.push([iris.hold + 0.1, 0.35]);
    for (const list of [A.track.arms, A.track.feel, A.track.look, A.track.bounces, A.track.leans, A.track.spins, A.track.caps]) list.sort((a, b) => a[0] - b[0]);
    A.track.moves.sort((a, b) => a.t0 - b.t0);
  }
  t = iris.t1 + 0.25;
  // the title, written on the dark at the pen's pace
  const card = [];
  const lens = comp.endCard.map((s) => cumulative(s.pts).at(-1));
  const total = lens.reduce((a, l) => a + l, 0) || 1;
  const span = 1.4;
  comp.endCard.forEach((s, i) => {
    const d = Math.max(0.02, ((span - 0.02 * comp.endCard.length) * lens[i]) / total);
    card.push({ ...s, t0: t, t1: t + d });
    t += d + 0.02;
  });
  tl.outro = { t0: tl.duration, iris, card };
  tl.duration = t + 1.8;
}

