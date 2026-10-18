# Changelog

## 0.5.0

- A board on a site: `?embed` makes the page's room transparent, so it sits on the site's own page, and the page tells its host what the film does (`ready`, `play`, `pause`, `ended`), how tall it wants to be for its width and where the board sits in it (`size`), with `postMessage`; a host that starts listening late says hello and hears `ready` again. SKILL.md says how.
- Every length a page shows is the time it takes at the board's own speed: a child's board, at half speed, says "Watch it drawn · 5:09" for a film of 2:34, and its clock ends there; the build and a series' report give the same length. The speed menu's 1x is the board's own speed, and before the film has played its clock reads from 0:00.
- A child's board has controls big enough for small fingers: 44 pixel buttons, with the paper under the board to fit them.
- A series gives each board a cover, `site/<id>-cover.png`: the frame of its own film where its first picture is complete and the camera holds on it, the guide beside it (`meta.cover` names another beat). The gallery's tiles for a child show it: a whole board shrunk to a tile is too small to read.

## 0.4.0

- Characters: the guide is a character, `guide: { character }`. The marker stays the default; Stuart, a fuzzy pink brain with round glasses created by Niki, age 7, ships beside it, with his own costumes from her drawings (an elf hat and mittens, and a spider for Halloween) worn as outfits; a board can also bring a character module of its own. Each character has its look, its measures and poses for its own body, places for the shared costumes, what it can wear and its skins, its material (how much it squashes and stretches, how it wobbles, whether its top sways over its feet like a jelly) and its personality (its own ways to arrive and leave, chosen by the seed, and its quirks: Stuart pushes his glasses up in a quiet moment). Soft bodies arrive with a `bounce` or a `jiggle` and leave with a `bounce`.
- A character from a drawing: references/characters.md says how, from one picture or several (each variant picture's costumes become an outfit), keeping the drawing's proportions, colors and details and improving only what a guide needs; `scripts/character.mjs` checks a character module and writes its model sheet and three boards it presents. Both characters' presentations ship in `examples/characters/`, and the README embeds moments of them as GIFs made with the new `scripts/gif.mjs`.
- The guide is whole in the picture whenever the camera holds still: it lands from a hop between ideas as the camera arrives, never hops higher than the shot has room for, and steps only inside the shot and on the board; the audit's new `guide` rule fails a board where it is not. A character's `size` sets its height beside the marker's, so a wide one (Stuart, 0.76) takes about the marker's paper.
- The guide points only along a clear line, with nothing just ahead of its finger and its finger never left in the air beside another thing, and steps up to what it cannot reach: when something drawn earlier stands between it and what a sentence names, it steps to free paper beside or under the thing, inside the shot, and otherwise only looks. A thing not drawn yet never stops its hand.
- Who it is for: the skill decides from the request and the subject whether a board is for a young child, a beginner, an adult or an expert, and pitches the pace, the words, the example and the depth to them. Get it right: every number checked and written down at the top of the script, a source's own example used, and where a source is wrong the board says what is true and the person is told.
- A series: `scripts/series.mjs` builds a folder of boards with their audits and checks, keeps one report (two builds at once both keep theirs) and writes a gallery to pick from or to review.
- The page keeps the film's place every frame and as it goes, so a reload goes on from the very frame it was showing.
- The audit's sparse rule counts a line by the paper it marks and a linked drawing (a tree, a graph) by the paper it spans.
- The skill's description fits the Agent Skills limit of 1024 characters.

## 0.3.0

- A numbered page: the regions are numbered in the order they are told (in paper on a disc of the accent, before each title) and laid out as a page is read, left to right in balanced rows, as many rows as make the board 16:9, each row's titles on one line and no corner left empty (`flow: "page"`, the default; `numbers: false` leaves the numbers out). Slides end as a numbered storyboard. The story road and the story arrows are gone: the numbers give the order, and a link between regions is only for a connection the order does not say.
- Explained completely: the skill now asks for the problem, the mechanism traced step by step on one worked example, why it works, what it costs, the classic mistakes and when to use it; the length warning moves to ten minutes at the board's own speed.
- The guide, dressed for the subject: `guide: { wear, hold, skin }`. Thirteen things to wear (glasses, a bow tie, a scarf, a star, a hair bow, a pencil behind its ear, and one hat: a mortarboard, a hard hat, headphones, a party hat, a crown, a beanie, a chef's hat), twelve to hold (a pointer, which lies along its arm when it points, and a book, a pencil, a ruler, a coin, a clock, a magnifier, a flag, a balloon, a wrench, a calculator, a lightbulb), and a body in a tint, bands or dots.
- The guide arrives and leaves its own way on each board: `guide: { intro, outro }` (a wave, a hop, a spin, a bow, a tip of its cap, a jump; a wave, a bow, a cheer, a salute, a tip of its cap, a spin), picked by the seed when the script does not say. Its cap is a component of its own, so it can be lifted and tipped, hat and all.
- Links meet a circle or an ellipse at its outline, so a tree's edges touch their nodes; a side two cells share is drawn by whichever is drawn first, so a cell drawn out of order is never left open; a highlight over several cells stays inside them; a circle on a cell goes round its words; a shape thinner than the marker's nib is colored in with a finer one; a label's descenders no longer run into its note.
- The hand writes □, the box a missing number goes in, and a minus as wide as the equal sign (a hyphen between spaces is written as one).

## 0.2.0

- The guide: every board is presented by the same animated character, a felt marker with its cap in the board's accent. It is drawn stroke by stroke, comes alive with a bounce and a wave, presents the title as it is written, looks at and points to each new thing as the pen draws it, turns to face what is behind it, is surprised by a mark, hops along the road to the next idea while the camera flies there, and cheers at the end. It is a rig of components (cap, body, eyes, pupils, brows, mouths, rubber-hose arms, gloves, legs) posed every frame as a pure function of time, so the video shows the same performance. A beat can set how it feels (`feel`) and what it does (`act`). It blinks and breathes while the board is paused, and waves when tapped.
- The story road: on a canvas (`flow: "path"`, the default) and in slides, the regions sit on alternate sides of one wide road that sways toward each and turns back row after row, as many rows as make the board a 16:9 poster, so any number of ideas composes into one picture. A stretch of road is drawn on each camera flight; the road ends in an arrowhead as the camera pulls back to the whole board.
- Drawing the thing itself: `sketch` items (SVG paths in a 100 x 100 box, shapes colored in with `{ d, fill }`), cartoon characters (poses, faces, hair, hats, shirts, a bubble with what they `say`), `size: "large"` for a region's focal thing, a `radial` layout, pictures on a common ground line, and characters that face into their region.
- Weight and depth: marker fills, grey drop shadows under frames, banners colored in, `bold` links drawn as wide filled arrows, solid arrowheads, a highlighter swash under the title, thicker lines.
- `far: true` on a link sets its two items further apart.
- The camera opens close on the guide and the title, and the overview frames the drawing rather than the regions' shots.
- The outro, the same on every board: the guide waves goodbye and winks while a circle closes on it, then the title is written on the dark; the page then rests on the whole board (`outro: false` ends on the overview). The check pictures the last frame too.
- Slides: a sheet whose content is small has it drawn larger to fill its page.
- Audit: a focal point in every region, no empty paper, no crossing lines, no long bridges between regions.
- The build creates its output folder.
- The examples draw the real things (a chip, memory sticks, a server rack, a botnet, bars and curves to scale) instead of icons or analogies.

## 0.1.0

- A board script (regions, items, links, beats) becomes a standalone page: a hand-drawn board that builds stroke by stroke while each sentence shows as its caption, with a marker at the tip of every stroke.
- Handwriting written letter by letter in pen order, from two single-stroke fonts (print and marker, Latin-1), with a seeded tilt, size and baseline per letter.
- Shapes drawn the way a hand draws them (Rough.js's model, rewritten to return polylines in pen order), and the 2,154 Lucide icons drawn in the same hand.
- A computed camera: each region a shot, van Wijk and Nuij flights between shots, a closing overview of the whole board; regions wrap so the overview fits 16:9.
- Two modes from one script: a canvas tour, or slides (one sheet per region, all one size, ending on the deck laid out).
- The board stays live when the explanation ends: zoom it, drag it, tap a part to go back to its sentence.
- Live parts: an item with a Dissect figure opens into it, running, grown from its place on the board.
- An audit (readable text in every shot, overlaps, captions, labels, pace, the opening, the closing map), a browser check that pictures every beat, and a video export ready for social sites.
- Data structures: `cells` and `stack` layouts draw adjacent slots of one size (an array, a table row, a stack), and an item can hang `under` a cell (a chain in a bucket, a value under a slot).
- Shots keep the caption's band clear, and the audit fails anything drawn under it or outside its shot.
- Every word on the board is checked against the hand's glyphs: typographic marks are written the plain way, and a character the hand lacks fails the build instead of turning into "?".
- A long title goes on two lines rather than widening the first shot.
- Examples: how a CPU cache works (canvas), compound interest (slides), how a site survives a DDoS attack (with a live Dissect figure), how a hash table works (cells and a chain).
