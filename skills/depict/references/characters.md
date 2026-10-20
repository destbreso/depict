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

## Characters that share a slot

Every board keeps a slot for its guide: how tall it stands, the paper it takes beside each idea, the room over its head for what it wears, and how far its pointing finger reaches. The board is laid out by the slot, and the guide's performance is worked out with it (where it stands, how it hops, what it points at, when it steps aside), so a board is the same board whoever presents it. A character keeps its own slot unless it is drawn to another's: `contract: "stuart"` draws a character to Stuart's slot. Characters of one slot are interchangeable: any of them can present any board made for that slot, cast in as the board plays, with no board built again.

**A character drawn to another's slot** stands exactly as tall (`size` is the slot's, and its module may not say another). Its body is its own: round like Stuart, narrow as a pencil, or any other shape, with its own shoulders, arms, reach and poses. What it does not say it takes from the slot's character (its measures, shoulders, reach, poses, the places for costumes, what a hat tips about, its arms and its hands), and poses it gives join the ones it takes, so it can add a quirk's pose without saying the rest again. `scripts/character.mjs` and `scripts/look.mjs` check that it fits the slot:

- at rest, its drawing and its hands stay within the slot's paper on either side, and it is no taller than the slot;
- a costume reaches no higher on it than on the slot's character, and its own costumes no higher than his highest;
- its hands are no more than a quarter bigger than his.

How far it points beside the slot's own character is reported, not required (`reachShare` in kit/look.mjs): a narrow character with short arms reaches less far (Niki's pencil, 68% as far as Stuart). Where a board has its guide point further than this character's finger reaches, or along a line its own arm would not keep clear, it looks at the thing instead, its hands at rest. So it never points across the drawing or at the wrong thing, whatever its shape.

**One file per character, for every board of its slot.** `node scripts/look.mjs <character> --out <id>.look.json` writes the character's look: its body and face, its arms and hands, each costume it can wear as a part of its own, its outfits, its ways to arrive and leave and its quirks, and what it is made of; 30 to 50 kB. A look does not depend on any board: a board built once and a look made once meet in the page. With `--out <id>.look.js` it is a script that puts the look in `window.depictLooks[<id>]`, for a page opened from the disk, where nothing can be fetched.

**Casting it in.** A page casts a look in its guide's place with `depict.cast(look, dress)`, or a host with a message to the page, `{ depict: "cast", look, outfit }`; `depict.cast(null)` (a message with `look: null`) brings the board's own guide back. The page answers a host with `{ depict: { event: "cast", ok, character, outfit, wear } }`, or with `ok: false` and the `reason` (a look of another slot, or a board built before slots). From that moment the new character does what the board's guide does, its own way:

- it goes where the board's guide goes, points where it points (or looks, as above), feels what it feels, and holds what it holds;
- it arrives and says goodbye its own way: the board's own way when that is one of its own too, otherwise one of its own picked by the board's seed, and an arrival never leaves the ground higher than the board's own did (the opening shot made room for that one);
- in the board's quiet moments, where Stuart pushes his glasses up, it does its own quirks, or rests when it has none;
- it moves as its own material does: a cloud settles slowly, a pencil lands firm;
- it wears its own outfit of the board's (below), or else the costumes the board wears that it can wear, and a costume goes on only where the board kept the room over its head.

**Outfits: the occasion and the part.** An outfit is costumes worn together under a name. The name is what a board and a host ask for, so each character wears its own:

- **Its own outfits, from its drawings**, like Stuart's `winter` (an elf hat and mittens) and `Halloween` (his spider). A board dresses its guide in one by name (`guide: { outfit: "winter" }`), and a board whose list of things is one of its guide's outfits is dressed in that outfit.
- **The parts every character can dress for**, from the shared costumes, unless it has its own outfit of that name: `builder` (a hard hat), `scholar` (a mortarboard), `chef`, `party`, `royal` (a crown), `music` (headphones) and `formal` (a bow tie). A board about building dresses its guide as a builder, and a friend with a builder's outfit of its own (a tool belt it was drawn with) wears that one.
- **The occasions of the year.** A host that asks for `outfit: "today"` dresses a character in its own outfit for the day, when it has one: New Year, Valentine's Day, St. Patrick's Day, the Fourth of July, Halloween, Thanksgiving and Christmas, then the seasons, winter and summer (a holiday before its season; `OCCASIONS` in kit/act.mjs). A host can name any occasion of its own (a school's sports day), and a character with an outfit of that name wears it.

Give a character the outfits its drawings show: whoever drew it can draw it for an occasion too.

**The example** is `examples/friends/`: the hash table board built once and presented by Stuart as a scholar (`friends.html`); the looks of Stuart, of Pip (a rain cloud drawn to his slot with his body and its own face, colors, material, outfits and quirk) and of Niki's pencil (narrow, with its own short arms); and a host page with a picker for who presents it and what for (`index.html`), as a site would have one. `npm run looks` makes the looks again.

## The module, field by field

A character is a module whose default export holds these fields. `scripts/character.mjs` checks every one.

| Field | What it says |
|---|---|
| `contract` | Optional: the slot it is drawn to, another character's id (`"stuart"`), so it can present any board made for that slot; leave it out for a slot of its own. Its `size` is then the slot's, and what it does not say it takes from that character (see Characters that share a slot). |
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
| `outfits` | Optional: costumes worn together, by name, `[{ name, wear }]`: those of each variant picture (Stuart's `winter` and `Halloween`), and any it has for an occasion of the year (`Christmas`, `Fourth of July`) or a part it plays (`builder`, `chef`). A board or a host asks for an outfit by its name, so each character wears its own. Its presentations wear them, one each. |
| `motion` | What it is made of: `squash` and `stretch` as multiples of the kit's own, `freq` and `damp` (how fast it wobbles after a landing and how fast that dies), `jelly` (how much its top sways over its feet, 0 for a stiff body), `breath` and `breathPeriod`. Leave it empty for the marker's stiff barrel. |
| `personality` | `traits` (a line), `intros` and `outros` (its own ways of arriving and leaving; the seed picks among them), `quirks` (its signature gestures: poses of its own it makes in a quiet moment, like Stuart's `glasses`; each needs its pose in `poses`). |

The intros a character can choose from are `wave`, `hop`, `spin`, `bow`, `tip` (it needs a cap), `jump`, and for a soft body `bounce` (it squashes, springs up, lands and bounces once more) and `jiggle` (it shakes itself awake like a jelly); the outros, `wave`, `bow`, `cheer`, `salute`, `tip`, `spin` and `bounce`.

## How every character points, stands and moves, and stays in the picture

Whatever its body, the guide points at a thing only when the way is clear: the straight line from its shoulder to it crosses nothing else on the board, and, when the thing is out of its reach, nothing else lies just ahead of its finger before it (the eye follows a finger to the first thing it meets) and its finger does not stop in the air beside another thing. A thing and its own note never block each other, and across the cells of a thing's own table the hand points at the table. When the way is not clear, or the thing is out of reach and a place nearer has a clear way, it steps (one small hop) to free paper beside or under the thing, inside the shot and on the board; at most one step a sentence, never two within two seconds. Where no place serves, it only looks, its hands at rest. A thing not drawn yet never stops its hand.

Nothing it does hides the drawing. A step belongs to its sentence: it leaves once the sentence has begun, so the last picture is seen whole with the guide still beside it, and the sentence waits the moment the step takes, so the pen begins as it lands. A step never crosses what is drawn, for a body that covers a thing even in passing hides it while the camera holds still: it hops over what is low enough, goes round in two hops by free paper, or does not go. It never stands on a thing, against one, or with its feet on top of one (it would seem to stand on it, as on a shelf). Its place in each idea is the free paper from which its hand reaches the most of the idea along clear lines, so it needs to step less, and never one that makes the idea's shot so wide its words get small or its paper empty. The audit warns where it stands on a thing all the same (the `stand` rule).

It is whole in the picture whenever the camera holds still: it lands from a hop between ideas as the camera arrives, with as many hops as the camera's flight has time for and never higher than the shot it lands in has room for, and it steps only inside the shot and on the board, never higher than the shot has room for over either end of the step. The audit fails a board where it is not (the `guide` rule).

A character's `size` (1 for the marker) scales it beside the others: a character as wide as it is tall stands a little shorter (Stuart: 0.76), so it takes about the paper the marker takes and the camera does not pull back to fit it.
