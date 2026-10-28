# Plan — Tower Head

Balance a tower of office things on your head. Built on SDK 2.0.0-alpha.9; the head pipeline is
shared with Try-On Studio, Spirit Animal Reveal and Mood Hat. The Notion brief called it "Head
Stack".

## Decisions (from the creator)

- Balancing is the game: the tower always drifts and you keep it up by tilting against the lean.
  Catching is easy (pieces fall near the top of the tower).
- Five pieces, office set, built in code in a soft clay look: book, laptop, coffee mug, tissue box,
  desk plant, a few colourways each. A cushion is always on the head as the base (not scored).
- Size matters: wide flat pieces steady the tower, narrow or tall ones make it touchier, and the
  catch window follows the top piece's width.
- Endless until it falls; score = pieces in the tower. A miss bounces off with no penalty.
- Tap to start. No screen overlay: the score is on a patch on the cushion.

## How it works

- `pieces.ts`: each piece built from rounded boxes, lathes and spheres in canonical cm (origin at
  the middle of its flat bottom), with `height` (where the next sits; soft tops pressed down),
  `width` (what you land on) and `touchy` (how much it unsettles the tower). `PieceView.tsx` pops a
  piece in with a squash-and-settle and squashes the tissue / leaves while something sits on them.
- `Tower.tsx`: the cushion on the crown (with `CushionLabel.tsx`, the score patch), then nested
  level groups, each pivoting at its bottom, so a lean shared up the levels bends the tower.
- `rules.ts` (tested): one springy lean. Gravity pulls a leaning tower over; the head's grip pulls
  it toward where the head points; gravity's share grows with the tower's load (the pieces'
  `touchy` added up) and passes the grip from a little load up, so it must be balanced. A wandering
  random push (drift) grows with the load; sideways head acceleration makes it sway; a catch off the
  middle knocks it; past 38° of total tilt it falls. Catch window = half the top's width (3.5–9 cm);
  a near miss (within 9 cm past it) bounces off. Tests include a simulated player with a reaction
  delay who keeps every kind of tower up, and a still head that drops a tall one.
- `Game.tsx`: each frame reads the head's tilt and sideways acceleration, steps the lean, bends the
  levels, drops pieces from above the screen near the tower top (faster as it grows), judges
  catches, bounces misses and throws the pieces off when it falls (world space, a portal).
- `FilteredHead.tsx` + `headFilter.ts` (tested): the SDK's canonical head fit through a
  speed-adaptive critically damped spring, with the depth-only v3 head occluder in the same group
  and the SDK's `NeckOccluder` in the face tracker. Face model 20 Hz.
- `TapToStart.tsx`: a tap anywhere starts a round. `state.ts`: phase, tower, score, best (kept in
  localStorage).
- Dev only: `DevKeys.tsx` (S / F / 1–5 / Backspace / C, `?aim`, `window.__tower` with a play log),
  `DevMediaSwitcher.tsx`, `?occ`.
- Checks: `audit/stacks.cjs` (towers on a clip), `audit/play.cjs` (a round with its log and
  screenshots).

## Known limits

- The SDK's sample videos never tilt or move the head sideways, so balancing was tested with a
  rotated copy of one and by simulation; the feel needs a webcam / phone check.
