# Verifying a board

Two checks run before anyone sees a board. The audit measures it; the check looks at it in a browser. Neither replaces reading the pictures.

## The audit

`node scripts/build.mjs board.mjs --audit` builds the page and prints every finding. A problem fails the build; a warning is worth a look.

| Rule | Level | What it checks | How to fix it |
|---|---|---|---|
| readable | problem under 14 px, warning under 18 | The cap height of every label and note in the shot of the beat that draws it, in pixels of a 1920 x 1080 frame | Fewer or smaller items in that region, a region split in two, a `column` layout for a wide row |
| overlap | problem | Items, titles, notes and arrow labels landing on one another | A note on another `side`, another `layout` or grid cell, a shorter label, a `bend` on the arrow |
| overlap (mark) | warning | A mark running into something other than its target | Mark a smaller target (`underline` instead of `circle`), or move the neighbour |
| frame | problem in slides, warning on a canvas | Anything reaching outside its slide or its region's frame | Shorter notes, fewer items on that sheet |
| caption | problem over 110 characters, warning over 90 | A beat's sentence fitting two caption lines | Split the sentence into two beats |
| pace | warning | Reading speed over 20 characters a second | A shorter sentence, or more drawing in that beat |
| label | warning over 4 words | Labels read at a glance (words with letters; a formula counts as none) | Two or three words; the rest goes in the note or the sentence |
| note | warning over 9 words | Notes are a phrase | Shorten, or say it |
| load | warning over 4 things | New things in one beat | Split the beat |
| hook | warning over 7 s (10 s with the guide, whose hello counts as the opening picture) | The first beat's drawing time | Open with a picture; move a long title or a second item to the next beat |
| focal | warning | A region of two or more items where none is large, a character, a sketch, framed or marked | Draw the thing the region is about as a large sketch, or frame or mark it |
| sparse | warning under 10% | How much of a region's shot its drawing covers: its items, each line as the band of paper it marks, and a drawing of two or more linked things (a tree, a graph) as the paper it spans | Draw the idea as a scene, make the key item large, merge a thin region into another |
| tangle | warning | Two lines crossing (arrows) | Put the item between the other two, link fewer things, or say the connection in the sentence |
| through | warning | A link's line running through a third item | Bend it (`bend`), or place the items so the line has a clear way |
| bridge | warning | A link between regions that are not side by side, or many links between regions | The numbers already give the order: say the connection, or put both items in one region |
| islands | warning | With the numbers turned off, regions that no link connects | Number the ideas again, or link an item of one region to the next |
| length | warning over 10 minutes, at the speed the board plays at | The whole board | Two boards |
| map | warning | Region titles in the closing overview under 10 px | A smaller board; the page can still be zoomed |

## The check

`node scripts/check.mjs board.html` opens the page in headless Chrome, pictures the board at the end of every beat (as the video shows it, 1920 x 1080), the closing overview and the page with its controls, and fails on any error the page logs. The pictures land in `shots/` next to the page.

Read them as the artist. For each beat's picture, ask:

- Without the caption, can a viewer tell what this frame is about?
- Is anything cut at an edge, crowded against another thing, or too small?
- Does the pen's order make sense: the thing named first, then its label, then the arrow to the next?
- Is there one place the eye goes first?
- Does the overview read as a poster: the title, the numbered ideas in the order they were told, no empty corner, the guide at the end?
- Is the idea explained completely: the problem, every step of the worked example, why it works, what it costs, the mistakes, when to use it?

- Does the guide point at the thing the sentence names? It points only along a clear line; when it only looks at something, often, the idea's things stand in its way: give the region room beside them, or a grid instead of a long row.

The audit cannot answer these; the pictures can.

## A character

`node scripts/character.mjs <character> --out <folder>` checks a character module (every missing or wrong field at once) and writes its model sheet and three test boards it presents. Read the sheet against the drawing it came from, part by part: the proportions, the colors, the signature details, every feeling and pose. Play the tests: does it land and move the way its material says, point where it means to, look like itself in every costume? Show both to the person before any board uses it (references/characters.md).

## The video

`node scripts/video.mjs board.html` renders every frame with the page's own `depict.render(t)` and encodes them with ffmpeg: 1920 x 1080 at 30 frames a second, H.264 in studio-range yuv420p with Rec. 709 tags, a silent AAC track and the index first, the form social sites take without problems (LinkedIn drops a file with an ICC profile, full-range color or no audio track, without an error). The frames are the board alone: the sentences are written beside the video as board.srt, each timed to its beat at the video's speed, for a site's subtitles or for a voice laid over it. A minute of board takes about two minutes to render.
