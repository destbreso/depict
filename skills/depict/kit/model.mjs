// The board script: what the agent writes. It says what the concept is made
// of (regions, the items in them, the links between items) and the order to
// tell it in (beats: one sentence each, and what is drawn or marked while it
// is said). It holds no coordinates: the kit lays the board out, times every
// stroke and moves the camera.
import { hasIcon, nearIcons } from "./icons.mjs";
import { hand } from "./fonts.mjs";
import { POSE_NAMES, FACES, HAIRS, HATS, TINTS } from "./people.mjs";
import { flattenPath } from "./svgpath.mjs";
import { ACTS, FEELINGS, HATS as GUIDE_HATS, HOLD } from "./rig.mjs";
import { CHARACTERS, characterOf, checkCharacter } from "./characters/index.mjs";
import { hash32 } from "./rng.mjs";

/** Typographic marks a hand writes the plain way; anything else outside its glyphs is a problem. */
const PLAIN = { "\u2019": "'", "\u2018": "'", "\u201c": '"', "\u201d": '"', "\u2026": "...", "\u2192": "->", "\u2190": "<-", "\u2248": "~", "\u2260": "!=", "\u2264": "<=", "\u2265": ">=", "\u2014": ", ", "\u2013": "-", "\u2022": "\u00b7", "\u00a0": " " };
const plain = (s) => s.replace(/[\u2019\u2018\u201c\u201d\u2026\u2192\u2190\u2248\u2260\u2264\u2265\u2014\u2013\u2022\u00a0]/g, (c) => PLAIN[c]);

const SHAPES = ["none", "box", "ellipse", "circle", "cloud", "bubble", "banner"];
const LINK_STYLES = ["solid", "dashed", "double", "bold", "line"];
const MARKS = ["circle", "underline", "highlight", "box", "cross"];
const FLOWS = ["page", "row", "column", "grid"];
const LAYOUTS = ["row", "column", "grid", "cells", "stack", "radial"];
/** What a sketch's shape can be colored in with: the board's accent, the highlighter, solid ink, grey, or a shirt's tint. */
export const FILLS = ["accent", "yellow", "ink", "grey", "blue", "green", "sand", "pink"];

/**
 * Validates and fills in a board script. Returns { board, errors }; the
 * board is only usable when errors is empty. Every message names the thing
 * it is about and says what to do.
 */
export function normalize(input) {
  const errors = [];
  const err = (m) => errors.push(m);
  const b = { ...input };
  b.title = String(b.title ?? "").trim();
  if (!b.title) err("the board needs a title: a few words naming the concept");
  b.hand = b.hand ?? "print";
  if (!["print", "marker"].includes(b.hand)) err(`hand "${b.hand}": use "print" or "marker"`);
  b.mode = b.mode ?? "canvas";
  if (!["canvas", "slides"].includes(b.mode)) err(`mode "${b.mode}": use "canvas" or "slides"`);
  b.flow = b.flow ?? "page";
  if (!FLOWS.includes(b.flow)) err(`flow "${b.flow}": use ${FLOWS.join(", ")}`);
  b.accent = b.accent ?? "#c43f0a";
  // the house style: the guide, the marker who greets the viewer beside the title, and each idea numbered in the order it is told
  const cast = b.guide && typeof b.guide === "object" ? b.guide : {};
  b.guide = b.guide !== false;
  b.numbers = b.numbers ?? true;
  b.outro = b.outro ?? true; // the standard ending: a goodbye from the guide and the title
  // who it is for: a child reads slowly, so the captions are larger, shorter and held longer
  b.audience = b.audience ?? "adult";
  if (!["adult", "child"].includes(b.audience)) err(`audience "${b.audience}": use "adult" or "child"`);
  // the speed the page starts at (and a video is made at): a child's board plays at half speed
  b.speed = b.speed ?? (b.audience === "child" ? 0.5 : 1);
  if (!(b.speed >= 0.25 && b.speed <= 3)) err(`speed ${b.speed}: use a number from 0.25 to 3 (1 is the drawing's own pace)`);
  b.seed = Number.isFinite(b.seed) ? b.seed : 1;
  // the guide: which character presents the board, dressed for the subject ({ wear, hold, skin }) and directed
  // ({ intro, outro }); how it arrives and leaves is the seed's pick, among its character's own, when not said
  for (const k of Object.keys(cast)) if (!["character", "wear", "hold", "skin", "intro", "outro"].includes(k)) err(`guide.${k}: the guide takes character, wear, hold, skin, intro and outro`);
  if (typeof cast.character === "string" && !CHARACTERS[cast.character]) err(`the guide's character "${cast.character}": use ${Object.keys(CHARACTERS).join(", ")}, or a character module of your own`);
  if (cast.character && typeof cast.character === "object") for (const m of checkCharacter(cast.character)) err(`the guide's character: ${m}`);
  const C = characterOf(cast);
  const who = C.name ?? C.id;
  const own = Object.keys(C.costumes ?? {});
  const wearable = [...(C.wear ?? []), ...own];
  const wear = cast.wear == null ? [] : [cast.wear].flat();
  for (const w of wear) if (!wearable.includes(w)) err(`${who} wears "${w}": it can wear ${wearable.join(", ")}`);
  const hats = wear.filter((w) => GUIDE_HATS.includes(w) || C.costumes?.[w]?.hat);
  if (hats.length > 1) err(`the guide wears ${hats.join(" and ")}: one hat at a time`);
  if (wear.length > 3) err(`the guide wears ${wear.length} things: three at most, or it stops looking like itself`);
  if (cast.hold != null && !HOLD.includes(cast.hold)) err(`the guide holds "${cast.hold}": it can hold ${HOLD.join(", ")}`);
  const skins = C.skins ?? ["plain"];
  if (cast.skin != null && !skins.includes(cast.skin)) err(`${who}'s skin "${cast.skin}": use ${skins.join(", ")}`);
  const intros = C.personality?.intros ?? ["wave"];
  const outros = C.personality?.outros ?? ["wave"];
  if (cast.intro != null && !intros.includes(cast.intro)) err(`${who}'s intro "${cast.intro}": it comes alive with ${intros.join(", ")}`);
  if (cast.outro != null && !outros.includes(cast.outro)) err(`${who}'s outro "${cast.outro}": it says goodbye with ${outros.join(", ")}`);
  const pick = (list, salt) => list[hash32(`${b.seed}:${b.title}:${salt}`) % list.length];
  b.cast = { character: cast.character ?? "marker", wear, hold: cast.hold ?? null, skin: cast.skin ?? "plain", intro: cast.intro ?? pick(intros, "intro"), outro: cast.outro ?? pick(outros, "outro") };

  const ids = new Map(); // id -> kind
  const claim = (id, kind, where) => {
    if (!id || typeof id !== "string") return err(`${where} needs an id`);
    if (!/^[a-z][a-z0-9-]*$/.test(id)) err(`${where}: id "${id}" should be lowercase letters, digits and dashes`);
    // the kit names some things itself: the title, the guide, notes and marks
    if (id === "title" || id === "guide" || /^(note|mark|guide)-/.test(id)) err(`${where}: id "${id}" is one the kit uses; pick another`);
    if (ids.has(id)) err(`id "${id}" is used twice (${ids.get(id)} and ${kind})`);
    ids.set(id, kind);
  };

  b.regions = (b.regions ?? []).map((r, ri) => {
    const where = `region ${r.id ?? ri + 1}`;
    claim(r.id, "region", where);
    const region = { ...r, title: r.title ? String(r.title) : "", items: [] };
    region.layout = r.layout ?? (r.items?.some((i) => i.at) ? "grid" : "row");
    if (!LAYOUTS.includes(region.layout)) err(`${where}: layout "${region.layout}": use ${LAYOUTS.join(", ")}`);
    if (!r.items?.length) err(`${where} has no items: give it at least one`);
    region.items = (r.items ?? []).map((it, ii) => {
      const w = `item ${it.id ?? `${ii + 1} of ${where}`}`;
      claim(it.id, "item", w);
      const item = { ...it, region: r.id, label: it.label != null ? String(it.label) : "", note: it.note != null ? String(it.note) : "" };
      item.shape = it.shape ?? "none";
      if (!SHAPES.includes(item.shape)) err(`${w}: shape "${item.shape}": use ${SHAPES.join(", ")}`);
      if (item.icon && !hasIcon(item.icon)) err(`${w}: no icon named "${item.icon}" (icons are Lucide names); close ones: ${nearIcons(item.icon).join(", ") || "none"}`);
      // a character: a pose name, or { pose, face, facing, hair, glasses }
      if (it.character != null) {
        const c = typeof it.character === "string" ? { pose: it.character } : { ...it.character };
        c.pose ??= "stand";
        c.face ??= "happy";
        c.hair ??= "short";
        if (!POSE_NAMES.includes(c.pose)) err(`${w}: pose "${c.pose}": use ${POSE_NAMES.join(", ")}`);
        if (!FACES.includes(c.face)) err(`${w}: face "${c.face}": use ${FACES.join(", ")}`);
        if (!HAIRS.includes(c.hair)) err(`${w}: hair "${c.hair}": use ${HAIRS.join(", ")}`);
        c.hat ??= "none";
        if (!HATS.includes(c.hat)) err(`${w}: hat "${c.hat}": use ${HATS.join(", ")}`);
        if (c.shirt != null && !(c.shirt in TINTS)) err(`${w}: shirt "${c.shirt}": use ${Object.keys(TINTS).join(", ")}`);
        // left out, the kit turns it to face into its region
        if (c.facing != null && !["left", "right"].includes(c.facing)) err(`${w}: facing "${c.facing}": use left or right, or leave it out`);
        item.character = c;
      }
      // a sketch: SVG path data in a 100 x 100 box, drawn in order; each entry a path string, or { d, fill } to color the shape in
      if (it.sketch != null) {
        const paths = (Array.isArray(it.sketch) ? it.sketch : [it.sketch]).map((e) => (typeof e === "string" ? { d: e } : { ...e }));
        item.sketch = paths;
        // its box: 100 x 100 units, or wider (or taller) for a long thing: a number line, a time line, a bar graph
        const [bw, bh] = it.box ?? [100, 100];
        if (it.box != null && !(Array.isArray(it.box) && it.box.length === 2 && it.box.every((v) => Number.isFinite(v) && v >= 40 && v <= 400))) err(`${w}: box: [width, height] takes two numbers from 40 to 400 (the sketch's box, in its own units)`);
        item.box = [bw, bh];
        const outside = (x, y) => x < -20 || x > bw + 20 || y < -20 || y > bh + 20;
        for (const e of paths) {
          if (e.text != null) {
            // words inside the drawing: { text, at: [x, y], size } in the box's units
            if (!Array.isArray(e.at) || e.at.length !== 2 || !e.at.every(Number.isFinite) || outside(e.at[0], e.at[1])) err(`${w}: a sketch's text "${e.text}" needs at: [x, y] inside its ${bw} x ${bh} box`);
            if (e.size != null && !(e.size > 0)) err(`${w}: a sketch's text "${e.text}" has a size that is not a positive number`);
            continue;
          }
          const d = String(e.d ?? "");
          if (e.fill != null && !FILLS.includes(e.fill)) err(`${w}: a sketch's fill "${e.fill}": use ${FILLS.join(", ")}`);
          if (e.line === false && e.fill == null) err(`${w}: a sketch path with line: false draws nothing; give it a fill`);
          try {
            const lines = flattenPath(d);
            if (!lines.length) err(`${w}: a sketch path draws nothing: "${d.slice(0, 40)}"`);
            if (lines.some((l) => l.some((v, i) => (i % 2 ? false : outside(v, l[i + 1]))))) err(`${w}: a sketch path reaches outside its ${bw} x ${bh} box: "${d.slice(0, 40)}"`);
          } catch (x) {
            err(`${w}: a sketch path does not parse (${x.message})`);
          }
        }
      }
      if ([item.icon, item.character, item.sketch].filter(Boolean).length > 1) err(`${w}: give it one picture: an icon, a character or a sketch`);
      if (!item.icon && !item.character && !item.sketch && !item.label) err(`${w} has no picture and no label`);
      item.size = it.size ?? "normal";
      if (!["normal", "large"].includes(item.size)) err(`${w}: size "${item.size}": use "normal" or "large"`);
      if (it.says != null) {
        if (!item.character) err(`${w}: says needs a character to say it`);
        item.says = String(it.says);
      }
      if (region.layout === "grid" && !Array.isArray(item.at)) err(`${w}: region ${r.id} lays its items on a grid, so give it at: [column, row]`);
      if (Array.isArray(item.at) && (item.at.length !== 2 || item.at.some((v) => !Number.isFinite(v) || v < 0))) err(`${w}: at: [column, row] takes two numbers from 0 (0.5 sits between columns 0 and 1)`);
      else if (region.layout === "cells" && Array.isArray(item.at) && item.at.some((v) => !Number.isInteger(v))) err(`${w}: a cell of a matrix sits at a whole column and row`);
      // in a matrix, what is written under a cell would land on the cell below it
      if (region.layout === "cells" && Array.isArray(item.at) && item.note && (r.items ?? []).some((x) => Array.isArray(x.at) && x.at[0] === item.at[0] && x.at[1] === item.at[1] + 1)) err(`${w}: a cell with a cell under it in a matrix takes no note (it would cover the cell below); say it in a beat's note beside the row`);
      if (region.layout === "cells" && it.under == null && (r.items ?? []).some((x) => Array.isArray(x.at) && x.under == null) && !Array.isArray(it.at)) err(`${w}: region ${r.id} is a matrix (its cells have at), so give this cell at: [column, row] too`);
      const celled = region.layout === "cells" || region.layout === "stack";
      if (it.under != null) {
        // an item hanging under a cell: a chain in a bucket, a value under a slot
        if (region.layout !== "cells") err(`${w}: under works in a region whose layout is "cells"`);
        else if (!(r.items ?? []).some((x) => x.id === it.under && x.under == null)) err(`${w}: under "${it.under}" is not a cell of region ${r.id}`);
      } else if (celled && item.icon) err(`${w}: region ${r.id} draws its items as ${region.layout === "cells" ? "adjacent cells" : "a stack"}, which hold a label and a note, not an icon (an item with under: "cell" can have one)`);
      else if (celled && !item.label) err(`${w}: a ${region.layout === "cells" ? "cell" : "stack entry"} needs a label`);
      if (it.figure != null && (typeof it.figure !== "string" || !it.figure.trim())) err(`${w}: figure should be the path or URL of a Dissect page`);
      return item;
    });
    return region;
  });
  if (!b.regions.length) err("the board has no regions: one region per idea, each with its items");
  if (b.flow === "grid") {
    const taken = new Map();
    for (const r of b.regions) {
      const ok = Array.isArray(r.at) && r.at.length === 2 && r.at.every((v) => Number.isInteger(v) && v >= 0);
      if (!ok) err(`region ${r.id}: the board's flow is "grid", so give the region at: [column, row]`);
      else if (taken.has(String(r.at))) err(`regions ${taken.get(String(r.at))} and ${r.id} are both at [${r.at}]`);
      else taken.set(String(r.at), r.id);
    }
  }

  b.links = (b.links ?? []).map((l, li) => {
    const where = `link ${l.id ?? li + 1}`;
    claim(l.id, "link", where);
    const link = { ...l, label: l.label != null ? String(l.label) : "", style: l.style ?? "solid", bend: Number.isFinite(l.bend) ? l.bend : null, far: l.far === true };
    if (!LINK_STYLES.includes(link.style)) err(`${where}: style "${link.style}": use ${LINK_STYLES.join(", ")}`);
    for (const end of ["from", "to"]) if (ids.get(l[end]) !== "item") err(`${where}: ${end} "${l[end]}" is not an item`);
    return link;
  });

  // what a beat may draw: an item, a link, a region (its title), or "title"
  const drawable = (ref) => ref === "title" || ids.has(ref);
  b.beats = (b.beats ?? []).map((bt, bi) => {
    const where = `beat ${bi + 1}`;
    const beat = { ...bt, say: String(bt.say ?? "").trim(), draw: [], mark: [], notes: [] };
    if (!beat.say) err(`${where} has nothing to say: every beat is one sentence of the explanation`);
    for (const d of bt.draw ?? []) {
      if (typeof d === "string") {
        if (!drawable(d)) err(`${where} draws "${d}", which is not an item, a link, a region or "title"`);
        beat.draw.push(d);
      } else if (d && typeof d === "object" && "note" in d) {
        if (ids.get(d.near) !== "item") err(`${where}: a note's near "${d.near}" is not an item`);
        const side = d.side ?? "below";
        if (!["below", "above", "left", "right"].includes(side)) err(`${where}: a note's side "${side}": use below, above, left or right`);
        beat.notes.push({ text: String(d.note), near: d.near, side, arrow: d.arrow !== false });
      } else err(`${where} draws ${JSON.stringify(d)}: give an id, or { note, near, side }`);
    }
    for (const m of bt.mark ?? []) {
      const kind = MARKS.find((k) => k in m);
      if (!kind) err(`${where} marks ${JSON.stringify(m)}: use one of ${MARKS.join(", ")}, e.g. { circle: "cache" }`);
      else {
        // a mark on one thing, or on several side by side (a window of cells, a run of items)
        const targets = Array.isArray(m[kind]) ? m[kind] : [m[kind]];
        const missing = targets.filter((id) => !ids.has(id) && id !== "title");
        if (!targets.length || missing.length) err(`${where} marks "${missing.join('", "') || "nothing"}", which is not on the board`);
        else beat.mark.push({ kind, target: targets[0], targets });
      }
    }
    // how the guide feels in this beat, and what it does
    if (bt.feel != null && !(bt.feel in FEELINGS)) err(`${where}: feel "${bt.feel}": use ${Object.keys(FEELINGS).join(", ")}`);
    if (bt.act != null && !ACTS.includes(bt.act)) err(`${where}: act "${bt.act}": use ${ACTS.join(", ")}`);
    if (bt.open != null) {
      const it = b.regions.flatMap((r) => r.items).find((x) => x.id === bt.open);
      if (!it) err(`${where} opens "${bt.open}", which is not an item`);
      else if (!it.figure) err(`${where} opens "${bt.open}", which has no figure to open`);
      beat.open = bt.open;
    }
    if (!beat.draw.length && !beat.mark.length && !beat.notes.length && !beat.open) err(`${where} draws and marks nothing: say it while something is drawn, or merge it into the beat before`);
    return beat;
  });
  if (!b.beats.length) err("the board has no beats: the explanation, one sentence per beat, in the order to tell it");

  // everything on the board is drawn once, and before it is marked
  const drawnAt = new Map();
  b.beats.forEach((bt, i) => {
    for (const d of bt.draw) {
      if (drawnAt.has(d)) err(`"${d}" is drawn twice (beats ${drawnAt.get(d) + 1} and ${i + 1}): draw it once, mark it later`);
      else drawnAt.set(d, i);
    }
  });
  for (const r of b.regions) for (const it of r.items) if (!drawnAt.has(it.id)) err(`item "${it.id}" is never drawn: add it to a beat's draw`);
  for (const l of b.links) if (!drawnAt.has(l.id)) err(`link "${l.id}" is never drawn: add it to a beat's draw`);
  b.beats.forEach((bt, i) => {
    for (const m of bt.mark) {
      for (const id of m.targets) {
        const at = drawnAt.get(id);
        if (at == null || at > i) err(`beat ${i + 1} marks "${id}" before it is drawn`);
      }
    }
    for (const l of bt.draw.filter((d) => ids.get(d) === "link")) {
      const link = b.links.find((x) => x.id === l);
      for (const end of [link.from, link.to]) if ((drawnAt.get(end) ?? Infinity) > i) err(`beat ${i + 1} draws link "${l}" before "${end}"`);
    }
  });
  // every word on the board must be in the hand's glyphs: a missing one would be drawn as "?"
  if (["print", "marker"].includes(b.hand)) {
    const font = hand(b.hand);
    const check = (where, text) => {
      const missing = [...new Set([...text].filter((c) => !/\s/.test(c) && !font.glyphs[c] && !font.glyphs[c.normalize("NFD")[0]]))];
      if (missing.length) err(`${where}: the ${b.hand} hand cannot write ${missing.map((c) => `"${c}" (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`).join(", ")}; write it another way`);
    };
    b.title = plain(b.title);
    check("the title", b.title);
    for (const r of b.regions) {
      r.title = plain(r.title);
      check(`region ${r.id}'s title`, r.title);
      for (const it of r.items) {
        it.label = plain(it.label);
        it.note = plain(it.note);
        if (it.says) it.says = plain(it.says);
        check(`item ${it.id}`, it.label + it.note + (it.says ?? ""));
        for (const e of it.sketch ?? []) if (e.text != null) {
          e.text = plain(String(e.text));
          check(`item ${it.id}'s sketch`, e.text);
        }
      }
    }
    for (const l of b.links) {
      l.label = plain(l.label);
      check(`link ${l.id}`, l.label);
    }
    b.beats.forEach((bt, i) => bt.notes.forEach((n) => {
      n.text = plain(n.text);
      check(`beat ${i + 1}'s note`, n.text);
    }));
  }

  b.drawnAt = drawnAt;
  b.kindOf = ids;
  return { board: b, errors };
}
