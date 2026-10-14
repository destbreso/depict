// SVG geometry to polylines: every path command (absolute and relative,
// curves and arcs) plus rect, circle, ellipse, line, polyline and polygon.
// Icons arrive as SVG; the hand draws them as polylines, one subpath per
// stroke, in the order the file lists them.
import { cubic } from "./geom.mjs";

const NUM = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

function quad(x0, y0, x1, y1, x2, y2, step) {
  return cubic(x0, y0, x0 + (2 / 3) * (x1 - x0), y0 + (2 / 3) * (y1 - y0), x2 + (2 / 3) * (x1 - x2), y2 + (2 / 3) * (y1 - y2), x2, y2, step);
}

/** An SVG elliptical arc as points (excluding the start), per the spec's endpoint-to-center conversion. */
function arc(x1, y1, rx, ry, phi, large, sweep, x2, y2, step) {
  if (rx === 0 || ry === 0) return [x2, y2];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy;
  const yp = -sin * dx + cos * dy;
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  let co = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) co = -co;
  const cxp = (co * rx * yp) / ry;
  const cyp = (-co * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const k = Math.max(2, Math.ceil((Math.abs(dt) * Math.max(rx, ry)) / step));
  const out = [];
  for (let i = 1; i <= k; i++) {
    const t = t1 + (dt * i) / k;
    out.push(cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos);
  }
  return out;
}

/** A path's "d" as polylines, one per subpath. `step` is the flattening length in path units. */
export function flattenPath(d, step = 0.6) {
  // a scanner, not a tokenizer: arc flags are single digits and may be packed
  // against what follows ("a.25.25 0 00.407.195" is flags 0 and 0, then .407)
  let i = 0;
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++;
  };
  const num = () => {
    skip();
    const m = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(d.slice(i));
    if (!m) throw new Error(`a number expected at ${i} in "${d.slice(0, 60)}"`);
    i += m[0].length;
    return Number(m[0]);
  };
  const flag = () => {
    skip();
    const c = d[i++];
    if (c !== "0" && c !== "1") throw new Error(`an arc flag expected at ${i - 1} in "${d.slice(0, 60)}"`);
    return c === "1";
  };
  const more = () => {
    skip();
    return i < d.length && /[-+.\d]/.test(d[i]);
  };
  const out = [];
  let cur = null;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let lastC = null; // the last cubic control point, for S
  let lastQ = null; // the last quadratic control point, for T
  const start = (nx, ny) => {
    cur = [nx, ny];
    out.push(cur);
    sx = nx;
    sy = ny;
  };
  const to = (pts) => {
    if (!cur) start(x, y);
    cur.push(...pts);
  };
  skip();
  while (i < d.length) {
    const cmd = d[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    let first = true;
    do {
      const ox = rel ? x : 0;
      const oy = rel ? y : 0;
      if (C === "M") {
        x = ox + num();
        y = oy + num();
        if (first) start(x, y);
        else to([x, y]); // pairs after a move are line-tos
        lastC = lastQ = null;
      } else if (C === "L") {
        x = ox + num();
        y = oy + num();
        to([x, y]);
        lastC = lastQ = null;
      } else if (C === "H") {
        x = (rel ? x : 0) + num();
        to([x, y]);
        lastC = lastQ = null;
      } else if (C === "V") {
        y = (rel ? y : 0) + num();
        to([x, y]);
        lastC = lastQ = null;
      } else if (C === "C") {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
        to(cubic(x, y, x1, y1, x2, y2, ex, ey, step).slice(2));
        lastC = [x2, y2];
        lastQ = null;
        x = ex;
        y = ey;
      } else if (C === "S") {
        const x1 = lastC ? 2 * x - lastC[0] : x, y1 = lastC ? 2 * y - lastC[1] : y;
        const x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
        to(cubic(x, y, x1, y1, x2, y2, ex, ey, step).slice(2));
        lastC = [x2, y2];
        lastQ = null;
        x = ex;
        y = ey;
      } else if (C === "Q") {
        const x1 = ox + num(), y1 = oy + num(), ex = ox + num(), ey = oy + num();
        to(quad(x, y, x1, y1, ex, ey, step).slice(2));
        lastQ = [x1, y1];
        lastC = null;
        x = ex;
        y = ey;
      } else if (C === "T") {
        const x1 = lastQ ? 2 * x - lastQ[0] : x, y1 = lastQ ? 2 * y - lastQ[1] : y;
        const ex = ox + num(), ey = oy + num();
        to(quad(x, y, x1, y1, ex, ey, step).slice(2));
        lastQ = [x1, y1];
        lastC = null;
        x = ex;
        y = ey;
      } else if (C === "A") {
        const rx = num(), ry = num(), rot = (num() * Math.PI) / 180, large = flag(), sweep = flag();
        const ex = ox + num(), ey = oy + num();
        to(arc(x, y, rx, ry, rot, large, sweep, ex, ey, step));
        lastC = lastQ = null;
        x = ex;
        y = ey;
      } else if (C === "Z") {
        if (cur) cur.push(sx, sy);
        x = sx;
        y = sy;
        cur = null;
        lastC = lastQ = null;
        break;
      } else throw new Error(`unknown path command "${cmd}" in "${d.slice(0, 60)}"`);
      first = false;
    } while (more());
    skip();
  }
  return out.filter((s) => s.length >= 4);
}

/** A rounded rectangle as one polyline, starting after the top-left corner and going clockwise. */
export function rectPath(x, y, w, h, rx = 0, ry = rx, step = 0.6) {
  rx = Math.min(rx, w / 2);
  ry = Math.min(ry || rx, h / 2);
  if (!rx) return [[x, y, x + w, y, x + w, y + h, x, y + h, x, y]];
  return flattenPath(`M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}`, step);
}

/** An ellipse as one polyline, from the top, counterclockwise as a hand usually draws it. */
export function ellipsePath(cx, cy, rx, ry, step = 0.6) {
  const k = Math.max(16, Math.ceil((2 * Math.PI * Math.max(rx, ry)) / step));
  const pts = [];
  for (let i = 0; i <= k; i++) {
    const a = -Math.PI / 2 - (2 * Math.PI * i) / k;
    pts.push(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
  }
  return [pts];
}

/** One compact icon element (as stored in icons.json) to polylines. */
export function shapeLines(el, step = 0.6) {
  const [kind, ...a] = el;
  if (kind === "p") return flattenPath(a[0], step);
  if (kind === "r") return rectPath(a[0], a[1], a[2], a[3], a[4] ?? 0, a[5] ?? a[4] ?? 0, step);
  if (kind === "c") return ellipsePath(a[0], a[1], a[2], a[2], step);
  if (kind === "e") return ellipsePath(a[0], a[1], a[2], a[3], step);
  if (kind === "l") return [[a[0], a[1], a[2], a[3]]];
  if (kind === "pl" || kind === "pg") {
    const pts = (a[0].match(NUM) ?? []).map(Number);
    if (kind === "pg") pts.push(pts[0], pts[1]);
    return [pts];
  }
  return [];
}
