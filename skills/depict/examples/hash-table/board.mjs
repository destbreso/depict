// How a hash table works, for someone who just learned arrays: an array finds
// by number, a hash table turns a name (the key) into that number. The hash
// values are illustrative; the arithmetic is exact: 2,615 % 4 = 3 and
// 1,847 % 4 = 3, so Ana and Ben collide in a table of four buckets.
// Collisions are handled by chaining: each bucket keeps a short list.
export default {
  title: "How a hash table works",
  mode: "canvas",
  flow: "grid",
  seed: 7,
  regions: [
    {
      id: "intro",
      title: "By number, by name",
      at: [0, 0],
      items: [
        { id: "byindex", icon: "brackets", label: "arr[3]", note: "one jump" },
        { id: "byname", icon: "search", label: "Find Ana", note: "check every slot" },
      ],
    },
    {
      id: "hashing",
      title: "Key to index",
      at: [1, 0],
      items: [
        { id: "key", icon: "user", label: "Ana", note: "the key" },
        { id: "hash", icon: "hash", label: "Hash function", note: "same key, same number" },
        { id: "idx", label: "2,615 % 4 = 3", note: "the remainder is the index", shape: "box" },
      ],
    },
    {
      id: "buckets",
      title: "Four buckets",
      at: [0, 1],
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
      at: [1, 1],
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
    { id: "k2h", from: "key", to: "hash" },
    { id: "h2i", from: "hash", to: "idx", label: "2,615" },
    { id: "put", from: "b3", to: "ana" },
    { id: "chain", from: "ana", to: "ben", label: "next" },
  ],
  beats: [
    { say: "You know arrays: ask for slot 3 and you get it in one jump.", draw: ["title", "byindex"] },
    { say: "But to find a contact by name, like Ana, you'd check slot after slot.", draw: ["intro", "byname"] },
    { say: "A hash table turns the name, called the key, into a slot number.", draw: ["hashing", "key"] },
    { say: "A hash function turns the key into a number, like 2,615, the same every time.", draw: ["k2h", "hash"] },
    { say: "Divide by the array's size, 4, and the remainder, 3, is the index.", draw: ["h2i", "idx"] },
    { say: "The array's slots are called buckets. This table has four.", draw: ["buckets", "b0", "b1", "b2", "b3"] },
    { say: "Ana's entry, her name and her number, goes into bucket 3.", draw: ["put", "ana"] },
    { say: "Ben's name hashes to 1,847, and 1,847 % 4 is also 3: a collision.", draw: [{ note: "1,847 % 4 = 3", near: "b3", side: "right" }] },
    { say: "One way to handle it: the bucket keeps a list, and Ben goes after Ana.", draw: ["chain", "ben"] },
    { say: "To find Ben, you jump to bucket 3 and compare keys down the list.", mark: [{ circle: "ben" }] },
    { say: "Why is that fast? A good hash spreads keys evenly over the buckets.", draw: ["why", "spread"] },
    { say: "When it gets crowded, the table doubles its buckets and moves every key.", draw: ["grow"] },
    { say: "So each list stays about one key long, however many keys you store.", draw: ["short"], mark: [{ highlight: "spread" }] },
    { say: "So a lookup is one jump and a check or two, for ten keys or ten million.", draw: ["fast"] },
  ],
};
