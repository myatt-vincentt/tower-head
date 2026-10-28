// The game's rules. Pure (no React, no three), so they're tested on their
// own (rules.test.ts).
//
// Balancing is the game. The tower is one springy column on your head:
// gravity pulls a leaning tower further over, your head's grip pulls it
// toward the way your head points. How hard gravity pulls depends on the
// tower's load: each piece adds its own touchiness (a flat laptop little,
// a tall plant a lot). From a little load up gravity wins, so
// like a broom on your hand it never stands still by itself: it drifts
// (random pushes, more the taller it is), starts to tip, and you tilt your
// head against the lean to bring it back. Moving your head sideways makes
// it lag and sway; a catch off the middle knocks it. Past TOPPLE of tilt
// (your head's plus the tower's) it falls.
//
// Falling: one piece at a time from above the screen, near the top of the
// tower, a little faster for every piece on it. It's caught when it comes
// down to the top within the catch window, which is set by how wide the top
// piece is (easy on a laptop, hard on a mug); otherwise it bounces off.

export const GAME = {
  lean: {
    /** How hard the head pulls the tower back upright (1/s²). */
    grip: 16,
    /** Damping (1/s). */
    damp: 4,
    /**
     * Gravity as a share of the grip: one item → many. Above 1 the tower
     * can't stand by itself and must be balanced.
     */
    gravity: [0.9, 1.35] as const,
    /** Load for gravity to get two thirds of the way there. */
    gravityItems: 5,
    /** Random pushes, typical size (rad/s²): one item → many. */
    drift: [0.8, 2.4] as const,
    /** How long a push lasts (s). */
    driftTime: 0.6,
    /** Sideways head acceleration → lean (rad/s² per cm/s²). */
    sway: 0.0035,
    /** Knock from a catch at the very edge (rad/s). */
    kick: 1.1,
    /** Total tilt (head + tower) at which it falls (degrees). */
    topple: 38,
  },
  fall: {
    /** Seconds from the top of the screen to the tower: first item → fastest. */
    time: [3.2, 1.6] as const,
    /** Seconds faster per item on the tower. */
    perItem: 0.12,
    /** Seconds between one item ending (caught or missed) and the next. */
    gap: 0.6,
    /** How far from the top of the tower it falls (cm): first item → later. */
    spread: [4, 12] as const,
  },
  /** Catch window either side of the middle: share of the top's width (cm), and its limits. */
  catch: { share: 0.5, min: 3.5, max: 9 },
};

const DEG = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export type Lean = {
  angle: number;
  vel: number;
  /** The random push right now (rad/s²). */
  push: number;
};

export const leanState = (): Lean => ({ angle: 0, vel: 0, push: 0 });

const grow = (n: number, [a, b]: readonly [number, number], items: number) =>
  a + (b - a) * (1 - Math.exp(-Math.max(0, n - 1) / items));

/** Gravity's pull on a tower with this load (1/s²). */
export const gravityFor = (load: number) => {
  const { grip, gravity, gravityItems } = GAME.lean;
  return load <= 0 ? 0 : grip * grow(load, gravity, gravityItems);
};

/** The catch window either side of the middle (cm) on a top this wide. */
export const catchFor = (topWidth: number) => {
  const { share, min, max } = GAME.catch;
  return clamp(topWidth * share, min, max);
};

/** A standard normal sample from two uniform ones. */
const gauss = (random: () => number) =>
  Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) *
  Math.cos(2 * Math.PI * random());

/**
 * One step of the lean. `roll` is your head's tilt (rad, + = the top goes
 * to the screen's left, as three's rotation.z), `accel` your head's
 * sideways acceleration (cm/s², + = to the screen's right), `load` the
 * tower's (the pieces' touchiness added up).
 * The angle is the tower's lean on top of your head's (same sense).
 * `random` drives the drift (null: no drift).
 */
export const stepLean = (
  lean: Lean,
  dt: number,
  roll: number,
  accel: number,
  load: number,
  random: (() => number) | null = Math.random,
): Lean => {
  if (load <= 0) return leanState();
  const { grip, damp, sway, drift, driftTime, gravityItems } = GAME.lean;
  const g = gravityFor(load);
  let { angle, vel, push } = lean;
  // The drift: a random push that wanders (it keeps its typical size).
  const t = Math.min(dt, 0.1);
  const size = grow(load, drift, gravityItems);
  if (random)
    push +=
      -push * (t / driftTime) +
      size * Math.sqrt((2 * t) / driftTime) * gauss(random);
  // Small fixed steps: it's a stiff spring.
  const steps = Math.max(1, Math.ceil(Math.min(dt, 0.1) / (1 / 240)));
  const h = Math.min(dt, 0.1) / steps;
  for (let i = 0; i < steps; i += 1) {
    const a =
      g * Math.sin(roll + angle) -
      grip * angle -
      damp * vel +
      sway * accel +
      push;
    vel += a * h;
    angle += vel * h;
  }
  return { angle, vel, push };
};

/**
 * A catch `offset` cm from the middle (+ = screen right) knocks the tower:
 * at the edge of the catch `window` (cm), the hardest.
 */
export const kick = (lean: Lean, offset: number, window: number): Lean => ({
  ...lean,
  // Weight landing to the right tips the top to the right (− in three).
  vel: lean.vel - GAME.lean.kick * clamp(offset / window, -1, 1),
});

/** Has it fallen? */
export const toppled = (lean: Lean, roll: number, n: number) =>
  n > 0 && Math.abs(roll + lean.angle) > GAME.lean.topple * DEG;

/** Seconds from the top of the screen to the tower with `n` pieces on it. */
export const fallTime = (n: number) =>
  Math.max(GAME.fall.time[1], GAME.fall.time[0] - GAME.fall.perItem * n);

/** How far from the top of the tower it may fall (cm). */
export const spreadFor = (n: number) => {
  const [a, b] = GAME.fall.spread;
  return a + (b - a) * Math.min(1, n / 8);
};

/** The next piece: any but the last one. */
export const pickItem = (last: number, count: number, random: () => number) => {
  if (last < 0 || count < 2) return Math.floor(random() * count);
  const k = Math.floor(random() * (count - 1));
  return k >= last ? k + 1 : k;
};

/**
 * Where a falling piece is relative to the tower top, in cm (its bottom vs.
 * where it would sit): returns "caught" (with the sideways offset),
 * "missed" or null (still coming). `window` is the catch window (catchFor).
 */
export const judge = (
  prevY: number,
  y: number,
  dx: number,
  window: number,
): { result: "caught"; offset: number } | { result: "missed" } | null => {
  if (prevY > 0 && y <= 0)
    return Math.abs(dx) <= window
      ? { result: "caught", offset: dx }
      : { result: "missed" };
  return null;
};

/** A miss that clips the tower's edge (or your head) bounces off it. */
export const BOUNCE = {
  /** How far past the catch window it still clips the edge (cm). */
  reach: 9,
  /** Bounce up, as a share of its falling speed. */
  up: 0.5,
  /** Off to the side (cm/s). */
  side: [30, 60] as const,
};

/**
 * The bounce for a miss `dx` cm from the middle falling at `speed` cm/s
 * past a catch `window` (cm): a velocity (cm/s, + = right / up), or null
 * when it's clear of the tower.
 */
export const bounceOff = (
  dx: number,
  speed: number,
  window: number,
  random: () => number,
) => {
  if (Math.abs(dx) > window + BOUNCE.reach) return null;
  const [a, b] = BOUNCE.side;
  return {
    vx: Math.sign(dx || 1) * (a + (b - a) * random()),
    vy: speed * BOUNCE.up,
  };
};
