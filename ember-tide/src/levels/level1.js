// =========================================================
// Level 1: The Forest Temple
// Introductory elemental puzzle layout
// =========================================================

export const level1 = {
  id: 1,
  name: "The Forest Temple",
  nameAr: "معبد الغابة",
  theme: "forest",
  description: "Navigate the mossy ruins, push the stone block, and reach the exit doors together.",
  parTime: 45,
  width: 1280,
  height: 720,

  // Spawns are placed directly above solid floor surfaces.
  // Player height is 42px, so y=636 places the hitbox safely on y=680.
  emberSpawn: { x: 70, y: 636 },
  tideSpawn: { x: 190, y: 556 },

  platforms: [
    { x: 0, y: 0, width: 32, height: 720, solid: true },
    { x: 1248, y: 0, width: 32, height: 720, solid: true },
    { x: 0, y: 0, width: 1280, height: 32, solid: true },

    // Tier 1 - Solid floor beneath the full lava and water basins.
    { x: 0, y: 680, width: 560, height: 40, solid: true },
    { x: 560, y: 708, width: 360, height: 12, solid: true },
    { x: 920, y: 680, width: 360, height: 40, solid: true },

    { x: 140, y: 600, width: 280, height: 20, solid: true },
    { x: 440, y: 540, width: 320, height: 20, solid: true },

    // Tier 2 - Mid tier; the acid pool has a solid ledge underneath it.
    { x: 160, y: 440, width: 440, height: 20, solid: true },
    { x: 620, y: 460, width: 380, height: 20, solid: true },
    // 42px clearance below the acid so both players can pass underneath it.
    { x: 740, y: 606, width: 180, height: 20, solid: true },
    { x: 1020, y: 480, width: 228, height: 20, solid: true },

    { x: 300, y: 280, width: 340, height: 20, solid: true },
    { x: 660, y: 310, width: 380, height: 20, solid: true },
    { x: 1060, y: 330, width: 188, height: 20, solid: true },

    { x: 860, y: 170, width: 388, height: 20, solid: true },
    { x: 32, y: 190, width: 240, height: 20, solid: true },
    { x: 320, y: 180, width: 340, height: 20, solid: true }
  ],

  hazards: [
    // Keep the original 180px lava and water basin sizes.
    { type: 'lava', x: 560, y: 684, width: 180, height: 24 },
    { type: 'water', x: 740, y: 684, width: 180, height: 24 },
    // Elevated toxic pool with solid ground beneath it.
    { type: 'acid', x: 760, y: 544, width: 160, height: 20 }
  ],

  mechanisms: {
    pushBoxes: [
      { id: 'box_silver', x: 600, y: 240, width: 36, height: 36 }
    ],
    pressurePlates: [
      { id: 'plate_tier2', x: 340, y: 432, width: 34, height: 8, targetIds: ['lift_yellow'], color: '#a855f7', isLatching: false },
      { id: 'plate_tier3', x: 920, y: 302, width: 34, height: 8, targetIds: ['lift_purple'], color: '#a855f7', isLatching: false }
    ],
    levers: [
      { id: 'lev_tier1', x: 320, y: 574, width: 24, height: 26, targetIds: ['lift_yellow'], defaultState: false }
    ],
    doors: [],
    movingPlatforms: [
      { id: 'lift_yellow', x: 40, y: 440, width: 110, height: 14, waypoints: [{ x: 40, y: 600 }], speed: 70, color: '#eab308', requiresTrigger: true },
      { id: 'lift_purple', x: 1060, y: 330, width: 110, height: 14, waypoints: [{ x: 1060, y: 170 }], speed: 70, color: '#a855f7', requiresTrigger: true }
    ],
    elementalRunes: [],
    dualSwitches: []
  },

  checkpoints: [],

  collectibles: [
    { type: 'fire', x: 340, y: 90 },
    { type: 'fire', x: 580, y: 150 },
    { type: 'water', x: 710, y: 150 },
    { type: 'water', x: 80, y: 160 },
    { type: 'fire', x: 230, y: 400 },
    { type: 'water', x: 730, y: 420 },
    { type: 'fire', x: 630, y: 640 },
    { type: 'water', x: 870, y: 640 }
  ],

  emberGoal: { x: 980, y: 108, width: 42, height: 62 },
  tideGoal: { x: 1060, y: 108, width: 42, height: 62 },

  hints: [
    { text: "Use A, W, D TO MOVE WATERGIRL...", x: 280, y: 520, type: 'water' },
    { text: "...Use ◀ ▲ ▶ TO MOVE FIREBOY", x: 260, y: 640, type: 'fire' },
    { text: "...NEVER MIX FIRE & WATER !", x: 800, y: 640, type: 'gold' }
  ]
};
