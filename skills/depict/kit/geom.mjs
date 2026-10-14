// Polylines. Everything on a board, a letter, an arrow, a box, is drawn as
// polylines with a known length, so "how much of the drawing exists at time t"
// is just how far along each polyline the pen has gone. Points are flat
// arrays: [x0, y0, x1, y1, ...].

/** Cumulative length at each point of a polyline (first entry 0, last the total). */
export function cumulative(pts) {
  const n = pts.length / 2;
  const cum = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    cum[i] = cum[i - 1] + Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
  }
  return cum;
}

export const lengthOf = (pts) => {
  const cum = cumulative(pts);
  return cum[cum.length - 1] ?? 0;
};

/** The part of a polyline from its start to distance d along it. */
export function prefix(pts, cum, d) {
  const n = cum.length;
  if (d >= cum[n - 1]) return pts;
  if (d <= 0) return pts.slice(0, 2);
  let i = 1;
  while (cum[i] < d) i++;
  const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  const out = pts.slice(0, 2 * i);
  out.push(pts[2 * i - 2] + (pts[2 * i] - pts[2 * i - 2]) * t, pts[2 * i - 1] + (pts[2 * i + 1] - pts[2 * i - 1]) * t);
  return out;
}

/** The point at distance d along a polyline, and the unit direction there. */
export function pointAt(pts, cum, d) {
  const n = cum.length;
  const total = cum[n - 1];
  d = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < n - 1 && cum[i] < d) i++;
  const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  const dx = pts[2 * i] - pts[2 * i - 2];
  const dy = pts[2 * i + 1] - pts[2 * i - 1];
  const len = Math.hypot(dx, dy) || 1;
  return { x: pts[2 * i - 2] + dx * t, y: pts[2 * i - 1] + dy * t, dx: dx / len, dy: dy / len };
}

/** Axis-aligned bounds of several polylines: { x, y, w, h }. */
export function bounds(lines) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const pts of lines) {
    for (let i = 0; i < pts.length; i += 2) {
      if (pts[i] < x0) x0 = pts[i];
      if (pts[i] > x1) x1 = pts[i];
      if (pts[i + 1] < y0) y0 = pts[i + 1];
      if (pts[i + 1] > y1) y1 = pts[i + 1];
    }
  }
  return x0 === Infinity ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export const union = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

export const pad = (r, p, q = p) => ({ x: r.x - p, y: r.y - q, w: r.w + 2 * p, h: r.h + 2 * q });

export const overlaps = (a, b, gap = 0) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/** Catmull-Rom through the points, sampled every `step` units: a polyline made smooth, as a hand would draw it. */
export function smooth(pts, step = 6) {
  const n = pts.length / 2;
  if (n < 3) return pts;
  const P = (i) => [pts[2 * Math.max(0, Math.min(n - 1, i))], pts[2 * Math.max(0, Math.min(n - 1, i)) + 1]];
  const out = [pts[0], pts[1]];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = P(i - 1);
    const [x1, y1] = P(i);
    const [x2, y2] = P(i + 1);
    const [x3, y3] = P(i + 2);
    const k = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let j = 1; j <= k; j++) {
      const t = j / k;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3),
        0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3),
      );
    }
  }
  return out;
}

/** A cubic Bézier sampled into a polyline (the first point included). */
export function cubic(x0, y0, x1, y1, x2, y2, x3, y3, step = 6) {
  const est = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
  const k = Math.max(2, Math.ceil(est / step));
  const out = [];
  for (let j = 0; j <= k; j++) {
    const t = j / k;
    const u = 1 - t;
    out.push(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
  }
  return out;
}

/** An SVG path's "d" for a polyline, with coordinates rounded to tenths. */
export function pathOf(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].toFixed(1)} ${pts[1].toFixed(1)}`;
  for (let i = 2; i < pts.length; i += 2) d += `L${pts[i].toFixed(1)} ${pts[i + 1].toFixed(1)}`;
  return d;
}
