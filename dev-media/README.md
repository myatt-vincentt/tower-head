# dev-media

Optional dev-only preview media. Nothing here ships: only
`src/DevMediaSwitcher.tsx` reads this folder, and it is stripped from
production builds.

You don't need anything here. Without a webcam, `pnpm dev` starts on the SDK's
built-in "Person Shaking Head" video and lists every SDK sample video and
image. In development: S starts a round, F freezes it, keys 1–5 put a piece on
the tower, Backspace takes one off, C clears; `?aim` drops every piece straight
onto the tower (`?aim=10`: 10 cm to the side).

To preview with your own clip, add it at `dev-media/tower.mp4` (H.264 MP4); it
is listed first and used as the start. A clip with room above the head shows
the whole tower (the SDK's sample videos have the head near the top). Clips
here are git-ignored. Restart `pnpm dev` after adding or removing one.
