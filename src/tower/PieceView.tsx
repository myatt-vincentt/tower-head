// One piece in one colourway (pieces.ts): built once, popped in when it
// lands (a quick squash-and-settle, strict ease-out), and with its soft top
// (the tissue, the leaves) squashed flat while something sits on it.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Material, Mesh, Object3D } from "three";

import type { Piece } from "./pieces";

/** House motion: strict ease-out, never an overshoot. */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

const POP = 0.28; // s
/** How flat a soft top gets under a piece (share of its height). */
const SQUASHED = 0.3;
/** Mesh renderOrder (the head occluder is −1). */
const ORDER = 5;

const dispose = (root: Object3D) =>
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach(
      (x: Material) => x.dispose(),
    );
  });

export const PieceView = ({
  piece,
  look,
  covered = false,
  instant = false,
}: {
  piece: Piece;
  /** Index into piece.looks. */
  look: number;
  /** Something sits on it: squash its soft top. */
  covered?: boolean;
  /** Show at full size at once (no pop). */
  instant?: boolean;
}) => {
  const holder = useRef<Group>(null);
  const born = useRef(-1);

  const model = useMemo(() => {
    const root = piece.build(piece.looks[look % piece.looks.length]);
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.renderOrder = ORDER;
      m.frustumCulled = false;
    });
    return { root, soft: root.getObjectByName("squash") ?? null };
  }, [piece, look]);

  useEffect(() => () => dispose(model.root), [model]);

  useFrame((state, dt) => {
    const h = holder.current;
    if (!h) return;
    if (born.current < 0) born.current = state.clock.elapsedTime;
    // Lands squashed (wide and low) and settles to its shape.
    const k = instant
      ? 1
      : easeOut(Math.min(1, (state.clock.elapsedTime - born.current) / POP));
    h.scale.set(1 + 0.12 * (1 - k), 1 - 0.22 * (1 - k), 1 + 0.12 * (1 - k));
    if (model.soft) {
      const goal = covered ? SQUASHED : 1;
      const s = model.soft.scale;
      s.y += (goal - s.y) * (1 - Math.exp(-14 * Math.min(dt, 0.1)));
      s.x = 1 + (1 - s.y) * 0.25;
      s.z = s.x;
    }
  });

  return (
    <group ref={holder}>
      <primitive object={model.root} />
    </group>
  );
};
