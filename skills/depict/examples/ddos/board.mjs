// How a site survives a DDoS attack: what an attack is, the layers an edge
// network puts in front of a site, and autoscaling behind it. The last item
// opens Dissect's running figure of the same system (figure-ddos.html, made
// with Dissect: github.com/destbreso/dissect), where every layer has a switch.
// The numbers are that figure's: people send about 600 requests a second, a
// new server takes 45 to 75 s to start.
export default {
  title: "How a site survives a DDoS attack",
  mode: "canvas",
  seed: 11,
  regions: [
    {
      id: "attack",
      title: "The attack",
      items: [
        { id: "crowd", character: { pose: "wave", hair: "long", shirt: "blue" }, label: "People", note: "a few hundred requests a second" },
        {
          id: "site",
          // a server rack: three servers, a light on each
          sketch: [
            { d: "M24 4 H76 V96 H24 Z", fill: "grey" },
            { d: "M31 12 H69 V31 H31 Z", fill: "blue" },
            { d: "M31 40 H69 V59 H31 Z", fill: "blue" },
            { d: "M31 68 H69 V87 H31 Z", fill: "blue" },
            "M48 21.5 H63 M48 49.5 H63 M48 77.5 H63",
            { d: "M35 21.5 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", fill: "green" },
            { d: "M35 49.5 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", fill: "green" },
            { d: "M35 77.5 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", fill: "green" },
          ],
          size: "large",
          label: "The site",
          note: "a few servers",
        },
        {
          id: "botnet",
          // three robots, frowning, each with its antenna
          sketch: [
            { d: "M36 16 H64 V42 H36 Z", fill: "grey" },
            "M50 16 V8",
            { d: "M47.5 6 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0", fill: "accent" },
            "M42 25 L47 28 M58 25 L53 28 M43 35 H57",
            { d: "M6 56 H34 V82 H6 Z", fill: "grey" },
            "M20 56 V48",
            { d: "M17.5 46 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0", fill: "accent" },
            "M12 65 L17 68 M28 65 L23 68 M13 75 H27",
            { d: "M66 56 H94 V82 H66 Z", fill: "grey" },
            "M80 56 V48",
            { d: "M77.5 46 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0", fill: "accent" },
            "M72 65 L77 68 M88 65 L83 68 M73 75 H87",
          ],
          size: "large",
          label: "Botnet",
          note: "machines all over the world",
        },
      ],
    },
    {
      id: "edge",
      title: "Layers at the edge",
      // the layers drawn as layers: a stack, a request passes them top to bottom
      layout: "stack",
      items: [
        { id: "waf", label: "Rules", note: "block known attackers" },
        { id: "limit", label: "Rate limit", note: "caps each address" },
        { id: "challenge", label: "Challenge", note: "people pass, scripts fail" },
        { id: "cache", label: "Cache", note: "answers images and scripts" },
      ],
    },
    {
      id: "behind",
      title: "Behind the edge",
      items: [
        {
          id: "scale",
          // two racks running and a new one starting, with a plus over it
          sketch: [
            { d: "M6 32 H30 V94 H6 Z", fill: "grey" },
            "M11 46 H25 M11 60 H25 M11 74 H25",
            { d: "M38 32 H62 V94 H38 Z", fill: "grey" },
            "M43 46 H57 M43 60 H57 M43 74 H57",
            { d: "M70 32 H94 V94 H70 Z", fill: "green" },
            "M75 46 H89 M75 60 H89 M75 74 H89",
            "M82 6 V24 M73 15 H91",
          ],
          size: "large",
          label: "Autoscaling",
          note: "more servers, a minute each",
        },
        { id: "try", icon: "activity", label: "Try it", note: "switch each layer off", shape: "bubble", figure: "figure-ddos.html" },
      ],
    },
  ],
  links: [
    { id: "visits", from: "crowd", to: "site" },
    { id: "flood", from: "botnet", to: "site", label: "a flood", style: "bold" },
  ],
  beats: [
    { say: "A DDoS attack floods a site with more requests than it can answer.", draw: ["title", "site"] },
    { say: "Real people send a few hundred requests a second.", draw: ["attack", "crowd", "visits"] },
    { say: "A botnet sends tens of thousands, from machines all over the world.", draw: ["botnet", "flood"], feel: "worried" },
    { say: "No single fix stops it, so the edge puts layers in front of the site.", draw: ["edge", "waf"] },
    { say: "Rules block known attackers, and a rate limit caps each address.", draw: ["limit"] },
    { say: "A challenge in the browser lets people through and stops scripts.", draw: ["challenge"] },
    { say: "The cache answers images and scripts before they reach the servers.", draw: ["cache"] },
    { say: "Only what gets past every layer reaches the site.", mark: [{ circle: "site" }] },
    { say: "Behind the edge, autoscaling adds servers, but each takes about a minute.", draw: ["behind", "scale"], feel: "thinking" },
    { say: "Open the figure, switch each layer off, and watch what breaks.", draw: ["try"], open: "try" },
  ],
};
