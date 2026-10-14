# The board script

A board is a JavaScript module whose default export is the script. It says what the idea is made of and the order to tell it in; it never says where anything goes. `node scripts/build.mjs board.mjs` validates it and reports every problem at once, each naming the thing it is about and what to do.

## The board

| Field | Default | What it does |
|---|---|---|
| `title` | required | The board's title: the largest words on the board, written as the first region's top line. A few words naming the concept. |
| `mode` | `"canvas"` | `"canvas"`: one board the camera tours region by region, ending on the whole picture. `"slides"`: each region its own sheet, all one size; the camera pans from sheet to sheet and ends on the deck laid out. |
| `flow` | `"path"` | Where regions go on a canvas: `"path"` wraps them into the rows that bring the board closest to 16:9, turning back on every other row so each region is next to the one before; `"row"`, `"column"`; `"grid"` with a region `at: [column, row]`. |
| `hand` | `"print"` | The lettering: `"print"`, a clear handwritten print (EMS Tech, after Architects Daughter), or `"marker"`, a looser hand (EMS Casual Hand). Both cover Latin-1: accents, ñ, ¿, ¡, €, ×, ÷. |
| `accent` | `"#c43f0a"` | The one accent color: title underlines, marks, the live part's play mark. |
| `seed` | `1` | The wobble of every line. The same seed draws the same board; change it to redraw by hand. |
| `lang` | `"en"` | The page's language. |
| `regions` | required | The ideas, in the order you tell them. |
| `links` | `[]` | Arrows between items. |
| `beats` | required | The explanation, one sentence each. |

## Regions

A region is one idea: a part, a stage, a reason. On a canvas it is one shot of the tour; in slides it is one sheet.

| Field | What it does |
|---|---|
| `id` | Lowercase letters, digits and dashes. A beat draws the region's title by its id. |
| `title` | Two to four words, written underlined in the accent above the region's items. Optional, but a tour reads better with them. |
| `layout` | How its items sit: `"row"` (default), `"column"`, `"grid"` (each item gives `at: [column, row]`; the default when any item has `at`), `"cells"` (adjacent cells of one size, edge to edge: an array, a row of a table) or `"stack"` (the same, top to bottom: a stack, a list of slots). Cells hold a label inside and a note under them (beside them in a stack): an index, a value. They take no icon. |
| `at` | `[column, row]` when the board's `flow` is `"grid"`: where the region sits among the others. Every region needs one, and no two may share it. |
| `items` | One to four things, at most six (a `cells` or `stack` region may hold more: they are one thing, drawn as a row of slots). |

## Items

| Field | What it does |
|---|---|
| `id` | As for regions; ids are unique across the board. |
| `icon` | A Lucide icon name (lucide.dev): `cpu`, `database`, `users`, `lightbulb`, `shield-check`, `coins`. A wrong name fails the build and lists the closest ones. |
| `label` | Two or three words, the thing's name. An item needs an icon or a label. |
| `note` | A short phrase under the label, in grey: a number, a property, a hint. |
| `shape` | A frame drawn round the item after it: `"none"` (default), `"box"`, `"ellipse"`, `"circle"`, `"cloud"`, `"bubble"`, `"banner"`. Frame what matters, not everything. A `banner` with a label and no icon is a take-away. |
| `at` | `[column, row]` in a grid region. |
| `figure` | A live part: the path (relative to the board file) or URL of a Dissect page. The item gets a play mark; tapping it opens the running figure. See live.md. |

The kit draws an item in this order: icon, label, note, then its frame round them.

## Links

| Field | What it does |
|---|---|
| `id` | A beat draws the link by its id. |
| `from`, `to` | Item ids. The arrow runs between the items' edges and points at `to`. |
| `label` | One to three words beside the arrow (a latency, a verb, a condition). |
| `style` | `"solid"` (leads to), `"dashed"` (weak, optional, slow), `"double"` (both ways). |
| `bend` | How much the arrow curves, as a share of its length: positive to the left of travel. The kit picks one when it is left out. |

A link is drawn after both its items; in the same beat it may come first, pointing at what is about to appear.

## Beats

| Field | What it does |
|---|---|
| `say` | One sentence, under about 90 characters: the caption, and what a narrator would say. |
| `draw` | What the pen draws while it is said, in order: `"title"`, a region id (its title), an item id, a link id, or a note `{ note: "a few words", near: "item", side: "below" \| "above" \| "left" \| "right", arrow: true }`. |
| `mark` | Emphasis on things already drawn: `{ circle: "id" }` (round an item's words), `{ underline: "id" }`, `{ highlight: "id" }`, `{ box: "id" }`, `{ cross: "id" }`. |
| `open` | An item with a `figure`: the page opens it as the beat starts and waits until the reader closes it. |

Everything on the board is drawn exactly once, in some beat, and marked only after it is drawn. A beat that draws, marks and opens nothing is refused: say that sentence while something is drawn, or merge it into the beat before.

A link between items of two regions makes its beat's shot cover both regions, so everything drawn in that beat is shot smaller. Draw such a link in a beat of its own, after both its ends (a short label then reads fine), or keep items that link inside one region.

## Words the hand can write

The board's words (titles, labels, notes, an arrow's label) are written by a single-stroke font that covers Latin-1: accents, ñ, ¿, ¡, ×, ÷, €, °. Typographic marks an agent tends to produce are written the plain way: curly quotes as straight ones, … as ..., → as ->, ≈ as ~, ≤ and ≥ as <= and >=. Anything else the hand cannot write fails the build, naming the item and the character. Captions (a beat's `say`) are shown in the page's own type and take any character.

## What the kit decides

Item and region layout, frames, every stroke and its wobble, the pen's order and speed, pauses, each beat's length (at least its sentence's reading time), camera shots and flights, and the closing overview. If something reads badly, change the structure: another layout, a region split in two, fewer items, shorter words.
