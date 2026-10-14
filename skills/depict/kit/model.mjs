// The board script: what the agent writes. It says what the concept is made
// of (regions, the items in them, the links between items) and the order to
// tell it in (beats: one sentence each, and what is drawn or marked while it
// is said). It holds no coordinates: the kit lays the board out, times every
// stroke and moves the camera.
import { hasIcon, nearIcons } from "./icons.mjs";

const SHAPES = ["none", "box", "ellipse", "circle", "cloud", "bubble", "banner"];
const LINK_STYLES = ["solid", "dashed", "double"];
const MARKS = ["circle", "underline", "highlight", "box", "cross"];
const FLOWS = ["path", "row", "column", "grid"];
const LAYOUTS = ["row", "column", "grid"];

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
  b.flow = b.flow ?? "path";
  if (!FLOWS.includes(b.flow)) err(`flow "${b.flow}": use ${FLOWS.join(", ")}`);
  b.accent = b.accent ?? "#c43f0a";
  b.seed = Number.isFinite(b.seed) ? b.seed : 1;

  const ids = new Map(); // id -> kind
  const claim = (id, kind, where) => {
    if (!id || typeof id !== "string") return err(`${where} needs an id`);
    if (!/^[a-z][a-z0-9-]*$/.test(id)) err(`${where}: id "${id}" should be lowercase letters, digits and dashes`);
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
      if (!item.icon && !item.label) err(`${w} has neither an icon nor a label`);
      if (region.layout === "grid" && !Array.isArray(item.at)) err(`${w}: region ${r.id} lays its items on a grid, so give it at: [column, row]`);
      if (it.figure != null && (typeof it.figure !== "string" || !it.figure.trim())) err(`${w}: figure should be the path or URL of a Dissect page`);
      return item;
    });
    return region;
  });
  if (!b.regions.length) err("the board has no regions: one region per idea, each with its items");

  b.links = (b.links ?? []).map((l, li) => {
    const where = `link ${l.id ?? li + 1}`;
    claim(l.id, "link", where);
    const link = { ...l, label: l.label != null ? String(l.label) : "", style: l.style ?? "solid", bend: Number.isFinite(l.bend) ? l.bend : null };
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
      else if (!ids.has(m[kind]) && m[kind] !== "title") err(`${where} marks "${m[kind]}", which is not on the board`);
      else beat.mark.push({ kind, target: m[kind] });
    }
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
      const at = m.target === "title" ? drawnAt.get("title") : drawnAt.get(m.target);
      if (at == null || at > i) err(`beat ${i + 1} marks "${m.target}" before it is drawn`);
    }
    for (const l of bt.draw.filter((d) => ids.get(d) === "link")) {
      const link = b.links.find((x) => x.id === l);
      for (const end of [link.from, link.to]) if ((drawnAt.get(end) ?? Infinity) > i) err(`beat ${i + 1} draws link "${l}" before "${end}"`);
    }
  });
  b.drawnAt = drawnAt;
  b.kindOf = ids;
  return { board: b, errors };
}
