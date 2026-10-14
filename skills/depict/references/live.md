# Live parts

A board explains an idea; a Dissect figure runs a process. A live part joins them: an item on the board that opens into a running Dissect figure, where the reader can switch parts off, turn dials and watch what happens. The board says what the parts are and why they matter; the figure lets the reader try it.

[Dissect](https://github.com/destbreso/dissect) is the sibling skill that builds those figures: interactive, simulated process pages, one standalone HTML file each.

## Making one

1. Build the Dissect figure first (with the dissect skill), in its light theme so it sits well next to the board: a standalone page such as `ddos-light.html`.
2. Put the page next to the board, or anywhere the board's page can reach it, and name it on the item:

   ```js
   { id: "try", icon: "activity", label: "Try it", note: "switch each layer off", shape: "bubble", figure: "figure-ddos.html" }
   ```

   The path is relative to the board file; the build checks the file exists and links it relative to the page it writes. A URL works too.
3. Optionally open it from a beat, as the explanation reaches it:

   ```js
   { say: "Open the figure, switch each layer off, and watch what breaks.", draw: ["try"], open: "try" }
   ```

## What the reader sees

- The item is drawn like any other, with a small play mark in the accent at its top right.
- Tapping the item (while the board is paused, or once the explanation has ended) opens the figure: it grows out of the item's place on the board to fill the frame, running. "Back to the board" (or Escape) shrinks it back.
- A beat with `open` opens it about a second into the beat and pauses the explanation; closing the figure resumes it.
- The video shows the item and its play mark; a running figure is not something a frame-by-frame capture can hold, so the video invites the viewer to the page instead.

## When to use one

When the idea has a process inside it that behaves (queues fill, layers stop part of a load, a cache hits or misses) and seeing it run says more than a sentence: the board explains the concept, the figure is the experiment. One live part per board is usually right, near the end, as the thing to try.
