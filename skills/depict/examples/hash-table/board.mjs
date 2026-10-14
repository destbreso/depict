// How a hash table works, for someone who just learned arrays: an array finds
// by number, a hash table turns a name (the key) into that number. The hash
// values are illustrative; the arithmetic is exact: 2,615 % 4 = 3 and
// 1,847 % 4 = 3, so Ana and Ben collide in a table of four buckets.
// Collisions are handled by chaining: each bucket keeps a short list.
export default {
  title: "How a hash table works",
  mode: "canvas",
  seed: 7,
  regions: [
    {
      id: "intro",
      title: "By number, by name",
      items: [
        {
          id: "byindex",
          // an array, and one jump straight to slot 3
          sketch: [
            "M4 48 H96 V72 H4 Z",
            "M22.4 48 V72 M40.8 48 V72 M59.2 48 V72 M77.6 48 V72",
            { d: "M59.2 48 H77.6 V72 H59.2 Z", fill: "yellow" },
            "M13 42 C22 12 58 10 68 40",
            "M68 40 L60 33 M68 40 L71 30",
          ],
          size: "large",
          label: "arr[3]",
          note: "one jump",
        },
        { id: "byname", character: { pose: "think", face: "worried", hair: "curly", shirt: "green" }, says: "Ana...?", label: "Find Ana", note: "check every slot" },
      ],
    },
    {
      id: "hashing",
      title: "Key to index",
      items: [
        { id: "key", icon: "tag", label: "Ana", note: "the key" },
        { id: "hash", icon: "hash", size: "large", label: "Hash function", note: "same key, same number" },
        { id: "idx", label: "2,615 % 4 = 3", note: "the remainder is the index", shape: "box" },
      ],
    },
    {
      id: "buckets",
      title: "Four buckets",
      layout: "cells",
      items: [
        { id: "b0", label: "0" },
        { id: "b1", label: "1" },
        { id: "b2", label: "2" },
        { id: "b3", label: "3" },
        { id: "ana", label: "Ana", note: "555-0134", shape: "box", under: "b3" },
        { id: "ben", label: "Ben", note: "555-0178", shape: "box", under: "b3" },
      ],
    },
    {
      id: "why",
      title: "Why it's fast",
      layout: "grid",
      items: [
        { id: "spread", icon: "shuffle", label: "Even spread", note: "a good hash scatters keys", at: [0, 0] },
        { id: "grow", icon: "expand", label: "Grows", note: "doubles its buckets when crowded", at: [1, 0] },
        { id: "short", icon: "list", label: "Short lists", note: "about one key each", at: [0, 1] },
        { id: "fast", label: "Fast on average", shape: "banner", at: [1, 1] },
      ],
    },
  ],
  links: [
    { id: "k2h", from: "key", to: "hash", style: "bold" },
    { id: "h2i", from: "hash", to: "idx", label: "2,615" },
    { id: "put", from: "b3", to: "ana" },
    { id: "chain", from: "ana", to: "ben", label: "next" },
  ],
  beats: [
    { say: "You know arrays: ask for slot 3 and you get it in one jump.", draw: ["title", "byindex"] },
    { say: "But to find a contact by name, like Ana, you'd check slot after slot.", draw: ["intro", "byname"], feel: "worried" },
    { say: "A hash table turns the name, called the key, into a slot number.", draw: ["hashing", "key"] },
    { say: "A hash function turns the key into a number, like 2,615, the same every time.", draw: ["k2h", "hash"] },
    { say: "Divide by the array's size, 4, and the remainder, 3, is the index.", draw: ["h2i", "idx"] },
    { say: "The array's slots are called buckets. This table has four.", draw: ["buckets", "b0", "b1", "b2", "b3"] },
    { say: "Index 3 means bucket 3: one jump, as with any array.", mark: [{ highlight: "b3" }] },
    { say: "Ana's entry, her name and her number, goes into bucket 3.", draw: ["put", "ana"] },
    { say: "Ben's name hashes to 1,847, and 1,847 % 4 is also 3: a collision.", draw: [{ note: "1,847 % 4 = 3", near: "b3", side: "right" }], feel: "surprised" },
    { say: "One way to handle it: the bucket keeps a list, and Ben goes after Ana.", draw: ["chain", "ben"] },
    { say: "To find Ben, you jump to bucket 3 and compare keys down the list.", mark: [{ circle: "ben" }] },
    { say: "Why is that fast? A good hash spreads keys evenly over the buckets.", draw: ["why", "spread"], act: "scratch", feel: "thinking" },
    { say: "When it gets crowded, the table doubles its buckets and moves every key.", draw: ["grow"] },
    { say: "So each list stays about one key long, however many keys you store.", draw: ["short"], mark: [{ highlight: "spread" }] },
    { say: "So a lookup is one jump and a check or two, for ten keys or ten million.", draw: ["fast"] },
  ],
};
