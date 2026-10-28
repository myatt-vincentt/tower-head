// The round and the tower on your head. One small store for the scene, the
// game loop, the HUD and the dev keys.
import { useSyncExternalStore } from "react";

export type Phase = "ready" | "playing" | "over";

/** A piece on the tower: index into PIECES and its colourway. */
export type Placed = { piece: number; look: number };

export type TowerState = {
  phase: Phase;
  /** Bottom first (the cushion isn't in it). */
  stack: Placed[];
  /** Items the last round ended with. */
  score: number;
  best: number;
  /** Bumps when a tower topples (the debris plays once per fall). */
  falls: number;
};

const BEST_KEY = "tower-head-best";

const loadBest = () => {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};

const saveBest = (best: number) => {
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Private mode and the like: the best just isn't kept.
  }
};

let current: TowerState = {
  phase: "ready",
  stack: [],
  score: 0,
  best: loadBest(),
  falls: 0,
};
const listeners = new Set<() => void>();

const set = (next: TowerState) => {
  current = next;
  listeners.forEach((l) => l());
};

export const getTower = () => current;

export const useTower = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getTower,
    getTower,
  );

export const towerActions = {
  /** A new round on an empty head. */
  start() {
    set({ ...current, phase: "playing", stack: [] });
  },
  /** Put a piece on top. */
  push(p: Placed) {
    set({ ...current, stack: [...current.stack, p] });
  },
  /** It fell: the round ends with the items it had. */
  topple() {
    const score = current.stack.length;
    const best = Math.max(current.best, score);
    if (best > current.best) saveBest(best);
    set({
      ...current,
      phase: "over",
      stack: [],
      score,
      best,
      falls: current.falls + 1,
    });
  },
  /** Dev: take the top item off. */
  pop() {
    set({ ...current, stack: current.stack.slice(0, -1) });
  },
  /** Dev: a whole tower at once. */
  set(stack: Placed[]) {
    set({ ...current, stack: [...stack] });
  },
  clear() {
    set({ ...current, stack: [] });
  },
};
