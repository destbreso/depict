// One board, any guide of its body. The hash table board, presented by Stuart
// and built once (friends.html); any character drawn to Stuart's body can
// present it instead, cast in as it plays, from one file of its own, its look
// (stuart.look.js, pip.look.js; `npm run looks` makes them). index.html is a
// host page with a picker, as a site would have. Every number is the hash table
// board's own.
import board from "../hash-table/board.mjs";

// a scholar's cap (his glasses are his own) and a magnifier, for finding things: the cap keeps room over his head,
// so a friend's hat for the day (a bat at Halloween) fits under it
export default { ...board, guide: { character: "stuart", outfit: "scholar", hold: "magnifier" } };
