// Scene.tsx — Tower Head: catch falling office things on your head and keep
// the tower balanced before it topples. See PLAN.md.
import { lazy, Suspense } from "react";

import { TowerScene } from "./tower/TowerScene";

// Dev-only helpers for previewing without a camera. Lazy and behind a constant
// esbuild folds to false in production. Two rules: `process.env.NODE_ENV`, not
// `import.meta.env.DEV` (vincentt-xr/v2-template#112); and write the check
// INSIDE the ternary — hoisted into a `const`, esbuild keeps the dead branch.
const DevMediaSwitcher =
  process.env.NODE_ENV !== "production"
    ? lazy(() => import("./DevMediaSwitcher"))
    : null;
const DevKeys =
  process.env.NODE_ENV !== "production"
    ? lazy(() => import("./tower/DevKeys"))
    : null;

export const Scene = () => (
  <>
    <TowerScene />
    {DevMediaSwitcher && DevKeys ? (
      <Suspense fallback={null}>
        <DevMediaSwitcher />
        <DevKeys />
      </Suspense>
    ) : null}
  </>
);
