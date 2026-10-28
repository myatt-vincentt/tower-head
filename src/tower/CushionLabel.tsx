// The score, stitched on a patch on the front of the cushion: no overlay
// on the screen. 👆 before the first round (tap to start), the tower's count
// while playing (it pops on every catch), and after a fall the round's count
// with your best under it. Lives in the cushion's frame (canonical cm).
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Group,
} from "three";
// eslint-disable-next-line import/extensions
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { useTower } from "./state";

const PATCH = {
  /** cm: the patch, on the cushion's front. */
  size: [10, 3.4, 0.3] as const,
  /** Just proud of the cushion's bulge (its front is at z 7). */
  position: [0, 1.95, 7.25] as const,
  cloth: "#fff8e1",
  stitch: "#e2b93b",
  ink: "#5a4210",
  best: "#b8860b",
};

const FONT = `system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
const W = 354;
const H = 120;

/** House motion: strict ease-out. */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/* eslint-disable no-param-reassign -- drawing into our own canvas */
const draw = (
  g: CanvasRenderingContext2D,
  main: string,
  sub: string | null,
) => {
  g.clearRect(0, 0, W, H);
  // Running stitches round the edge.
  g.strokeStyle = PATCH.stitch;
  g.lineWidth = 5;
  g.setLineDash([12, 9]);
  g.beginPath();
  g.roundRect(9, 9, W - 18, H - 18, 26);
  g.stroke();
  g.setLineDash([]);
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (sub) {
    g.fillStyle = PATCH.ink;
    g.font = `800 76px ${FONT}`;
    g.fillText(main, W * 0.34, H / 2 + 4);
    g.fillStyle = PATCH.best;
    g.font = `700 48px ${FONT}`;
    g.fillText(sub, W * 0.68, H / 2 + 3);
  } else {
    g.fillStyle = PATCH.ink;
    // Emoji draw smaller than digits at the same size.
    g.font = `800 ${/\d/.test(main) ? 80 : 92}px ${FONT}`;
    g.fillText(main, W / 2, H / 2 + 5);
  }
};
/* eslint-enable no-param-reassign */

export const CushionLabel = () => {
  const { phase, stack, score, best } = useTower();
  const holder = useRef<Group>(null);
  const bumped = useRef(-1);

  const parts = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return {
      canvas,
      g: canvas.getContext("2d") as CanvasRenderingContext2D,
      texture,
      patch: new RoundedBoxGeometry(...PATCH.size, 3, 0.14),
      cloth: new MeshStandardMaterial({
        color: PATCH.cloth,
        roughness: 0.95,
        envMapIntensity: 0.55,
      }),
      face: new PlaneGeometry(PATCH.size[0], PATCH.size[1]),
      ink: new MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, []);

  useEffect(
    () => () => {
      parts.texture.dispose();
      parts.patch.dispose();
      parts.cloth.dispose();
      parts.face.dispose();
      parts.ink.dispose();
    },
    [parts],
  );

  // What it says.
  let main = "👆";
  let sub: string | null = null;
  if (phase === "playing") main = String(stack.length);
  if (phase === "over") {
    main = String(score);
    sub = best > 0 ? `🏆${best}` : null;
  }
  useEffect(() => {
    draw(parts.g, main, sub);
    parts.texture.needsUpdate = true;
    bumped.current = -2; // pop on the next frame
  }, [parts, main, sub]);

  useFrame((state) => {
    const h = holder.current;
    if (!h) return;
    const now = state.clock.elapsedTime;
    if (bumped.current === -2) bumped.current = now;
    const k =
      bumped.current < 0 ? 1 : Math.min(1, (now - bumped.current) / 0.3);
    h.scale.setScalar(1 + 0.18 * (1 - easeOut(k)));
  });

  return (
    <group ref={holder} position={PATCH.position}>
      <mesh geometry={parts.patch} material={parts.cloth} renderOrder={5} />
      <mesh
        geometry={parts.face}
        material={parts.ink}
        position={[0, 0, PATCH.size[2] / 2 + 0.02]}
        renderOrder={6}
      />
    </group>
  );
};
