<h1 align="center">Depict</h1>

<p align="center"><b>An Agent Skill that explains a concept by drawing it.</b><br>For Claude Code, and also runs in OpenCode, Codex and Antigravity.<br>A hand-drawn board that builds stroke by stroke, one sentence at a time, presented by an animated guide, and stays explorable when the explanation ends.</p>

<p align="center">
  <a href="https://code.claude.com/docs/en/skills"><img src="https://img.shields.io/badge/Claude_Code-skill-1b1b19?style=flat-square&logo=claude&logoColor=white" alt="Claude Code skill"></a>
  <a href="https://agentskills.io"><img src="https://img.shields.io/badge/Agent_Skills-compatible-1b1b19?style=flat-square" alt="Agent Skills compatible"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1b1b19?style=flat-square" alt="MIT license"></a>
  <a href="#requirements"><img src="https://img.shields.io/badge/node-%E2%89%A5%2020.10-1b1b19?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node 20.10 or later"></a>
  <a href="#requirements"><img src="https://img.shields.io/badge/dependencies-0-1b1b19?style=flat-square" alt="No dependencies"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#what-you-get">What you get</a> ·
  <a href="#gallery">Gallery</a> ·
  <a href="#install">Install</a> ·
  <a href="#examples">Examples</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#checks">Checks</a>
</p>

<p align="center">
  <a href="skills/depict/examples/cpu-cache/cpu-cache.html"><img src="assets/drawing.gif" width="800" alt="A hand-drawn board being drawn: the guide, a cartoon marker with a red cap, glasses, a bow tie and a teacher\'s pointer, is drawn stroke by stroke beside the title How a CPU cache works, comes alive its own way and presents the title as it is written over a yellow highlighter swash; then the first idea, numbered 1 in a red disc, Where data lives, and a green CPU chip drawn pin by pin, while a caption under the board says each sentence."></a>
</p>

<p align="center"><sub><code>skills/depict/examples/cpu-cache</code>: the opening of a one-minute board. Every letter is written in pen order; the pen follows the tip; the guide is drawn, then performs.</sub></p>

## Quick start

```sh
npx skills add destbreso/depict -g -a claude-code
```

Then, in Claude Code:

```text
/depict how a CPU cache works
```

The agent finds the one sentence the idea comes down to, splits it into a few regions, draws the focal thing of each as it really is, writes one sentence per beat and what is drawn while it is said, builds the page, audits it, pictures every beat in a browser, reads the pictures as an artist would and hands you one HTML file. Ask for slides ("as slides"), for a video ("and a video for LinkedIn"), or for a part people can try (a Dissect figure that opens from the board).

As a Claude Code plugin instead: `/plugin marketplace add destbreso/depict`, then `/plugin install depict@depict`, and call it with `/depict:depict`. For OpenCode or Codex, swap the agent: `-a opencode` or `-a codex`.

## What you get

- **A page that plays like a video.** One standalone HTML file, no network. A pen draws each shape and writes each word in the order a hand would, and each sentence is written under the board as it is said, never over the drawing. Pause, scrub, step sentence by sentence, change the speed.
- **A guide with a face, and a cast to choose from.** Every board is presented by a character: depict's own marker by default (a felt marker with its cap in the board's accent), Stuart (a fuzzy pink brain with round glasses, created by Niki, age 7), or one made from any drawing you give it. Each has its own look, its own way of moving (the marker is stiff; Stuart is soft and wobbles like a jelly when he lands) and its own personality (how it arrives and leaves, what it does on its own). It is drawn first, then comes alive its own way, points at each new thing as the pen draws it (only along a clear line: when something is in the way it steps aside to see it, or only looks), never leaves the picture, follows the pen with its eyes, is surprised when something is marked, worried or thinking when the sentence is, hops to the next idea and says goodbye at the end. It is dressed for the subject: a mortarboard and a book, a hard hat and a wrench, glasses and a pointer, headphones, a crown, a ruler, a coin, a clock, Stuart's elf hat and mittens, and his Halloween spider. It blinks and breathes while you explore, and waves back when you tap it.
- **Pitched to its viewer.** It decides from what you ask and what the subject is whether the board is for a young child, a beginner, an adult or an expert, and sets the pace, the words, how concrete the example is and how deep it goes: real blocks and coins and half speed for a seven-year-old, the field's own terms and the internals for a design review.
- **A character from a drawing.** Give it a drawing (a child's drawing, a sketch; one picture or several of the same character) and it makes it a guide: the drawing's proportions, colors and details kept, the lines evened, every feeling and pose added, a material and a personality chosen, and a model sheet and three test boards to look at before any board uses it.
- **Numbered ideas, read as a page.** Each idea is numbered in the order it is told and the ideas are laid out as a page is read, left to right in balanced rows, so three or ten compose into one 16:9 poster with no empty corner.
- **Explained completely.** The problem and why the obvious way falls short, the mechanism traced step by step on one worked example, why it works, what it costs, the classic mistakes and when to use it.
- **Things drawn as they are.** A chip with its pins, memory sticks, a server rack, bars and curves drawn to scale, colored in with marker fills, framed with drop shadows; people only where people are part of the idea.
- **An ending, not a stop.** After the last sentence the camera pulls back to the whole board, then comes in on the guide saying goodbye its own way (a wave, a bow, a cheer, a salute, a tip of its cap, a spin) as a circle closes on it, and the title is written on the dark.
- **A board that stays.** When the film is over the page goes back to the whole board: zoom it, drag it, and tap any part to go back to the sentence that explained it.
- **Handwriting, not a wipe.** Words are written letter by letter from single-stroke fonts, with a little tilt and drift per letter, in two hands (a clear print and a looser marker), accents and all.
- **A camera that is computed.** Every shot is checked to be readable; the board opens close on the guide and the title, the camera flies between shots along the optimal zoom path, and the board ends on a held overview that reads as a map of the idea.
- **Two modes from one script.** A tour of one big canvas, or sketched slides that end laid out as a numbered storyboard.
- **Live parts.** An item can open into a running [Dissect](https://github.com/destbreso/dissect) figure, grown from its place on the board: the board explains, the figure lets you try.
- **A series.** A course or a set of lessons builds in one go, with one report of what every audit said and a gallery to pick the boards from.
- **A video when you want one.** 1920 x 1080, the board alone and clean, in the form social sites take without trouble, with its sentences as an .srt beside it: subtitles for the site, or the script for a voice.

## Gallery

<table>
  <tr>
    <td width="50%"><a href="skills/depict/examples/cpu-cache/cpu-cache.html"><img src="assets/cpu-cache.png" alt="The closing overview of How a CPU cache works, laid out as a numbered page: 1 Where data lives (a green CPU chip, a yellow cache block with a bolt, two memory sticks circled, a yellow arrow of 1 ns and a dashed one of 100 ns), then below it 2 Hit or miss (a cache block with the found row and a check, an hourglass) and 3 Why it pays off (a yellow loop arrow, a row of memory with its neighbors colored, a banner Most reads hit), and the guide in glasses and a bow tie, holding a pointer."></a></td>
    <td width="50%"><a href="skills/depict/examples/compound-interest/compound-interest.html"><img src="assets/compound-interest.png" alt="Compound interest as four numbered sketched slides laid out as a storyboard: 1 simple interest with a coin stack, 2 compound interest with growing green bars, 3 the gap between a line and a curve colored yellow with 30 years circled, and 4 the rule of 72 with a person saying 72 divided by 10 is 7.2 and the guide in a bow tie holding a coin."></a></td>
  </tr>
  <tr>
    <td><b>How a CPU cache works.</b> A canvas tour: the chip, the cache and the memory drawn as they are, a hit and a miss, why it pays off.</td>
    <td><b>Compound interest.</b> Slides: one idea per numbered sheet, every chart drawn to scale.</td>
  </tr>
  <tr>
    <td width="50%"><a href="skills/depict/examples/ddos/ddos.html"><img src="assets/ddos.png" alt="How a site survives a DDoS attack as a numbered page: 1 the attack (a person waving, a server rack circled, three frowning robots sending a yellow flood arrow), 2 the layers at the edge drawn as a stack (rules, rate limit, challenge, cache) and 3 behind the edge, autoscaling racks with a plus and a Try it bubble with a play mark; the guide wears a yellow hard hat and holds a wrench."></a></td>
    <td width="50%"><a href="skills/depict/examples/hash-table/hash-table.html"><img src="assets/hash-table.png" alt="How a hash table works as a numbered page: 1 an array with one jump to slot 3 and a worried person searching for Ana, 2 a tag hashed through a hash sign to 2,615 % 4 = 3, 3 four buckets with Ana and then Ben chained under bucket 3, and 4 why it is fast, ending in a banner; the guide wears glasses and holds a magnifier."></a></td>
  </tr>
  <tr>
    <td><b>How a site survives a DDoS attack.</b> The last item opens the running Dissect figure of the same system, where every layer has a switch.</td>
    <td><b>How a hash table works.</b> A data structure: someone searching by name, the buckets as adjacent cells, a collision's chain under bucket 3.</td>
  </tr>
</table>

### Characters

<table>
  <tr>
    <td width="50%"><a href="skills/depict/examples/characters/stuart/stuart-test-1.html"><img src="assets/meet-stuart.gif" alt="Stuart, a fuzzy pink brain with round glasses, short salmon arms and legs and black shoes, is drawn beside the words Meet Stuart, bounces to life, presents the title, hops to the next idea and lands with a jelly wobble; then he shakes himself awake in a green elf hat and green mittens, hops with a black spider on his head, and says goodbye with two bounces as a circle closes on him and Meet Stuart is written on the dark."></a></td>
    <td width="50%"><a href="skills/depict/examples/characters/marker/marker-test-1.html"><img src="assets/meet-the-marker.gif" alt="The marker, a felt marker with a red cap, big eyes, white gloves and black shoes, is drawn beside the words Meet the marker, waves, presents the title and hops to the next idea; then it hops in a mortarboard holding a book, spins in a chef's hat holding a ruler, and waves goodbye as a circle closes on it and Meet the marker is written on the dark."></a></td>
  </tr>
  <tr>
    <td><b>Stuart</b>, created by Niki, age 7: a fuzzy pink brain, soft and bouncy, who wobbles like a jelly when he lands and pushes his glasses up before he explains; here as she drew him, as he is, in his winter outfit and with his Halloween spider. <a href="skills/depict/examples/characters/stuart/stuart-sheet.png">His model sheet</a>.</td>
    <td><b>The marker</b>, depict's own guide and the default: a stiff barrel that hops and lands with a firm squash and can tip its cap. <a href="skills/depict/examples/characters/marker/marker-sheet.png">Its model sheet</a>.</td>
  </tr>
</table>

<p align="center"><sub>Each is the presentation <code>scripts/character.mjs</code> writes for a character: its model sheet and three short boards it presents, the same check any character made from a drawing goes through. The GIFs are moments of those boards, made with <code>scripts/gif.mjs</code>.</sub></p>

## Install

Depict is one skill folder, `skills/depict`, with a `SKILL.md` at its root.

| Way | Command | Goes to |
|---|---|---|
| **skills CLI**, for you | `npx skills add destbreso/depict -g -a claude-code` | `~/.claude/skills/depict` |
| **skills CLI**, one project | `npx skills add destbreso/depict -a claude-code` | `.claude/skills/depict` |
| **Claude Code plugin** | `/plugin marketplace add destbreso/depict`, then `/plugin install depict@depict` | managed by Claude Code |

By hand: copy `skills/depict` into `~/.claude/skills/` (Codex: `~/.agents/skills/`, OpenCode: `~/.config/opencode/skills/`, Antigravity: `~/.gemini/antigravity/skills/`).

## Use

Ask in your own words; the skill triggers on explaining, teaching, sketching out or whiteboarding an idea:

```text
/depict the CAP theorem, for my team, under a minute
/depict why the sky is blue, as slides, with a video for LinkedIn
/depict how a hash table works, for someone who just learned arrays
/depict telling time to the nearest five minutes, for my 7-year-old
/depict make a character from my daughter's drawings: drawing-1.jpg drawing-2.jpg
```

Open a page in a browser, straight from the file. A preview that reloads the page whenever a file in its folder changes (VS Code's Live Server or Live Preview) stops the film at every reload.

## Examples

| Example | What it shows |
|---|---|
| [`cpu-cache`](skills/depict/examples/cpu-cache/board.mjs) | **How a CPU cache works.** Where data lives, hit or miss, why it pays off: the chip, the cache's lines and the memory sticks drawn as sketches, the memory set far off. A canvas tour in nine beats. |
| [`compound-interest`](skills/depict/examples/compound-interest/board.mjs) | **Compound interest.** Simple against compound interest on $1,000 at 10%, growing bars, the line and the curve over 30 years drawn to scale, the rule of 72. Slides. |
| [`ddos`](skills/depict/examples/ddos/board.mjs) | **How a site survives a DDoS attack.** People and a botnet against a server rack, the layers at the edge as a stack, autoscaling, and a live part that opens Dissect's running figure. |
| [`hash-table`](skills/depict/examples/hash-table/board.mjs) | **How a hash table works.** For someone who just learned arrays: one jump by index, a search by name, a key hashed to an index, buckets as adjacent cells, a collision and its chain, why lookups stay fast. |

Rebuild any of them: `node skills/depict/scripts/build.mjs skills/depict/examples/<name>/board.mjs --out <your folder>/<name>.html --audit`.

## How it works

The agent writes a **board script**: the idea's regions, the items in them (a sketch of the thing, a character, or a Lucide icon; a two or three word label; a short note; a frame), the links between items, and the beats, one sentence each with what is drawn or marked while it is said, and how the guide feels. It holds no coordinates.

The kit does the rest, in Node, with nothing but its own modules:

1. **Layout.** Items sit in their region by row (on a ground line), column, grid, radial or cells; the regions are numbered and laid out in reading order, in balanced rows, as many as make the board 16:9; every region gets a frame that holds all of it.
2. **Strokes.** Every shape, sketch, icon and letter becomes polylines in pen order, wobbled by a seeded hand: lines bowed and jittered as Rough.js draws them, ellipses that overshoot where they close, letters from single-stroke fonts; shapes are colored in with a marker's passes and cast grey shadows.
3. **Time.** Each stroke gets its moment: the pen's pace, the lifts between strokes, and each beat at least as long as its sentence takes to read.
4. **Camera.** The board opens close on the guide and the title; each beat is shot from its region's frame; between shots the camera flies along van Wijk and Nuij's path; the board ends on the overview.
5. **The guide.** A character drawn as a rig of components (body, eyes, pupils, brows, mouths, rubber-hose arms, hands, legs, and what it wears and holds), with its own measures, poses, material and personality, and a track written from the timeline: where it stands, where it steps to see what it points at, how it arrives and leaves, its hops, bows, spins and quirks, its gestures, feelings, gaze and blinks. Its pose at any moment follows from its material: a stiff body squashes a little, a soft one squashes deep and sways over its feet.
6. **Page.** All of it goes into one HTML file whose player draws the board and poses the guide as a pure function of time, `render(t)`. Playing, scrubbing and capturing a video frame by frame are the same call.

## Checks

- **The audit**, `--audit` on the build: readable text in every shot, nothing overlapping or outside its slide, captions that fit two lines and read at no more than 20 characters a second, short labels, a quick opening, a closing map, and the composition: a focal point in every region, no empty paper, no crossing lines, no long bridges.
- **The check**, `scripts/check.mjs board.html`: pictures every beat, the overview and the page in headless Chrome and fails on any page error. The agent reads the pictures before handing anything over.
- **A character**, `scripts/character.mjs <character> --out <folder>`: checks a character module, every field, and writes its model sheet (every feeling, pose and costume) and three test boards it presents.
- **A series**, `scripts/series.mjs <folder>`: builds, audits and checks every board under `boards/`, keeps one report and writes the gallery.
- **A GIF**, `scripts/gif.mjs board.html@from-to ... --out file.gif`: moments of one or more boards as an animated GIF, for a README or a post that cannot play the page.
- **The video**, `scripts/video.mjs board.html`: 1920 x 1080 at 30 frames a second, H.264 in studio-range color with Rec. 709 tags, a silent audio track and the index first.

`skills/depict/references/craft.md` gives the rules of the genre and where each comes from.

## Requirements

| Needs | For | |
|---|---|---|
| Node.js 20.10+ | everything | built-in modules only |
| Chrome or Chromium | the check and the video | found on its own, or `CHROME_PATH` |
| ffmpeg | the video | |

The page itself needs only a browser.

## Credits

- The line and ellipse models follow [Rough.js](https://github.com/rough-stuff/rough) (MIT), after Jo Wood's Handy.
- The guide is animated by the principles in Thomas and Johnston's *The Illusion of Life* (squash and stretch, anticipation, arcs, secondary action).
- The handwriting is converted from Evil Mad Scientist's [EMS fonts](https://gitlab.com/oskay/svg-fonts) (SIL Open Font License 1.1): EMS Tech, after Architects Daughter, and EMS Casual Hand, after Covered By Your Grace, both by Kimberly Geswein.
- The icons are [Lucide](https://lucide.dev) (ISC; icons from Feather, MIT).
- The camera's flights are van Wijk and Nuij's "Smooth and efficient zooming and panning" (InfoVis 2003).
- Live parts open figures made with [Dissect](https://github.com/destbreso/dissect).
- Stuart was created by Niki, age 7, who drew him in three pictures.

## License

MIT. The fonts and the icons in the kit keep their own licenses, which travel with them (`skills/depict/LICENSE`).
