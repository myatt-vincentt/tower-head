// The tower: the cushion on your crown (with the score on its patch), then
// each piece flat on the one below. Levels are nested groups, each pivoting at its own bottom, so the
// game loop leans the tower by turning each level a share of the lean, and
// everything above follows. The groups are registered in `live` for the
// game loop (lean, where the next piece sits, the debris when it falls).
import type { ReactNode } from "react";

import { CushionLabel } from "./CushionLabel";
import { CROWN } from "./frame";
import { live } from "./live";
import { CUSHION, PIECES } from "./pieces";
import { PieceView } from "./PieceView";
import type { Placed } from "./state";

/** How far the puffy cushion sinks onto the crown (cm). */
const CUSHION_SINK = 1.2;

const Level = ({ stack, k }: { stack: Placed[]; k: number }): ReactNode => {
  if (k >= stack.length)
    return (
      <group
        name="tower-top"
        ref={(g) => {
          live.top = g;
        }}
      />
    );
  const { piece, look } = stack[k];
  const p = PIECES[piece];
  return (
    <group
      name={`level-${k}`}
      ref={(g) => {
        live.levels[k] = g;
      }}
    >
      <PieceView piece={p} look={look} covered={k < stack.length - 1} />
      <group position={[0, p.height, 0]}>
        <Level stack={stack} k={k + 1} />
      </group>
    </group>
  );
};

/** Lives on the filtered head (canonical cm). */
export const Tower = ({ stack }: { stack: Placed[] }) => {
  live.levels.length = stack.length;
  return (
    <group
      name="tower"
      position={[CROWN[0], CROWN[1] - CUSHION_SINK, CROWN[2]]}
    >
      <PieceView piece={CUSHION} look={0} covered={stack.length > 0} instant />
      <CushionLabel />
      <group position={[0, CUSHION.height, 0]}>
        <Level stack={stack} k={0} />
      </group>
    </group>
  );
};
