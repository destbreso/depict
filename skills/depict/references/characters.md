# Characters

Every board is presented by a guide, and the guide is a character. Two ship with the skill; any drawing can become a third.

| Character | `guide.character` | Who it is |
|---|---|---|
| The marker | `"marker"` (the default) | A felt marker with big eyes, white gloves, black shoes and its cap in the board's accent: depict's own guide, at home on any board. A stiff barrel: it hops and lands with a firm squash, and it can tip its cap. |
| Stuart | `"stuart"` | A fuzzy pink brain with round glasses, rosy cheeks, a little w of a mouth, short salmon arms and legs and big black shoes. Soft: he squashes deep when he lands, bounces, and wobbles on like a jelly; he pushes his glasses up before he explains. Created by Niki, age 7, who drew him in three pictures. A boy: he, him, his, and he wears what a boy would (the shared costumes without the hair bow). His own costumes, from her drawings, worn as two outfits: winter, `elf-hat` (green, with a white pompom and a striped band) and `mittens` (green); and Halloween, `spider` (sitting on his head). |

`guide: { character: "stuart", wear: ["elf-hat", "mittens"] }` puts Stuart on a board, dressed. Each character's presentation, its model sheet and three boards it presents, is in `examples/characters/<id>/` (`npm run characters` remakes them). A character keeps its own list of what it can wear, its skins and its ways of arriving and leaving; a script that asks for something its character does not have is refused with the list it does have.

## What a character is

A character is three things, and each one is written down in its module.

1. **Its look.** A body; a face whose eyes are components of their own (so they blink), with pupils that follow the pen and brows and a mouth for each feeling; rubber-hose arms from its shoulders and hands in three shapes (open, a fist, pointing); legs, shoes and a shadow on the floor. It is drawn by the board's own pen, stroke by stroke, the first time it appears.
2. **Its body: what it is made of, so how it moves.** The principles of character animation (squash and stretch, follow-through, secondary action: [Thomas and Johnston, The Illusion of Life, 1981](https://archive.org/details/illusionoflifedi00thom)) are applied in proportion to its material. A stiff body squashes a little and is still at once. A soft one squashes deep, stretches tall in the air, bounces, and its top keeps swaying over its feet after it lands or sets off, like a jelly on a plate.
3. **Its personality: what it does on its own.** How it likes to arrive and leave (the seed picks among its own when a board does not say), its quirks (Stuart pushes his glasses up in a quiet moment before he explains), and a line of traits that says who it is.

## Make a character from a drawing

This is a tool of the skill. Use it when someone gives you a drawing of a character (a photo of a child's drawing, a scan, a sketch: one picture, or several pictures of the same character) and wants it as the guide of their boards. They might say "turn my daughter's drawing into the guide", "make this a character for the slides", "use this drawing as the presenter", or `/depict make a character from these drawings: niki-1.jpg niki-2.jpg`.

**What to ask for, if it is not given:** the drawing or drawings (image files, or images in the conversation); a name for it; who drew it and whether to credit them; and anything the pictures do not say: which things are part of it and which are costumes, what it is made of (soft, stiff, bouncy, floaty) and what it is like. One picture is enough; several pictures of the same character tell you what stays (the character) and what changes (its costumes, expressions and poses).

**Then:**

1. **Study the drawings side by side.** Write down what is the same in every picture: that is the character. Measure its proportions against its whole height: how much of it is the body, how long its legs and arms are, how big its eyes or glasses, how wide it is. Note its colors and its signature details (for Stuart: the fuzzy outline, round glasses far apart on a long bridge, big pupils with glints, rosy cheeks, the little w of a mouth). What changes between pictures is a costume (a hat, mittens, a spider on his head), an expression (an open mouth) or a pose (arms out); the costumes of one picture, worn together, are an outfit.
2. **Decide what it is made of and who it is,** from the drawing and from what the person says. A brain or a jelly is soft; a robot or a box is stiff; a ball is bouncy; a cloud or a ghost floats. Its face and its look suggest its personality (glasses: curious and a little nerdy). Choose its intros and outros to match: a soft body bounces and jiggles; a stiff one hops, bows and salutes.
3. **Write its module** as the shipped ones are written (`kit/characters/stuart.mjs` is the worked example from a drawing; `kit/characters/marker.mjs` is the default). Draw it in its own frame: `u` across and `v` down from the top of its head, its feet at `v = 0.99`, both in units of its height, so its proportions are the drawing's own. Give its body, face and limbs as the drawing has them, its poses for its own body (short arms reach less), its places for the shared costumes, its own costumes from the drawings (and its outfits, one per variant picture), its material and its personality. The fields are listed below.
4. **Respect the original; improve only what a guide needs.** Keep its proportions, its colors, its signature details and its spirit, exactly. Improve the line (even weight, closed shapes, symmetry where the drawing was unsure), give it every feeling a guide shows (if the drawing has no brows, add small ones only for the feelings that need them: worried, surprised, sad, quizzical; the happy face stays as drawn), make its hands read at a small size, and keep its proportions the same in every pose. Never add what it does not have, and never "correct" it toward a style of your own.
5. **Check it before any board uses it:** `node scripts/character.mjs path/to/character.mjs --out <folder>`. It refuses a module with a missing or wrong field (every problem at once), then writes its model sheet (`<id>-sheet.png`: every feeling, every pose, its costumes) and three test boards it presents (`<id>-test-1.html` to `-3.html`, each in other clothes, arriving and leaving its own ways). Put the sheet beside the drawings and compare part by part; play the tests and watch it land, point, step aside, hop and feel. Then show both to the person, and to whoever drew it, and change what they ask for. Only then put it on their boards.
6. **Use it.** A board can bring its own character: `import mine from "./characters/mine.mjs"` and `guide: { character: mine }`. To ship it with the skill instead, put its module in `kit/characters/` and add it to `kit/characters/index.mjs`; then `guide: { character: "<id>" }` works on any board.
7. **Credit the artist** when they want it: a `credit: { by, age, note }` field, and a line at the top of its module. The sheet's title carries the note.

## The module, field by field

A character is a module whose default export holds these fields. `scripts/character.mjs` checks every one.

| Field | What it says |
|---|---|
| `id`, `name` | A short lowercase id (`"stuart"`) and how a sentence names it (`"Stuart"`, or `"the marker"`). |
| `about`, `credit` | One line on who it is; who drew it (`{ by, age, note }`), if they want the credit. |
| `size` | Optional: its height beside the marker's (1). A wide character stands a little shorter, so the shots keep their size. |
| `measures` | The paper it takes, in units of its height, from the point between its feet: `back` and `front` at rest (arms and hands included), and `reach`, to the tip of a pointing finger. The kit keeps that paper free for it beside each idea. |
| `shoulders` | `{ front, back }` as `[u, v]`: where its arms come out of its body. |
| `arm` | `{ width }` in units of the outline's nib; a limb with a color of its own adds `fill` (a color) and `fillWidth` (its arms are then an ink outline round that color). |
| `reach`, `tip` | How far its arm reaches from its shoulder, and how long its pointing finger is, in units of its height (the marker: 0.36 and 0.13; Stuart's short arms: 0.21 and 0.1). |
| `capPivot` | `[u, v]`: what a hat tips about (the marker's cap rim; the top of Stuart's head). |
| `poses` | Where its hands go, for its own body: `rest`, `present`, `wave`, `cheer`, `shrug`, `scratch`, `salute`, `tip` and `point`, each `{ front, back }` with `hand` and `bow` (the hose's curve) as `[u, v]` and a hand shape (`open`, `fist`, `point`); and any pose its quirks need (Stuart's `glasses`). |
| `hands(wear, colors)` | Its hands for what it wears: `{ size, shapes: { open, fist, point }, cuffs, knuckle, fill }`, the shapes as outlines in units of the hand's size, `fill` a color or `"paper"` (white gloves). Stuart's become green mittens when he wears `mittens`. |
| `draw(k)` | Its body, face, legs and shadow, drawn with the kit's pen in the order a hand would draw them; it returns `{ eyes }`, the centers of its eyes. `k` gives the pen (`p`), its height (`h`), `P(u, v)` (its frame to the board's), the outline's nib `W` and a `fine` one, `add(part, role, lines, width, color, layer, opacity)`, `shape`, `line`, `disc`, `curve`, `rrect`, `closed`, `ink`, the colors, and `arms()`, called at the point in the pen's order where its arms and hands are drawn. Parts the player moves: `body`, `cap` (tips), `eye0`/`eye1` (blink), `pupil0`/`pupil1` (look), `squint0`/`squint1`, `brows:<name>` and `mouth:<name>` for the feelings (`up`, `high`, `worried`, `quizzical`, `sad`; `smile`, `grin`, `wow`, `wavy`, `side`, `frown`), and `floor`. |
| `anchors` | Where each shared costume goes on it, as a scale and a shift of the place it was made for on the marker: `hat`, `neck` (a bow tie, a scarf), `chest` (a star), `hair` (a bow), `ear` (a pencil): `{ s, du, dv }`. |
| `wear`, `skins` | The shared costumes it can wear (`glasses` only if it has none of its own; a scarf only if it has a neck) and its skins (`plain` at least). |
| `costumes` | Its own costumes, from its drawings: `{ draw(k), hat, top }`, `hat: true` for a hat or anything else that sits on its head (one at a time), `top` how far above its head it reaches. |
| `outfits` | Optional: the costumes of each variant picture, worn together, `[{ name, wear }]` (Stuart's winter and Halloween). Its presentations wear them, one each. |
| `motion` | What it is made of: `squash` and `stretch` as multiples of the kit's own, `freq` and `damp` (how fast it wobbles after a landing and how fast that dies), `jelly` (how much its top sways over its feet, 0 for a stiff body), `breath` and `breathPeriod`. Leave it empty for the marker's stiff barrel. |
| `personality` | `traits` (a line), `intros` and `outros` (its own ways of arriving and leaving; the seed picks among them), `quirks` (what it does on its own: `glasses`). |

The intros a character can choose from are `wave`, `hop`, `spin`, `bow`, `tip` (it needs a cap), `jump`, and for a soft body `bounce` (it squashes, springs up, lands and bounces once more) and `jiggle` (it shakes itself awake like a jelly); the outros, `wave`, `bow`, `cheer`, `salute`, `tip`, `spin` and `bounce`.

## How every character points, and stays in the picture

Whatever its body, the guide points at a thing only when the way is clear: the straight line from its shoulder to it crosses nothing else on the board, and, when the thing is out of its reach, nothing else lies just ahead of its finger before it (the eye follows a finger to the first thing it meets) and its finger does not stop in the air beside another thing. A thing and its own note never block each other, and across the cells of a thing's own table the hand points at the table. When the way is not clear, or the thing is out of reach and a place nearer has a clear way, it steps (one small hop) to free paper beside or under the thing, inside the shot and on the board; at most one step a sentence, never two within two seconds. Where no place serves, it only looks, its hands at rest. A thing not drawn yet never stops its hand.

It is whole in the picture whenever the camera holds still: it lands from a hop between ideas as the camera arrives, with as many hops as the camera's flight has time for and never higher than the shot it lands in has room for, and it steps only inside the shot and on the board. The audit fails a board where it is not (the `guide` rule).

A character's `size` (1 for the marker) scales it beside the others: a character as wide as it is tall stands a little shorter (Stuart: 0.76), so it takes about the paper the marker takes and the camera does not pull back to fit it.
