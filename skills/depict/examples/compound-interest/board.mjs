// Compound interest, as slides: simple interest, compound interest, how far
// apart they end up, and the rule of 72. $1,000 at 10% a year:
// 1000 x 1.1^10 = 2,593.74 and 1000 x 1.1^30 = 17,449.40 (compound);
// 1000 + 10 x 100 = 2,000 and 1000 + 30 x 100 = 4,000 (simple).
// The rule of 72 gives 72 / 10 = 7.2 years to double; exactly, ln 2 / ln 1.1 = 7.27.
// The charts are drawn to scale: the growth bars are 1.1^n for years 1 to 8;
// the gap chart runs over 30 years up to $18,000, the compound curve through
// its values every five years (1,000, 1,611, 2,594, 4,177, 6,727, 10,835, 17,449).
export default {
  title: "Compound interest",
  mode: "slides",
  seed: 21,
  guide: { wear: ["bow-tie"], hold: "coin", skin: "sand" }, // money
  regions: [
    {
      id: "simple",
      title: "Simple interest",
      items: [
        {
          id: "money",
          // a stack of coins
          sketch: [
            { d: "M26 78 H74 V90 H26 Z", fill: "sand" },
            { d: "M30 66 H78 V78 H30 Z", fill: "sand" },
            { d: "M24 54 H72 V66 H24 Z", fill: "sand" },
            { d: "M29 42 H77 V54 H29 Z", fill: "sand" },
            "M36 48 H44 M58 48 H66",
          ],
          size: "large",
          label: "$1,000",
          note: "at 10% a year",
        },
        { id: "flat", icon: "circle-plus", label: "+$100", note: "every year, on the $1,000" },
        { id: "ten", icon: "calendar", label: "$2,000", note: "after 10 years" },
      ],
    },
    {
      id: "compound",
      title: "Compound interest",
      // the chart above, the first three years under it
      layout: "grid",
      items: [
        {
          id: "growth",
          // eight years, each bar 10% taller than the one before
          sketch: [
            "M4 88 H96",
            { d: "M7 88 V49 H15 V88 Z", fill: "green" },
            { d: "M18 88 V45 H26 V88 Z", fill: "green" },
            { d: "M29 88 V41 H37 V88 Z", fill: "green" },
            { d: "M40 88 V36 H48 V88 Z", fill: "green" },
            { d: "M51 88 V31 H59 V88 Z", fill: "green" },
            { d: "M62 88 V25 H70 V88 Z", fill: "green" },
            { d: "M73 88 V19 H81 V88 Z", fill: "green" },
            { d: "M84 88 V12 H92 V88 Z", fill: "green" },
          ],
          size: "large",
          label: "10% of what's there",
          at: [1, 0],
        },
        { id: "y1", label: "$1,100", note: "after one year", at: [0, 1] },
        { id: "y2", label: "$1,210", note: "10% of $1,100 is $110", at: [1, 1] },
        { id: "y3", label: "$1,331", note: "10% of $1,210 is $121", at: [2, 1] },
      ],
    },
    {
      id: "gap",
      title: "The gap grows",
      // the chart beside the two numbers it shows, the take-away under them
      layout: "grid",
      items: [
        {
          id: "chart",
          // thirty years: simple interest a straight line, compound a curve, the gap between them colored in
          sketch: [
            "M12 4 V86 H96",
            { d: "M12 81.7 L25.3 79 L38.7 74.8 L52 67.9 L65.3 56.8 L78.7 39 L92 10.4 L92 68.7 Z", fill: "yellow" },
            "M12 81.7 L92 68.7",
            "M12 81.7 L25.3 79 L38.7 74.8 L52 67.9 L65.3 56.8 L78.7 39 L92 10.4",
          ],
          size: "large",
          label: "A line and a curve",
          at: [0, 0],
        },
        { id: "g10", label: "10 years", note: "$2,594 against $2,000", at: [1, 0] },
        { id: "g30", label: "30 years", note: "$17,449 against $4,000", at: [2, 0] },
        { id: "why", label: "Interest earns interest", shape: "banner", at: [1, 1] },
      ],
    },
    {
      id: "rule",
      title: "The rule of 72",
      items: [
        { id: "saver", character: { pose: "point", hair: "bun", shirt: "sand" }, says: "72 ÷ 10 = 7.2", label: "You", note: "rate in percent" },
        { id: "r72", icon: "divide", label: "72 ÷ rate", note: "the years it takes to double" },
        { id: "r10", icon: "timer", label: "About 7 years", note: "for $1,000 at 10% to double" },
      ],
    },
  ],
  links: [
    { id: "each", from: "money", to: "flat", label: "each year" },
    { id: "sum", from: "flat", to: "ten" },
    { id: "c1", from: "y1", to: "y2", label: "+10%" },
    { id: "c2", from: "y2", to: "y3", label: "+10%" },
  ],
  beats: [
    { say: "Put $1,000 in an account that pays 10% a year.", draw: ["title", "money"] },
    { say: "Simple interest pays you 10% of that first $1,000 every year: $100.", draw: ["simple", "each", "flat"] },
    { say: "After ten years, you have $2,000.", draw: ["sum", "ten"] },
    { say: "Compound interest pays 10% of whatever is there now.", draw: ["compound", "growth"] },
    { say: "So the first year pays $100 and you have $1,100.", draw: ["y1"] },
    { say: "The second year pays $110, not $100.", draw: ["c1", "y2"] },
    { say: "And the third pays $121: interest earns interest.", draw: ["c2", "y3"] },
    { say: "Over thirty years, the line and the curve drift apart.", draw: ["gap", "chart"], feel: "surprised" },
    { say: "After ten years that is $2,594, against $2,000.", draw: ["g10"] },
    { say: "After thirty, $17,449 against $4,000.", draw: ["g30"], mark: [{ circle: "g30" }] },
    { say: "The difference is interest earning interest.", draw: ["why"] },
    { say: "A shortcut: divide 72 by the rate to get the years to double.", draw: ["rule", "saver", "r72"], feel: "thinking" },
    { say: "At 10%, your $1,000 doubles in about seven years.", draw: ["r10"] },
  ],
};
