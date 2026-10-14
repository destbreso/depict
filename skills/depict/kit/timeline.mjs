// The timeline: when every stroke is drawn, and where the camera is. Each
// beat flies the camera to its shot if it needs a new one, draws its
// elements in order (each part, each stroke, at the pen's speed, with the
// short lifts a hand makes between strokes), and then holds at least as long
// as its sentence takes to read. The board ends on a held overview.
import { cumulative, union, pad } from "./geom.mjs";
import { flight, flightTime, pan, shotOf, shotSafe } from "./camera.mjs";
import { perform } from "./perform.mjs";

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
  regionHold: 0.7, // more when the next beat moves to another region
  readBase: 0.5, // a caption takes readBase + chars / readRate seconds to read
  readRate: 16,
  overviewHold: 4.5,
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
  const shown = (s) => !/^brows:(?!up$)|^mouth:(?!smile$)|^squint/.test(s.part);
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
 * drawn in, for the audit.
 */
export function time(board, comp) {
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
  // the story arrow into a region is drawn as the camera first goes there, from a region told before it
  const stories = [...comp.elements.values()].filter((e) => e.kind === "story");
  const visited = new Set();
  const drawn = new Set();
  /** Draws all of an element's strokes between t0 and t1, each for a time in proportion to its length (fills count for less: a broad nib moves fast). */
  const drawWithin = (e, bi, t0, t1, lift = PACE.lift) => {
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
    if (e.kind) {
      e.beat = bi;
      drawn.add(e.id);
    }
    return at;
  };
  const x_lift = (all, i, lift) => (all[i].part !== all[i - 1].part ? lift : 0.002);
  board.beats.forEach((beat, bi) => {
    const start = t;
    let drawStart = null;
    beat.draw.forEach((id, ei) => {
      const e = comp.elements.get(id);
      const next = shotFor(board, comp, e);
      if (ei > 0) t += PACE.element; // a pause between things, then the camera moves if the next one is elsewhere
      const due = e.joins ? [] : stories.filter((st) => !drawn.has(st.id) && (st.id === "story-0" ? e.kind !== "title" && e.kind !== "guide" : !visited.has(e.region) && st.joins.includes(e.region) && st.joins.some((r) => r !== e.region && visited.has(r))));
      const keys = camera.length;
      toward = e.joins ? null : e.region;
      go(next);
      for (const st of due) {
        st.shot = next;
        if (camera.length > keys) {
          // drawn while the camera flies there: the pen leads the way to the next idea
          const k = camera[camera.length - 1];
          t = Math.max(t, drawWithin(st, bi, k.t0 + (k.t1 - k.t0) * 0.08, k.t1 - (k.t1 - k.t0) * 0.06, 0.02));
        } else t = drawWithin(st, bi, t, t + 1.1, 0.02) + PACE.part;
      }
      if (!e.joins) visited.add(e.region);
      e.shot = next;
      drawStart ??= t;
      e.beat = bi;
      if (e.kind === "guide") {
        // the guide is drawn in one go, quickly, stroke by stroke: the same hello on every board
        appear = drawGuide(comp.guide.rig, t, t + PACE.guideMax);
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
          if (pi > 0) t += PACE.part;
          const natural = run.reduce((a, q) => a + q.strokes.reduce((b, pts) => b + cumulative(pts).at(-1), 0) / (q.layer === "ink" ? PACE.icon : PACE.fill), 0);
          t = drawWithin({ id, parts: run }, bi, t, t + Math.min(PACE.figureMax, natural + 0.3), 0.02);
          return;
        }
        if (pi > 0) t += PACE.part;
        // handwriting keeps the same pace per letter at any size: bigger letters, a faster pen;
        // secondary text (notes, an arrow's label) goes faster, so it never holds up the sentence
        const secondary = part.write && part.size < 30 && !(e.bridge && part.role === "label") ? 1.3 : 1;
        const speed =
          part.role === "fill" || part.role === "shadow" || part.role === "swash" ? PACE.fill
          : part.layer === "under" ? PACE.highlight
          : part.write ? PACE.write * (part.size / 32) * secondary
          : part.role === "underline" ? PACE.flick
          : part.role === "mark" ? PACE.mark
          : part.role === "icon" || part.role === "character" || part.role === "sketch" ? PACE.icon
          : PACE.line * (e.scale ?? 1);
        const lens = part.strokes.map((pts) => cumulative(pts));
        const total = lens.reduce((a, c) => a + c[c.length - 1], 0);
        // a picture is drawn faster when it would otherwise take too long (the lifts between its strokes count)
        const most = e.kind === "guide" ? PACE.guideMax : part.role === "icon" ? PACE.iconMax : PACE.figureMax;
        const lifts = PACE.lift * (part.strokes.length - 1);
        const picture = ["icon", "character", "sketch"].includes(part.role);
        const coloring = part.role === "fill" || part.role === "shadow" || part.role === "swash";
        const k = picture && total / speed + lifts > most ? total / speed / Math.max(0.4, most - lifts) : coloring && total / speed > PACE.fillMax ? total / speed / PACE.fillMax : 1;
        part.strokes.forEach((pts, si) => {
          if (si > 0) t += PACE.lift;
          const len = lens[si][lens[si].length - 1];
          const d = Math.max(0.03, len / speed / k);
          strokes.push({ el: id, role: part.role, pts, t0: t, t1: t + d, width: part.width, color: part.color, layer: part.layer, opacity: part.opacity, beat: bi });
          t += d;
        });
      });
    });
    drawStart ??= t;
    const drawEnd = t;
    const read = PACE.readBase + beat.say.length / PACE.readRate;
    // more of a pause when the next sentence takes the camera somewhere else
    const nextBeat = board.beats[bi + 1];
    const moves = nextBeat?.draw.length && !same(shot, shotFor(board, comp, comp.elements.get(nextBeat.draw[0])));
    t = Math.max(drawEnd + PACE.hold, drawStart + read) + (moves ? PACE.regionHold : 0);
    beats.push({ say: beat.say, t0: start, draw0: drawStart, draw1: drawEnd, t1: t, shot });
  });
  // the overview: the whole board, held; the road reaches its end as the camera pulls back to it
  const overview = shotOf(comp.extent);
  const S = flight(shot, overview).S;
  const dur = flightTime(S) * 1.2;
  camera.push({ t0: t, t1: t + dur, from: shot, to: overview });
  const end = comp.elements.get("story-end");
  if (end) {
    end.shot = overview;
    const done = drawWithin(end, beats.length - 1, t + dur * 0.12, t + dur * 0.95, 0.02);
    beats.at(-1).t1 = Math.max(t + dur, done);
  }
  t += dur + PACE.overviewHold;
  const result = { strokes, beats, camera, duration: t, overview, first: beats[0].shot, actors: [] };
  if (appear) result.actors.push(perform(board, comp, result, appear));
  return result;
}
