// How a CPU cache works: three places data can be, what happens on a hit and
// a miss, and why the cache pays off. Latencies are the usual orders of
// magnitude (about 1 ns for an L1 hit, about 100 ns for main memory).
export default {
  title: "How a CPU cache works",
  mode: "canvas",
  seed: 4,
  regions: [
    {
      id: "places",
      title: "Where data lives",
      items: [
        { id: "cpu", icon: "cpu", label: "CPU", note: "needs data every step" },
        { id: "cache", icon: "layers", label: "Cache", note: "small, close, fast", shape: "box" },
        { id: "ram", icon: "memory-stick", label: "Memory", note: "big, far, slow" },
      ],
    },
    {
      id: "lookup",
      title: "Hit or miss",
      items: [
        { id: "hit", icon: "zap", label: "Hit", note: "already in the cache" },
        { id: "miss", icon: "hourglass", label: "Miss", note: "fetch it from memory" },
      ],
    },
    {
      id: "why",
      title: "Why it pays off",
      items: [
        { id: "again", icon: "repeat", label: "Reuse", note: "the same data, soon again" },
        { id: "next", icon: "grid-3x3", label: "Neighbors", note: "the data next to it" },
        { id: "wins", label: "Most reads hit", shape: "banner" },
      ],
    },
  ],
  links: [
    { id: "near", from: "cpu", to: "cache", label: "1 ns" },
    { id: "far", from: "cache", to: "ram", label: "100 ns", style: "dashed" },
  ],
  beats: [
    { say: "Your CPU runs billions of steps a second, and almost every step needs data.", draw: ["title", "cpu"] },
    { say: "That data lives in main memory, which is big but far away.", draw: ["places", "ram"] },
    { say: "So the CPU keeps a small, fast copy close by: the cache.", draw: ["cache", "near"] },
    { say: "Going past the cache to memory costs about a hundred times longer.", draw: ["far"], mark: [{ circle: "ram" }] },
    { say: "When the data is already in the cache, it is a hit.", draw: ["lookup", "hit"] },
    { say: "When it is not, it is a miss, and the CPU waits for memory.", draw: ["miss"] },
    { say: "Programs reuse what they just touched, and the data right next to it.", draw: ["why", "again", "next"] },
    { say: "So most reads hit, and the cache pays for itself.", draw: ["wins"] },
  ],
};
