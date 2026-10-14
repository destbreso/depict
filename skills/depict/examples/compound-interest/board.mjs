// Compound interest, as slides: simple interest, compound interest, how far
// apart they end up, and the rule of 72. $1,000 at 10% a year:
// 1000 x 1.1^10 = 2,593.74 and 1000 x 1.1^30 = 17,449.40 (compound);
// 1000 + 10 x 100 = 2,000 and 1000 + 30 x 100 = 4,000 (simple).
// The rule of 72 gives 72 / 10 = 7.2 years to double; exactly, ln 2 / ln 1.1 = 7.27.
export default {
  title: "Compound interest",
  mode: "slides",
  seed: 21,
  regions: [
    {
      id: "simple",
      title: "Simple interest",
      items: [
        { id: "money", icon: "coins", label: "$1,000", note: "at 10% a year" },
        { id: "flat", icon: "plus", label: "+$100", note: "every year, on the $1,000" },
        { id: "ten", icon: "calendar", label: "$2,000", note: "after 10 years" },
      ],
    },
    {
      id: "compound",
      title: "Compound interest",
      items: [
        { id: "y1", label: "$1,100", note: "after one year" },
        { id: "y2", label: "$1,210", note: "10% of $1,100 is $110" },
        { id: "y3", label: "$1,331", note: "10% of $1,210 is $121" },
      ],
    },
    {
      id: "gap",
      title: "The gap grows",
      items: [
        { id: "g10", icon: "calendar", label: "10 years", note: "$2,594 against $2,000" },
        { id: "g30", icon: "calendar-range", label: "30 years", note: "$17,449 against $4,000" },
        { id: "why", label: "Interest earns interest", shape: "banner" },
      ],
    },
    {
      id: "rule",
      title: "The rule of 72",
      items: [
        { id: "r72", icon: "divide", label: "72 ÷ rate", note: "the years it takes to double" },
        { id: "r10", icon: "timer", label: "72 ÷ 10 = 7.2", note: "$1,000 doubles in about 7 years" },
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
    { say: "Compound interest pays 10% of whatever is there now.", draw: ["compound", "y1"] },
    { say: "So the second year pays $110, not $100.", draw: ["c1", "y2"] },
    { say: "And the third pays $121: interest earns interest.", draw: ["c2", "y3"] },
    { say: "After ten years that is $2,594, against $2,000.", draw: ["gap", "g10"] },
    { say: "After thirty, $17,449 against $4,000.", draw: ["g30"], mark: [{ circle: "g30" }] },
    { say: "The difference is interest earning interest.", draw: ["why"] },
    { say: "A shortcut: divide 72 by the rate to get the years to double.", draw: ["rule", "r72"] },
    { say: "At 10%, your $1,000 doubles in about seven years.", draw: ["r10"] },
  ],
};
