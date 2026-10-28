import { describe, expect, it } from "vitest";

import {
  BOUNCE,
  GAME,
  bounceOff,
  catchFor,
  fallTime,
  gravityFor,
  judge,
  kick,
  leanState,
  pickItem,
  stepLean,
  toppled,
  type Lean,
} from "./rules";
import { CUSHION, PIECES } from "./pieces";

const DEG = Math.PI / 180;

/** A repeatable random source. */
const seeded = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const NONE = () => 0.5;
/** A catch window (cm) for the tests that don't care which piece. */
const W = 7;

/**
 * Seconds until a tower with this `load` (one piece ≈ 1) falls with the
 * head held at `roll` (Infinity = never, in `limit`).
 */
const fallsAfter = (
  n: number,
  roll: number,
  limit = 20,
  random: (() => number) | null = null,
) => {
  let l: Lean = { ...leanState(), angle: 0.002 };
  for (let i = 0; i < limit * 60; i += 1) {
    l = stepLean(l, 1 / 60, roll, 0, n, random);
    if (toppled(l, roll, n)) return i / 60;
  }
  return Infinity;
};

/**
 * A player who tilts their head against the tower's lean, seeing it
 * `delay` s late (tracking + reaction) and tilting at most 25°.
 */
const balance = (
  n: number,
  seconds: number,
  random: () => number,
  delay = 0.15,
) => {
  let l = leanState();
  const seen: Lean[] = [];
  let roll = 0;
  for (let i = 0; i < seconds * 60; i += 1) {
    seen.push(l);
    const s = seen[Math.max(0, seen.length - 1 - Math.round(delay * 60))];
    const want = -(1.5 * s.angle + 0.35 * s.vel);
    // Heads don't snap: ease toward the tilt you want.
    roll += (Math.max(-25 * DEG, Math.min(25 * DEG, want)) - roll) * 0.35;
    l = stepLean(l, 1 / 60, roll, 0, n, random);
    if (toppled(l, roll, n)) return i / 60;
  }
  return Infinity;
};

describe("balancing", () => {
  it("one item stands by itself with a still head", () => {
    expect(fallsAfter(1, 0, 20, seeded(1))).toBe(Infinity);
  });
  it("from a few items up it can't stand by itself", () => {
    expect(gravityFor(4)).toBeGreaterThan(GAME.lean.grip);
    expect(fallsAfter(4, 0, 20, seeded(1))).toBeLessThan(10);
  });
  it("taller towers tip over faster", () => {
    expect(fallsAfter(10, 0)).toBeLessThan(fallsAfter(4, 0));
  });
  it("it drifts even when you hold perfectly still", () => {
    expect(fallsAfter(6, 0, 20, seeded(3))).toBeLessThan(20);
  });
  it("a player tilting against the lean keeps it up", () => {
    for (const n of [3, 6, 10])
      for (const seed of [1, 2, 3])
        expect(balance(n, 20, seeded(seed))).toBe(Infinity);
  });
  it("a big head tilt drops even one item", () => {
    expect(fallsAfter(1, 32 * DEG)).toBeLessThan(5);
  });
  it("moving the head sideways makes it sway", () => {
    let l = leanState();
    let peak = 0;
    for (let i = 0; i < 30; i += 1) {
      l = stepLean(l, 1 / 60, 0, i < 10 ? 600 : 0, 1, null);
      peak = Math.max(peak, Math.abs(l.angle));
    }
    expect(peak).toBeGreaterThan(0.02);
  });
  it("an empty head has nothing to lean", () => {
    expect(stepLean(leanState(), 1 / 60, 20 * DEG, 0, 0)).toEqual(leanState());
    expect(toppled(leanState(), 60 * DEG, 0)).toBe(false);
  });
  it("a catch at the edge knocks harder than one in the middle", () => {
    expect(Math.abs(kick(leanState(), W, W).vel)).toBeGreaterThan(
      Math.abs(kick(leanState(), 1, W).vel),
    );
    expect(kick(leanState(), 0, W).vel).toBe(0);
  });
});

describe("pieces balance differently", () => {
  const loadOf = (id: string, count: number) =>
    (PIECES.find((p) => p.id === id)?.touchy ?? 0) * count;
  it("four laptops stand longer than four mugs", () => {
    // Median over a few drifts (one unlucky push can drop anything).
    const median = (load: number) =>
      [1, 2, 3, 4, 5, 6, 7]
        .map((seed) => fallsAfter(load, 0, 30, seeded(seed)))
        .sort((x, y) => x - y)[3];
    expect(median(loadOf("laptop", 4))).toBeGreaterThan(
      median(loadOf("mug", 4)) * 2,
    );
  });
  it("a plant unsettles the tower most, a laptop least", () => {
    const touchy = Object.fromEntries(PIECES.map((p) => [p.id, p.touchy]));
    expect(Math.max(...PIECES.map((p) => p.touchy))).toBe(touchy.plant);
    expect(Math.min(...PIECES.map((p) => p.touchy))).toBe(touchy.laptop);
  });
  it("landing on a mug is harder than on a laptop or the cushion", () => {
    const at = (id: string) =>
      catchFor(PIECES.find((p) => p.id === id)?.width ?? 0);
    expect(at("mug")).toBeLessThan(at("laptop"));
    expect(at("mug")).toBeLessThan(catchFor(CUSHION.width));
    expect(at("mug")).toBeGreaterThanOrEqual(GAME.catch.min);
    expect(at("laptop")).toBeLessThanOrEqual(GAME.catch.max);
  });
});

describe("falling", () => {
  it("falls faster as the tower grows, down to a floor", () => {
    expect(fallTime(5)).toBeLessThan(fallTime(0));
    expect(fallTime(100)).toBe(GAME.fall.time[1]);
  });
  it("caught when it reaches the top near the middle", () => {
    expect(judge(0.5, -0.2, 3, W)).toEqual({ result: "caught", offset: 3 });
  });
  it("missed when it reaches the top too far to the side", () => {
    expect(judge(0.5, -0.2, W + 1, W)).toEqual({ result: "missed" });
  });
  it("nothing until it gets there, even in one big step", () => {
    expect(judge(20, 10, 0, W)).toBeNull();
    expect(judge(40, -30, 0, W)?.result).toBe("caught");
  });
  it("a near miss bounces off to its own side; a far one falls clear", () => {
    const b = bounceOff(W + 2, 100, W, NONE);
    expect(b?.vx).toBeGreaterThan(0);
    expect(b?.vy).toBeGreaterThan(0);
    expect(bounceOff(-(W + 2), 100, W, NONE)?.vx).toBeLessThan(0);
    expect(bounceOff(W + BOUNCE.reach + 1, 100, W, NONE)).toBeNull();
  });
  it("never the same piece twice in a row", () => {
    for (let last = 0; last < 5; last += 1)
      for (let r = 0; r < 1; r += 0.05)
        expect(pickItem(last, 5, () => r)).not.toBe(last);
  });
});
