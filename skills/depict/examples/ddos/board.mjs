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
      layout: "grid",
      items: [
        { id: "crowd", icon: "users", label: "People", note: "a few hundred requests a second", at: [0, 0] },
        { id: "botnet", icon: "bot", label: "Botnet", note: "machines all over the world", at: [0, 1] },
        { id: "site", icon: "server", label: "The site", note: "a few servers", shape: "box", at: [1, 0] },
      ],
    },
    {
      id: "edge",
      title: "Layers at the edge",
      items: [
        { id: "waf", icon: "shield-check", label: "Rules", note: "block known attackers" },
        { id: "limit", icon: "gauge", label: "Rate limit", note: "caps each address" },
        { id: "challenge", icon: "puzzle", label: "Challenge", note: "people pass, scripts fail" },
        { id: "cache", icon: "database", label: "Cache", note: "answers images and scripts" },
      ],
    },
    {
      id: "behind",
      title: "Behind the edge",
      items: [
        { id: "scale", icon: "server-cog", label: "Autoscaling", note: "more servers, a minute each" },
        { id: "try", icon: "activity", label: "Try it", note: "switch each layer off", shape: "bubble", figure: "figure-ddos.html" },
      ],
    },
  ],
  links: [
    { id: "visits", from: "crowd", to: "site" },
    { id: "flood", from: "botnet", to: "site", label: "a flood" },
  ],
  beats: [
    { say: "A DDoS attack floods a site with more requests than it can answer.", draw: ["title", "site"] },
    { say: "Real people send a few hundred requests a second.", draw: ["attack", "crowd", "visits"] },
    { say: "A botnet sends tens of thousands, from machines all over the world.", draw: ["botnet", "flood"] },
    { say: "No single fix stops it, so the edge puts layers in front of the site.", draw: ["edge", "waf"] },
    { say: "Rules block known attackers, and a rate limit caps each address.", draw: ["limit"] },
    { say: "A challenge in the browser lets people through and stops scripts.", draw: ["challenge"] },
    { say: "The cache answers images and scripts before they reach the servers.", draw: ["cache"] },
    { say: "Behind the edge, autoscaling adds servers, but each takes about a minute.", draw: ["behind", "scale"] },
    { say: "Open the figure, switch each layer off, and watch what breaks.", draw: ["try"], open: "try" },
  ],
};
