// The tower on your head (Tower.tsx), on the filtered head
// (FilteredHead.tsx: the SDK's canonical head fit through a spring, with the
// depth-only head occluder in the same group); the round (Game.tsx) and
// tap to start (TapToStart.tsx). The score is on the cushion, not on screen.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator } from "three";
// eslint-disable-next-line import/extensions
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { FilteredHead } from "./FilteredHead";
import { Game } from "./Game";
import { useTower } from "./state";
import { TapToStart } from "./TapToStart";
import { Tower } from "./Tower";

/** Soft studio light, so the clay shapes read on camera. */
const useStudioLight = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const before = scene.environment;
    scene.environment = tex;
    return () => {
      scene.environment = before;
      tex.dispose();
    };
  }, [gl, scene]);
};

export const TowerScene = () => {
  const { stack } = useTower();
  useStudioLight();
  return (
    <>
      {/* A key light from the upper left, so the clay shapes have form. */}
      <directionalLight position={[-3, 6, 4]} intensity={1.5} />
      <FilteredHead>
        <Tower stack={stack} />
      </FilteredHead>
      <Game />
      <TapToStart />
    </>
  );
};
