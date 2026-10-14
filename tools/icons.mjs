// Converts the Lucide icon set into the kit's compact form:
//   node tools/icons.mjs <lucide-static package dir>
//
// Lucide (https://lucide.dev, ISC; icons derived from Feather are MIT) draws
// every icon with strokes on a 24 unit grid, which is what the hand needs: an
// icon is drawn element by element, in the order the file lists them. Each
// element is kept as its own geometry (a path's "d", a rect, a circle) and
// flattened only when a board draws it.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node tools/icons.mjs <lucide-static package dir>");
  process.exit(2);
}
const out = path.resolve("skills/depict/kit/icons");
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
const n = (v) => (v == null ? 0 : Number(v));
const icons = {};
for (const file of fs.readdirSync(path.join(dir, "icons")).sort()) {
  if (!file.endsWith(".svg")) continue;
  const svg = fs.readFileSync(path.join(dir, "icons", file), "utf8");
  const els = [];
  for (const m of svg.matchAll(/<(path|rect|circle|ellipse|line|polyline|polygon)\s[^>]*\/?>/g)) {
    const [tag, kind] = m;
    if (kind === "path") els.push(["p", attr(tag, "d")]);
    else if (kind === "rect") {
      const r = ["r", n(attr(tag, "x")), n(attr(tag, "y")), n(attr(tag, "width")), n(attr(tag, "height"))];
      const rx = attr(tag, "rx");
      const ry = attr(tag, "ry");
      if (rx || ry) r.push(n(rx ?? ry), n(ry ?? rx));
      els.push(r);
    } else if (kind === "circle") els.push(["c", n(attr(tag, "cx")), n(attr(tag, "cy")), n(attr(tag, "r"))]);
    else if (kind === "ellipse") els.push(["e", n(attr(tag, "cx")), n(attr(tag, "cy")), n(attr(tag, "rx")), n(attr(tag, "ry"))]);
    else if (kind === "line") els.push(["l", n(attr(tag, "x1")), n(attr(tag, "y1")), n(attr(tag, "x2")), n(attr(tag, "y2"))]);
    else els.push([kind === "polyline" ? "pl" : "pg", attr(tag, "points")]);
  }
  if (els.length) icons[file.replace(/\.svg$/, "")] = els;
}
fs.writeFileSync(path.join(out, "lucide.json"), JSON.stringify(icons));
fs.copyFileSync(path.join(dir, "LICENSE"), path.join(out, "LICENSE"));
const version = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).version;
fs.writeFileSync(
  path.join(out, "README.md"),
  `# Icons\n\nThe board draws icons from Lucide ${version} (https://lucide.dev), ${Object.keys(icons).length} icons on a 24 unit grid, all made of strokes, under the ISC license; the icons Lucide derives from Feather are under the MIT license. Both licenses are in \`LICENSE\`. \`tools/icons.mjs\` converts the set; an icon's name is its Lucide name (\`cpu\`, \`database\`, \`users\`, \`lightbulb\`).\n`,
);
console.log(`${Object.keys(icons).length} icons, ${(fs.statSync(path.join(out, "lucide.json")).size / 1024).toFixed(0)} KB`);
