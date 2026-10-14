---
name: depict
description: Explain a concept by drawing it, as a hand-drawn board that builds stroke by stroke while a sentence at a time explains it, delivered as one standalone HTML page (and an MP4 when asked). Every board is presented by the same animated guide, a marker with the board's accent on its cap who appears drawn, comes alive, points at each new thing, reacts with feeling and walks the story road from idea to idea as the camera flies. The ideas sit on alternate sides of that road, a wide winding ribbon that turns back row after row like a hand-drawn journey map, so any number of them composes into one poster. Objects are drawn as what they are and colored in with marker fills, handwriting is written letter by letter in pen order, the camera is computed (every shot readable, smooth zoom flights, a closing overview), and when the explanation ends the board stays live: zoom it, drag it, tap any part to hear its sentence again. Two modes from one script: a tour of one big canvas, or sketched slides. A part of the board can open into a running Dissect figure. Use it whenever someone asks to explain, teach, sketch out, illustrate or whiteboard an idea, a concept, a mechanism, a trade-off or how something works, wants a whiteboard or doodle explainer, a sketchnote, an RSA Animate or Minute Physics style video, a visual summary or slides drawn by hand, even if they never say "animation". Framework-free: a Node build writes the page; a video needs Chrome and ffmpeg.
license: MIT
compatibility: Written for Claude Code; also runs in Codex, OpenCode and Antigravity. Needs Node.js 20.10+ (built-in modules only), Chrome or Chromium for the checks, and ffmpeg for a video.
metadata:
  version: "0.2.0"
  author: "David Estévez"
  repository: "https://github.com/destbreso/depict"
---

# Depict

You are a master of the subject who is also a talented artist. You know the idea well enough to find the one sentence it comes down to, and you draw well enough that the board alone tells it. You write a board script: what the idea is made of (regions, the items in them, the links between items) and the order to tell it in (beats: one sentence each, and what is drawn or marked while it is said). It holds no coordinates. The kit lays the board out along a winding road, draws every shape and writes every word in the order a hand would, times each stroke, flies the camera, and animates the guide who presents it. The page plays like a video, and when it ends it does not go blank: the reader can zoom and drag the board and tap any part to go back to the sentence that explained it.

Examples ship with the skill, built. Open the closest one before you start: read its `board.mjs`, and open its page (`examples/<name>/<name>.html`) in a browser or run `node scripts/check.mjs examples/<name>/<name>.html --out <a folder of yours>` to picture it. Never build into the skill's own folder; give `--out` a path of your own.

- `examples/cpu-cache/` is the quality bar for a canvas: how a CPU cache works, with the chip, the cache's lines and two memory sticks drawn as they are, a hit and a miss, and why it pays off.
- `examples/ddos/` explains how a site survives a DDoS attack: people and a botnet against a server rack, the layers at the edge drawn as a stack, autoscaling; its last item opens the running Dissect figure of the same system.
- `examples/compound-interest/` is slides: a coin stack, growing bars, the line and the curve drifting apart with the gap colored in, the rule of 72.
- `examples/hash-table/` is a data structure: an array and one jump, someone searching by name, a key hashed to an index, buckets as adjacent cells, a collision and its chain.

## The house style

Every depict board is recognizable, whoever it is about. The kit does all of this; know it so you write for it.

- **The story road.** The ideas sit along one wide road in the accent, a ribbon with a paper lane line down its middle, that sways toward each idea and turns back at the end of each row, ending in an arrowhead. Each idea is on the other side of the road from the one before, so they interlock instead of lining up in a grid; more ideas, more rows, and the number of rows is the one that makes the board a 16:9 poster. A stretch of road is drawn on each camera flight from one idea to the next. No idea is an island and no long line crosses the board to say "and then".
- **The guide.** A felt marker with big eyes, white gloves, black shoes and its cap in the board's accent. It is drawn first, stroke by stroke, beside the title, then comes alive with a bounce and a wave, presents the title as it is written, looks at and points to each new thing as the pen draws it, turns to what is behind it, jumps when something is marked, hops along the road to the next idea while the camera flies there, and cheers at the end. It blinks and breathes on its own; on the page, a tap on it gets a wave. Give it a feeling or a gesture where the story calls for one (`feel`, `act` on a beat); otherwise it reacts by itself.
- **The same ending.** After the last beat the camera pulls back to the whole board, holds it, then comes in on the guide, who waves goodbye and winks while a circle closes on it, as old cartoons end; the board's title is written on the dark and held. The page then rests on the whole board for exploring; a video ends on the title.
- **A short palette.** Black line, a grey shade, the one accent (the road, marks, the guide's cap, underlines), a highlighter yellow (the title's swash, a bold arrow, a banner), and a few muted tints for fills (blue, green, sand, pink, grey).
- **Drawn with weight.** Frames, banners and bubbles cast a grey drop shadow; banners are colored in; a bold arrow is wide and filled; shapes in a sketch are colored in with a marker.

## Draw the thing itself

The board shows what the idea is about, drawn as it is. A CPU is a chip with its pins, memory is a pair of sticks, a server is a rack, a collision is two names in one bucket, growth is bars or a curve. Draw these as **sketches**: SVG path data in a 100 x 100 box, each shape colored in when it matters (`{ d, fill }`). Use a Lucide icon for small secondary things; draw the focal thing of each region yourself.

- **No analogies unless one is exact.** A comparison the viewer has to translate back (a chef for a CPU, a library for memory) costs more than it gives and often misleads. Explain the real mechanism with real drawings; reach for an analogy only when it maps one to one and the viewer already knows it, and even then keep it secondary.
- **Characters are actors, not metaphors.** Draw a person when a person is part of the idea: the people visiting a site, you searching a list, a user waiting. Give them a pose, a face that shows how they feel, and what they say in a bubble (`says`) when it adds something.
- **How much is a chart.** A quantity, a growth, a comparison: draw the bars or the curve to scale, and color the part that matters.

## Composition

You are composing a picture, not filling a form.

- **One focal point per region.** The thing the region is about is drawn large (`size: "large"`), or framed, or marked. The audit warns when a region has none.
- **Pictures stand on a ground line.** In a row, the kit stands every picture on one line and lines the labels up under it, the way objects stand on a table.
- **Distance means something.** Things that belong together sit together; a link with `far: true` sets its two items further apart (memory is far from the CPU, so draw it far).
- **Few lines, none crossing.** Inside a region, an arrow says how two things relate; a bold arrow carries the main move. Between regions, the road already says "next": link items across regions only when the link says something the road does not, and only between neighbors. The audit warns on crossings and long bridges.
- **No empty paper.** A region of three small icons in a big frame reads as unfinished: draw its idea as a scene, make the key item large, or merge it into another region. The audit warns when items cover too little of their shot.
- **Regions of a similar weight.** Each region is a stop on the road; one that is far larger or smaller than the others unbalances the poster. Split a crowded region, merge a thin one.

## Workflow

1. **Find the one sentence.** What should the viewer understand after a minute? Say it in one sentence, and say who the viewer is. Everything on the board serves that sentence.
2. **Plan the final board first.** Split the idea into two to five regions in the order you will tell them. For each, decide its focal thing and how to draw it, then one to four items (a sketch, a character, an icon; a two or three word label; a short note) and the links. Name the parts before the process. Pick each region's `layout` from its shape (`row`, `column`, `grid` with `at: [column, row]`, `radial` round a hub, or `cells` and `stack` for an array, a table row, a stack of layers); references/craft.md maps shapes of argument to layouts.
3. **Draw the sketches.** Write each focal sketch as paths in a 100 x 100 box; color the shapes that carry meaning. Keep a sketch to the strokes that say what it is.
4. **Write the beats.** One sentence each, under about 90 characters, spoken to the viewer ("your CPU", "you"). Each beat draws the one or two things its sentence names, and nothing its sentence does not need. Open with a picture within about five seconds (the guide's hello is quick). Give the guide a `feel` where the sentence has one (`worried` at a problem, `surprised` at a big number, `thinking` before an explanation) and an `act` where a gesture says it (`shrug`, `scratch`, `cheer`). Close on the take-away: a banner, a mark, or a live part to try.
5. **Choose the mode.** `canvas` is one board the camera tours region by region along the road, ending on the whole picture as a map: for systems, structures and ideas with parts that relate. `slides` gives every region its own sheet, the sheets laid along the road, and ends on the deck as a storyboard: for sequences, steps and before-and-after.
6. **Build with the audit:** `node scripts/build.mjs board.mjs --audit --out <your folder>/board.html`. It fails on problems (unreadable text, overlaps, things outside their slide) and warns about the craft (no focal point, empty paper, crossing lines, long bridges, long captions, many words, a slow opening, too much at once). Fix every problem; read every warning and fix the ones that are right.
7. **Look at it:** `node scripts/check.mjs board.html`. It pictures the end of every beat, the closing overview and the page, and fails on any error the page logs. Open the pictures and read them as the artist: is there one place the eye goes first in each? Is anything cut, crowded, too small or floating in empty paper? Does the overview read as a poster, the road leading the eye from the title to the take-away?
8. **A video, when asked:** `node scripts/video.mjs board.html` writes board.mp4 at 1920 x 1080 with the captions burned in, ready for social sites (H.264, studio-range color with Rec. 709 tags, a silent audio track, the index first).
9. **Hand it back:** the page's path and how to open it (any browser, no server), how long it runs, what is on the board, and the video's path if you made one.

## The board script

A board is a module whose default export is the script. Fields (references/model.md has every one, with what the kit does with it):

```js
export default {
  title: "How a CPU cache works",          // written first, beside the guide, the largest words on the board
  mode: "canvas",                           // or "slides"
  accent: "#c43f0a",                        // the one accent: the guide's cap, the road, marks
  seed: 4,                                  // the wobble of every line; same seed, same drawing
  regions: [
    { id: "places", title: "Where data lives", items: [
      { id: "cpu", size: "large", label: "CPU", note: "needs data every step",
        sketch: [{ d: "M24 16 H76 V84 H24 Z", fill: "green" }, "M28 16 V6 M50 16 V6 M72 16 V6"] },
      { id: "cache", icon: "layers", label: "Cache", note: "small, close, fast" },
      { id: "ram", icon: "memory-stick", label: "Memory", note: "big, far, slow" },
    ] },
  ],
  links: [
    { id: "near", from: "cpu", to: "cache", label: "1 ns", style: "bold" },
    { id: "far", from: "cache", to: "ram", label: "100 ns", style: "dashed", far: true },
  ],
  beats: [
    { say: "Your CPU needs data at almost every step.", draw: ["title", "cpu"] },
    { say: "That data lives in main memory, big but far away.", draw: ["places", "ram"] },
    { say: "So it keeps a small, fast copy close by: the cache.", draw: ["cache", "near"] },
    { say: "Going to memory takes about a hundred times longer.", draw: ["far"], mark: [{ circle: "ram" }], feel: "surprised" },
  ],
};
```

- A beat's `draw` lists ids in the order the pen takes them: `"title"`, a region's id (its title), an item, a link, or a note `{ note: "short words", near: "item", side: "below" }`.
- `mark` puts an emphasis on something already drawn: `{ circle | underline | highlight | box | cross: "id" }`.
- An item's picture is one of: `sketch` (paths in a 100 x 100 box, `{ d, fill }` to color a shape: accent, yellow, ink, grey, blue, green, sand, pink), `character` (`{ pose, face, hair, hat, shirt }`, with `says`), or `icon` (a Lucide name; a wrong one fails the build with the closest ones).
- An item with `figure: "path/to/dissect-page.html"` is a live part; a beat with `open: "item"` opens it as the beat starts and waits for the reader (references/live.md).

## What the kit decides, so you do not

Where every item and region goes (along the road, every picture on its ground line), the frames, the road, every stroke's shape, wobble and fill, the order and speed of the pen, the pauses, each beat's length (at least as long as its sentence takes to read), the camera's shots and flights, the guide's whole performance, and the closing overview. Do not try to position things; if the result reads badly, change the structure (another layout, a larger focal item, another region, fewer items, shorter words) and build again.

## References

- references/model.md: the board script, field by field
- references/craft.md: the rules of the genre, composition, drawing and the guide, and where they come from
- references/verify.md: what the audit and the check look at, and how to fix what they find
- references/live.md: live parts, a Dissect figure that opens from the board
