// The camera. A shot is a frame of the board: its center and its width (the
// height follows from 16:9). Between two shots the camera takes van Wijk and
// Nuij's path ("Smooth and efficient zooming and panning", InfoVis 2003),
// the one d3.interpolateZoom ships: it pulls back as it travels and comes in
// at the far end, so a long move never smears the board across the screen.
// This file has no imports: the page inlines it as it is.

const RHO = Math.SQRT2;
const RHO2 = 2;
const RHO4 = 4;

/** A shot from a frame { x, y, w, h }: center and width, the frame grown to 16:9 so all of it shows. */
export function shotOf(f, aspect = 16 / 9) {
  const w = Math.max(f.w, f.h * aspect);
  return [f.x + f.w / 2, f.y + f.h / 2, w];
}

/** The path from shot a to shot b: a function of u in [0, 1], and the path's length (in the zoom metric). */
export function flight(a, b) {
  const [ux0, uy0, w0] = a;
  const [ux1, uy1, w1] = b;
  const dx = ux1 - ux0;
  const dy = uy1 - uy0;
  const d2 = dx * dx + dy * dy;
  if (d2 < 1e-6) {
    const S = Math.log(w1 / w0) / RHO;
    return { S: Math.abs(S), at: (u) => [ux0 + u * dx, uy0 + u * dy, w0 * Math.exp(RHO * u * S)] };
  }
  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + RHO4 * d2) / (2 * w0 * RHO2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - RHO4 * d2) / (2 * w1 * RHO2 * d1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / RHO;
  return {
    S,
    at(u) {
      const s = u * S;
      const coshr0 = Math.cosh(r0);
      const k = (w0 / (RHO2 * d1)) * (coshr0 * Math.tanh(RHO * s + r0) - Math.sinh(r0));
      return [ux0 + k * dx, uy0 + k * dy, (w0 * coshr0) / Math.cosh(RHO * s + r0)];
    },
  };
}

/** A straight pan between shots, for slides: the next sheet slides in, nothing zooms out. */
export function pan(a, b) {
  const S = Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.max(a[2], b[2]);
  return { S, at: (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u] };
}

/** How long a flight takes, in seconds: longer for longer paths, never a jump and never a crawl. */
export const flightTime = (S) => Math.min(2.6, Math.max(0.9, 0.55 + 0.5 * S));

/** Ease in and out, so the camera leaves and arrives gently. */
export const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/**
 * The camera at time t, from its keys: [{ t0, t1, from, to }] flights and
 * the holds between them. Returns a shot [cx, cy, width].
 */
export function cameraAt(keys, t) {
  let shot = keys[0].from;
  for (const k of keys) {
    if (t < k.t0) return shot;
    if (t < k.t1) return (k.pan ? pan : flight)(k.from, k.to).at(ease((t - k.t0) / (k.t1 - k.t0)));
    shot = k.to;
  }
  return shot;
}
