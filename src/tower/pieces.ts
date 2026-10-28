// The things you stack, built in code: a cushion that's always on your head
// and five office pieces (book, laptop, mug, tissue box, desk plant). Soft
// clay look: rounded edges, matte colours. Each is in canonical
// centimetres with its origin at the middle of its flat bottom, +Y up, +Z
// toward the camera, and sits flat on the one below.
import {
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
  type Material,
} from "three";
// eslint-disable-next-line import/extensions
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type Piece = {
  id: string;
  /** Where the next piece sits: cm above its bottom (soft tops pressed down). */
  height: number;
  /** Its top's width (cm): what you have to land on. */
  width: number;
  /**
   * How much it unsettles the tower (rules.ts adds these up): a wide flat
   * piece little, a tall or top-heavy one a lot.
   */
  touchy: number;
  /** Colourways: one is picked per drop. */
  looks: readonly (readonly string[])[];
  /** Builds it in one colourway. */
  build: (look: readonly string[]) => Group;
};

/** Room reflections, kept low so the key light shapes them. */
const ENV = 0.55;

const clay = (color: string, roughness = 0.62, metalness = 0) =>
  new MeshStandardMaterial({
    color,
    roughness,
    metalness,
    envMapIntensity: ENV,
  });

const mesh = (
  geometry: BufferGeometry,
  material: Material,
  [x, y, z]: readonly [number, number, number] = [0, 0, 0],
) => {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
};

/** A box with rounded edges, its bottom on y = `bottom`. */
const box = (
  w: number,
  h: number,
  d: number,
  r: number,
  material: Material,
  bottom = 0,
  x = 0,
  z = 0,
) =>
  mesh(
    new RoundedBoxGeometry(w, h, d, 4, Math.min(r, h / 2 - 1e-3)),
    material,
    [x, bottom + h / 2, z],
  );

/** Quarter circle from angle a to b (radians) about (cx, cy). */
const arc = (cx: number, cy: number, r: number, a: number, b: number) =>
  Array.from({ length: 7 }, (_, i) => {
    const t = a + ((b - a) * i) / 6;
    return new Vector2(cx + r * Math.cos(t), cy + r * Math.sin(t));
  });

/** A solid cylinder with rounded top and bottom edges (radius `rb` → `rt`). */
const roundCylinder = (rb: number, rt: number, h: number, round: number) =>
  new LatheGeometry(
    [
      new Vector2(0, 0),
      ...arc(rb - round, round, round, -Math.PI / 2, 0),
      ...arc(rt - round, h - round, round, 0, Math.PI / 2),
      new Vector2(0, h),
    ],
    40,
  );

const SOFT = Math.PI / 2;

/** The cushion that's always on your head: everything stacks on it. */
export const CUSHION: Piece = {
  id: "cushion",
  height: 3.6,
  width: 15,
  touchy: 0,
  looks: [["#f4d968", "#e2b93b"]],
  build: ([cover, button]) => {
    const g = new Group();
    // Puffy: a deep rounding, a little flattened.
    const c = box(16, 4.6, 14, 2.2, clay(cover, 0.85));
    c.scale.y = 0.85;
    c.position.y = 2;
    g.add(c);
    g.add(
      mesh(new SphereGeometry(0.55, 16, 12), clay(button, 0.5), [0, 3.75, 0]),
    );
    return g;
  },
};

export const PIECES: readonly Piece[] = [
  {
    id: "book",
    height: 3.2,
    width: 15,
    touchy: 0.7,
    // cover, pages, band
    looks: [
      ["#e5484d", "#f6efdc", "#f4d968"],
      ["#3e63dd", "#f6efdc", "#f4d968"],
      ["#30a46c", "#f6efdc", "#f4f1ea"],
      ["#8e4ec6", "#f6efdc", "#f4d968"],
    ],
    build: ([cover, pages, band]) => {
      const g = new Group();
      const c = clay(cover);
      const b = clay(band, 0.45);
      g.add(box(15, 0.5, 11, 0.24, c));
      g.add(box(15, 0.5, 11, 0.24, c, 2.7));
      g.add(box(0.8, 3.2, 11, 0.38, c, 0, -7.1));
      g.add(box(14.1, 2.3, 10.4, 0.12, clay(pages, 0.9), 0.45, 0.35));
      [0.85, 2.1].forEach((y) =>
        g.add(box(0.86, 0.26, 11.04, 0.1, b, y, -7.1)),
      );
      return g;
    },
  },
  {
    id: "laptop",
    height: 1.9,
    width: 19,
    touchy: 0.55,
    // shell, logo, seam
    looks: [
      ["#c9ced6", "#ffffff", "#5b6170"],
      ["#5b6170", "#c9ced6", "#2b2f38"],
      ["#e8b4b8", "#ffffff", "#9a6a70"],
      ["#2b3445", "#8ec5ff", "#151a22"],
    ],
    build: ([shell, logo, seam]) => {
      const g = new Group();
      const s = clay(shell, 0.38, 0.25);
      g.add(box(19, 1.25, 13, 0.55, s));
      g.add(box(18.7, 0.06, 12.7, 0.02, clay(seam, 0.7), 1.22));
      g.add(box(18.9, 0.62, 12.9, 0.28, s, 1.28));
      g.add(
        mesh(
          new CylinderGeometry(1.1, 1.1, 0.04, 32),
          clay(logo, 0.3),
          [0, 1.91, 0],
        ),
      );
      return g;
    },
  },
  {
    id: "mug",
    height: 9.6,
    width: 8.4,
    touchy: 1.4,
    // body, coffee
    looks: [
      ["#f4f1ea", "#6b3e26"],
      ["#e5484d", "#6b3e26"],
      ["#3e63dd", "#6b3e26"],
      ["#f4d968", "#6b3e26"],
    ],
    build: ([body, coffee]) => {
      const g = new Group();
      const m = clay(body, 0.5);
      m.side = DoubleSide;
      const R = 4.2;
      const H = 9.6;
      // Outside up, over the rim, down the inside to the coffee.
      g.add(
        mesh(
          new LatheGeometry(
            [
              new Vector2(0, 0),
              ...arc(R - 0.6, 0.6, 0.6, -SOFT, 0),
              ...arc(R - 0.3, H - 0.3, 0.3, 0, Math.PI),
              new Vector2(R - 0.6, H - 1.4),
              new Vector2(0, H - 1.4),
            ],
            40,
          ),
          m,
        ),
      );
      g.add(
        mesh(
          new CylinderGeometry(R - 0.62, R - 0.62, 0.05, 40),
          clay(coffee, 0.35),
          [0, H - 1.25, 0],
        ),
      );
      const handle = mesh(new TorusGeometry(2.3, 0.6, 14, 28, Math.PI), m, [
        R - 0.2,
        H / 2,
        0,
      ]);
      handle.rotation.z = -Math.PI / 2;
      g.add(handle);
      return g;
    },
  },
  {
    id: "tissues",
    height: 10,
    width: 12,
    touchy: 1,
    // box, band, slot
    looks: [
      ["#7fd8be", "#f4f1ea", "#4fa58c"],
      ["#f6a6c1", "#f4f1ea", "#c87390"],
      ["#8ec5ff", "#f4f1ea", "#5a8fc9"],
      ["#f4d968", "#f4f1ea", "#c9ad3e"],
    ],
    build: ([boxColor, band, slot]) => {
      const g = new Group();
      g.add(box(12, 10, 12, 0.9, clay(boxColor)));
      g.add(box(12.12, 1.6, 12.12, 0.7, clay(band, 0.7), 2.4));
      const s = mesh(
        new CylinderGeometry(1, 1, 0.05, 32),
        clay(slot, 0.8),
        [0, 10.01, 0],
      );
      s.scale.set(3.6, 1, 1.4);
      g.add(s);
      // The tissue poking out: two soft puffs (squashed when covered).
      const tissue = new Group();
      tissue.name = "squash";
      tissue.position.y = 10;
      const t = clay("#ffffff", 0.95);
      [-0.5, 0.6].forEach((a, i) => {
        const p = mesh(new SphereGeometry(1, 20, 14), t, [
          i ? 0.4 : -0.4,
          1.4,
          0,
        ]);
        p.scale.set(2.4, 2, 0.7);
        p.rotation.set(0.2, a, i ? -0.25 : 0.2);
        tissue.add(p);
      });
      g.add(tissue);
      return g;
    },
  },
  {
    id: "plant",
    // The next piece presses the leaves down onto the pot.
    height: 9.6,
    width: 9,
    touchy: 1.7,
    // pot, leaves, light leaves, soil
    looks: [
      ["#d9774b", "#30a46c", "#4cc38a", "#5a3a26"],
      ["#f4f1ea", "#30a46c", "#4cc38a", "#5a3a26"],
      ["#f6a6c1", "#2f9e66", "#5bd093", "#5a3a26"],
      ["#3e63dd", "#30a46c", "#4cc38a", "#5a3a26"],
    ],
    build: ([pot, leaf, leafLight, soil]) => {
      const g = new Group();
      g.add(mesh(roundCylinder(3.3, 4.5, 7.6, 0.45), clay(pot)));
      g.add(
        mesh(
          new CylinderGeometry(4.05, 4.05, 0.05, 36),
          clay(soil, 0.95),
          [0, 7.62, 0],
        ),
      );
      // Leaves fanning up and out (squashed when covered).
      const leaves = new Group();
      leaves.name = "squash";
      leaves.position.y = 7.4;
      const mats = [clay(leaf, 0.55), clay(leafLight, 0.55)];
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * Math.PI * 2;
        const tilt = i % 2 ? 0.55 : 0.32;
        const holder = new Group();
        holder.rotation.set(0, a, 0);
        const l = mesh(new SphereGeometry(1, 18, 14), mats[i % 2]);
        l.scale.set(1.25, 3.3, 0.45);
        l.position.set(0, 3.1, 0);
        const pivot = new Group();
        pivot.rotation.x = tilt;
        pivot.add(l);
        holder.add(pivot);
        leaves.add(holder);
      }
      g.add(leaves);
      return g;
    },
  },
];
