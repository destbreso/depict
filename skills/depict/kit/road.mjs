// The story road: how a board is composed. The ideas sit along one wide
// road that winds across the board the way a journey map is drawn: rows that
// run one way and turn back the other at the end, each idea on the other side
// of the road from the one before, staggered so they interlock instead of
// lining up in a grid. Any number of ideas fits: more of them, more turns, and
// the number of rows is the one that makes the whole board closest to 16:9,
// so the closing picture is a poster, not a strip. The road is what the eye
// follows from the first idea to the last; the guide walks it.

/**
 * Places boxes ({ w, h }, in telling order) along a road. Returns the place
 * of each box ({ x, y, side: "above" | "below", row }), the road's
 * centerline as a polyline with each box's stop on it (arc length and point),
 * and the size of the whole.
 */
export function layRoad(boxes, { road = 38, side = 72, same = 230, stagger = 0.42, band = 80, lead = 120, swing = 70, aspect = 16 / 9 } = {}) {
  const n = boxes.length;
  const arrange = (R) => {
    // the boxes split into R rows, as evenly as their order allows
    const rows = [];
    let i = 0;
    for (let r = 0; r < R; r++) {
      const k = Math.max(1, Math.round((n - i) / (R - r)));
      rows.push([...Array(Math.min(k, n - i)).keys()].map((j) => i + j));
      i += k;
    }
    // along each row: each box starts a share of the way past the one before (they are on opposite sides),
    // and clear of the one two before (on the same side), with room between for the guide to stand
    const along = new Map();
    const widths = rows.map((row) => {
      let w = 0;
      row.forEach((b, j) => {
        let x = 0;
        if (j >= 1) x = along.get(row[j - 1]) + stagger * boxes[row[j - 1]].w;
        if (j >= 2) x = Math.max(x, along.get(row[j - 2]) + boxes[row[j - 2]].w + same);
        along.set(b, x);
        w = Math.max(w, x + boxes[b].w);
      });
      return w;
    });
    const W = Math.max(...widths);
    const up = rows.map((row) => Math.max(0, ...row.filter((_, j) => j % 2 === 0).map((b) => boxes[b].h)));
    const down = rows.map((row) => Math.max(0, ...row.filter((_, j) => j % 2 === 1).map((b) => boxes[b].h)));
    // the road swings up to each idea above it and down to each below, so each row's band is that much taller
    const reach = road / 2 + side + swing;
    const roadY = [];
    let y = up[0] + reach;
    for (let r = 0; r < rows.length; r++) {
      if (r > 0) y += reach + down[r - 1] + band + up[r] + reach;
      roadY.push(y);
    }
    const H = roadY.at(-1) + reach + down.at(-1);
    const turn = rows.length > 1 ? Math.min(190, (roadY[1] - roadY[0]) / 2) : 0;
    return { rows, along, widths, W, H, roadY, turn };
  };
  let best = null;
  for (let R = 1; R <= n; R++) {
    const L = arrange(R);
    const misfit = Math.abs(Math.log((L.W + 2 * (L.turn + lead)) / (L.H + 160) / aspect));
    if (!best || misfit < best.misfit - 1e-9) best = { ...L, misfit };
  }
  const { rows, along, W, roadY, turn } = best;

  // each box's place: even rows run left to right, odd rows right to left; first above the road, then below, and so on
  const places = Array(n);
  rows.forEach((row, r) => {
    const forward = r % 2 === 0;
    row.forEach((b, j) => {
      const x = forward ? along.get(b) : W - along.get(b) - boxes[b].w;
      const above = j % 2 === 0;
      const y = above ? roadY[r] - swing - road / 2 - side - boxes[b].h : roadY[r] + swing + road / 2 + side;
      places[b] = { x, y, side: above ? "above" : "below", row: r };
    });
  });

  // the road's centerline: each row a slalom, up to each idea above it and down to each below, joined to the
  // next row by a half turn at its end
  const pts = [];
  // the bends come at an even pace along the row, toward each idea in turn, so the road sways rather than jerks
  const bends = rows.map((row) => {
    const xs = row.map((b) => places[b].x + boxes[b].w / 2);
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const order = [...row].sort((a, c) => places[a].x - places[c].x);
    return order.map((b, k) => ({ x: order.length === 1 ? lo : lo + ((hi - lo) * k) / (order.length - 1), dy: places[b].side === "above" ? -swing : swing }));
  });
  const wave = (r, x) => {
    const k = bends[r];
    if (!k.length) return roadY[r];
    if (x <= k[0].x) return roadY[r] + k[0].dy * Math.max(0, 1 - (k[0].x - x) / 500);
    if (x >= k.at(-1).x) return roadY[r] + k.at(-1).dy * Math.max(0, 1 - (x - k.at(-1).x) / 500);
    let i = 0;
    while (i < k.length - 2 && x > k[i + 1].x) i++;
    const u = (x - k[i].x) / (k[i + 1].x - k[i].x || 1);
    const e = (1 - Math.cos(Math.PI * u)) / 2;
    return roadY[r] + k[i].dy + (k[i + 1].dy - k[i].dy) * e;
  };
  rows.forEach((row, r) => {
    const forward = r % 2 === 0;
    const last = r === rows.length - 1;
    // where the row's stretch of road starts and ends
    const first = places[row[0]];
    const end = places[row.at(-1)];
    const x0 = r === 0 ? first.x - lead : forward ? 0 : W;
    const x1 = last ? (forward ? end.x + boxes[row.at(-1)].w + lead : end.x - lead) : forward ? W : 0;
    const steps = Math.max(8, Math.round(Math.abs(x1 - x0) / 24));
    for (let k = 0; k <= steps; k++) {
      const x = x0 + ((x1 - x0) * k) / steps;
      if (k === 0 && pts.length) continue;
      pts.push(x, wave(r, x));
    }
    if (!last) {
      // the turn: half an ellipse out past the row's end and back into the next row
      const ya = wave(r, x1);
      const yb = wave(r + 1, x1);
      const cy = (ya + yb) / 2;
      const ry = (yb - ya) / 2;
      for (let k = 1; k <= 24; k++) {
        const a = -Math.PI / 2 + (Math.PI * k) / 24;
        pts.push(x1 + (forward ? 1 : -1) * turn * Math.cos(a), cy + ry * Math.sin(a));
      }
    }
  });
  const cum = [0];
  for (let k = 1; k < pts.length / 2; k++) cum.push(cum[k - 1] + Math.hypot(pts[2 * k] - pts[2 * k - 2], pts[2 * k + 1] - pts[2 * k - 1]));
  // each box's stop: the point of the road on its row closest under (or over) its middle
  const stops = places.map((q, b) => {
    const cx = q.x + boxes[b].w / 2;
    let bestK = 0;
    let bestD = Infinity;
    for (let k = 0; k < pts.length / 2; k++) {
      const d = Math.abs(pts[2 * k] - cx) + Math.abs(pts[2 * k + 1] - roadY[q.row]) * 0.5;
      if (d < bestD) {
        bestD = d;
        bestK = k;
      }
    }
    return { s: cum[bestK], x: pts[2 * bestK], y: pts[2 * bestK + 1] };
  });
  return { places, road: { pts, cum, stops, width: road, rows: rows.length, roadY }, W, H: best.H };
}

/** The stretch of a polyline between two arc lengths, as a polyline. */
export function stretch(pts, cum, s0, s1) {
  const n = cum.length;
  const at = (s) => {
    let k = 1;
    while (k < n - 1 && cum[k] < s) k++;
    const t = Math.max(0, Math.min(1, (s - cum[k - 1]) / (cum[k] - cum[k - 1] || 1)));
    return [pts[2 * k - 2] + (pts[2 * k] - pts[2 * k - 2]) * t, pts[2 * k - 1] + (pts[2 * k + 1] - pts[2 * k - 1]) * t];
  };
  const out = [...at(s0)];
  for (let k = 0; k < n; k++) if (cum[k] > s0 && cum[k] < s1) out.push(pts[2 * k], pts[2 * k + 1]);
  out.push(...at(s1));
  return out;
}
