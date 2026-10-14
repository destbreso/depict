// The hand. Shapes come out as the polylines a person would draw, in the
// order they would draw them: a box in one stroke that overshoots where it
// closes, a circle that does not quite meet itself, an arrow's shaft and then
// its head. The wobble is seeded, so the same board draws the same way every
// time.
//
// The line and ellipse models follow Rough.js (MIT, Preet Shihn), itself
// after Jo Wood's Handy and the "Sketchy rendering" paper: endpoints jittered,
// a cubic bowed sideways, long lines damped, ellipses with jittered radii that
// overshoot their start. Here they are rewritten to return polylines in pen
// order, with one random stream per element.
import { cubic, smooth } from "./geom.mjs";

const TAU = Math.PI * 2;

/** A pen: the rng of one element, how rough it draws, and how wide its line is. */
export function pen(rng, { roughness = 1, bowing = 1, width = 4 } = {}) {
  const r = (lo, hi) => lo + (hi - lo) * rng();
  const off = (max) => r(-max, max);
  return { rng, r, off, roughness, bowing, width };
}

/** How far a point may wander for a line of this length: in proportion to the pen, small on short lines. */
function wander(p, len) {
  const base = p.roughness * Math.max(1.2, p.width * 0.55);
  return Math.min(base, len / 10);
}

/** One bowed, jittered segment as a polyline (its first point included). */
export function segment(p, x1, y1, x2, y2) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.5) return [x1, y1, x2, y2];
  // long lines hold straighter, as a hand steadies over distance
  const gain = len < 200 ? 1 : len > 500 ? 0.4 : 1 - (0.6 * (len - 200)) / 300;
  const m = wander(p, len) * gain;
  const bow = p.bowing * p.roughness * (len / 200) * 2 * gain;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const sx = x1 + p.off(m * 0.6);
  const sy = y1 + p.off(m * 0.6);
  const ex = x2 + p.off(m * 0.6);
  const ey = y2 + p.off(m * 0.6);
  const a = p.r(0.2, 0.4);
  const side = p.off(bow);
  const c1x = x1 + (x2 - x1) * a + nx * side + p.off(m * 0.3);
  const c1y = y1 + (y2 - y1) * a + ny * side + p.off(m * 0.3);
  const c2x = x1 + (x2 - x1) * Math.min(0.95, 2 * a) + nx * side * 0.8 + p.off(m * 0.3);
  const c2y = y1 + (y2 - y1) * Math.min(0.95, 2 * a) + ny * side * 0.8 + p.off(m * 0.3);
  return cubic(sx, sy, c1x, c1y, c2x, c2y, ex, ey, Math.max(3, p.width));
}

/** A straight line, one stroke. */
export const line = (p, x1, y1, x2, y2) => [segment(p, x1, y1, x2, y2)];

/** A path through the points as one continuous stroke, each leg bowed on its own. */
export function polyline(p, pts, closed = false) {
  const out = [];
  const n = pts.length / 2;
  const legs = closed ? n : n - 1;
  for (let i = 0; i < legs; i++) {
    const j = (i + 1) % n;
    const s = segment(p, pts[2 * i], pts[2 * i + 1], pts[2 * j], pts[2 * j + 1]);
    out.push(...(i === 0 ? s : s.slice(2)));
  }
  return [out];
}

/**
 * A box drawn in one stroke: it starts just past the top-left corner, goes
 * round clockwise and overshoots the start where it closes. Corners are
 * eased a little, as a marker rounds them.
 */
export function box(p, x, y, w, h, { corner = 0 } = {}) {
  const k = Math.min(corner || Math.min(w, h) * 0.08, Math.min(w, h) / 2);
  const o = Math.min(w, h) * p.r(0.03, 0.07);
  const corners = [
    [x + k + o, y],
    [x + w - k, y],
    [x + w, y + k],
    [x + w, y + h - k],
    [x + w - k, y + h],
    [x + k, y + h],
    [x, y + h - k],
    [x, y + k],
    [x + k, y],
    [x + k + o * 3, y + p.off(1.5)],
  ];
  const out = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const [ax, ay] = corners[i];
    const [bx, by] = corners[i + 1];
    const s = segment(p, ax, ay, bx, by);
    out.push(...(i === 0 ? s : s.slice(2)));
  }
  return [smooth(out, Math.max(3, p.width))];
}

/**
 * An ellipse that does not quite meet itself: the radius drifts slowly as the
 * pen goes round, so where it closes the line passes a little outside its
 * start instead of folding over it.
 */
export function ellipse(p, cx, cy, rx, ry, { overshoot = 0.1 } = {}) {
  const steps = Math.max(12, Math.round(Math.sqrt((rx + ry) / 2) * 2.6));
  const start = p.r(0, TAU);
  const span = TAU * (1 + overshoot * p.r(0.6, 1.2));
  // the pen ends a little outside or inside its start, clearly apart from it (at least a line and a half)
  const drift = Math.max(p.r(0.06, 0.1), (1.6 * p.width) / Math.min(rx, ry)) * (p.rng() < 0.5 ? -1 : 1);
  const wob = [p.off(0.02), p.off(0.02), p.r(0, TAU)];
  const pts = [];
  const n = Math.ceil(steps * (span / TAU));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = start + u * span;
    const j = 1 + drift * u + wob[0] * Math.sin(2 * a + wob[2]) + wob[1] * Math.cos(3 * a);
    pts.push(cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j);
  }
  return [smooth(pts, Math.max(3, p.width))];
}

/**
 * An arrow: the shaft, bowed by `bend` (a share of its length, + to the left
 * of travel), then the head as one stroke from wing to tip to wing.
 */
export function arrow(p, x1, y1, x2, y2, { bend = 0, head = null, double = false } = {}) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const b = bend * len;
  const c1x = x1 + (x2 - x1) / 3 + nx * b;
  const c1y = y1 + (y2 - y1) / 3 + ny * b;
  const c2x = x1 + (2 * (x2 - x1)) / 3 + nx * b;
  const c2y = y1 + (2 * (y2 - y1)) / 3 + ny * b;
  const m = wander(p, len) * 0.5;
  const shaft = cubic(x1 + p.off(m), y1 + p.off(m), c1x + p.off(m), c1y + p.off(m), c2x + p.off(m), c2y + p.off(m), x2, y2, Math.max(3, p.width));
  const strokes = [shaft];
  const size = head ?? Math.min(26, Math.max(10, len * 0.18)) * (p.width / 4) ** 0.5;
  const tipHead = (tx, ty, dx, dy) => {
    const dl = Math.hypot(dx, dy) || 1;
    const ux = dx / dl;
    const uy = dy / dl;
    const spread = 0.5 + p.off(0.08);
    const wing = (sign) => [tx - size * (ux * Math.cos(spread) - sign * uy * Math.sin(spread)), ty - size * (uy * Math.cos(spread) + sign * ux * Math.sin(spread))];
    const [lx, ly] = wing(1);
    const [rx, ry] = wing(-1);
    return polyline(p, [lx, ly, tx, ty, rx, ry])[0];
  };
  // the head points along the shaft's last stretch
  const n = shaft.length;
  strokes.push(tipHead(x2, y2, x2 - shaft[n - 6], y2 - shaft[n - 5]));
  if (double) strokes.push(tipHead(x1, y1, x1 - shaft[4], y1 - shaft[5]));
  return strokes;
}

/** An underline under a box: a slight dip, a little longer than the words at its end. */
export function underline(p, x, y, w) {
  const over = Math.min(w * 0.03, 14);
  return line(p, x - over * 0.3, y + p.off(1.5), x + w + over, y + p.off(2.5));
}

/**
 * Circling something: an ellipse that clears the box's corners with room to
 * spare (a box w by h fits inside rx, ry when (w/2rx)^2 + (h/2ry)^2 < 1).
 */
export function circleAround(p, b, margin = 14) {
  const rx = (b.w / 2) * 1.16 + margin;
  const ry = (b.h / 2) * 1.5 + margin * 0.8;
  return ellipse(p, b.x + b.w / 2, b.y + b.h / 2, rx, ry, { overshoot: 0.16 });
}

/** A highlighter pass: back and forth across the box, as one wide stroke. */
export function highlight(p, b) {
  const rows = Math.max(1, Math.round(b.h / (p.width * 0.9)));
  const pts = [];
  for (let i = 0; i < rows; i++) {
    const yy = b.y + ((i + 0.5) * b.h) / rows + p.off(1);
    const [a, z] = i % 2 ? [b.x + b.w, b.x] : [b.x, b.x + b.w];
    pts.push(a + p.off(3), yy, z + p.off(3), yy + p.off(1));
  }
  return [pts];
}

/** A cross-out: two quick diagonals over the box. */
export const crossOut = (p, b) => [...line(p, b.x, b.y, b.x + b.w, b.y + b.h), ...line(p, b.x + b.w, b.y, b.x, b.y + b.h)];

/**
 * Hachure shading inside a polygon: parallel lines at an angle, drawn as one
 * zigzag stroke the way a hand shades, each line a little rough.
 */
export function hachure(p, poly, { gap = 10, angle = -41 } = {}) {
  const a = (angle * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // rotate the polygon so the hachure is horizontal, scan it, rotate back
  const rot = [];
  for (let i = 0; i < poly.length; i += 2) rot.push(poly[i] * cos + poly[i + 1] * sin, -poly[i] * sin + poly[i + 1] * cos);
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 1; i < rot.length; i += 2) {
    y0 = Math.min(y0, rot[i]);
    y1 = Math.max(y1, rot[i]);
  }
  const back = (x, y) => [x * cos - y * sin, x * sin + y * cos];
  const zig = [];
  let flip = false;
  for (let y = y0 + gap / 2; y < y1; y += gap) {
    const xs = [];
    const n = rot.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [ax, ay, bx, by] = [rot[2 * i], rot[2 * i + 1], rot[2 * j], rot[2 * j + 1]];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((m, k) => m - k);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const inset = Math.min(gap * 0.4, (xs[i + 1] - xs[i]) / 4);
      let [ax, bx] = [xs[i] + inset, xs[i + 1] - inset];
      if (flip) [ax, bx] = [bx, ax];
      flip = !flip;
      const [sx, sy] = back(ax, y + p.off(gap * 0.08));
      const [ex, ey] = back(bx, y + p.off(gap * 0.08));
      zig.push(sx, sy, ex, ey);
    }
  }
  return zig.length ? [zig] : [];
}

/** A cloud around a box: bumps along an ellipse, drawn in one stroke. */
export function cloud(p, b, margin = 18) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.w / 2 + margin * 1.6;
  const ry = b.h / 2 + margin * 1.3;
  const bumps = Math.max(7, Math.round((rx + ry) / 38));
  const pts = [];
  const start = p.r(0, TAU);
  for (let i = 0; i < bumps; i++) {
    const a0 = start + (i / bumps) * TAU;
    const a1 = start + ((i + 1) / bumps) * TAU;
    const bulge = 1.18 + p.off(0.06);
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const a = a0 + (a1 - a0) * t;
      const swell = 1 + (bulge - 1) * Math.sin(Math.PI * t);
      if (k === 0 && i > 0) continue;
      pts.push(cx + Math.cos(a) * rx * swell, cy + Math.sin(a) * ry * swell);
    }
  }
  pts.push(pts[0] + p.off(3), pts[1] + p.off(3));
  return [smooth(pts, Math.max(3, p.width))];
}

/** A speech bubble: a rounded box with a tail from its lower left. */
export function bubble(p, b) {
  const k = Math.min(b.w, b.h) * 0.25;
  const tailX = b.x + b.w * 0.22;
  const pts = [
    b.x + k, b.y,
    b.x + b.w - k, b.y,
    b.x + b.w, b.y + k,
    b.x + b.w, b.y + b.h - k,
    b.x + b.w - k, b.y + b.h,
    tailX + 26, b.y + b.h,
    tailX - 14, b.y + b.h + 34,
    tailX, b.y + b.h,
    b.x + k, b.y + b.h,
    b.x, b.y + b.h - k,
    b.x, b.y + k,
    b.x + k * 1.2, b.y,
  ];
  return [smooth(polyline(p, pts)[0], Math.max(3, p.width))];
}

/** A banner for a title: a band with its ends folded back. */
export function banner(p, b) {
  const fold = Math.min(42, b.h * 0.6);
  const drop = b.h * 0.35;
  const band = box(p, b.x, b.y, b.w, b.h, { corner: 2 });
  const left = polyline(p, [b.x, b.y + drop, b.x - fold, b.y + drop, b.x - fold * 0.55, b.y + drop + b.h / 2, b.x - fold, b.y + b.h + drop, b.x, b.y + b.h + drop, b.x, b.y + b.h]);
  const right = polyline(p, [b.x + b.w, b.y + drop, b.x + b.w + fold, b.y + drop, b.x + b.w + fold * 0.55, b.y + drop + b.h / 2, b.x + b.w + fold, b.y + b.h + drop, b.x + b.w, b.y + b.h + drop, b.x + b.w, b.y + b.h]);
  return [...band, ...left, ...right];
}

/**
 * A hand's wobble over an existing polyline (an icon's line, a traced
 * shape): resampled evenly, then nudged sideways by a slow wave whose phase
 * and length are the pen's own. Small details survive; long lines stop being
 * ruler-straight.
 */
export function wobble(p, pts, { amp = null, wave = null } = {}) {
  const a = amp ?? Math.min(1.6, 0.35 * p.width * p.roughness);
  const lam = wave ?? p.r(70, 130);
  const phase = p.r(0, Math.PI * 2);
  const phase2 = p.r(0, Math.PI * 2);
  const step = Math.max(2, p.width * 0.8);
  // resample at an even step so the wave is even along the line
  const out = [];
  let s = 0;
  const n = pts.length / 2;
  const ex = p.off(a * 0.6);
  const ey = p.off(a * 0.6);
  for (let i = 0; i < n - 1; i++) {
    const x0 = pts[2 * i], y0 = pts[2 * i + 1], x1 = pts[2 * i + 2], y1 = pts[2 * i + 3];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len === 0) continue;
    const nx = -(y1 - y0) / len;
    const ny = (x1 - x0) / len;
    const k = Math.max(1, Math.ceil(len / step));
    for (let j = i === 0 ? 0 : 1; j <= k; j++) {
      const t = j / k;
      const d = s + len * t;
      const off = a * (0.7 * Math.sin((2 * Math.PI * d) / lam + phase) + 0.3 * Math.sin((2 * Math.PI * d) / (lam * 0.37) + phase2));
      out.push(x0 + (x1 - x0) * t + nx * off + ex, y0 + (y1 - y0) * t + ny * off + ey);
    }
    s += len;
  }
  return out.length >= 4 ? out : pts;
}
