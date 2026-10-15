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
export function ellipse(p, cx, cy, rx, ry, { overshoot = 0.1, outward = false } = {}) {
  const steps = Math.max(12, Math.round(Math.sqrt((rx + ry) / 2) * 2.6));
  const start = p.r(0, TAU);
  const span = TAU * (1 + overshoot * p.r(0.6, 1.2));
  // the pen ends a little outside or inside its start, clearly apart from it (at least a line and a half)
  // (outward only, when it circles something it must not cut)
  const drift = Math.max(p.r(0.06, 0.1), (1.6 * p.width) / Math.min(rx, ry)) * (outward || p.rng() < 0.5 ? 1 : -1);
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
export function arrow(p, x1, y1, x2, y2, { bend = 0, head = null, double = false, solid = false } = {}) {
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
    if (!solid) return polyline(p, [lx, ly, tx, ty, rx, ry])[0];
    // a solid head: the triangle closed and colored in, in one stroke that spirals into it
    const mx = (lx + rx) / 2;
    const my = (ly + ry) / 2;
    const k = 0.45;
    return [lx, ly, tx, ty, rx, ry, lx, ly, lx + (tx - lx) * k + (mx - lx) * 0.3, ly + (ty - ly) * k + (my - ly) * 0.3, tx - (tx - mx) * 0.3, ty - (ty - my) * 0.3, rx + (tx - rx) * k + (mx - rx) * 0.3, ry + (ty - ry) * k + (my - ry) * 0.3, mx + (tx - mx) * 0.3, my + (ty - my) * 0.3];
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
 * spare. A box of half-sides a and b fits inside radii rx and ry when
 * (a/rx)^2 + (b/ry)^2 <= 1; rx = a*sqrt(2), ry = b*sqrt(2) is the smallest
 * ellipse of the box's shape that does, and the margin goes on top.
 */
export function circleAround(p, b, margin = 14) {
  const rx = (b.w / 2) * Math.SQRT2 * 1.04 + margin;
  const ry = (b.h / 2) * Math.SQRT2 * 1.04 + margin * 0.8;
  return ellipse(p, b.x + b.w / 2, b.y + b.h / 2, rx, ry, { overshoot: 0.16, outward: true });
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

/** A speech bubble: a rounded box with a tail from its lower edge, pointing down to the left (or the right). */
export function bubble(p, b, { tail = "left" } = {}) {
  const k = Math.min(b.w, b.h) * 0.25;
  const left = tail === "left";
  const tailX = left ? b.x + b.w * 0.22 : b.x + b.w * 0.78;
  const t1 = left ? tailX + 26 : tailX - 26;
  const tip = left ? tailX - 14 : tailX + 14;
  const pts = [
    b.x + k, b.y,
    b.x + b.w - k, b.y,
    b.x + b.w, b.y + k,
    b.x + b.w, b.y + b.h - k,
    b.x + b.w - k, b.y + b.h,
    ...(left ? [t1, b.y + b.h, tip, b.y + b.h + 34, tailX, b.y + b.h] : [tailX, b.y + b.h, tip, b.y + b.h + 34, t1, b.y + b.h]),
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

/**
 * A soft closed shape through points (a bean of a body, a blob, a cloud of an
 * outline): a smooth curve round them in one stroke, closing a little past
 * where it began, each point nudged by the hand.
 */
export function blob(p, pts, { overshoot = 0.08 } = {}) {
  const n = pts.length / 2;
  const jig = pts.map((v) => v + p.off(Math.min(2.2, p.width * 0.4)));
  // closed Catmull-Rom: wrap the points round, then sample
  const out = [];
  const P = (i) => [jig[2 * (((i % n) + n) % n)], jig[2 * (((i % n) + n) % n) + 1]];
  const steps = 10;
  const total = Math.ceil(n * (1 + overshoot));
  for (let i = 0; i < total; i++) {
    const [x0, y0] = P(i - 1);
    const [x1, y1] = P(i);
    const [x2, y2] = P(i + 1);
    const [x3, y3] = P(i + 2);
    for (let j = i === 0 ? 0 : 1; j <= steps; j++) {
      const t = j / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3),
        0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3),
      );
    }
  }
  return [out];
}

/** A small closed dot of a loop (a hand, a knot, a bullet): round, no spiral. */
export function dot(p, cx, cy, r) {
  const pts = [];
  const a0 = p.r(0, Math.PI * 2);
  for (let i = 0; i <= 14; i++) {
    const a = a0 + (Math.PI * 2 * i) / 13;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return [pts];
}

/**
 * A marker fill inside a polygon: the area colored in with a broad nib, back
 * and forth, each pass a little irregular and kept just inside the outline.
 * The passes are scanlines at an angle; consecutive passes that overlap are
 * one zigzag stroke, so a curved or hollow shape is filled in a few strokes
 * and no stroke jumps across paper. Returns the strokes and the nib width.
 */
export function fill(p, poly, { nib = 16, angle = -38, edge = 0.34 } = {}) {
  // a thin shape (a bar, a stem) is colored in with a finer nib, as a thinner marker would do it
  const thick = thickness(poly);
  if (thick < nib * 1.2) nib = Math.max(2.5, thick * 0.8);
  const gap = nib * 0.8;
  const a = (angle * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const rot = [];
  for (let i = 0; i < poly.length; i += 2) rot.push(poly[i] * cos + poly[i + 1] * sin, -poly[i] * sin + poly[i + 1] * cos);
  const n = rot.length / 2;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 1; i < rot.length; i += 2) {
    y0 = Math.min(y0, rot[i]);
    y1 = Math.max(y1, rot[i]);
  }
  const back = (x, y) => [x * cos - y * sin, x * sin + y * cos];
  const strips = []; // { last: [xa, xb], row, pts, flip }
  let row = 0;
  for (let y = y0 + gap * 0.5; y < y1 - gap * 0.2; y += gap, row++) {
    const xs = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [ax, ay, bx, by] = [rot[2 * i], rot[2 * i + 1], rot[2 * j], rot[2 * j + 1]];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((m, k) => m - k);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xa = xs[i] + nib * edge;
      const xb = xs[i + 1] - nib * edge;
      if (xb - xa < nib * 0.15) continue;
      const strip = strips.find((st) => st.row === row - 1 && st.last[0] < xb && xa < st.last[1]);
      const jy = p.off(gap * 0.06);
      if (strip) {
        const [sa, sb] = strip.flip ? [xb, xa] : [xa, xb];
        strip.pts.push(...back(sa + p.off(1.5), y + jy), ...back(sb + p.off(1.5), y + jy));
        strip.flip = !strip.flip;
        strip.last = [xa, xb];
        strip.row = row;
      } else strips.push({ last: [xa, xb], row, pts: [...back(xa, y + jy), ...back(xb, y + jy)], flip: true });
    }
  }
  return { strokes: strips.map((st) => st.pts), width: nib };
}

/** How thick a polygon is: twice its area over its perimeter (a bar's width, a disc's radius). */
function thickness(poly) {
  const n = poly.length / 2;
  let a = 0;
  let per = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += poly[2 * i] * poly[2 * j + 1] - poly[2 * j] * poly[2 * i + 1];
    per += Math.hypot(poly[2 * j] - poly[2 * i], poly[2 * j + 1] - poly[2 * i + 1]);
  }
  return per ? Math.abs(a) / per : 0;
}

/** A polygon shrunk toward its centroid by about d (enough for the convex-ish shapes it is used on). */
export function inset(poly, d) {
  const n = poly.length / 2;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    cx += poly[2 * i];
    cy += poly[2 * i + 1];
  }
  cx /= n;
  cy /= n;
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = poly[2 * i] - cx;
    const y = poly[2 * i + 1] - cy;
    const r = Math.hypot(x, y) || 1;
    const k = Math.max(0, r - d) / r;
    out.push(cx + x * k, cy + y * k);
  }
  return out;
}

/** A small solid spot (a pupil, a shoe, a blot of ink): one short stroke as wide as the spot, from one end to the other. */
export function dab(p, x0, y0, x1, y1, width) {
  const mx = (x0 + x1) / 2 + p.off(width * 0.06);
  const my = (y0 + y1) / 2 + p.off(width * 0.06);
  return { strokes: [[x0, y0, mx, my, x1, y1]], width };
}

/** The points of a polyline moved by (dx, dy). */
export const shift = (pts, dx, dy) => pts.map((v, i) => v + (i % 2 ? dy : dx));

/**
 * A wide arrow with an area, the kind a whiteboard artist draws to carry the
 * story from one scene to the next: a band along a curve that widens into a
 * head. `path` is the centerline (a polyline from tail to tip); the shaft is
 * `width` wide at the head and a little narrower at the tail. Returns the
 * outline as one stroke in pen order (down one side, round the head, back up
 * the other, across the tail), the polygon it encloses, and `inner`: the same
 * shape drawn `inside` units in, for the fill.
 */
export function fatArrow(p, path, { width = 34, head = null, inside = 7 } = {}) {
  const n = path.length / 2;
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(path[2 * i] - path[2 * i - 2], path[2 * i + 1] - path[2 * i - 1]));
  const L = cum[n - 1];
  const hl = Math.min(head ?? width * 1.55, L * 0.5);
  const at = (d) => {
    let i = 1;
    while (i < n - 1 && cum[i] < d) i++;
    const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    const x = path[2 * i - 2] + (path[2 * i] - path[2 * i - 2]) * t;
    const y = path[2 * i - 1] + (path[2 * i + 1] - path[2 * i - 1]) * t;
    const dx = path[2 * i] - path[2 * i - 2];
    const dy = path[2 * i + 1] - path[2 * i - 1];
    const l = Math.hypot(dx, dy) || 1;
    return [x, y, -dy / l, dx / l, dx / l, dy / l];
  };
  const shape = (inset) => {
    const steps = Math.max(6, Math.round((L - hl) / 14));
    const left = [];
    const right = [];
    for (let k = 0; k <= steps; k++) {
      const d = inset + ((L - hl - inset) * k) / steps;
      const [x, y, nx, ny] = at(d);
      const w = Math.max(2, (width / 2) * (0.82 + 0.18 * (d / (L - hl))) - inset);
      left.push(x + nx * w, y + ny * w);
      right.push(x - nx * w, y - ny * w);
    }
    // the head: wings out from the shaft, and the tip (pulled in along the arrow for an inner outline)
    const hw = width * 1.05 - inset * 1.6;
    const [bx, by, bnx, bny, btx, bty] = at(L - hl);
    const [, , , , tx, ty] = at(L);
    const tip = [path[2 * n - 2] - tx * inset * 2.2, path[2 * n - 1] - ty * inset * 2.2];
    const base = [bx + btx * inset * 0.6, by + bty * inset * 0.6];
    const rightBack = [];
    for (let k = right.length / 2 - 1; k >= 0; k--) rightBack.push(right[2 * k], right[2 * k + 1]);
    return [...left, base[0] + bnx * hw, base[1] + bny * hw, ...tip, base[0] - bnx * hw, base[1] - bny * hw, ...rightBack];
  };
  const poly = shape(0);
  const outline = wobble(p, [...poly, poly[0] + p.off(1.5), poly[1] + p.off(1.5), poly[2], poly[3]], { amp: Math.min(1.4, 0.3 * p.width) });
  /** The fill: passes along the band, tail to head and back, then across the head toward its tip. */
  const along = (nib) => {
    const edge = nib * 0.5 + inside * 0.45;
    const half = (d) => (width / 2) * (0.82 + 0.18 * (d / (L - hl))) - edge;
    const passes = Math.max(1, Math.ceil((width - 2 * edge) / (nib * 0.78)) + 1);
    const zig = [];
    const d0 = edge;
    const d1 = L - hl + nib * 0.3;
    const steps = Math.max(4, Math.round((d1 - d0) / 12));
    for (let k = 0; k < passes; k++) {
      const q = passes === 1 ? 0 : -1 + (2 * k) / (passes - 1);
      const run = [];
      for (let j = 0; j <= steps; j++) {
        const d = d0 + ((d1 - d0) * j) / steps;
        const [x, y, nx, ny] = at(d);
        const o = q * Math.max(0, half(d));
        run.push(x + nx * o, y + ny * o);
      }
      if (k % 2) for (let j = run.length / 2 - 1; j >= 0; j--) zig.push(run[2 * j] + p.off(0.8), run[2 * j + 1] + p.off(0.8));
      else zig.push(...run.map((v) => v + p.off(0.8)));
    }
    const strokes = [zig];
    // the head, in passes across it that shorten toward the tip
    const [bx, by, bnx, bny, btx, bty] = at(L - hl);
    const reach = width * 1.05 - edge * 1.5;
    const len = hl - edge * 2.2;
    const across = [];
    const m = Math.max(2, Math.ceil(len / (nib * 0.72)));
    for (let j = 0; j <= m; j++) {
      const s = (len * j) / m;
      const wj = reach * (1 - s / hl) - nib * 0.15;
      if (wj < nib * 0.2) break;
      const cx = bx + btx * (s + edge * 0.4);
      const cy = by + bty * (s + edge * 0.4);
      const a = [cx + bnx * wj, cy + bny * wj];
      const b = [cx - bnx * wj, cy - bny * wj];
      across.push(...(j % 2 ? [...b, ...a] : [...a, ...b]));
    }
    if (across.length >= 4) strokes.push(across);
    return strokes;
  };
  return { outline, poly, inner: shape(inside), along };
}

