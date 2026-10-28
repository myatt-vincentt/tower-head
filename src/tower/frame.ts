// Where the tower stands: the top of the SDK's v3 skull, and the head and
// neck occluders. Canonical head frame: centimetres, +Y up, +Z out of the
// face.

/** The top of the SDK's v3 skull, canonical cm: the cushion sits here. */
export const CROWN: [number, number, number] = [0, 13.26, -3.76];

/** The SDK's v3 head occluder, hosted here until the SDK CDN serves it. */
export const OCCLUDER_URL = "/models/head-occluder-v3.glb";

/** The SDK's neck-and-shoulders bust occluder (same story). */
export const NECK_OCCLUDER_URL = "/models/neck-occluder-bust-v1.glb";
