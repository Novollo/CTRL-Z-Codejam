// Schematic McGill downtown campus for the "Where are you?" picker (round 3). Owned by the lead.
// Not to scale, roughly right: Sherbrooke St at the bottom, Docteur-Penfield at the top (up the mountain),
// University St on the right, McTavish St on the left. Our own drawing: no official map is used.
//
// Track B renders this as an SVG (viewBox below). Pickable buildings (with `spot`) are red and clickable;
// the selected one gets a stronger red + a pin. Grey buildings are decoration only.

import type { CampusSpot } from "./catalog";

export interface MapBuilding {
  /** Set = pickable campus spot. Unset = grey decoration. */
  spot?: CampusSpot;
  label: string;
  /** SVG polygon points in viewBox units. */
  points: string;
  /** Where the label (and the pin) goes. */
  labelAt: [number, number];
}

export interface MapStreet {
  name: string;
  /** SVG path. Draw as a wide light-grey stroke. */
  d: string;
  labelAt: [number, number];
  /** Label rotation in degrees. */
  rotate: number;
}

export const CAMPUS_MAP = {
  viewBox: "0 0 360 300",
  note: "Not to scale",
  /** Light green areas: the lower field and the mountain edge. */
  green: [
    "M128 150 L248 146 L252 226 L126 230 Z", // lower field
    "M0 0 H360 V20 Q300 30 240 22 T120 24 T0 20 Z", // Mount Royal edge
  ],
  /** Paths inside campus: the main drive from the Roddick Gates. Thin grey dashed. */
  paths: ["M190 268 L190 104", "M190 140 L120 140", "M190 140 L262 132"],
  gates: { label: "Roddick Gates", at: [190, 262] as [number, number] },
  streets: [
    { name: "Sherbrooke St W", d: "M0 272 L360 266", labelAt: [300, 284], rotate: -1 },
    { name: "University St", d: "M338 36 L344 300", labelAt: [352, 160], rotate: 90 },
    { name: "McTavish St", d: "M62 36 L66 272", labelAt: [52, 165], rotate: -90 },
    { name: "Docteur-Penfield Ave", d: "M0 40 L360 34", labelAt: [120, 32], rotate: -1 },
  ] as MapStreet[],
  buildings: [
    // pickable (CAMPUS_SPOTS)
    { spot: "trottier", label: "Trottier", points: "286,64 326,62 327,100 287,102", labelAt: [306, 82] },
    { spot: "mclennan", label: "McLennan Library", points: "72,206 126,204 128,252 74,254", labelAt: [100, 229] },
    { spot: "leacock", label: "Leacock", points: "222,68 268,66 270,106 224,108", labelAt: [246, 87] },
    { spot: "bronfman", label: "Bronfman", points: "8,214 54,212 55,254 9,256", labelAt: [31, 234] },
    { spot: "burnside", label: "Burnside", points: "262,116 312,114 313,148 263,150", labelAt: [287, 132] },
    { spot: "ssmu", label: "SSMU", points: "10,84 54,82 55,128 11,130", labelAt: [32, 106] },
    { spot: "redpath", label: "Redpath Hall", points: "74,122 120,120 121,160 75,162", labelAt: [97, 141] },
    { spot: "mcconnell", label: "McConnell Eng.", points: "272,170 326,168 328,214 274,216", labelAt: [300, 192] },
    // decoration
    { label: "Arts", points: "160,58 220,56 221,98 161,100", labelAt: [190, 78] },
    { label: "Redpath Museum", points: "78,64 128,62 129,100 79,102", labelAt: [103, 82] },
    { label: "", points: "136,108 172,107 173,132 137,133", labelAt: [154, 120] },
    { label: "", points: "212,236 250,234 251,258 213,260", labelAt: [231, 247] },
  ] as MapBuilding[],
} as const;
