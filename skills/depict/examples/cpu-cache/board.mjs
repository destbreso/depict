// How a CPU cache works: three places data can be, what happens on a hit and
// a miss, and why the cache pays off. Latencies are the usual orders of
// magnitude (about 1 ns for an L1 hit, about 100 ns for main memory). Reuse
// is temporal locality; the neighbors are spatial locality: a miss brings a
// whole cache line, the data next to what was asked for.
export default {
  title: "How a CPU cache works",
  mode: "canvas",
  seed: 4,
  guide: { wear: ["glasses", "bow-tie"], hold: "pointer" }, // a lecture on hardware
  regions: [
    {
      id: "places",
      title: "Where data lives",
      items: [
        {
          id: "cpu",
          // a chip: its package, the die, and the pins on all four sides
          sketch: [
            { d: "M24 16 H76 Q84 16 84 24 V76 Q84 84 76 84 H24 Q16 84 16 76 V24 Q16 16 24 16 Z", fill: "green" },
            { d: "M33 33 H67 V67 H33 Z", fill: "grey" },
            "M28 16 V6 M39 16 V6 M50 16 V6 M61 16 V6 M72 16 V6",
            "M28 84 V94 M39 84 V94 M50 84 V94 M61 84 V94 M72 84 V94",
            "M16 28 H6 M16 39 H6 M16 50 H6 M16 61 H6 M16 72 H6",
            "M84 28 H94 M84 39 H94 M84 50 H94 M84 61 H94 M84 72 H94",
          ],
          size: "large",
          label: "CPU",
          note: "needs data every step",
        },
        {
          id: "cache",
          // a small block of cache lines, and a bolt: fast
          sketch: [
            { d: "M22 40 H78 V88 H22 Z", fill: "yellow" },
            "M22 52 H78 M22 64 H78 M22 76 H78",
            { d: "M58 2 L40 22 H52 L44 36 L64 14 H52 Z", fill: "accent" },
          ],
          label: "Cache",
          note: "small, close, fast",
        },
        {
          id: "ram",
          // two memory sticks, chips on a board, each with its notch
          sketch: [
            { d: "M6 24 H94 V46 H6 Z", fill: "green" },
            { d: "M12 29 H25 V40 H12 Z", fill: "ink" },
            { d: "M30 29 H43 V40 H30 Z", fill: "ink" },
            { d: "M57 29 H70 V40 H57 Z", fill: "ink" },
            { d: "M75 29 H88 V40 H75 Z", fill: "ink" },
            "M47 46 V42 H53 V46",
            { d: "M6 58 H94 V80 H6 Z", fill: "green" },
            { d: "M12 63 H25 V74 H12 Z", fill: "ink" },
            { d: "M30 63 H43 V74 H30 Z", fill: "ink" },
            { d: "M57 63 H70 V74 H57 Z", fill: "ink" },
            { d: "M75 63 H88 V74 H75 Z", fill: "ink" },
            "M47 80 V76 H53 V80",
          ],
          size: "large",
          label: "Memory",
          note: "big, far, slow",
        },
      ],
    },
    {
      id: "lookup",
      title: "Hit or miss",
      items: [
        {
          id: "hit",
          // the cache's lines, the one asked for found, and a check
          sketch: [
            { d: "M16 30 H58 V80 H16 Z", fill: "yellow" },
            "M16 42.5 H58 M16 55 H58 M16 67.5 H58",
            { d: "M16 42.5 H58 V55 H16 Z", fill: "accent" },
            "M64 52 L74 64 L94 34",
          ],
          size: "large",
          label: "Hit",
          note: "in the cache: 1 ns",
        },
        {
          id: "miss",
          // an hourglass, the sand running
          sketch: [
            "M28 8 H72 M28 92 H72",
            "M34 8 C34 31 47 42 47 50 C47 58 34 69 34 92",
            "M66 8 C66 31 53 42 53 50 C53 58 66 69 66 92",
            { d: "M38 17 H62 C61 29 54 37 50 43 C46 37 39 29 38 17 Z", fill: "sand" },
            "M50 45 V82",
            { d: "M37 90 C40 77 60 77 63 90 Z", fill: "sand" },
          ],
          size: "large",
          label: "Miss",
          note: "from memory: 100 ns",
        },
      ],
    },
    {
      id: "why",
      title: "Why it pays off",
      items: [
        {
          id: "again",
          // a wide arrow going round: the same data, used again
          sketch: [{ d: "M68 20.8 A36 36 0 1 1 18.8 34 L11.9 30 L31.5 28.4 L36.1 44 L29.2 40 A24 24 0 1 0 62 31.2 Z", fill: "yellow" }],
          size: "large",
          label: "Reuse",
          note: "the same data, soon again",
        },
        {
          id: "next",
          // a row of memory: the byte asked for, its neighbors, and the cache line that brings them all
          sketch: [
            "M6 36 H94 V62 H6 Z",
            "M24 36 V62 M41 36 V62 M59 36 V62 M76 36 V62",
            { d: "M24 36 H41 V62 H24 Z", fill: "yellow" },
            { d: "M41 36 H59 V62 H41 Z", fill: "accent" },
            { d: "M59 36 H76 V62 H59 Z", fill: "yellow" },
            "M24 70 V77 H76 V70",
          ],
          size: "large",
          label: "Neighbors",
          note: "they come along",
        },
        { id: "wins", label: "Most reads hit", shape: "banner" },
      ],
    },
  ],
  links: [
    { id: "near", from: "cpu", to: "cache", label: "1 ns", style: "bold" },
    { id: "far", from: "cache", to: "ram", label: "100 ns", style: "dashed", far: true },
  ],
  beats: [
    { say: "Your CPU runs billions of steps a second, and almost every step needs data.", draw: ["title", "cpu"] },
    { say: "That data lives in main memory, which is big but far away.", draw: ["places", "ram"] },
    { say: "So the CPU keeps a small, fast copy close by: the cache.", draw: ["cache", "near"] },
    { say: "Going past the cache to memory takes about a hundred times longer.", draw: ["far"], mark: [{ circle: "ram" }] },
    { say: "When the data is already in the cache, it's a hit: about a nanosecond.", draw: ["lookup", "hit"] },
    { say: "When it's not, it's a miss, and the CPU waits for memory.", draw: ["miss"] },
    { say: "Programs reuse what they just touched, again and again.", draw: ["why", "again"] },
    { say: "And they use what sits next to it, so a miss brings the neighbors too.", draw: ["next"] },
    { say: "So most reads hit, and the cache pays for itself.", draw: ["wins"] },
  ],
};
