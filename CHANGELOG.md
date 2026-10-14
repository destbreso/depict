# Changelog

## 0.1.0

- A board script (regions, items, links, beats) becomes a standalone page: a hand-drawn board that builds stroke by stroke while each sentence shows as its caption, with a marker at the tip of every stroke.
- Handwriting written letter by letter in pen order, from two single-stroke fonts (print and marker, Latin-1), with a seeded tilt, size and baseline per letter.
- Shapes drawn the way a hand draws them (Rough.js's model, rewritten to return polylines in pen order), and the 2,154 Lucide icons drawn in the same hand.
- A computed camera: each region a shot, van Wijk and Nuij flights between shots, a closing overview of the whole board; regions wrap so the overview fits 16:9.
- Two modes from one script: a canvas tour, or slides (one sheet per region, all one size, ending on the deck laid out).
- The board stays live when the explanation ends: zoom it, drag it, tap a part to go back to its sentence.
- Live parts: an item with a Dissect figure opens into it, running, grown from its place on the board.
- An audit (readable text in every shot, overlaps, captions, labels, pace, the opening, the closing map), a browser check that pictures every beat, and a video export ready for social sites.
- Examples: how a CPU cache works (canvas), compound interest (slides), how a site survives a DDoS attack (with a live Dissect figure).
