# Changelog

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
