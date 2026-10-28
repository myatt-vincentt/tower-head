# Tower Head

Balance a wobbly office tower on your head. Tap to start: books, laptops, coffee mugs, tissue boxes
and desk plants drop from above, one at a time. Move under each one to catch it on the cushion on
your head, then keep the tower up. It never stands still by itself: it drifts and starts to tip,
and you tilt your head against the lean, like balancing a broom. Tip too far and it all flies off.
Your score is the number of pieces in your tower when it falls. No overlay on screen: the score is
stitched on a patch on the cushion (👆 before a round, the count while you play, the count and your
best 🏆 after a fall).

- Every piece balances differently: flat laptops and books steady the tower, tissue boxes are in
  between, mugs and plants make it touchy. You land on the top piece's width, so a mug is harder to
  land on than a laptop. A catch near the edge knocks the tower; a miss bounces off and tumbles
  away, with no penalty.
- Thumbnail: `public/images/tower-head-thumbnail.jpg` (mid-balance with six pieces; the share image).
- The pieces are built in code (`src/tower/pieces.ts`): soft clay shapes with a few colourways
  each. To add or change one, edit that file.
- The tower sits on the SDK's canonical head fit, steadied by a speed-adaptive spring
  (`src/tower/headFilter.ts`) with the head occluder in the same group. The rules (lean, drift,
  catch window, bounce) are in `src/tower/rules.ts`, tested on their own.
- Dev preview without a camera: the media switcher starts on the SDK's "Person Shaking Head" video
  (add `dev-media/tower.mp4` for a clip with room above the head); S starts a round, F freezes it,
  keys 1–5 put a piece on, `?aim` drops pieces straight onto the tower, `?occ` draws the head
  occluder. Checks in `audit/`. How it works: `PLAN.md`.

---

# v2-template

The Vincentt starter app: a real React + R3F + Vincentt XR SDK (`@vincentt-xr/sdk`)
WebXR app, bundled by esbuild.

## Shape

```
src/
  main.tsx            mount — never edited
  App.tsx             protected shell: XRProvider + AspectRatioContainer +
                      XRScene + media-source binding, camera, lighting,
                      VideoBackground, PreviewAnchors — never edited
  Scene.tsx           the agent's surface: add SDK components and R3F
                      primitives here
  PreviewAnchors.tsx  editor-preview integration — never edited
```

See `AGENTS.md` and `GROUNDING.md` for the API reference and how to author scenes.

## Develop

```
pnpm install
pnpm dev          # esbuild dev server on localhost:5173 (output in .dev/)
pnpm preview      # on-device preview over a secure tunnel (needs `vincentt login`)
pnpm typecheck
pnpm build        # production bundle to dist/
```

## Release

`vincentt init` scaffolds from the **`latest` tag**, not from `main`. Merging to `main` does
not ship a template to creators — cutting a release does.

```
git tag 1.1.0 <sha>      # bare semver, no `v` prefix
git push origin 1.1.0    # the Release workflow verifies the tag, then moves `latest`
```

The Release workflow (`.github/workflows/release.yml`) installs from the frozen lockfile,
builds, and typechecks **the tagged tree** before force-updating `latest` to it. A tag that
fails leaves `latest` where it was, so a broken release cannot reach a new creator.

The job runs in the `release` environment, which accepts bare-semver tags only. To re-run it by
hand, dispatch it from the tag itself ("Use workflow from: 1.1.0"); a dispatch from `main` is
refused.

**Never move `latest` by hand.** It is force-updated by that workflow and nowhere else; moving
it manually decouples the pointer from the version it claims to be.

Creators can pin a specific version — `vincentt init --template 1.0.0` — which is the escape
hatch when a release turns out to be bad. That is why the version tags are immutable and only
`latest` moves.

### `MIGRATION.md` and the platform release row

Root `MIGRATION.md` carries one entry per released tag, newest first, authored in the same
PR as the change: `required: true|false`, a one-line summary, and optional notes bullets.
`required: false` means no consumer action is needed, never that the entry was skipped. The
Release workflow refuses to move `latest` for a tag with no valid entry, then — once `latest`
has moved — posts that entry as this release's row to the platform (`POST
/platform/releases`, component `template`), via `scripts/release-row.mjs`. Both steps read
`MIGRATION.md` from `main`, not from the tagged tree: the note is reviewed via PR into `main`
and is append-only per version, so `main`'s copy is the reviewed source for any tag, including
one cut before this file existed. That row is what `vincentt outdated` reads back to tell a
creator's agent what changed and what to do about it.
