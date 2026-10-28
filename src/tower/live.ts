// Live per-frame values shared without re-renders: the head and tower
// objects (FilteredHead, Tower), plus dev-only hooks.
import type { Group } from "three";

export const live = {
  /** A face is being tracked (FilteredHead). */
  tracked: false,
  /** The filtered head group (canonical cm inside; FilteredHead). */
  head: null as Group | null,
  /** Each level's group, bottom first; its origin is the piece's bottom (Tower). */
  levels: [] as (Group | null)[],
  /** Where the next piece sits (Tower). */
  top: null as Group | null,
  /** Dev checks only: stops the game loop's spawning and toppling. */
  frozen: false,
  /** Dev checks only: drop every piece this far (cm) from the top of the tower. */
  aim: null as number | null,
  /** Dev checks only: the game loop reports drops, catches and falls here. */
  log: null as ((event: string) => void) | null,
};
