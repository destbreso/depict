---
name: depict
description: Explain a concept by drawing it, as a hand-drawn board that builds stroke by stroke while a sentence at a time explains it, delivered as one standalone HTML page (and an MP4 when asked). Handwriting is written letter by letter in pen order, the camera is computed (every shot readable, smooth zoom flights, a closing overview of the whole board), and when the explanation ends the board stays live: zoom it, drag it, tap any part to hear its sentence again. Two modes from one script: a tour of one big canvas, or sketched slides. A part of the board can open into a running Dissect figure. Use it whenever someone asks to explain, teach, sketch out, illustrate or whiteboard an idea, a concept, a mechanism, a trade-off or how something works, wants a whiteboard or doodle explainer, a sketchnote, an RSA Animate or Minute Physics style video, a visual summary or slides drawn by hand, even if they never say "animation". Framework-free: a Node build writes the page; a video needs Chrome and ffmpeg.
license: MIT
compatibility: Written for Claude Code; also runs in Codex, OpenCode and Antigravity. Needs Node.js 20.10+ (built-in modules only), Chrome or Chromium for the checks, and ffmpeg for a video.
metadata:
  version: "0.1.0"
  author: "David Estévez"
  repository: "https://github.com/destbreso/depict"
---

# Depict

This skill explains an idea the way a good whiteboard explainer does: a pen draws while a voice explains, one sentence at a time, and the drawing grows into a picture of the whole idea. You write a board script, which says what the idea is made of (regions, the items in them, the links between items) and the order to tell it (beats: one sentence each, and what is drawn or marked while it is said). It holds no coordinates. The kit lays the board out, draws every shape and writes every word in the order a hand would, times each stroke, and moves the camera so every shot is readable. The page plays like a video, and when it ends it does not go blank: the reader can zoom and drag the board, and tap any part to go back to the sentence that explained it.

Examples ship with the skill. Open the closest one before you start. Build any of them with `node scripts/build.mjs examples/<name>/board.mjs --audit`, which writes a page next to it.

- `examples/cpu-cache/` is the quality bar for a canvas tour: how a CPU cache works, in three regions (where data lives, hit or miss, why it pays off) and eight beats. Each region is a shot; the tour ends on the whole board as a map.
- `examples/ddos/` explains how a site survives a DDoS attack (the attack, the layers at the edge, autoscaling behind it), and its last item opens the running Dissect figure of the same system, where every layer has a switch.
- `examples/compound-interest/` is slides: one idea per sheet, a deck that ends laid out on the table.

## The one idea that matters

**Draw the idea, not the slide.** Every mark on the board is a stroke the viewer sees being made, at the moment the sentence that needs it is said. The sentences are the captions; the board holds pictures, a few words and the arrows between them.

| In the explanation | On the board |
|---|---|
| One idea (a part, a stage, a reason) | A region, with a short title underlined in the accent |
| A thing the idea is about | An item: a Lucide icon, a label of two or three words, a short note, a frame (box, ellipse, cloud, bubble, banner) when it matters |
| How two things relate | A link: an arrow with a one to three word label; dashed when weak or optional, double-headed when mutual |
| A sentence | A beat: the sentence as the caption, and what is drawn while it is said |
| Emphasis | A mark: circle, underline, highlight, box, cross |
| An aside about one thing | A note beside it, with a small arrow |
| A part you can run | An item with a `figure`: a Dissect page that opens, live, from the board |

Two ways this fails, both common:

- **Slides with a pen.** Paragraphs written on the board, or every sentence drawn as text. Handwriting is slow to watch and hard to read; a board of sentences is a page of notes. Labels are two or three words taken from the sentence; the rest is said.
- **Clip art without a structure.** Icons scattered with no regions and no reading order. The viewer cannot build a picture of the idea if the board has none. Plan the final board first, then tell it.

## Workflow

1. **Find the one sentence.** What should the viewer understand after a minute? Say it in one sentence, and say who the viewer is. Everything on the board serves that sentence.
2. **Plan the final board first.** Split the idea into two to five regions in the order you will tell them. Give each region one to four items (an icon, a two or three word label, a short note) and decide the links. Name the parts before the process: a region that shows how things work needs the things drawn first. Pick each region's `layout` (`row`, `column`, or `grid` with `at: [column, row]`) from its shape; references/craft.md maps shapes of argument to layouts.
3. **Write the beats.** One sentence each, under about 90 characters, spoken to the viewer ("your CPU", "you"). Each beat draws the one or two things its sentence names, and draws nothing its sentence does not need. Open with a picture within about five seconds, not a long title. Close on the take-away: a banner item, a mark on the key part, or a live part to try.
4. **Choose the mode.** `canvas` is one board the camera tours region by region, ending on the whole picture as a map: for systems, structures and ideas with parts that relate. `slides` gives every region its own sheet, one idea at a time, and ends on the deck laid out: for sequences, steps and before-and-after.
5. **Build with the audit:** `node scripts/build.mjs board.mjs --audit`. It fails on problems (unreadable text, overlaps, things outside their slide) and warns about the craft (long captions, labels of many words, a slow opening, too much at once). Fix every problem; read every warning and fix the ones that are right.
6. **Look at it:** `node scripts/check.mjs board.html`. It pictures the end of every beat, the closing overview and the page, and fails on any error the page logs. Open the pictures and read them. Ask of each one: can a viewer who sees only this frame tell what the sentence is about? Is anything cut, crowded or too small?
7. **A video, when asked:** `node scripts/video.mjs board.html` writes board.mp4 at 1920 x 1080 with the captions burned in, ready for social sites (H.264, studio-range color with Rec. 709 tags, a silent audio track, the index first).
8. **Hand it back:** the page's path and how to open it (any browser, no server), how long it runs, what is on the board, and the video's path if you made one.

## The board script

A board is a module whose default export is the script. Fields (references/model.md has every one, with what the kit does with it):

```js
export default {
  title: "How a CPU cache works",          // written first, the largest words on the board
  mode: "canvas",                           // or "slides"
  hand: "print",                            // the lettering: "print" (a clear hand) or "marker" (looser)
  accent: "#c43f0a",                        // the one accent color: underlines and marks
  seed: 4,                                  // the wobble of every line; same seed, same drawing
  regions: [
    { id: "places", title: "Where data lives", items: [
      { id: "cpu", icon: "cpu", label: "CPU", note: "needs data every step" },
      { id: "cache", icon: "layers", label: "Cache", note: "small, close, fast", shape: "box" },
    ] },
  ],
  links: [{ id: "near", from: "cpu", to: "cache", label: "1 ns" }],
  beats: [
    { say: "Your CPU needs data at almost every step.", draw: ["title", "cpu"] },
    { say: "So it keeps a small, fast copy close by: the cache.", draw: ["places", "cache", "near"], mark: [{ circle: "cache" }] },
  ],
};
```

- A beat's `draw` lists ids in the order the pen takes them: `"title"`, a region's id (its title), an item, a link, or a note `{ note: "short words", near: "item", side: "below" }`.
- `mark` puts an emphasis on something already drawn: `{ circle | underline | highlight | box | cross: "id" }`.
- Icons are Lucide names (lucide.dev): `cpu`, `database`, `users`, `lightbulb`, `shield-check`. A wrong name fails the build with the closest ones.
- An item with `figure: "path/to/dissect-page.html"` is a live part; a beat with `open: "item"` opens it as the beat starts and waits for the reader (references/live.md).

## What the kit decides, so you do not

The layout of items inside a region, where the regions go (a path that wraps so the closing overview fits 16:9), the frames, every stroke's shape and wobble, the order and speed of the pen (about 14 letters a second, a little faster for notes), the pauses, each beat's length (at least as long as its sentence takes to read), the camera's shots and its flights between them, and the closing overview. Do not try to position things; if the result reads badly, change the structure (another layout, another region, fewer items, shorter words) and build again.

## References

- references/model.md: the board script, field by field
- references/craft.md: the rules of the genre and where they come from
- references/verify.md: what the audit and the check look at, and how to fix what they find
- references/live.md: live parts, a Dissect figure that opens from the board
