// Dev-only: keys 1–5 put that piece on top (in PIECES order, a random
// colourway), Backspace takes the top one off, C clears, S starts a round, F
// freezes the round (no new items, no falling over); ?aim drops every item
// straight onto the tower (?aim=10: 10 cm to the side); window.__tower exposes
// the store and a play log for debugging. Scene.tsx lazy-imports this behind an
// inline NODE_ENV check, so it never reaches production.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import { live } from "./live";
import { PIECES } from "./pieces";
import { getTower, towerActions } from "./state";

const randomLook = (piece: number) =>
  Math.floor(Math.random() * PIECES[piece].looks.length);

const DevKeys = () => {
  const scene = useThree((st) => st.scene);
  useEffect(() => {
    const events: string[] = [];
    const t0 = performance.now();
    const aim = new URLSearchParams(window.location.search).get("aim");
    live.aim = aim === null ? null : Number(aim) || 0;
    live.log = (e) => {
      events.push(`${((performance.now() - t0) / 1000).toFixed(1)}s ${e}`);
    };
    (window as unknown as Record<string, unknown>).__tower = {
      events,
      actions: {
        ...towerActions,
        /** Dev: a tower from piece indices, or "piece:look" strings. */
        build(list: (number | string)[]) {
          towerActions.set(
            list.map((x) => {
              const [p, l] = String(x).split(":").map(Number);
              return { piece: p, look: Number.isNaN(l) ? randomLook(p) : l };
            }),
          );
        },
      },
      get: getTower,
      pieces: PIECES,
      live,
      scene,
    };
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (e.key.length === 1 && i >= 0 && i < PIECES.length)
        towerActions.push({ piece: i, look: randomLook(i) });
      else if (e.key === "Backspace") towerActions.pop();
      else if (e.key === "c") towerActions.clear();
      else if (e.key === "s") towerActions.start();
      else if (e.key === "f") live.frozen = !live.frozen;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scene]);
  return null;
};

export default DevKeys;
