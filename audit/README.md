# Tower and round checks

Dev tooling, not part of the app. Headless Chrome (GPU on) against the running dev server
(`PORT=5194 pnpm dev`) with a fake webcam fed from a `.y4m` clip; reads the dev-only
`window.__tower` (`src/tower/DevKeys.tsx`). Needs `@playwright/test` and Chrome:
`PLAYWRIGHT_FROM=<folder whose node_modules has it>`.

- `stacks.cjs <out-dir> <clip.y4m> <x,y,w,h> <cols> <stack> …` — one tower per shot. A stack is
  piece indices (or `piece:look`) joined by dots, bottom first (`-` = just the cushion);
  `DPR=2` for sharper shots.
- `play.cjs <out-dir> <clip.y4m> <seconds> [every-ms] [query] [skip-seconds]` — taps to start a
  round, logs drops / catches / misses / falls and screenshots it. `&aim` (or `&aim=10`) in the
  query drops pieces onto the tower (or 10 cm to the side).

Clips (not committed), from the SDK's sample videos
(`cdn.vincentt.studio/assets/sdk/debug-ui/v1/videos/*.mp4`):
- room above the head: `-vf "scale=270:480,pad=540:960:135:480:color=0xa9802f,format=yuv420p"`
- a head that tilts (to topple a tower): add `rotate='0.30*sin(2*PI*t/6)':c=0xa9802f:ow=540:oh=960`
