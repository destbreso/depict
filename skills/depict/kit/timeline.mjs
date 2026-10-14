// The timeline: when every stroke is drawn, and where the camera is. Each
// beat flies the camera to its shot if it needs a new one, draws its
// elements in order (each part, each stroke, at the pen's speed, with the
// short lifts a hand makes between strokes), and then holds at least as long
// as its sentence takes to read. The board ends on a held overview.
import { cumulative, union, pad } from "./geom.mjs";
import { flight, flightTime, pan, shotOf, shotSafe } from "./camera.mjs";

/** The pen, in board units per second, and its pauses, in seconds. */
export const PACE = {
  line: 1350, // shapes and arrows
  icon: 1500,
  write: 1400, // handwriting at a label's size: about 14 letters a second
  flick: 2600, // underlines: a quick flick of the pen
  mark: 1800, // circling, boxing, crossing out
  highlight: 2400,
  iconMax: 1.7, // an icon never takes longer than this
  lift: 0.035, // between strokes of one part
  part: 0.12, // between parts of one element
  element: 0.28, // between elements
  hold: 0.55, // after a beat's drawing
  regionHold: 0.7, // more when the next beat moves to another region
  readBase: 0.5, // a caption takes readBase + chars / readRate seconds to read
  readRate: 16,
  overviewHold: 4.5,
};

/** The regions a beat touches: the ones its elements sit in, and both ends of a link. */
function regionsOf(board, comp, beat) {
  const set = new Set();
  for (const id of beat.draw) {
    const e = comp.elements.get(id);
    if (!e) continue;
    if (e.joins) e.joins.forEach((r) => set.add(r));
    else set.add(e.region);
  }
  return set;
}

/** The frame a beat is shot in: its regions' frames together, and the board's title when it is drawn. */
function frameOf(board, comp, beat) {
  const regions = regionsOf(board, comp, beat);
  let f = null;
  for (const r of comp.regions) if (regions.has(r.id)) f = union(f, r.frame);
  return f;
}

/** In slides mode, the sheet a beat is drawn on: the region of its first element (the first sheet also holds the title). */
function sheetOf(comp, beat, board) {
  const ids = beat.draw.filter((id) => id !== "title");
  const region = ids.length ? comp.elements.get(ids[0]).region : comp.regions[0].id;
  return comp.sheets.get(region);
}

/**
 * Times the board. Returns { strokes, beats, camera, duration, overview }:
 * strokes in drawing order with t0 and t1; beats with their span and shot;
 * camera keys (flights between shots).
 */
export function time(board, comp) {
  const strokes = [];
  const beats = [];
  const camera = [];
  let t = 0;
  let shot = null;
  board.beats.forEach((beat, bi) => {
    const slides = board.mode === "slides";
    // a slide is shot whole and still; on the canvas the shot takes the beat's regions, with air
    const frame = slides ? sheetOf(comp, beat, board) : frameOf(board, comp, beat);
    const next = slides ? shotOf(frame) : shotSafe(pad(frame, 40));
    const start = t;
    if (!shot) shot = next;
    else if (Math.hypot(next[0] - shot[0], next[1] - shot[1]) > 1 || Math.abs(next[2] - shot[2]) > 1) {
      const S = (slides ? pan : flight)(shot, next).S;
      const dur = slides ? 0.75 : flightTime(S);
      camera.push({ t0: t, t1: t + dur, from: shot, to: next, pan: slides });
      t += dur;
      shot = next;
    }
    const drawStart = t;
    beat.draw.forEach((id, ei) => {
      const e = comp.elements.get(id);
      if (ei > 0) t += PACE.element;
      e.beat = bi;
      e.parts.forEach((part, pi) => {
        if (pi > 0) t += PACE.part;
        // handwriting keeps the same pace per letter at any size: bigger letters, a faster pen
        // secondary text (notes, an arrow's label) goes faster, so it never holds up the sentence
        const secondary = part.write && part.size < 30 ? 1.3 : 1;
        const speed =
          part.layer === "under" ? PACE.highlight
          : part.write ? PACE.write * (part.size / 32) * secondary
          : part.role === "underline" ? PACE.flick
          : part.role === "mark" ? PACE.mark
          : part.role === "icon" ? PACE.icon
          : PACE.line;
        const lens = part.strokes.map((pts) => cumulative(pts));
        const total = lens.reduce((a, c) => a + c[c.length - 1], 0);
        // an icon is drawn faster when it would otherwise take too long
        const k = part.role === "icon" && total / speed > PACE.iconMax ? total / speed / PACE.iconMax : 1;
        part.strokes.forEach((pts, si) => {
          if (si > 0) t += PACE.lift;
          const len = lens[si][lens[si].length - 1];
          const d = Math.max(0.03, len / speed / k);
          strokes.push({ el: id, role: part.role, pts, t0: t, t1: t + d, width: part.width, color: part.color, layer: part.layer, opacity: part.opacity, beat: bi });
          t += d;
        });
      });
    });
    const drawEnd = t;
    const read = PACE.readBase + beat.say.length / PACE.readRate;
    const nextBeat = board.beats[bi + 1];
    const moves = nextBeat && [...regionsOf(board, comp, nextBeat)].some((r) => !regionsOf(board, comp, beat).has(r));
    t = Math.max(drawEnd + PACE.hold, drawStart + read) + (moves ? PACE.regionHold : 0);
    beats.push({ say: beat.say, t0: start, draw0: drawStart, draw1: drawEnd, t1: t, shot });
  });
  // the overview: the whole board, held
  const overview = shotOf(comp.extent);
  const S = flight(shot, overview).S;
  const dur = flightTime(S) * 1.2;
  camera.push({ t0: t, t1: t + dur, from: shot, to: overview });
  t += dur + PACE.overviewHold;
  return { strokes, beats, camera, duration: t, overview, first: beats[0].shot };
}
