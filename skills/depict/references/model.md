# The board script

A board is a JavaScript module whose default export is the script. It says what the idea is made of and the order to tell it in; it never says where anything goes. `node scripts/build.mjs board.mjs` validates it and reports every problem at once, each naming the thing it is about and what to do.

## The board

| Field | Default | What it does |
|---|---|---|
| `title` | required | The board's title: the largest words on the board, written with a highlighter swash beside the guide, as the first region's top line. A few words naming the concept. |
| `mode` | `"canvas"` | `"canvas"`: one board the camera tours region by region along the story road, ending on the whole picture. `"slides"`: each region its own sheet, all one size, the sheets laid along the road; the camera pans from sheet to sheet and ends on the deck laid out. A sheet whose content is small has it drawn larger, up to about one and a half times, to fill its page. |
| `flow` | `"path"` | How a canvas is composed. `"path"` lays the regions along the story road, alternating sides, in as many rows as bring the board closest to 16:9. `"row"`, `"column"` and `"grid"` (with a region `at: [column, row]`) are plain layouts, with a story arrow between consecutive regions instead of a road: use them only when the shape of the idea needs it. |
| `hand` | `"print"` | The lettering: `"print"`, a clear handwritten print (EMS Tech, after Architects Daughter), or `"marker"`, a looser hand (EMS Casual Hand). Both cover Latin-1: accents, ñ, ¿, ¡, €, ×, ÷. |
| `accent` | `"#c43f0a"` | The one accent color: the road, the guide's cap and cheeks, title underlines, marks, the live part's play mark. |
| `guide` | `true` | The guide: the animated marker who presents the board. `false` leaves it out. |
| `story` | `true` | The story road (or, in a plain flow, the story arrows). `false` leaves it out; then link regions yourself, or the audit warns about islands. |
| `outro` | `true` | The standard ending: the camera comes in on the guide, who waves and winks as a circle closes on it, then the title on the dark. `false` ends on the held overview. |
| `audience` | `"adult"` | `"child"` for a young viewer: larger captions, the page starting at half speed (captions read at about eight letters a second, the drawing at a calm pace), and the audit holding a sentence to about 64 characters. |
| `speed` | `1` (`0.5` for a child) | The speed the page starts at, and a video is made at. The viewer can change it from 0.5 to 2. |
| `seed` | `1` | The wobble of every line and the guide's blinking. The same seed draws the same board; change it to redraw by hand. |
| `lang` | `"en"` | The page's language. |
| `regions` | required | The ideas, in the order you tell them. |
| `links` | `[]` | Arrows between items. |
| `beats` | required | The explanation, one sentence each. |

## Regions

A region is one idea: a part, a stage, a reason. On a canvas it is a stop on the road and one shot of the tour; in slides it is one sheet.

| Field | What it does |
|---|---|
| `id` | Lowercase letters, digits and dashes. A beat draws the region's title by its id. |
| `title` | Two to four words, written underlined in the accent above the region's items. |
| `layout` | How its items sit: `"row"` (default; every picture on one ground line, the labels lined up under them), `"column"`, `"grid"` (each item gives `at: [column, row]`; the default when any item has `at`; each row has its own ground line), `"radial"` (round a hub: the large item, or the first), `"cells"` (adjacent cells of one size, edge to edge: an array, a row of a table) or `"stack"` (the same, top to bottom: a stack, layers). Cells hold a label inside and a note under them (beside them in a stack). They take no icon. Cells that each give `at: [column, row]` make a matrix: a grid of cells sharing their edges. |
| `at` | `[column, row]` when the board's `flow` is `"grid"`: where the region sits among the others. |
| `items` | One to four things, at most six (a `cells` or `stack` region may hold more: they are one thing, drawn as a row of slots). |

## Items

An item is one thing on the board. It has one picture, or none, and words under it.

| Field | What it does |
|---|---|
| `id` | As for regions; ids are unique across the board. The kit keeps `title`, `guide`, and ids starting `note-`, `mark-`, `story-` or `guide-` for itself. |
| `sketch` | A drawing of the thing: SVG path data in a 100 x 100 box, one entry per path, drawn in order. An entry is a path string (a line), `{ d, fill }` (a shape colored in with a marker: `"accent"`, `"yellow"`, `"ink"`, `"grey"`, `"blue"`, `"green"`, `"sand"`, `"pink"`), `{ d, fine: true }` (a detail drawn with a finer nib: the grid inside a block, a ring), or `{ text, at: [x, y], size, color }` (words written inside the drawing, centered on `at`, `size` their cap height in the box's units, default 10; `color` `"grey"` or `"paper"` for words on a dark fill): a clock's numbers, a coin's value, a node's key. Every point must stay within -20 to 120. This is how the focal thing of a region is drawn. |
| `character` | A person who is part of the idea: a pose name, or `{ pose, face, facing, hair, hat, shirt }`. Poses: `stand`, `wave`, `point`, `think`, `cheer`, `shrug`, `walk`, `hold`. Faces: `happy`, `sad`, `surprised`, `worried`, `neutral`, `angry`. Hair: `none`, `short`, `long`, `bun`, `curly`. Hats: `none`, `chef`, `cap`. Shirts: `blue`, `green`, `sand`, `pink`, `grey`, `accent`, `none` (left out, one is chosen by the id). Left out, `facing` turns it into its region. |
| `says` | What a character says, in a bubble beside its head on the side it faces. A few words. |
| `icon` | A Lucide icon name (lucide.dev), for a small secondary thing: `cpu`, `database`, `users`, `shield-check`, `coins`. A wrong name fails the build and lists the closest ones. |
| `size` | `"normal"` (default) or `"large"`: the picture half as large again, the label a fifth larger. The region's focal thing is large. |
| `label` | Two or three words, the thing's name. An item needs a picture or a label. |
| `note` | A short phrase under the label, in grey: a number, a property, a hint. |
| `shape` | A frame drawn round the item after it: `"none"` (default), `"box"`, `"ellipse"`, `"circle"`, `"cloud"`, `"bubble"`, `"banner"`. Frames cast a grey shadow; a banner is colored in. A `banner` with a label and no picture is a take-away. |
| `at` | `[column, row]` in a grid region. |
| `under` | In a `cells` region: the cell this item hangs under (a value in a slot, a chain in a bucket). |
| `figure` | A live part: the path (relative to the board file) or URL of a Dissect page. The item gets a play mark; tapping it opens the running figure. See live.md. |

The kit draws an item in this order: its picture (a sketch's or a character's lines and then its color, as one gesture), what it says, its label, its note, then its frame.

## Links

| Field | What it does |
|---|---|
| `id` | A beat draws the link by its id. |
| `from`, `to` | Item ids. The arrow runs between the items' edges and points at `to`. |
| `label` | One to three words beside the arrow (a latency, a verb, a condition). |
| `style` | `"solid"` (leads to; a solid head), `"dashed"` (weak, optional, slow), `"double"` (both ways), `"bold"` (the main move inside an idea: a wide arrow, colored in, with a shadow), `"line"` (an edge with no head: a tree's, an undirected graph's). For a tree or a graph, give nodes `shape: "circle"` in a `grid` region, each at its place. |
| `far` | `true` sets the two items further apart in their row or column: the distance means something (memory is far from the CPU). |
| `bend` | How much the arrow curves, as a share of its length: positive to the left of travel. The kit picks one when it is left out. |

A link is drawn after both its items; in the same beat it may come first, pointing at what is about to appear. Link items inside one region; between regions the road already leads from one idea to the next, so a link across regions is for a connection the road does not say, and only between neighbors.

## Beats

| Field | What it does |
|---|---|
| `say` | One sentence, under about 90 characters: the caption, and what a narrator would say. |
| `draw` | What the pen draws while it is said, in order: `"title"`, a region id (its title), an item id, a link id, or a note `{ note: "a few words", near: "item", side: "below" \| "above" \| "left" \| "right", arrow: true }`. |
| `mark` | Emphasis on things already drawn: `{ circle: "id" }` (round an item's words, or round its frame), `{ underline: "id" }`, `{ highlight: "id" }`, `{ box: "id" }`, `{ cross: "id" }`. A list of ids marks them as one, side by side: `{ highlight: ["c1", "c2", "c3"] }` is a window over three cells. The guide is surprised by a mark. |
| `feel` | How the guide feels during this beat: `happy` (its default), `excited`, `surprised`, `worried`, `thinking`, `proud`, `sad`. Its brows, eyes and mouth change, and it keeps reacting by itself. |
| `act` | What the guide does in this beat instead of pointing at each new thing: `point`, `wave`, `cheer`, `shrug`, `scratch` (its head, puzzled), `present`, `rest`. |
| `open` | An item with a `figure`: the page opens it as the beat starts and waits until the reader closes it. |

Everything on the board is drawn exactly once, in some beat, and marked only after it is drawn. A beat that draws, marks and opens nothing is refused: say that sentence while something is drawn, or merge it into the beat before.

## The guide, by itself

Without a `feel` or an `act`, the guide still performs: it is drawn as the board begins, comes alive with a bounce and a wave, presents the title while it is written, looks at each new thing and points at items and titles as they are drawn, turns to face what is behind it, is surprised when something is marked, hops along the road to the next idea while the camera flies there, and cheers when the last beat is drawn. It blinks and breathes all along, and keeps doing so when the board is paused; a tap on it on the page gets a wave.

## Words the hand can write

The board's words (titles, labels, notes, an arrow's label, what a character says) are written by a single-stroke font that covers Latin-1: accents, ñ, ¿, ¡, ×, ÷, ¢, €, °. Two more are drawn to match each hand: □, the box a missing number goes in (8 + □ = 13), and the minus sign. A hyphen standing alone between spaces (15 - 7 = 8) is written as a minus, as wide as the equal sign. Typographic marks an agent tends to produce are written the plain way: curly quotes as straight ones, … as ..., → as ->, ≈ as ~, ≤ and ≥ as <= and >=. Anything else the hand cannot write fails the build, naming the item and the character. Captions (a beat's `say`) are shown in the page's own type and take any character.

## What the kit decides

Where every region and item goes (along the road, alternating sides; pictures on their ground line), the road and its turns, the frames and their shadows, every stroke, its wobble and its fill, the pen's order and speed, pauses, each beat's length (at least its sentence's reading time), the camera's shots and flights, the guide's whole performance, and the closing overview. If something reads badly, change the structure: another layout, a larger focal item, a region split in two, fewer items, shorter words.
