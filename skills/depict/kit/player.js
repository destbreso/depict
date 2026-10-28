// The player: the page's runtime. Everything on screen is a pure function of
// the time t (which strokes exist and how far each one is drawn, where the
// camera is, which sentence is said), so playing, scrubbing and capturing a
// video frame by frame are the same call: render(t). When the explanation
// ends, the board stays: zoom it, drag it, and tap any part to hear it again.
// This file is inlined into the page after the camera functions and SCENE.
(function () {
  "use strict";
  const S = SCENE;
  const VW = 1920;
  const VH = 1080;
  const NS = "http://www.w3.org/2000/svg";
  const q = new URLSearchParams(location.search);
  const capture = q.has("capture");
  // on a site, in a frame (?embed): the page tells its host what the film does, and how tall it wants to be
  const embedded = q.has("embed") && window.parent !== window;
  const reduced = !capture && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.querySelector(".dp");

  // strokes arrive as delta-encoded half units: [t0, t1, width x10, color, layer, opacity x100, element, x0, y0, dx, dy, ...]
  const strokes = S.strokes.map((a) => {
    const n = (a.length - 7) / 2;
    const pts = new Float64Array(n * 2);
    let x = 0;
    let y = 0;
    for (let i = 0; i < n; i++) {
      x += a[7 + 2 * i];
      y += a[8 + 2 * i];
      pts[2 * i] = x / 2;
      pts[2 * i + 1] = y / 2;
    }
    const cum = new Float64Array(n);
    for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
    return { t0: a[0] / 1000, t1: a[1] / 1000, w: a[2] / 10, color: S.palette[a[3]], layer: a[4], op: a[5] / 100, el: a[6], pts, cum, len: cum[n - 1] || 0, node: null, state: -1, shown: -1 };
  });
  const T = S.duration;
  const beats = S.beats;
  // The words of each beat: as the page was built, or as a host gives them (script(): other wording, another
  // language). A sentence longer than the one the board was timed for holds the board still at the end of its beat,
  // its picture whole and the guide breathing, until it is read. The film's clock (the bar, the clock, what a host
  // hears) runs through those holds; the board's clock (`now`) stands still in them.
  const lines = beats.map((b) => b.say);
  const READ = S.read || { base: 0.5, rate: 16 };
  let holds = []; // { at: board time, len }, in order
  let D = T; // the film's length, holds and all
  let film = 0; // the film's clock
  const filmOf = (t) => holds.reduce((f, h) => (h.at < t ? f + h.len : f), t);
  const boardOf = (f) => {
    let acc = 0;
    for (const h of holds) {
      if (f < h.at + acc) return f - acc;
      if (f < h.at + acc + h.len) return h.at;
      acc += h.len;
    }
    return Math.min(T, f - acc);
  };
  const holding = (f) => {
    let acc = 0;
    for (const h of holds) {
      if (f >= h.at + acc && f < h.at + acc + h.len) return true;
      acc += h.len;
    }
    return false;
  };
  const flights = S.camera.map((k) => ({ ...k, f: (k.pan ? pan : flight)(k.from, k.to) }));

  // the stage
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${VW} ${VH}`);
  svg.setAttribute("class", "dp-stage");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", S.title);
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("width", VW);
  bg.setAttribute("height", VH);
  bg.setAttribute("class", "dp-paper");
  const cam = document.createElementNS(NS, "g");
  const shadow = document.createElementNS(NS, "g"); // shadows, under everything
  const under = document.createElementNS(NS, "g"); // fills and highlighter, under the ink
  const inkLayer = document.createElementNS(NS, "g");
  for (const g of [shadow, under, inkLayer]) {
    g.setAttribute("fill", "none");
    g.setAttribute("stroke-linecap", "round");
    g.setAttribute("stroke-linejoin", "round");
  }
  const hoverBox = document.createElementNS(NS, "rect");
  hoverBox.setAttribute("class", "dp-hover");
  hoverBox.setAttribute("rx", 18);
  const pen = document.createElementNS(NS, "g");
  pen.setAttribute("class", "dp-pen");
  pen.innerHTML =
    '<g transform="rotate(-38)"><path d="M0 0 L-6 -16 L6 -16 Z" fill="#2b2b28"/><rect x="-8" y="-22" width="16" height="10" rx="2" fill="#3a3a36"/><rect x="-11" y="-118" width="22" height="98" rx="6" fill="#f4f1e8" stroke="#2b2b28" stroke-width="3"/><rect x="-11" y="-118" width="22" height="26" rx="6" fill="var(--dp-accent)"/></g>';
  // slides: each sheet is a page of paper on the room's grey
  const sheetLayer = document.createElementNS(NS, "g");
  for (const [x, y, w, h] of S.sheets) {
    const r = document.createElementNS(NS, "rect");
    Object.entries({ x, y, width: w, height: h, rx: 22, class: "dp-sheet" }).forEach(([k, v]) => r.setAttribute(k, v));
    sheetLayer.append(r);
  }
  if (S.sheets.length) root.classList.add("slides");
  const actorLayer = document.createElementNS(NS, "g");
  actorLayer.setAttribute("fill", "none");
  actorLayer.setAttribute("stroke-linecap", "round");
  actorLayer.setAttribute("stroke-linejoin", "round");
  cam.append(sheetLayer, hoverBox, shadow, under, inkLayer, actorLayer, pen);
  // the outro, over the board in the frame's own coordinates: the closing circle and the title on the dark
  const outroLayer = document.createElementNS(NS, "g");
  outroLayer.setAttribute("stroke-linecap", "round");
  outroLayer.setAttribute("stroke-linejoin", "round");
  const iris = document.createElementNS(NS, "path");
  iris.setAttribute("fill", "#1b1b19");
  iris.setAttribute("fill-rule", "evenodd");
  outroLayer.append(iris);
  outroLayer.style.display = "none";
  svg.append(bg, cam, outroLayer);
  const stage = root.querySelector(".dp-board");
  stage.append(svg);
  const caption = root.querySelector(".dp-caption");

  // the camera: a shot [cx, cy, width] maps the board onto the 1920 x 1080 stage
  let view = null; // a shot the reader set by zooming or dragging, or null to follow the explanation
  const camAt = (t) => {
    if (reduced) {
      // no flights: cut to each shot
      let shot = flights.length ? flights[0].from : S.overview;
      for (const k of flights) if (t >= k.t0) shot = k.to;
      return shot;
    }
    let shot = flights.length ? flights[0].from : S.overview;
    for (const k of flights) {
      if (t < k.t0) return shot;
      if (t < k.t1) return k.f.at(ease((t - k.t0) / (k.t1 - k.t0)));
      shot = k.to;
    }
    return shot;
  };
  let shotNow = S.overview;
  const setCam = (shot) => {
    shotNow = shot;
    const k = VW / shot[2];
    cam.setAttribute("transform", `translate(${VW / 2} ${VH / 2}) scale(${k}) translate(${-shot[0]} ${-shot[1]})`);
    // the pen keeps its size on screen
    pen.dataset.k = 1 / k;
  };

  const pathOf = (pts, n) => {
    let d = `M${pts[0].toFixed(1)} ${pts[1].toFixed(1)}`;
    for (let i = 2; i < n; i += 2) d += `L${pts[i].toFixed(1)} ${pts[i + 1].toFixed(1)}`;
    return d;
  };
  const partial = (s, d) => {
    // the polyline up to distance d along it
    const n = s.cum.length;
    let i = 1;
    while (i < n && s.cum[i] < d) i++;
    if (i >= n) return { d: pathOf(s.pts, s.pts.length), x: s.pts[2 * n - 2], y: s.pts[2 * n - 1] };
    const u = (d - s.cum[i - 1]) / (s.cum[i] - s.cum[i - 1] || 1);
    const x = s.pts[2 * i - 2] + (s.pts[2 * i] - s.pts[2 * i - 2]) * u;
    const y = s.pts[2 * i - 1] + (s.pts[2 * i + 1] - s.pts[2 * i - 1]) * u;
    return { d: pathOf(s.pts, 2 * i) + `L${x.toFixed(1)} ${y.toFixed(1)}`, x, y };
  };
  const nodeOf = (s) => {
    if (!s.node) {
      s.node = document.createElementNS(NS, "path");
      s.node.setAttribute("stroke", s.color);
      s.node.setAttribute("stroke-width", s.w);
      if (s.op < 1) s.node.setAttribute("stroke-opacity", s.op);
      (s.layer === 2 ? shadow : s.layer === 1 ? under : inkLayer).append(s.node);
    }
    return s.node;
  };

  // actors: the guide, a rig drawn once and moved every frame, as a pure function of the time
  const node = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.append(n);
    return n;
  };
  const measured = (list) => {
    const pts = Float64Array.from(list);
    const n = pts.length / 2;
    const cum = new Float64Array(n);
    for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
    return { pts, cum, len: cum[n - 1] || 0 };
  };
  const INKC = "#1b1b19";
  const PAPERC = "#fbfaf7";
  /** An actor's rig, drawn once into the page: its strokes, arms and gloves, ready to be moved every frame. */
  function makeActor(A) {
    const floor = node("g", {}, shadow);
    const root = node("g", { class: "dp-guide" }, actorLayer);
    const backArm = node("path", { stroke: INKC, "stroke-width": A.arm.width }, root);
    // a limb with a color of its own: its color drawn along the middle of its ink
    const backArmFill = A.arm.fill != null ? node("path", { stroke: S.palette[A.arm.fill], "stroke-width": A.arm.fillWidth }, root) : null;
    const backGloveG = node("g", {}, root);
    // the parts that move on their own (a tail), behind its body, each turning about its own pivot
    const swingG = node("g", {}, root);
    const swings = new Map(Object.keys(A.swing || {}).map((part) => [part, node("g", {}, swingG)]));
    const bodyUnder = node("g", {}, root);
    const bodyInk = node("g", {}, root);
    // its other views (facing the viewer, at rest as it stands): each its own body and face, shown in place of the
    // standing one while a pose is taken in it
    const viewG = {};
    for (const v of Object.keys(A.views || {})) {
      const g = node("g", {}, root);
      viewG[v] = { g, under: node("g", {}, g), ink: node("g", {}, g), face: node("g", {}, g) };
      g.style.display = "none";
    }
    // the cap, with whatever hat is on it: one group, so it can be lifted and tipped
    const capG = node("g", {}, root);
    const [capUnder, capInk, hatUnder, hatInk] = [0, 1, 2, 3].map(() => node("g", {}, capG));
    const face = node("g", {}, root);
    const wearG = node("g", {}, root);
    const [wearUnder, wearInk] = [0, 1].map(() => node("g", {}, wearG));
    const frontArm = node("path", { stroke: INKC, "stroke-width": A.arm.width }, root);
    const frontArmFill = A.arm.fill != null ? node("path", { stroke: S.palette[A.arm.fill], "stroke-width": A.arm.fillWidth }, root) : null;
    const pointerG = node("g", {}, root); // a pointer, under the fist that holds it
    const frontGloveG = node("g", {}, root);
    const [pointerUnder, pointerInk] = [0, 1].map(() => node("g", {}, pointerG));
    // what it holds, upright in its back hand, in front of it
    const heldG = node("g", {}, root);
    const [heldUnder, heldInk] = [0, 1].map(() => node("g", {}, heldG));
    // its whole-body forms (sitting, curled up), each drawn in place of the standing figure while it is taken
    const formsG = node("g", {}, root);
    const layered = { body: [bodyUnder, bodyInk], cap: [capUnder, capInk], hat: [hatUnder, hatInk], wear: [wearUnder, wearInk], pointer: [pointerUnder, pointerInk], held: [heldUnder, heldInk] };
    const groups = new Map();
    const groupFor = (part) => {
      if (groups.has(part)) return groups.get(part);
      let g;
      const vm = A.views && /^@([a-z][a-z0-9-]*):(.+)$/.exec(part);
      if (vm && viewG[vm[1]]) {
        // a part of another view: its eyes grouped as the standing face's are, the rest in its face
        const V = viewG[vm[1]];
        const e = /^(eye|pupil)(\d)$/.exec(vm[2]);
        const ek = `@${vm[1]}:eyes${e ? e[2] : ""}`;
        if (e && !groups.has(ek)) groups.set(ek, node("g", {}, V.face));
        g = node("g", {}, e ? groups.get(ek) : V.face);
        groups.set(part, g);
        return g;
      }
      const m = /^(eye|pupil|squint)(\d)$/.exec(part);
      if (m && m[1] !== "squint") {
        if (!groups.has(`eyes${m[2]}`)) groups.set(`eyes${m[2]}`, node("g", {}, face));
        g = node("g", {}, groups.get(`eyes${m[2]}`));
      } else if (part === "floor") g = floor;
      else if (swings.has(part)) g = swings.get(part);
      else if (part.startsWith("form:")) g = node("g", {}, formsG);
      else g = node("g", {}, face);
      groups.set(part, g);
      return g;
    };
    const strokes = A.strokes.map((st) => {
      const vb = A.views && /^@([a-z][a-z0-9-]*):body$/.exec(st.part);
      const parent = vb && viewG[vb[1]] ? viewG[vb[1]][st.l === 1 ? "under" : "ink"] : layered[st.part] ? layered[st.part][st.l === 1 ? 0 : 1] : groupFor(st.part);
      const n = node("path", { stroke: S.palette[st.c], "stroke-width": st.w }, parent);
      if (st.o < 1) n.setAttribute("stroke-opacity", st.o);
      n.style.display = "none";
      return Object.assign(measured(st.pts), { t0: st.t0, t1: st.t1, node: n, state: 0 });
    });
    const gloveSet = (parent) => {
      const set = {};
      for (const kind in A.gloves) {
        const gl = A.gloves[kind];
        const g = node("g", {}, parent);
        for (const f of gl.fill) node("path", { d: pathOf(f, f.length), stroke: A.gloveFill != null ? S.palette[A.gloveFill] : PAPERC, "stroke-width": gl.fillWidth }, g);
        for (const l of gl.lines) node("path", { d: pathOf(l, l.length), stroke: INKC, "stroke-width": A.gloveWidth }, g);
        g.style.display = "none";
        set[kind] = g;
      }
      return set;
    };
    // what stands: everything but its forms (hidden while it has taken one)
    const standing = [backArm, backArmFill, backGloveG, swingG, bodyUnder, bodyInk, capG, face, wearG, frontArm, frontArmFill, pointerG, frontGloveG, heldG].filter(Boolean);
    return { A, floor, root, backArm, frontArm, backArmFill, frontArmFill, backGloveG, frontGloveG, capG, heldG, pointerG, gloves: { back: gloveSet(backGloveG), front: gloveSet(frontGloveG) }, strokes, groups, swings, standing, formsG, viewG, main: [swingG, bodyUnder, bodyInk, face], wearG };
  }
  const actors = (S.actors || []).map(makeActor);
  const ownGuide = S.actors && S.actors[0];
  /**
   * Another character of the guide's slot presents the board: its look (scripts/look.mjs) takes the guide's
   * place, doing what the guide does, its own way, from this very moment; null brings the board's own guide back.
   * `dress` asks for an outfit, { outfit: "Halloween" } or { outfit: "today" } (act.mjs, OCCASIONS): the board's
   * own guide dresses for an occasion by casting its own look. Returns { ok, character } or { ok: false, reason }.
   */
  function cast(look, dress) {
    if (!ownGuide) return { ok: false, reason: "this board has no guide" };
    let A = ownGuide;
    if (look != null) {
      const why = castProblem(ownGuide, look);
      if (why) return { ok: false, reason: why };
      A = recast(ownGuide, look, S.palette, S.elements, dress || {});
    }
    const old = actors[0];
    old.root.remove();
    old.floor.remove();
    actors[0] = makeActor(A);
    render(now);
    return { ok: true, character: A.character, ...(A.dressed || { outfit: A.outfit ?? null, wear: A.wear || [] }) };
  }
  // A tap on the guide: something of its own, a different thing each time (its quirks: a cat sits, curls up into a
  // ball, twitches its ears and looks around; Stuart pushes his glasses up), taking turns with what any guide does
  // its own way (a hop and a wave, a jump, a spin, a cheer, a jiggle when it is soft). It plays on the real clock, over
  // whatever the board has it doing, playing or paused, and the board goes on under it.
  const REACT = { hop: 1.8, jump: 1.6, spin: 1.1, jiggle: 1.7, cheer: 1.6, pose: 1.7, form: 2.4, flip: 1.4, roll: 1.4 };
  // (a character drawn from a modelled shape turns by rotating, with drawings only round its front: it never spins)
  function reactionsOf(A) {
    const own = [...new Set(A.quirks || [])].filter((q) => A.forms?.includes(q) || A.fidgets?.[q] || A.poses?.[q]);
    const ways = { wave: "hop", hop: "hop", bounce: "hop", jump: "jump", spin: "spin", jiggle: "jiggle", flip: "flip", roll: "roll" };
    const any = [...new Set(["hop", ...(A.intros || []).map((i) => ways[i]).filter(Boolean), ...(A.travel || []).map((i) => ways[i]).filter(Boolean), "cheer", ...(A.yaw != null ? [] : ["spin"]), ...((A.motion?.jelly ?? 0) >= 0.5 ? ["jiggle"] : [])])];
    const list = [];
    for (let i = 0; i < Math.max(own.length, any.length); i++) {
      if (any[i]) list.push(any[i]);
      if (own[i]) list.push(own[i]);
    }
    return list;
  }
  function reactNow(X, st) {
    const r = X.react;
    if (!r) return;
    const A = X.A;
    const k = r.kind;
    const fid = A.fidgets?.[k];
    const form = A.forms?.includes(k);
    const time = form ? REACT.form : fid ? (fid.time ?? 1.6) + 0.2 : REACT[k] ?? Math.max(REACT.pose, A.poses?.[k]?.hold ?? 0);
    const d = performance.now() / 1000 - r.at;
    if (d > time) {
      X.react = null;
      return;
    }
    if (d < 0) return;
    const at = ([u, v]) => [u * A.h, (v - 0.99) * A.h];
    const arms = (name, wiggle = 0) => {
      const P = A.poses?.[name];
      // a character with no arms does it with its body: it leans, bends, stretches and looks
      if (A.armless) {
        // into the pose and out of it again, never at a jump (a slow rise onto its toe)
        const b = bodyOf(A, [0, name], st.x, st.y, st.facing, d);
        const e = envelope(d / time, Math.min(0.45, (b.ease ?? 0.24) / time));
        applyBody(st, { ...b, lean: b.lean * e, bend: b.bend * e, stretch: b.stretch * e, turn: b.turn * e, shift: [b.shift[0] * e, b.shift[1] * e] }, A.h);
        // a solid rises in its risen drawings
        return A.yaw != null ? solidRise(A, st) : st;
      }
      if (!P) return;
      for (const side of ["front", "back"]) {
        if (!P[side]) continue;
        const hand = at(P[side].hand);
        const bow = at(P[side].bow);
        st[side] = { hand: [hand[0] + wiggle * 0.055 * A.h, hand[1]], bow: [bow[0] + wiggle * 0.03 * A.h, bow[1]], glove: P[side].glove ?? "open" };
      }
    };
    const squash = A.motion?.squash ?? 1;
    const springy = (k0) => {
      const sq = Math.exp(-5 * k0) * Math.cos(13 * k0);
      st.sy *= 1 - 0.14 * squash * sq;
      st.sx *= 1 + 0.12 * squash * sq;
    };
    const arc = (t, len, high) => (t < len ? high * 4 * (t / len) * (1 - t / len) : 0);
    if (k === "hop" || k === "jump") {
      springy(d);
      if (A.motion?.jelly) st.skew = (st.skew || 0) + A.motion.jelly * 9 * Math.exp(-3 * d) * Math.sin(11 * d);
      st.lift = (st.lift || 0) + arc(d, k === "jump" ? 0.7 : 0.5, k === "jump" ? 120 : 70);
      st.feel = "excited";
      if (k === "jump") arms("cheer");
      else if (A.armless) arms("wave");
      else {
        const w = Math.sin(2 * Math.PI * 2.4 * d);
        const P = A.poses.wave.front;
        const hand = at(P.hand);
        const bow = at(P.bow);
        st.front = { hand: [hand[0] + w * 0.055 * A.h, hand[1]], bow: [bow[0] + w * 0.03 * A.h, bow[1]], glove: "open" };
      }
    } else if (k === "flip" || k === "roll") {
      // over once about its middle: in the air for a flip, along the ground for a roll, landing with a squash
      const len = k === "flip" ? 0.8 : 1.0;
      const u = Math.min(1, d / len);
      st.roll = 360 * easeInOut(u);
      st.rollAt = -(0.99 - (A.views?.[st.view]?.middle ?? A.motion?.middle ?? 0.5)) * A.h;
      st.lift = (st.lift || 0) + (k === "flip" ? arc(d, len, 95) : (A.motion?.roll ?? 0.25) * A.h * Math.abs(Math.sin(Math.PI * u)));
      if (d > len) springy(d - len);
      st.feel = "excited";
    } else if (k === "spin") {
      // turned round once, a little off the ground
      st.sx *= Math.cos((2 * Math.PI * d) / time);
      st.lift = (st.lift || 0) + arc(d, time, 26);
      st.feel = "happy";
    } else if (k === "jiggle") {
      const j = A.motion?.jelly ?? 1;
      st.skew = (st.skew || 0) + j * 14 * Math.exp(-2.4 * d) * Math.sin(15 * d);
      st.sy *= 1 + 0.08 * squash * Math.exp(-2.6 * d) * Math.sin(17 * d);
      st.feel = d < 0.6 ? "surprised" : "happy";
    } else if (k === "cheer") {
      arms("cheer", Math.sin(2 * Math.PI * 2 * d) * 0.4);
      st.lift = (st.lift || 0) + (d < 1.2 ? 22 * Math.abs(Math.sin((2 * Math.PI * d) / 0.9)) : 0);
      st.feel = "excited";
    } else if (form) {
      // it takes the form for a moment (a cat sits, curls up into a ball), then stands again
      if (d > 0.12 && d < time - 0.2) st.form = k;
      st.feel = "happy";
    } else if (fid) {
      const e = Math.sin(Math.PI * Math.min(1, d / time));
      st.fidget = { name: k, e };
      if (fid.look === "around") {
        const f = d / time;
        const [lx, ly] = f < 0.4 ? [-1, -0.3] : f < 0.75 ? [1, -0.4] : f < 0.95 ? [0, 0.6] : [0, 0];
        st.look = [lx * 0.018 * A.h, ly * 0.014 * A.h];
      }
    } else if (A.poses?.[k]) {
      arms(k);
      st.feel = "proud";
    }
  }
  /**
   * Other words for the board's beats, one sentence a beat (a string; an empty one keeps the board's own): other
   * wording, or another language. Each beat whose sentence takes longer to read than the board was timed for is
   * held at its end for as long as it needs; nothing drawn changes. Returns { ok, duration, held } (the film's new
   * length and how much of it is holds), or { ok: false, reason }.
   */
  function script(next) {
    if (!Array.isArray(next) || next.length !== beats.length) return { ok: false, reason: `a script is one sentence a beat, and this board has ${beats.length} beats` };
    beats.forEach((b, i) => (lines[i] = typeof next[i] === "string" && next[i].trim() ? next[i].trim() : b.say));
    const t = now;
    holds = [];
    beats.forEach((b, i) => {
      // how long its sentence had to be read in the board as timed, from the start of its pen to its end (less the
      // pause before the camera moves on), and how long this one takes
      const had = b.t1 - (b.rest || 0) - b.draw0;
      const more = READ.base + lines[i].length / READ.rate - had;
      if (more > 0.05) holds.push({ at: Math.max(b.draw0, b.t1 - (b.rest || 0) - 0.02), len: Math.round(more * 100) / 100 });
    });
    D = T + holds.reduce((a, h) => a + h.len, 0);
    film = filmOf(t);
    captionFor = -1;
    placeTicks();
    render(t);
    return { ok: true, duration: D, held: Math.round((D - T) * 100) / 100 };
  }
  const revealed = (rv, t) => (!rv ? 1 : t < rv[0] ? 0 : t >= rv[1] ? 1 : (t - rv[0]) / (rv[1] - rv[0]));
  /** Poses an actor at time t (and, paused, breathes and blinks on the wall clock); returns the pen's tip while it is being drawn. */
  function renderActor(X, t, wall) {
    const A = X.A;
    const st = actorAt(A, t);
    X.root.style.display = st.shown ? "" : "none";
    X.floor.style.display = st.shown ? "" : "none";
    if (!st.shown) return null;
    if (wall != null) {
      const mo = A.motion || {};
      const deep = mo.breath ?? 1;
      const b = Math.sin((2 * Math.PI * wall) / (mo.breathPeriod ?? 2.7));
      st.sy = 1 + 0.011 * deep * b;
      st.sx = 1 - 0.005 * deep * b;
      if (mo.jelly) st.skew = mo.jelly * 1.4 * Math.sin((2 * Math.PI * wall) / 3.4);
      const p = wall % 3.9;
      st.blink = p < 0.16 ? Math.sin((Math.PI * p) / 0.16) : 0;
    }
    reactNow(X, st);
    // a rise turns it about a point of its own (onto its toe, its tip), in its own frame
    const rise = (st.rise ? ` translate(${st.rise.shift[0]} ${st.rise.shift[1]}) rotate(${st.rise.turn} ${st.rise.pivot[0]} ${st.rise.pivot[1]})` : "") + (st.roll ? ` rotate(${st.roll} 0 ${st.rollAt})` : "");
    X.root.setAttribute("transform", `translate(${st.x} ${st.y - st.lift}) rotate(${st.lean * st.facing})${st.skew ? ` skewX(${-st.skew})` : ""} scale(${(st.mirror ?? st.facing) * st.sx} ${st.sy})${rise}`);
    X.floor.setAttribute("transform", `translate(${st.x} ${st.y}) scale(${1 - 0.45 * st.air} 1)`);
    X.floor.setAttribute("opacity", 1 - 0.5 * st.air);
    let tip = null;
    for (const s of X.strokes) {
      const state = t < s.t0 ? 0 : t >= s.t1 ? 2 : 1;
      if (state === 0) {
        if (s.state !== 0) s.node.style.display = "none";
        s.state = 0;
        continue;
      }
      if (s.state === 0) s.node.style.display = "";
      if (state === 2) {
        if (s.state !== 2) s.node.setAttribute("d", pathOf(s.pts, s.pts.length));
      } else {
        const p = partial(s, s.len * ((t - s.t0) / (s.t1 - s.t0)));
        s.node.setAttribute("d", p.d);
        tip = p;
      }
      s.state = state;
    }
    // standing, or a whole-body form it has taken (sitting, curled up): the one shown, the other hidden
    const form = st.form && X.groups.has(`form:${st.form}`) ? st.form : null;
    if (X.__form !== form) {
      for (const n of X.standing) n.style.display = form ? "none" : "";
      X.__form = form;
    }
    // the view it is seen in: its standing body and face, or another view's in their place
    const view = A.views && !form && st.view && X.viewG[st.view] ? st.view : null;
    if (A.views && X.__view !== `${form}|${view}`) {
      for (const n of X.main) n.style.display = form || view ? "none" : "";
      for (const v in X.viewG) X.viewG[v].g.style.display = v === view ? "" : "none";
      X.__view = `${form}|${view}`;
    }
    // the parts that move on their own: a tail sways all the time, and now and then swings over to its other side,
    // passing behind the body; a part that moves only in a fidget (ears that twitch) is still until one comes; any of
    // them swings harder while it wags (a cat's hello and goodbye)
    const clock = wall ?? t;
    for (const [part, g] of X.swings) {
      const s = A.swing[part];
      const fid = st.fidget;
      const on = s.while ? (fid && fid.name === s.while ? fid.e : 0) : 1;
      const wag = fid && fid.name === "wag" ? 1 + 1.4 * fid.e : 1;
      const deg = on * s.deg * wag * Math.sin((2 * Math.PI * clock * wag) / s.period);
      let side = 1;
      if (s.sides) {
        const k = Math.floor(clock / s.sides);
        const into = clock - k * s.sides;
        const sign = k % 2 ? -1 : 1;
        side = sign;
        if (k > 0 && into < 0.6) side = -sign * Math.cos(Math.PI * (0.5 - 0.5 * Math.cos((Math.PI * into) / 0.6)));
      }
      const [px, py] = s.at;
      const tr = `translate(${px} ${py}) scale(${side} 1) rotate(${deg}) translate(${-px} ${-py})`;
      if (g.__t !== tr) {
        g.setAttribute("transform", tr);
        g.__t = tr;
      }
    }
    // the feeling of the moment: its brows, its mouth, its eyes
    const F = A.feelings[st.feel] || A.feelings.happy;
    for (const [part, g] of X.groups) {
      const fm = /^form:(.+)$/.exec(part);
      if (fm) {
        const on = fm[1] === form;
        if (g.__on !== on) {
          g.style.display = on ? "" : "none";
          g.__on = on;
        }
        continue;
      }
      // a part of another view is shown for the feeling as the standing face's is
      const bare = part.charCodeAt(0) === 64 ? part.slice(part.indexOf(":") + 1) : part;
      const m = /^(brows|mouth):(\w+)$/.exec(bare);
      let on = null;
      if (m) on = (m[1] === "brows" ? F.brows : F.mouth) === m[2];
      else if (/^squint\d$/.test(bare)) on = F.eyes === "squint" || (F.eyes === "wink" && bare === "squint1");
      else if (/^eyes\d$/.test(bare)) on = !(F.eyes === "squint" || (F.eyes === "wink" && bare === "eyes1"));
      if (on != null && g.__on !== on) {
        g.style.display = on ? "" : "none";
        g.__on = on;
      }
    }
    const eyesOf = (list, key) =>
      list.forEach(([cx, cy], i) => {
        const g = X.groups.get(`${key}eyes${i}`);
        const wide = F.eyes === "wide" ? 1.12 : 1;
        if (g) g.setAttribute("transform", `translate(${cx} ${cy}) scale(${wide} ${wide * (1 - 0.92 * st.blink)}) translate(${-cx} ${-cy})`);
        const pg = X.groups.get(`${key}pupil${i}`);
        if (pg) pg.setAttribute("transform", `translate(${st.look[0]} ${st.look[1]})`);
      });
    eyesOf(A.eyes, "");
    // each view's eyes blink and look as the standing ones do
    for (const v in A.views || {}) eyesOf(A.views[v].eyes, `@${v}:`);
    // the cap, lifted and tipped about the middle of its rim
    const cap = st.cap || { lift: 0, angle: 0 };
    const cp = A.capPivot || [0, 0];
    // in another view its costumes move where its head and body are in that view
    const vo = view ? A.views[view] : null;
    const capT = (vo && (vo.hat[0] || vo.hat[1]) ? `translate(${vo.hat[0]} ${vo.hat[1]}) ` : "") + (cap.lift || cap.angle ? `translate(0 ${-cap.lift * A.h}) rotate(${cap.angle} ${cp[0]} ${cp[1]})` : "");
    if (X.capG.__t !== capT) {
      X.capG.setAttribute("transform", capT);
      X.capG.__t = capT;
    }
    if (A.views) {
      const wt = vo && (vo.wear[0] || vo.wear[1]) ? `translate(${vo.wear[0]} ${vo.wear[1]})` : "";
      if (X.wearG.__t !== wt) {
        X.wearG.setAttribute("transform", wt);
        X.wearG.__t = wt;
      }
    }
    // what it holds goes where its back hand goes, upright
    X.heldG.setAttribute("transform", `translate(${st.back.hand[0]} ${st.back.hand[1]}) rotate(-6)`);
    // the arms, bent anew to wherever the hands are, and the gloves on them (a character with no arms has none)
    for (const side of A.armless ? [] : ["back", "front"]) {
      const arm = st[side];
      const n = side === "back" ? X.backArm : X.frontArm;
      const nf = side === "back" ? X.backArmFill : X.frontArmFill;
      // a form it has taken (sitting, curled up) has no arms of its standing figure
      const frac = form ? 0 : revealed(A.reveal && A.reveal[side === "back" ? "armBack" : "armFront"], t);
      if (frac <= 0) {
        n.style.display = "none";
        if (nf) nf.style.display = "none";
      } else {
        n.style.display = "";
        const m = measured(hosePath(A.shoulders[side], arm.bow, arm.hand, A.arm.hose));
        let d;
        if (frac >= 1) d = pathOf(m.pts, m.pts.length);
        else {
          const p = partial(m, m.len * frac);
          d = p.d;
          tip = p;
        }
        n.setAttribute("d", d);
        if (nf) {
          nf.style.display = "";
          nf.setAttribute("d", d);
        }
      }
      const gf = revealed(A.reveal && A.reveal[side === "back" ? "gloveBack" : "gloveFront"], t);
      const gG = side === "back" ? X.backGloveG : X.frontGloveG;
      const ang = (Math.atan2(arm.hand[1] - arm.bow[1], arm.hand[0] - arm.bow[0]) * 180) / Math.PI;
      gG.setAttribute("transform", `translate(${arm.hand[0]} ${arm.hand[1]}) rotate(${ang}) scale(1 ${side === "front" ? 1 : -1})`);
      gG.setAttribute("opacity", Math.min(1, gf * 1.6));
      // a hand holding a pointer keeps its fist round it, the stick along the arm when it points and held up and out otherwise
      const glove = side === "front" && A.hold === "pointer" ? "fist" : arm.glove;
      if (side === "front" && A.hold === "pointer") {
        X.pointerG.setAttribute("transform", `translate(${arm.hand[0]} ${arm.hand[1]}) rotate(${arm.glove === "point" ? ang : -62})`);
        X.pointerG.setAttribute("opacity", Math.min(1, gf * 1.6));
      }
      for (const kind in X.gloves[side]) X.gloves[side][kind].style.display = kind === glove && gf > 0 ? "" : "none";
    }
    if (!tip) return null;
    return { x: st.x + (st.mirror ?? st.facing) * st.sx * tip.x, y: st.y - st.lift + st.sy * tip.y };
  }

  const card = (S.outro ? S.outro.card : []).map((c) => {
    const n = node("path", { stroke: S.palette[c.c], "stroke-width": c.w, fill: "none" }, outroLayer);
    n.style.display = "none";
    return Object.assign(measured(c.pts), { t0: c.t0, t1: c.t1, node: n });
  });
  const smooth = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  /** The outro at time t: the circle closing on the guide, then the title written on the dark. Played, never paused over. */
  let fading = false; // the title on the dark, fading away to leave the whole board when the film is over
  function renderOutro(t, shot) {
    if (fading) return;
    const O = S.outro;
    const on = O && t >= O.iris.t0 && (capture || playing);
    outroLayer.style.display = on ? "" : "none";
    if (!on) return;
    const I = O.iris;
    const k = VW / shot[2];
    const sx = (I.cx - shot[0]) * k + VW / 2;
    const sy = (I.cy - shot[1]) * k + VH / 2;
    const far = Math.hypot(Math.max(sx, VW - sx), Math.max(sy, VH - sy)) / k;
    let r;
    if (t < I.hold) r = far + (I.r - far) * smooth((t - I.t0) / (I.hold - I.t0));
    else if (t < I.close) r = I.r;
    else if (t < I.t1) r = I.r * (1 - smooth((t - I.close) / (I.t1 - I.close)));
    else r = 0;
    const rs = r * k;
    iris.setAttribute("d", `M-20 -20H${VW + 20}V${VH + 20}H-20Z` + (rs > 0.5 ? `M${sx + rs} ${sy}A${rs} ${rs} 0 1 0 ${sx - rs} ${sy}A${rs} ${rs} 0 1 0 ${sx + rs} ${sy}Z` : ""));
    for (const c of card) {
      if (t < c.t0) {
        c.node.style.display = "none";
        continue;
      }
      c.node.style.display = "";
      c.node.setAttribute("d", t >= c.t1 ? pathOf(c.pts, c.pts.length) : partial(c, c.len * ((t - c.t0) / (c.t1 - c.t0))).d);
    }
  }

  let now = 0;
  /** Draws the board as it is at time t. */
  function render(t) {
    now = Math.max(0, Math.min(T, t));
    setCam(view ?? camAt(now));
    let tip = null;
    for (const s of strokes) {
      const state = now < s.t0 ? 0 : now >= s.t1 ? 2 : 1;
      if (state === 0) {
        if (s.node && s.shown !== 0) {
          s.node.style.display = "none";
          s.shown = 0;
        }
        s.state = 0;
        continue;
      }
      const node = nodeOf(s);
      if (s.shown !== 1) {
        node.style.display = "";
        s.shown = 1;
      }
      if (state === 2) {
        if (s.state !== 2) node.setAttribute("d", pathOf(s.pts, s.pts.length));
      } else {
        const p = partial(s, s.len * ((now - s.t0) / (s.t1 - s.t0)));
        node.setAttribute("d", p.d);
        tip = p;
      }
      s.state = state;
    }
    for (const X of actors) {
      const at = renderActor(X, now, null);
      if (at) tip = at;
    }
    // the pen follows the tip of whatever is being drawn, and rests between strokes of a beat
    const b = beatAt(now);
    if (!tip && b && now >= b.draw0 && now < b.draw1) {
      const last = lastDrawn(now);
      if (last) tip = { x: last.pts[last.pts.length - 2], y: last.pts[last.pts.length - 1] };
    }
    if (tip && !capture) {
      pen.style.display = "";
      pen.setAttribute("transform", `translate(${tip.x} ${tip.y}) scale(${pen.dataset.k * 1.15})`);
    } else if (tip && capture) {
      pen.style.display = "";
      pen.setAttribute("transform", `translate(${tip.x} ${tip.y}) scale(${pen.dataset.k * 1.15})`);
    } else pen.style.display = "none";
    showCaption(b);
    renderOutro(now, shotNow);
    updateBar();
  }
  const beatAt = (t) => {
    for (let i = beats.length - 1; i >= 0; i--) if (t >= beats[i].t0) return t < beats[i].t1 ? { ...beats[i], i } : null;
    return null;
  };
  const lastDrawn = (t) => {
    let best = null;
    for (const s of strokes) if (s.t1 <= t && (!best || s.t1 > best.t1)) best = s;
    return best;
  };
  let captionFor = -1;
  function showCaption(b) {
    const i = b ? b.i : -1;
    if (i === captionFor) return;
    captionFor = i;
    // the last sentence stays in the caption while it fades out
    if (b) caption.textContent = lines[b.i];
    caption.classList.toggle("on", !!b);
  }

  // playing: the board's own speed is 1x (a child's board, half the film's speed), and the menu goes either way from it
  const own = S.speed || 1;
  let playing = false;
  let speed = own;
  let last = 0;
  let failed = false;
  const tick = (ms) => {
    if (!playing) return;
    // a frame is never more than a tenth of a second: back from a hidden tab, the film goes on from where it was
    const dt = last ? Math.min(0.1, (ms - last) / 1000) : 0;
    last = ms;
    film = Math.min(D, film + dt * speed);
    try {
      render(boardOf(film));
      // held for a longer sentence: the board stands still, and the guide breathes and blinks as it waits
      if (holding(film) && !reduced) for (const X of actors) renderActor(X, now, ms / 1000);
      watchOpen();
    } catch (err) {
      // one bad frame never stops the film
      if (!failed) console.error("depict: a frame failed to draw", err);
      failed = true;
      now = boardOf(film);
    }
    if (film >= D) {
      playing = false;
      ended();
      return;
    }
    remember();
    requestAnimationFrame(tick);
  };
  function play() {
    if (!playing) tell("play");
    unfade();
    // from the end, or from the board at rest after it, the film starts again from the beginning
    if (film >= D || root.classList.contains("ended")) seek(0);
    root.classList.remove("fresh");
    view = null;
    playing = true;
    last = 0;
    root.classList.add("playing");
    root.classList.remove("ended");
    requestAnimationFrame(tick);
  }
  function pause() {
    if (playing) tell("pause");
    playing = false;
    root.classList.remove("playing");
    forget();
  }
  /** To the board's time t (a beat's start, say); the film's clock goes there too. */
  function seek(t) {
    view = null;
    film = filmOf(Math.max(0, Math.min(T, t)));
    render(t);
  }
  /** To a moment of the film (the bar's place), holds and all. */
  function seekFilm(f) {
    view = null;
    film = Math.max(0, Math.min(D, f));
    render(boardOf(film));
  }
  function ended() {
    root.classList.remove("playing");
    // the title on the dark stays a moment and fades away over the whole board, which stays to explore
    const veil = S.outro && outroLayer.style.display !== "none";
    if (veil) {
      fading = true;
      outroLayer.style.transition = "opacity .9s ease";
      outroLayer.getBoundingClientRect();
      outroLayer.style.opacity = "0";
      setTimeout(unfade, 950);
    }
    if (S.explore != null) render(S.explore);
    root.classList.add("ended");
    forget();
    tell("ended");
  }
  function unfade() {
    if (!fading) return;
    fading = false;
    outroLayer.style.display = "none";
    outroLayer.style.transition = "";
    outroLayer.style.opacity = "";
  }
  // where the film was, while it plays, kept every frame: a page reloaded under the viewer (a preview that
  // refreshes whenever a file in its folder changes) goes on from the very frame it was showing, neither
  // starting over nor showing a moment again. Best effort: storage may be missing or blocked.
  const KEY = `depict:${location.pathname}`;
  function remember() {
    if (capture) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ t: now, at: Date.now() }));
    } catch {}
  }
  addEventListener("pagehide", () => playing && remember());
  function forget() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
  }

  // the bar
  const bar = root.querySelector(".dp-bar");
  const playBtn = bar.querySelector(".dp-play");
  const scrub = bar.querySelector(".dp-scrub");
  const clock = bar.querySelector(".dp-time");
  const ticks = bar.querySelector(".dp-ticks");
  // a tick for each beat, where it starts in the film
  const placeTicks = () => {
    scrub.max = String(D);
    ticks.replaceChildren(
      ...beats.map((b) => {
        const m = document.createElement("i");
        m.style.left = `${(100 * filmOf(b.t0)) / D}%`;
        return m;
      }),
    );
  };
  placeTicks();
  const fmt = (s) => {
    const r = Math.round(s);
    return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
  };
  function updateBar() {
    scrub.value = String(film);
    // the clock runs at the board's own speed: it ends at the length the start button promised; before the film
    // has played, while the whole board waits behind the start button, it reads from the beginning
    clock.textContent = `${fmt(root.classList.contains("fresh") ? 0 : film / own)} / ${fmt(D / own)}`;
    // its words in the board's language, as the page wrote them on it (kit/ui.mjs)
    playBtn.setAttribute("aria-label", playing ? playBtn.dataset.pause || "Pause" : film >= D || root.classList.contains("ended") ? playBtn.dataset.replay || "Replay" : playBtn.dataset.play || "Play");
  }
  playBtn.addEventListener("click", () => (playing ? pause() : play()));
  scrub.addEventListener("input", () => {
    pause();
    seekFilm(Number(scrub.value));
  });
  const step = (dir) => {
    pause();
    const i = beats.findIndex((b) => now < b.t1);
    const cur = i < 0 ? beats.length : i;
    const j = Math.max(0, Math.min(beats.length - 1, cur + dir));
    seek(dir < 0 && now - beats[cur]?.t0 > 1 ? beats[cur].t0 : beats[j].t0);
  };
  bar.querySelector(".dp-prev").addEventListener("click", () => step(-1));
  bar.querySelector(".dp-next").addEventListener("click", () => step(1));
  bar.querySelector(".dp-speed").addEventListener("change", (e) => (speed = own * Number(e.target.value)));
  root.addEventListener("keydown", (e) => {
    if (e.target.closest("select")) return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      playing ? pause() : play();
    } else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Home") seek(0);
    else if (e.key === "End") seek(T);
  });

  // exploring: zoom and drag the board; tap a part to hear it again
  const toBoard = (ev) => {
    const r = svg.getBoundingClientRect();
    const sx = ((ev.clientX - r.left) / r.width) * VW;
    const sy = ((ev.clientY - r.top) / r.height) * VH;
    const k = shotNow[2] / VW;
    return [shotNow[0] + (sx - VW / 2) * k, shotNow[1] + (sy - VH / 2) * k];
  };
  const visible = (e) => now >= e.t0;
  const hit = (ev) => {
    const [x, y] = toBoard(ev);
    let best = null;
    for (const e of S.elements) {
      if (!visible(e)) continue;
      const [bx, by, bw, bh] = e.box;
      if (x >= bx - 12 && x <= bx + bw + 12 && y >= by - 12 && y <= by + bh + 12 && (!best || bw * bh < best.box[2] * best.box[3])) best = e;
    }
    return best;
  };
  svg.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      pause();
      const [x, y] = toBoard(ev);
      const f = Math.exp(ev.deltaY * 0.0015);
      const w = Math.min(S.overview[2] * 1.6, Math.max(300, shotNow[2] * f));
      // zoom about the pointer
      const g = w / shotNow[2];
      view = [x + (shotNow[0] - x) * g, y + (shotNow[1] - y) * g, w];
      setCam(view);
    },
    { passive: false },
  );
  // one finger (or the mouse) drags the board; two fingers pinch it, zooming about the point between them
  let drag = null;
  let pinch = null;
  let gesture = false; // a drag or a pinch is going on: lifting the fingers is not a tap
  const fingers = new Map();
  const toSvg = (px, py) => {
    const r = svg.getBoundingClientRect();
    return [((px - r.left) / r.width) * VW, ((py - r.top) / r.height) * VH];
  };
  const pair = () => {
    const [a, b] = [...fingers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  };
  // the guide under a pointer, if it is there
  const guideAt = (ev) => {
    const [bx, by] = toBoard(ev);
    for (const X of actors) {
      const st = actorAt(X.A, now);
      if (st.shown && Math.abs(bx - st.x) < 0.36 * X.A.h && by < st.y + 10 && by > st.y - X.A.h) return X;
    }
    return null;
  };
  // a tap on it: the next thing of its own (reactNow); the page hosting the board hears of it
  const poke = (X) => {
    const list = (X.reactions ??= reactionsOf(X.A));
    X.pokes = ((X.pokes ?? -1) + 1) % list.length;
    X.react = { at: performance.now() / 1000, kind: list[X.pokes] };
    tell("guide-poke", { character: X.A.character, reaction: list[X.pokes] });
  };
  // a long press on it (a finger held), or the menu's click (a right click): the page hosting the board may offer
  // something for its guide (another guide to cast in); a board on its own leaves the browser's menu alone
  const hosted = window.parent !== window;
  let press = null;
  let menuAt = 0;
  const guideMenu = (X) => {
    if (performance.now() - menuAt < 800) return;
    menuAt = performance.now();
    tell("guide-menu", { character: X.A.character });
  };
  svg.addEventListener("contextmenu", (ev) => {
    if (!hosted) return;
    const X = guideAt(ev);
    if (!X) return;
    ev.preventDefault();
    guideMenu(X);
  });
  svg.addEventListener("pointerdown", (ev) => {
    if (ev.button > 0) return;
    if (hosted && !fingers.size) {
      const X = guideAt(ev);
      if (X) press = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, fired: false, timer: setTimeout(() => press && ((press.fired = true), guideMenu(X)), 550) };
    }
    fingers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    svg.setPointerCapture(ev.pointerId);
    if (fingers.size === 2) {
      const p = pair();
      const [sx, sy] = toSvg(p.mx, p.my);
      const k = shotNow[2] / VW;
      // the point of the board between the fingers stays between them
      pinch = { d: p.d, bx: shotNow[0] + (sx - VW / 2) * k, by: shotNow[1] + (sy - VH / 2) * k, w: shotNow[2] };
      drag = null;
      gesture = true;
      pause();
      return;
    }
    if (fingers.size === 1) {
      drag = { x: ev.clientX, y: ev.clientY, shot: shotNow, moved: false };
      gesture = false;
    }
  });
  const lift = (ev) => {
    fingers.delete(ev.pointerId);
    if (fingers.size < 2) pinch = null;
  };
  const unpress = () => {
    if (press) clearTimeout(press.timer);
    const fired = press?.fired;
    press = null;
    return fired;
  };
  svg.addEventListener("pointercancel", (ev) => {
    unpress();
    lift(ev);
    drag = null;
  });
  svg.addEventListener("pointermove", (ev) => {
    if (fingers.has(ev.pointerId)) fingers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (press && Math.abs(ev.clientX - press.x) + Math.abs(ev.clientY - press.y) > 8) unpress();
    if (pinch && fingers.size >= 2) {
      const p = pair();
      const w = Math.min(S.overview[2] * 1.6, Math.max(300, (pinch.w * pinch.d) / p.d));
      const [sx, sy] = toSvg(p.mx, p.my);
      const k = w / VW;
      view = [pinch.bx - (sx - VW / 2) * k, pinch.by - (sy - VH / 2) * k, w];
      setCam(view);
      return;
    }
    if (drag) {
      const r = svg.getBoundingClientRect();
      const k = drag.shot[2] / r.width;
      const dx = (ev.clientX - drag.x) * k;
      const dy = (ev.clientY - drag.y) * k;
      if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 4) {
        drag.moved = true;
        gesture = true;
        pause();
        view = [drag.shot[0] - dx, drag.shot[1] - dy, drag.shot[2]];
        setCam(view);
      }
      return;
    }
    if (guideAt(ev)) {
      svg.style.cursor = "pointer";
      hoverBox.style.display = "none";
      return;
    }
    const e = playing ? null : hit(ev);
    svg.style.cursor = e ? "pointer" : "grab";
    if (e) {
      const [bx, by, bw, bh] = e.box;
      hoverBox.setAttribute("x", bx - 14);
      hoverBox.setAttribute("y", by - 14);
      hoverBox.setAttribute("width", bw + 28);
      hoverBox.setAttribute("height", bh + 28);
      hoverBox.style.display = "";
    } else hoverBox.style.display = "none";
  });
  svg.addEventListener("pointerup", (ev) => {
    if (ev.button > 0) return;
    const pressed = unpress();
    lift(ev);
    drag = null;
    // a long press opened its menu: no tap
    if (pressed) return;
    // the last finger of a drag or a pinch lifts: no tap
    if (gesture) {
      if (!fingers.size) gesture = false;
      return;
    }
    if (fingers.size) return;
    // the guide answers a tap with something of its own, playing or paused
    const G = guideAt(ev);
    if (G) return poke(G);
    if (playing) return pause();
    const e = hit(ev);
    if (e && e.figure) openLive(e, false);
    else if (e) {
      // back to the moment this part was explained, and on from there
      seek(beats[e.beat].t0);
      play();
    } else play();
  });
  svg.addEventListener("dblclick", () => {
    view = null;
    setCam(camAt(now));
  });

  // live parts: an item with a Dissect figure opens into it, grown from where the item sits on the board
  const liveBox = root.querySelector(".dp-live");
  const frameEl = root.querySelector(".dp-frame");
  const live = { open: false, resume: false };
  const screenRect = (box) => {
    const fr = frameEl.getBoundingClientRect();
    const k = VW / shotNow[2];
    const s = fr.width / VW;
    const [bx, by, bw, bh] = box;
    return { x: ((bx - shotNow[0]) * k + VW / 2) * s, y: ((by - shotNow[1]) * k + VH / 2) * s, w: bw * k * s, h: bh * k * s, fw: fr.width, fh: fr.height };
  };
  function openLive(e, resume) {
    if (capture || !e.figure) return;
    pause();
    live.open = true;
    live.resume = resume;
    let frame = liveBox.querySelector("iframe");
    if (!frame || frame.dataset.src !== e.figure) {
      frame?.remove();
      frame = document.createElement("iframe");
      frame.dataset.src = e.figure;
      frame.src = e.figure;
      frame.title = `${e.label}: a running figure`;
      liveBox.prepend(frame);
    }
    liveBox.querySelector(".dp-live-name").textContent = `${e.label}, running`;
    const r = screenRect(e.box);
    liveBox.style.transition = "none";
    liveBox.style.transform = `translate(${r.x}px, ${r.y}px) scale(${r.w / r.fw}, ${r.h / r.fh})`;
    liveBox.style.opacity = "0.4";
    liveBox.hidden = false;
    liveBox.offsetWidth; // the start state is laid out before the transition runs
    liveBox.style.transition = "";
    liveBox.style.transform = "none";
    liveBox.style.opacity = "1";
    liveBox.dataset.el = String(S.elements.indexOf(e));
    liveBox.querySelector(".dp-live-close").focus();
  }
  function closeLive() {
    if (!live.open) return;
    live.open = false;
    const e = S.elements[Number(liveBox.dataset.el)];
    const r = screenRect(e.box);
    liveBox.style.transform = `translate(${r.x}px, ${r.y}px) scale(${r.w / r.fw}, ${r.h / r.fh})`;
    liveBox.style.opacity = "0";
    setTimeout(() => (liveBox.hidden = true), 450);
    root.focus();
    if (live.resume) play();
  }
  liveBox.querySelector(".dp-live-close").addEventListener("click", closeLive);
  root.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeLive();
  });
  // a beat that opens a live part does it as the beat starts, and the explanation waits for the reader
  let lastBeat = -1;
  const watchOpen = () => {
    const b = beatAt(now);
    const i = b ? b.i : -1;
    if (i !== lastBeat) {
      lastBeat = i;
      if (playing && b && b.open != null) setTimeout(() => openLive(S.elements[b.open], true), 900);
    }
  };

  // paused or ended, the guide stays alive: it breathes and blinks while the reader looks round the board
  if (!capture && actors.length) {
    const idle = (ms) => {
      if (!playing && !reduced) for (const X of actors) renderActor(X, now, ms / 1000);
      requestAnimationFrame(idle);
    };
    requestAnimationFrame(idle);
  }

  window.depict = {
    render,
    seek,
    seekFilm,
    play,
    pause,
    cast,
    script,
    occasions: occasionsOn,
    duration: T,
    explore: S.explore,
    speed: S.speed || 1,
    beats,
    lines,
    get time() {
      return now;
    },
    // the film's clock and length: the board's, and the holds a script needs
    get film() {
      return film;
    },
    get length() {
      return D;
    },
  };
  // the host of an embedded page hears ready, play, pause and ended, and size whenever the height the page
  // wants (the board as wide as the frame, with its bar and caption under it) or the board's place in it changes:
  // `box`, [x, y, width, height] of the board in the frame, so a host can lay a picture exactly over it
  function tell(event, more) {
    if (!embedded) return;
    try {
      window.parent.postMessage({ depict: { event, t: film, duration: D, speed: own, title: S.title, ...more } }, "*");
    } catch {}
  }
  let told = "";
  const want = () => {
    const cs = getComputedStyle(root);
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const r = root.querySelector(".dp-frame").getBoundingClientRect();
    return { height: Math.ceil(((innerWidth - pad) * 9) / 16 + (parseFloat(cs.getPropertyValue("--dp-reserve")) || 200)), box: [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 10) / 10) };
  };
  if (embedded)
    addEventListener("resize", () => {
      const w = want();
      const key = JSON.stringify(w);
      if (key !== told) {
        told = key;
        tell("size", w);
      }
    });
  hoverBox.style.display = "none";
  const at = q.get("t");
  let resume = null;
  try {
    const r = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (r && Date.now() - r.at < 20000 && r.t < T) resume = r.t;
  } catch {}
  // ?script=<address>: other words for its beats, read from a file of them ({ lines: [...] } or the list itself)
  if (q.get("script"))
    fetch(q.get("script"))
      .then((r) => r.json())
      .then((j) => {
        const r = script(Array.isArray(j) ? j : j.lines);
        if (!r.ok) console.warn(`depict: ${r.reason}`);
      })
      .catch((err) => console.warn("depict: the script did not load", err));
  if (!capture && at == null && resume != null) {
    // it was playing a moment ago: go on from there
    seek(resume);
    play();
  } else {
    render(at != null ? Number(at) : capture ? 0 : S.explore ?? T);
    if (!capture && at == null) {
      root.classList.add("ended", "fresh");
      updateBar();
    }
  }
  document.documentElement.dataset.ready = "1";
  if (embedded) {
    const w = want();
    told = JSON.stringify(w);
    tell("ready", w);
    // a host that was not listening yet (its own page still starting) says hello, and hears ready again; a host
    // can also start the film and pause it (its own play button, over the board)
    addEventListener("message", (e) => {
      if (e.source !== window.parent || !e.data) return;
      const say = e.data.depict;
      if (say === "hello") tell("ready", want());
      else if (say === "play" && !playing) play();
      else if (say === "pause" && playing) pause();
      // the host casts another character of the guide's body (its look), or the board's own back (null), and hears how it went
      else if (say === "cast") tell("cast", cast(e.data.look ?? null, { outfit: e.data.outfit, date: e.data.date }));
      else if (say === "script") tell("script", script(e.data.lines));
    });
  }
})();
