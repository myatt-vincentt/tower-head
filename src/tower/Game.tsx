// The round, every frame (rules in rules.ts): reads your head (tilt, how it
// moves sideways), leans the tower, drops the next item from above the
// screen near the top of the tower, judges the catch (a miss bounces off
// and tumbles away), and when the tower tips too far, throws its items off
// your head. The falling item and the debris are drawn
// straight into the scene (a portal), in world space, not on the head.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  Euler,
  PerspectiveCamera,
  Quaternion,
  Vector3,
  type Group,
} from "three";

import {
  GAME,
  bounceOff,
  catchFor,
  fallTime,
  judge,
  kick,
  leanState,
  pickItem,
  spreadFor,
  stepLean,
  toppled,
} from "./rules";
import { live } from "./live";
import { CUSHION, PIECES } from "./pieces";
import { PieceView } from "./PieceView";
import { getTower, towerActions, useTower, type Placed } from "./state";

/** How fast things fall once they're loose (cm/s², gentler than real). */
const GRAVITY = 980 * 0.6;
/** Seconds the debris flies before it's gone. */
const DEBRIS_TIME = 1.6;
/** Seconds before the first item of a round. */
const FIRST_DELAY = 0.8;

type Drop = { key: number } & Placed;

type Flying = Placed & {
  position: Vector3;
  quaternion: Quaternion;
  scale: number;
  velocity: Vector3;
  spin: Vector3;
};

/** A piece in world space (its bottom at the group's origin). */
const WorldPiece = ({
  placed,
  groupRef,
  instant,
}: {
  placed: Placed;
  groupRef: (g: Group | null) => void;
  instant?: boolean;
}) => (
  <group ref={groupRef} visible={false}>
    <PieceView
      piece={PIECES[placed.piece]}
      look={placed.look}
      instant={instant}
    />
  </group>
);

export const Game = () => {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const { phase, falls } = useTower();

  const lean = useRef(leanState());
  const motion = useRef({ x: 0, v: 0, a: 0, ready: false });
  const [drop, setDrop] = useState<Drop | null>(null);
  const dropGroup = useRef<Group | null>(null);
  const fall = useRef({
    x: 0,
    y: 0,
    speed: 0,
    z: 0,
    prevDy: Infinity,
    missed: false,
    missedAt: 0,
    vx: 0,
    vy: 0,
    spin: 0,
    nextAt: 0,
    last: -1,
    keys: 0,
  });
  const [debris, setDebris] = useState<{ key: number; pieces: Flying[] }>({
    key: 0,
    pieces: [],
  });
  const debrisGroups = useRef<(Group | null)[]>([]);
  const debrisBorn = useRef(0);

  const tmp = useMemo(
    () => ({
      up: new Vector3(),
      top: new Vector3(),
      head: new Vector3(),
      cam: new Vector3(),
      e: new Euler(),
      q: new Quaternion(),
    }),
    [],
  );

  // A new round: upright, nothing falling, the first item soon.
  useEffect(() => {
    if (phase !== "playing") {
      setDrop(null);
      return;
    }
    lean.current = leanState();
    fall.current.nextAt = performance.now() / 1000 + FIRST_DELAY;
    setDrop(null);
  }, [phase]);

  /** Throw the tower's pieces off the head. */
  const throwOff = (side: number) => {
    const { head } = live;
    const scale = head ? head.scale.x : 1;
    const pieces: Flying[] = [];
    getTower().stack.forEach((placed, k) => {
      // Each level's frame: its origin is the piece's bottom.
      const g = live.levels[k];
      if (!g) return;
      g.updateWorldMatrix(true, false);
      const position = new Vector3();
      const quaternion = new Quaternion();
      g.matrixWorld.decompose(position, quaternion, tmp.cam);
      pieces.push({
        ...placed,
        position,
        quaternion,
        scale,
        // Toward the way it was leaning, the top ones faster; a hop up.
        velocity: new Vector3(
          -side * (25 + 12 * k + Math.random() * 15),
          35 + Math.random() * 35,
          (Math.random() - 0.5) * 30,
        ).multiplyScalar(scale),
        spin: new Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          side * (2 + Math.random() * 3),
        ),
      });
    });
    debrisBorn.current = performance.now() / 1000;
    setDebris((d) => ({ key: d.key + 1, pieces }));
  };

  useFrame((_st, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const now = performance.now() / 1000;
    const { head } = live;
    const { stack } = getTower();
    const n = stack.length;
    // The tower's load and how wide its top is (the cushion when empty).
    const load = stack.reduce((sum, p) => sum + PIECES[p.piece].touchy, 0);
    const window = catchFor(
      n ? PIECES[stack[n - 1].piece].width : CUSHION.width,
    );
    const f = fall.current;

    // Debris: flies off, tumbling, and shrinks away at the end.
    if (debris.pieces.length) {
      const age = now - debrisBorn.current;
      const g = GRAVITY;
      debris.pieces.forEach((p, i) => {
        const o = debrisGroups.current[i];
        if (!o) return;
        o.visible = age < DEBRIS_TIME;
        o.position
          .copy(p.position)
          .addScaledVector(p.velocity, age)
          .add(tmp.up.set(0, -0.5 * g * p.scale * age * age, 0));
        tmp.e.set(p.spin.x * age, p.spin.y * age, p.spin.z * age);
        o.quaternion.copy(p.quaternion).multiply(tmp.q.setFromEuler(tmp.e));
        const fade = age < DEBRIS_TIME - 0.4 ? 1 : (DEBRIS_TIME - age) / 0.4;
        o.scale.setScalar(Math.max(1e-4, p.scale * fade));
      });
      if (age > DEBRIS_TIME)
        setDebris((d) => (d.pieces.length ? { ...d, pieces: [] } : d));
    }

    if (!head || !live.tracked) return;

    // Your head: tilt in the screen, and how it moves sideways (cm).
    const scale = head.scale.x;
    tmp.up.set(0, 1, 0).applyQuaternion(head.quaternion);
    const roll = Math.atan2(-tmp.up.x, tmp.up.y);
    const m = motion.current;
    const x = head.position.x / scale;
    if (!m.ready) {
      m.x = x;
      m.ready = true;
    }
    if (dt > 0) {
      const k = 1 - Math.exp(-12 * dt);
      const v = m.v + ((x - m.x) / dt - m.v) * k;
      m.a += ((v - m.v) / dt - m.a) * k;
      m.v = v;
    }
    m.x = x;

    if (phase !== "playing") return;

    // The lean, shared up the tower: the top levels take more of it.
    lean.current = stepLean(lean.current, dt, roll, m.a, load);
    const total = (n * (n + 1)) / 2;
    for (let i = 0; i < n; i += 1) {
      const l = live.levels[i];
      if (l) l.rotation.z = (lean.current.angle * (i + 1)) / (total || 1);
    }
    if (!live.frozen && toppled(lean.current, roll, n)) {
      live.log?.(
        `topple ${n} at ${(((roll + lean.current.angle) * 180) / Math.PI).toFixed(0)}°`,
      );
      throwOff(Math.sign(roll + lean.current.angle) || 1);
      towerActions.topple();
      return;
    }

    // Where the next item would sit (world).
    const { top } = live;
    if (!top) return;
    top.getWorldPosition(tmp.top);

    // The screen at that depth.
    const cam = camera as PerspectiveCamera;
    cam.getWorldPosition(tmp.cam);
    const depth = Math.max(0.1, tmp.cam.z - tmp.top.z);
    const halfH =
      (depth * Math.tan(((cam.fov ?? 45) * Math.PI) / 360)) / (cam.zoom || 1);
    const halfW = halfH * (cam.aspect || 9 / 16);

    // Time for the next one? It falls near the top of the tower.
    if (!drop) {
      if (live.frozen || now < f.nextAt) return;
      const piece = pickItem(f.last, PIECES.length, Math.random);
      const look = Math.floor(Math.random() * PIECES[piece].looks.length);
      const off = live.aim ?? (Math.random() * 2 - 1) * spreadFor(n);
      f.x = Math.max(
        -0.85 * halfW,
        Math.min(0.85 * halfW, tmp.top.x + off * scale),
      );
      f.y = tmp.cam.y + halfH + 25 * scale;
      f.speed = (f.y - tmp.top.y) / fallTime(n);
      f.prevDy = Infinity;
      f.missed = false;
      f.last = piece;
      f.keys += 1;
      setDrop({ key: f.keys, piece, look });
      live.log?.(`drop ${PIECES[piece].id}`);
      return;
    }

    const g = dropGroup.current;
    if (!f.missed) {
      // Coming down onto the tower.
      f.y -= f.speed * dt;
      const dy = (f.y - tmp.top.y) / scale;
      const dx = (f.x - tmp.top.x) / scale;
      f.z = tmp.top.z;
      const r = judge(f.prevDy, dy, dx, window);
      f.prevDy = dy;
      if (r?.result === "caught") {
        lean.current = kick(lean.current, dx, window);
        live.log?.(
          `caught ${dx.toFixed(1)}cm of ±${window.toFixed(1)} → ${n + 1}`,
        );
        towerActions.push({ piece: drop.piece, look: drop.look });
        f.nextAt = now + GAME.fall.gap;
        setDrop(null);
        return;
      }
      if (r?.result === "missed") {
        // Off the edge of the tower (or your head) it bounces; clear of it,
        // it just keeps falling. Either way it tumbles off the screen.
        f.missed = true;
        const b = bounceOff(dx, f.speed / scale, window, Math.random);
        f.vx = (b?.vx ?? 0) * scale;
        f.vy = b ? b.vy * scale : -f.speed;
        f.spin = b ? Math.sign(b.vx) * -(4 + Math.random() * 4) : 0;
        f.missedAt = now;
        live.log?.(
          `missed ${dx.toFixed(1)}cm of ±${window.toFixed(1)}${b ? ", bounced" : ""}`,
        );
      }
    } else {
      f.vy -= GRAVITY * scale * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.y < tmp.cam.y - halfH - 30 * scale || now - f.missedAt > 4) {
        f.nextAt = now + GAME.fall.gap;
        setDrop(null);
        return;
      }
    }
    if (g) {
      g.visible = true;
      g.position.set(f.x, f.y, f.z);
      const tumble = f.missed ? f.spin * (now - f.missedAt) : 0;
      g.rotation.set(
        0,
        Math.sin(now * 1.3) * 0.4,
        Math.sin(now * 2.1) * 0.12 + tumble,
      );
      g.scale.setScalar(scale);
    }
  });

  // A fall clears what's in the air.
  useEffect(() => {
    setDrop(null);
  }, [falls]);

  return createPortal(
    <>
      {drop ? (
        <WorldPiece
          key={drop.key}
          placed={drop}
          groupRef={(gr) => {
            dropGroup.current = gr;
          }}
        />
      ) : null}
      {debris.pieces.map((p, i) => (
        <WorldPiece
          // eslint-disable-next-line react/no-array-index-key -- fixed for a fall
          key={`${debris.key}:${i}`}
          placed={p}
          instant
          groupRef={(gr) => {
            debrisGroups.current[i] = gr;
          }}
        />
      ))}
    </>,
    scene,
  );
};
