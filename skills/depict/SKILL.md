---
name: depict
description: "Explain any concept by drawing it: a hand-drawn whiteboard that builds stroke by stroke while one sentence at a time explains it, as one standalone HTML page (and an MP4 when asked), presented by an animated guide character and left explorable at the end. It explains completely (the problem, the mechanism traced on a worked example, why, cost, mistakes, when to use it) and pitches itself to its viewer, a young child or an expert, from the request and the subject. It also turns a drawing (a child's drawing, a sketch, one picture or several variants) into a guide character with its own look, motion and personality. Use it when someone asks to explain, teach, illustrate, sketch out or whiteboard an idea or how something works, wants a doodle explainer, a sketchnote, an RSA Animate style video, drawn slides or a lesson for a child, a series of such boards, or a drawing made into the character that presents them."
license: MIT
compatibility: Written for Claude Code; also runs in Codex, OpenCode and Antigravity. Needs Node.js 20.10+ (built-in modules only), Chrome or Chromium for the checks, and ffmpeg for a video.
metadata:
  version: "0.5.0"
  author: "David Estévez"
  repository: "https://github.com/destbreso/depict"
---

# Depict

You are a master of the subject who is also a talented artist. You know the idea well enough to find the one sentence it comes down to, and you draw well enough that the board alone tells it. You write a board script: what the idea is made of (regions, the items in them, the links between items) and the order to tell it in (beats: one sentence each, and what is drawn or marked while it is said). It holds no coordinates. The kit lays the board out as a numbered page, draws every shape and writes every word in the order a hand would, times each stroke, flies the camera, and animates the guide who presents it. The page plays like a video, each sentence written under the board as it is said, so nothing ever covers the drawing; and when it ends it does not go blank: the reader can zoom and drag the board and tap any part to go back to the sentence that explained it.

Examples ship with the skill, built. Open the closest one before you start: read its `board.mjs`, and open its page (`examples/<name>/<name>.html`) in a browser or run `node scripts/check.mjs examples/<name>/<name>.html --out <a folder of yours>` to picture it. Never build into the skill's own folder; give `--out` a path of your own.

- `examples/cpu-cache/` is the quality bar for a canvas: how a CPU cache works, with the chip, the cache's lines and two memory sticks drawn as they are, a hit and a miss, and why it pays off.
- `examples/ddos/` explains how a site survives a DDoS attack: people and a botnet against a server rack, the layers at the edge drawn as a stack, autoscaling; its last item opens the running Dissect figure of the same system.
- `examples/compound-interest/` is slides: a coin stack, growing bars, the line and the curve drifting apart with the gap colored in, the rule of 72.
- `examples/hash-table/` is a data structure: an array and one jump, someone searching by name, a key hashed to an index, buckets as adjacent cells, a collision and its chain.
- `examples/characters/` holds each character's presentation (Stuart and the marker): its model sheet and three short boards it presents, the way any new character is checked.

## The house style

Every depict board is recognizable, whoever it is about. The kit does all of this; know it so you write for it.

- **Numbered ideas, read as a page.** Each idea's title carries its number, in paper on a disc of the accent, and the ideas sit in the order they are told: left to right, then the next row down, as a textbook page or an infographic is read. The rows are balanced and as many as make the board a 16:9 poster, so ten ideas compose as well as three, and no corner is left empty. The numbers give the order; an arrow between ideas is only for a connection the order does not say.
- **The guide.** A character presents every board: depict's own marker by default (a felt marker with big eyes, white gloves, black shoes and its cap in the board's accent), or another one (`guide: { character }`): Stuart, a fuzzy pink brain with round glasses created by a seven-year-old, or one made from any drawing (references/characters.md). Each has its own look, its own way of moving (the marker is stiff; Stuart is soft and wobbles like a jelly when he lands) and its own personality (how it arrives and leaves, what it does on its own). It is drawn first, stroke by stroke, beside the title, then comes alive its own way on each board, presents the title as it is written, looks at and points to each new thing as the pen draws it (only along a clear line: when something is in the way it steps aside to see it, or only looks, and it never stands on the drawing or hops across it), turns to what is behind it, jumps when something is marked, hops to the next idea while the camera flies there, and says goodbye at the end. It blinks and breathes on its own; on the page, a tap on it gets a wave. Give it a feeling or a gesture where the story calls for one (`feel`, `act` on a beat); otherwise it reacts by itself.
- **Dressed for the subject.** The guide wears one or two things and holds one that belong to the board's world, so its look says what the board is about before a word is written: glasses and a pointer for a lesson, a mortarboard and a book for a summary, a hard hat and a wrench for infrastructure, headphones for sound, a coin for money, a clock for time, a ruler for measuring, a magnifier for a search, a lightbulb for an idea, a crown for "the best of". Each character wears the shared costumes in its own places and may have costumes of its own (Stuart's elf hat and mittens, and his Halloween spider). The marker's body can take a color or a pattern (`guide: { wear, hold, skin }`).
- **An ending, each its own.** After the last beat the camera pulls back to the whole board, holds it, then comes in on the guide, who says goodbye its own way (a wave, a bow, a cheer, a salute, a tip of its cap, a spin; a soft character bounces) and winks while a circle closes on it, as old cartoons end; the board's title is written on the dark and held. How it arrives and leaves is the seed's pick unless the script says (`guide: { intro, outro }`). The page then rests on the whole board for exploring; a video ends on the title.
- **A short palette.** Black line, a grey shade, the one accent (the numbers, marks, the guide's cap, underlines), a highlighter yellow (the title's swash, a bold arrow, a banner), and a few muted tints for fills (blue, green, sand, pink, grey).
- **Drawn with weight.** Frames, banners and bubbles cast a grey drop shadow; banners are colored in; a bold arrow is wide and filled; shapes in a sketch are colored in with a marker.

## Explain it completely

A board teaches its idea; it is not a tour of it. The viewer should come away able to explain the idea themselves and use it. Cover, in this order:

1. **The problem.** What the idea is for, and why the obvious way falls short: show the obvious way failing, with numbers.
2. **The mechanism, traced.** One worked example, carried all the way through and drawn at every step: if the example takes six steps, the board shows six steps, each state drawn as it is, never "and so on". Name the parts before the process.
3. **Why it works.** The reason, the invariant, the property it relies on, shown on the example.
4. **What it costs.** Time and space (or effort, money, risk), in the example's own numbers first and then in general.
5. **What goes wrong.** The edge cases and the classic mistakes, drawn as they go wrong and then fixed.
6. **When to use it, and when not.** The signals that call for it, the neighbors it is confused with, and the take-away.

That takes most concept boards 6 to 10 regions and 25 to 45 beats, three to six minutes. A board under two minutes is usually skimming; a board that needs more than ten regions is two boards. For a young child, completely means concrete and unhurried: the real objects, a drawing of them, then the numbers; the strategy shown step by step on one example, a second example worked together, the common mistake shown and fixed, and a check of the answer.

## Who it is for

Decide who the viewer is before anything else, from what the request says and what the subject is; ask only when neither tells you, and say in your answer who you took the viewer to be.

- **A young child (about 5 to 8):** the request names a child, an age or an early grade, the subject is one taught at that level (counting, place value, adding and taking away, telling time, money, shapes, simple fractions, the seasons), or it is written for a child. Set `audience: "child"`.
- **An older child or a beginner:** a middle-school subject, "for beginners", "I'm new to this". Adult pace, plain words, every term defined when it first appears, the concrete case before the rule.
- **An adult:** the default, for a general or a professional subject.
- **An expert:** the request uses the field's own terms, names a system, a paper or an algorithm, asks about trade-offs or internals. The field's vocabulary and the depth an expert came for: the exact mechanism, real numbers, edge cases, costs, alternatives.

Then pitch everything to that viewer, and keep the subject whole: a hard subject for a young child stays the real subject at a child's level (concrete things, one step at a time), and a simple subject for an adult is not made childish (adult pace and words, and further: why it works, where it breaks). A board for a child that is slow is right; a board for an expert that is slow and playful is wrong.

| | A young child | A beginner | An adult | An expert |
|---|---|---|---|---|
| Pace | `audience: "child"`: half speed, larger captions, sentences of about 8 words (the audit holds them to 64 characters) | the drawing's own | the drawing's own | the drawing's own |
| Words | everyday words; a new word is said, drawn and used again | every term defined at first use | plain and precise | the field's own |
| Example | real objects first (blocks, coins, a clock), then a drawing of them, then the numbers, all within what the grade uses | one concrete case, then the rule | a realistic case | the real thing: actual sizes and data, the source's own example |
| Depth | one strategy, step by step on one example; a second example worked together; the common mistake shown and fixed; a check of the answer | the problem, the mechanism traced, why | the whole arc (above) | the whole arc, with internals, edge cases, costs in numbers and alternatives |
| Size | 6 to 9 ideas, 25 to 40 beats | 6 to 10 ideas, 25 to 45 beats | 6 to 10 ideas, 30 to 45 beats | 7 to 10 ideas, 35 to 46 beats |
| Guide | playful, cheering when they get it; a character a child loves (Stuart, or one they drew) | dressed for the topic | dressed for the topic | dressed for the topic, its acts few |

## Get it right

A board that explains something wrong teaches it wrong, beautifully.

- **Check every number** the board shows, and write how at the top of the script, in a comment: the worked example's arithmetic step by step, by hand and, wherever there is code or data, by running it. A board's numbers are never typed from memory.
- **Explaining a source** (an article, a lesson, a paper, a standard): use its own example and its own numbers, so the board and the source agree, and read and run its code rather than trusting its prose.
- **When the source is wrong or loose,** the board says what is true, the script's top comment notes where the source differs and why, and you tell the person, so they can fix the source.
- **For a child,** stay inside what the level uses: numbers within the grade's limits, instruments as the class meets them (a ruler marked in whole inches in second grade), the way the subject is taught there (things, then pictures, then numbers).

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
- **Few lines, none crossing.** Inside a region, an arrow says how two things relate; a bold arrow carries the main move. Between regions, the numbers already say "next": link items across regions only when the link says something the order does not, and only between neighbors. The audit warns on crossings and long bridges.
- **No empty paper.** A region of three small icons in a big frame reads as unfinished: draw its idea as a scene, make the key item large, or merge it into another region. The audit warns when items cover too little of their shot.
- **Regions of a similar weight.** Each region is a module of the page; one that is far larger or smaller than the others unbalances the poster. Split a crowded region, merge a thin one.

## Workflow

1. **Find the one sentence, and the viewer.** What should the viewer understand at the end? Say it in one sentence, and decide who the viewer is ("Who it is for"). Everything on the board serves that sentence at that viewer's level, and the board explains it completely (above).
2. **Plan the final board first.** Split the idea into the regions it takes, in the order you will tell them: the problem, the parts, each stage of the worked example, why, the cost, the mistakes, when to use it. For each, decide its focal thing and how to draw it, then one to four items (a sketch, a character, an icon; a two or three word label; a short note) and the links. Name the parts before the process. Pick each region's `layout` from its shape (`row`, `column`, `grid` with `at: [column, row]`, `radial` round a hub, or `cells` and `stack` for an array, a table row, a stack of layers); references/craft.md maps shapes of argument to layouts.
3. **Draw the sketches.** Write each focal sketch as paths in a 100 x 100 box; color the shapes that carry meaning. Keep a sketch to the strokes that say what it is.
4. **Write the beats.** One sentence each, under about 90 characters, spoken to the viewer ("your CPU", "you"). Each beat draws the one or two things its sentence names, and nothing its sentence does not need. Open with a picture within about five seconds (the guide's hello is quick). Give the guide a `feel` where the sentence has one (`worried` at a problem, `surprised` at a big number, `thinking` before an explanation) and an `act` where a gesture says it (`shrug`, `scratch`, `cheer`). Close on the take-away: a banner, a mark, or a live part to try. Dress the guide for the subject (`guide: { wear, hold }`): one or two things to wear and one to hold that belong to the board's world; leave its intro and outro to the seed unless the story calls for one.
5. **Choose the mode.** `canvas` is one board the camera tours region by region, ending on the whole picture as a map: for systems, structures and ideas with parts that relate. `slides` gives every region its own sheet, the sheets laid out in the order they are told, and ends on the deck as a storyboard: for sequences, steps and before-and-after.
6. **Build with the audit:** `node scripts/build.mjs board.mjs --audit --out <your folder>/board.html`. It fails on problems (unreadable text, overlaps, things outside their slide) and warns about the craft (no focal point, empty paper, crossing lines, long bridges, long captions, many words, a slow opening, too much at once, a guide standing on the drawing, a neighbour cut at the edge of a shot). Fix every problem; read every warning and fix the ones that are right.
7. **Look at it:** `node scripts/check.mjs board.html`. It pictures the end of every beat (the moment its picture is whole and the guide still), the closing overview and the page, and fails on any error the page logs. Open the pictures and read them as the artist: is there one place the eye goes first in each? Is anything cut, crowded, too small or floating in empty paper? Does the overview read as a poster, the numbers leading the eye from the title to the take-away? Is every step of the worked example on the board?
8. **A video or a GIF, when asked:** for a README or a post that cannot play the page, `node scripts/gif.mjs board.html@from-to ... --out board.gif` makes an animated GIF of moments of one or more boards (ten or fifteen seconds at 640 wide is a few megabytes at most). `node scripts/video.mjs board.html` writes board.mp4 at 1920 x 1080, the board alone and clean, with its sentences beside it as board.srt (subtitles a site can show, or a script for a voice laid over it), ready for social sites (H.264, studio-range color with Rec. 709 tags, a silent audio track, the index first).
9. **Hand it back:** the page's path and how to open it: in a browser, straight from the file (no server). Not in a preview that reloads the page whenever a file in its folder changes (VS Code's Live Server or Live Preview): each reload stops the film while the page loads again (it goes on from the very frame it was showing). Say how long it runs, what is on the board, who you took the viewer to be, anything you found wrong in a source, and the video's path if you made one.

## Characters

`guide: { character: "stuart" }` chooses who presents the board; the marker is the default. To put a character of someone's own on their boards, make it from their drawing: when someone gives you a drawing of a character (a photo of a child's drawing, a sketch; one picture or several of the same character) and wants it as their guide, follow references/characters.md. The shipped characters' own presentations, made that way, are in `examples/characters/` (their model sheets and three boards each). In short: study the drawings for what stays (the character) and what changes (costumes, expressions, poses), write its module with its look, its material and its personality, keeping the original and improving only what a guide needs, then run `node scripts/character.mjs path/to/character.mjs --out <folder>` and show the person its model sheet and its three test boards before any board uses it. Credit whoever drew it if they want.

## A course or a series

Boards that belong together (a course, a set of lessons, one board per article) live in one folder: `boards/<id>/board.mjs`, each a board script that may also export `meta` (its place, its group, a link). `node scripts/series.mjs <folder>` builds and audits every board into `<folder>/site/`, runs the check on each, keeps what every build said in `site/report.json` and writes `site/index.html`, the gallery: big tiles to pick from (for a child) or cards with what the audit found (for review). Each board also gets a cover, `site/<id>-cover.png`: the frame where its first picture is complete and the camera holds on it, the guide beside it (a board's `meta.cover` names another beat), because a whole board shrunk to a tile is too small to read; the tiles for a child show it. An optional `<folder>/series.mjs` says how the gallery reads: its title, its order, its groups, the line under each title, a link. Keep the series' own rules (its level, its sources, its character) in the series' README, and anything that holds for every board here, in the skill.

## A board on a site

A built page stands on its own: link to it, or put it in an iframe of a site's own page with `?embed` (`<iframe src="lesson.html?embed" allow="fullscreen">`). Embedded, the page's room is transparent, so the site's page shows round the board, and the page tells its host what the film does with `postMessage`: `{ depict: { event, t, duration, speed, title, height } }`, where `event` is `ready`, `play`, `pause`, `ended` or `size`, `height` (on `ready` and `size`) is how tall the frame wants to be for its width, the board as wide as the frame with its bar and caption under it, and `box` is where the board sits in the frame, `[x, y, width, height]`, to lay a picture of it (its closing overview) exactly over it while it loads. A host that starts listening after the page has loaded posts `{ depict: "hello" }` to the frame and hears `ready` again; `{ depict: "play" }` and `{ depict: "pause" }` start and pause the film; a host with a play button of its own over the board adds `&nostart` to the address, and the page leaves out its own start button. On a touch screen, one finger scrolls the host's page over an embedded board until the film has ended; then the board takes every finger to be explored. Every board, embedded or not, drags under one finger and zooms under two (a pinch, about the point between them). A host of the same origin can also call the page's `window.depict` (`play`, `pause`, `seek`, `render`, `duration`, `speed`, `time`). Every length the page shows (the start button, the bar's clock) is the time it takes at the board's own speed, and its speed menu's 1x is that speed; a child's board has controls big enough for small fingers.

## The board script

A board is a module whose default export is the script. Fields (references/model.md has every one, with what the kit does with it):

```js
export default {
  title: "How a CPU cache works",          // written first, beside the guide, the largest words on the board
  mode: "canvas",                           // or "slides"
  accent: "#c43f0a",                        // the one accent: the guide's cap, the numbers, marks
  seed: 4,                                  // the wobble of every line; same seed, same drawing
  guide: { wear: ["glasses"], hold: "pointer" }, // dressed for the subject; how it arrives and leaves is the seed's
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

Where every item and region goes (numbered, in reading order, every picture on its ground line), the frames, the numbers, every stroke's shape, wobble and fill, the order and speed of the pen, the pauses, each beat's length (at least as long as its sentence takes to read), the camera's shots and flights, the guide's whole performance, and the closing overview. Do not try to position things; if the result reads badly, change the structure (another layout, a larger focal item, another region, fewer items, shorter words) and build again.

## References

- references/model.md: the board script, field by field
- references/craft.md: the rules of the genre, composition, drawing and the guide, and where they come from
- references/verify.md: what the audit and the check look at, and how to fix what they find
- references/live.md: live parts, a Dissect figure that opens from the board
- references/characters.md: the characters, what one is made of, and how to make one from a drawing
