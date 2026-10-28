// A tap anywhere on the scene starts a round when one isn't running (after
// a fall, once the pieces have flown). No button: the 👆 on the cushion's
// patch is the only hint (CushionLabel.tsx).
import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";

import { towerActions, useTower } from "./state";

const TAP = { time: 300, move: 12 }; // ms, px
/** After a fall, taps wait this long (the pieces are still flying). */
const AGAIN = 900;

export const TapToStart = () => {
  const { phase, falls } = useTower();
  const gl = useThree((s) => s.gl);
  const [again, setAgain] = useState(false);

  useEffect(() => {
    setAgain(false);
    if (phase !== "over") return undefined;
    const t = window.setTimeout(() => setAgain(true), AGAIN);
    return () => window.clearTimeout(t);
  }, [phase, falls]);

  const canStart = phase === "ready" || (phase === "over" && again);
  useEffect(() => {
    if (!canStart) return undefined;
    const el = gl.domElement;
    let down: { x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (
        d &&
        performance.now() - d.t < TAP.time &&
        Math.hypot(e.clientX - d.x, e.clientY - d.y) < TAP.move
      )
        towerActions.start();
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
    };
  }, [gl, canStart]);

  return null;
};
