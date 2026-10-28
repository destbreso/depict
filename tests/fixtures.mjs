// Characters the tests share: the friends example's pencil with no arms (stump), and seen from the front too (turner).
import pencil from "../skills/depict/examples/friends/pencil.mjs";
import * as ink from "../skills/depict/kit/ink.mjs";

// the friends example's pencil with no arms: its body is all it has to show things with
const { poses, hands, arm, reach, tip, ...rest } = pencil;
export const stump = { ...rest, id: "stump", name: "Stump", arm: false, poses: { glance: { body: { bend: -4, look: [-1, 0.2] } } }, personality: { ...pencil.personality, quirks: ["glance"] } };

// the stump seen from the front too: a round body of its own color and two eyes, taken to present and to wave
export const FRONT = "#123456";
export const turner = {
  ...stump,
  id: "turner",
  views: { front: { hat: [0, -0.1], middle: 0.5 } },
  poses: { ...stump.poses, present: { view: "front", body: { aim: 5 } }, wave: { view: "front", body: { sway: [5, 0.5] } } },
  draw(k) {
    const out = stump.draw(k);
    k.view("front", () => {
      k.shape("body", k.disc(0, 0.55, 0.25, 0.44), FRONT);
      const eyes = [k.P(-0.08, 0.45), k.P(0.08, 0.45)];
      eyes.forEach(([x, y], i) => k.add(`eye${i}`, "eye", ink.ellipse(k.p, x, y, 6, 8, { closed: true }), 2));
      eyes.forEach(([x, y], i) => k.add(`pupil${i}`, "pupil", [[x, y, x + 1, y]], 5));
      k.add("mouth:smile", "mouth", [[k.P(-0.03, 0.55), k.P(0.03, 0.55)].flat()], 2);
      return { eyes };
    });
    return out;
  },
};

