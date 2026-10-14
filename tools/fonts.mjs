// Converts single-stroke SVG fonts into the kit's handwriting format:
//   node tools/fonts.mjs <dir with EMSTech.svg and EMSCasualHand.svg>
//
// The sources are Evil Mad Scientist's EMS fonts (https://gitlab.com/oskay/svg-fonts),
// open-path SVG fonts under the SIL Open Font License. Each glyph is a set of
// polylines in pen order, which is what lets the board write a word letter by
// letter instead of wiping it in. The output keeps every glyph's strokes as
// integer font units (1000 to the em, y up) and the font's credits.
import fs from "node:fs";
import path from "node:path";

const HANDS = [
  { file: "EMSTech.svg", hand: "print" },
  { file: "EMSCasualHand.svg", hand: "marker" },
];

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node tools/fonts.mjs <dir with the EMS SVG fonts>");
  process.exit(2);
}
const out = path.resolve("skills/depict/kit/fonts");

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];

/** The polylines of a glyph's path: EMS glyphs use M and L only (absolute). */
function strokesOf(d) {
  const strokes = [];
  let current = null;
  const tokens = d.trim().split(/[\s,]+|(?=[MLml])|(?<=[MLml])/).filter(Boolean);
  let cmd = "M";
  for (let i = 0; i < tokens.length; ) {
    if (/^[MLml]$/.test(tokens[i])) {
      cmd = tokens[i++];
      continue;
    }
    if (cmd !== "M" && cmd !== "L") throw new Error(`relative path command ${cmd} in ${d.slice(0, 40)}`);
    const x = Math.round(Number(tokens[i++]));
    const y = Math.round(Number(tokens[i++]));
    if (cmd === "M") {
      current = [x, y];
      strokes.push(current);
      cmd = "L";
    } else current.push(x, y);
  }
  // a lone point is a dot (the i's, the full stop): keep it as a tiny stroke
  return strokes.map((s) => (s.length === 2 ? [s[0], s[1], s[0] + 1, s[1]] : s));
}

const credits = [];
for (const { file, hand } of HANDS) {
  const svg = fs.readFileSync(path.join(dir, file), "utf8");
  const meta = Object.fromEntries(
    (svg.match(/<metadata>([\s\S]*?)<\/metadata>/)?.[1] ?? "")
      .split("\n")
      .map((l) => l.match(/^\s*([^:]+):\s+(.*)$/))
      .filter(Boolean)
      .map((m) => [m[1].trim(), m[2].trim()]),
  );
  const fontTag = svg.match(/<font\s[^>]*>/)[0];
  const face = svg.match(/<font-face[\s\S]*?\/>/)[0];
  const def = Number(attr(fontTag, "horiz-adv-x"));
  const glyphs = {};
  for (const m of svg.matchAll(/<glyph\s[^>]*\/>/g)) {
    const tag = m[0];
    const u = attr(tag, "unicode");
    if (u == null) continue;
    const ch = decode(u);
    if ([...ch].length !== 1) continue; // ligatures
    const adv = Math.round(Number(attr(tag, "horiz-adv-x") ?? def));
    const d = attr(tag, "d");
    glyphs[ch] = [adv, ...(d ? strokesOf(d) : [])];
  }
  const font = {
    name: meta["Font name"],
    hand,
    credit: `${meta["Font name"]}, created by ${meta["Created by"]}, SVG font conversion by ${meta["SVG font conversion by"]}; a derivative of ${meta["A derivative of"]} by ${meta["Designer"]}. SIL Open Font License 1.1.`,
    em: Number(attr(face, "units-per-em")),
    ascent: Number(attr(face, "ascent")),
    descent: Number(attr(face, "descent")),
    capHeight: Number(attr(face, "cap-height")),
    xHeight: Number(attr(face, "x-height")),
    glyphs,
  };
  fs.writeFileSync(path.join(out, `${hand}.json`), JSON.stringify(font));
  credits.push(`- **${hand}**: ${font.credit} ${Object.keys(glyphs).length} glyphs.`);
  console.log(`${hand}.json: ${font.name}, ${Object.keys(glyphs).length} glyphs, ${(fs.statSync(path.join(out, `${hand}.json`)).size / 1024).toFixed(0)} KB`);
}

fs.copyFileSync(path.join(dir, "OFL.txt"), path.join(out, "OFL.txt"));
fs.writeFileSync(
  path.join(out, "README.md"),
  `# Handwriting\n\nThe board writes with single-stroke fonts, whose glyphs are polylines in pen order. Both come from Evil Mad Scientist's EMS fonts (https://gitlab.com/oskay/svg-fonts), converted by \`tools/fonts.mjs\`. They are under the SIL Open Font License 1.1 (\`OFL.txt\`); the converted files stay under it.\n\n${credits.join("\n")}\n`,
);
