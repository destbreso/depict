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
  const under = document.createElementNS(NS, "g");
  const inkLayer = document.createElementNS(NS, "g");
  for (const g of [under, inkLayer]) {
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
  cam.append(sheetLayer, hoverBox, under, inkLayer, pen);
  svg.append(bg, cam);
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
      (s.layer === 1 ? under : inkLayer).append(s.node);
    }
    return s.node;
  };

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
    if (b) caption.textContent = b.say;
    caption.classList.toggle("on", !!b);
  }

  // playing
  let playing = false;
  let speed = 1;
  let last = 0;
  const tick = (ms) => {
    if (!playing) return;
    const dt = last ? (ms - last) / 1000 : 0;
    last = ms;
    render(now + dt * speed);
    watchOpen();
    if (now >= T) {
      playing = false;
      ended();
      return;
    }
    requestAnimationFrame(tick);
  };
  function play() {
    if (now >= T) seek(0);
    view = null;
    playing = true;
    last = 0;
    root.classList.add("playing");
    root.classList.remove("ended");
    requestAnimationFrame(tick);
  }
  function pause() {
    playing = false;
    root.classList.remove("playing");
  }
  function seek(t) {
    view = null;
    render(t);
  }
  function ended() {
    root.classList.remove("playing");
    root.classList.add("ended");
  }

  // the bar
  const bar = root.querySelector(".dp-bar");
  const playBtn = bar.querySelector(".dp-play");
  const scrub = bar.querySelector(".dp-scrub");
  const clock = bar.querySelector(".dp-time");
  const ticks = bar.querySelector(".dp-ticks");
  scrub.max = String(T);
  for (const b of beats) {
    const m = document.createElement("i");
    m.style.left = `${(100 * b.t0) / T}%`;
    ticks.append(m);
  }
  const fmt = (s) => {
    const r = Math.round(s);
    return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
  };
  function updateBar() {
    scrub.value = String(now);
    clock.textContent = `${fmt(now)} / ${fmt(T)}`;
    playBtn.setAttribute("aria-label", playing ? "Pause" : now >= T ? "Replay" : "Play");
  }
  playBtn.addEventListener("click", () => (playing ? pause() : play()));
  scrub.addEventListener("input", () => {
    pause();
    seek(Number(scrub.value));
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
  bar.querySelector(".dp-speed").addEventListener("change", (e) => (speed = Number(e.target.value)));
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
  let drag = null;
  svg.addEventListener("pointerdown", (ev) => {
    drag = { x: ev.clientX, y: ev.clientY, shot: shotNow, moved: false };
    svg.setPointerCapture(ev.pointerId);
  });
  svg.addEventListener("pointermove", (ev) => {
    if (drag) {
      const r = svg.getBoundingClientRect();
      const k = drag.shot[2] / r.width;
      const dx = (ev.clientX - drag.x) * k;
      const dy = (ev.clientY - drag.y) * k;
      if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 4) {
        drag.moved = true;
        pause();
        view = [drag.shot[0] - dx, drag.shot[1] - dy, drag.shot[2]];
        setCam(view);
      }
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
    const d = drag;
    drag = null;
    if (d && d.moved) return;
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

  window.depict = { render, seek, play, pause, duration: T, beats, get time() { return now; } };
  hoverBox.style.display = "none";
  const at = q.get("t");
  render(at != null ? Number(at) : capture ? 0 : T);
  if (!capture && at == null) root.classList.add("ended", "fresh");
  document.documentElement.dataset.ready = "1";
})();
