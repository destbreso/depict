// One board, any guide of its body. The hash table board, presented by Stuart
// and built once (friends.html); any character drawn to Stuart's body can
// present it instead, cast in as it plays, from one file of its own, its look
// (stuart.look.js, pip.look.js; `npm run looks` makes them). index.html is a
// host page with a picker, as a site would have. Every number is the hash table
// board's own.
import board from "../hash-table/board.mjs";

// his glasses are his own, so he finds things with a magnifier and a bow tie in the board's accent
export default { ...board, guide: { character: "stuart", wear: ["bow-tie"], hold: "magnifier" } };
