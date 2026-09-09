// =========================================================
// Level 2: Subterranean Flooded Forge
// =========================================================

export const level2 = {
  id: 2,
  name: "Subterranean Forge",
  nameAr: "المصنع المغمور",
  theme: "forge",
  description: "Navigate the active forge machinery and coordinate hydraulic elevators.",
  parTime: 55,
  width: 1360,
  height: 720,

  emberSpawn: { x: 70, y: 580 },
  tideSpawn: { x: 120, y: 580 },

  platforms: [
    { x: 0, y: 0, width: 32, height: 720, solid: true },
    { x: 1328, y: 0, width: 32, height: 720, solid: true },
    { x: 0, y: 0, width: 1360, height: 32, solid: true },

    { x: 0, y: 640, width: 240, height: 80, solid: true },
    { x: 240, y: 680, width: 180, height: 40, solid: true },
    { x: 420, y: 640, width: 180, height: 80, solid: true },
    { x: 600, y: 680, width: 180, height: 40, solid: true },
    { x: 780, y: 640, width: 200, height: 80, solid: true },
    { x: 980, y: 680, width: 180, height: 40, solid: true },
    { x: 1160, y: 640, width: 200, height: 80, solid: true },

    { x: 160, y: 480, width: 200, height: 24, solid: true },
    { x: 500, y: 460, width: 360, height: 24, solid: true },
    { x: 1000, y: 460, width: 220, height: 24, solid: true },

    { x: 80, y: 300, width: 280, height: 24, solid: true },
    { x: 560, y: 260, width: 240, height: 24, solid: true },
    { x: 980, y: 240, width: 348, height: 24, solid: true },
    { x: 1060, y: 120, width: 268, height: 24, solid: true }
  ],

  hazards: [
    { type: 'lava', x: 240, y: 654, width: 180, height: 26 },
    { type: 'water', x: 600, y: 654, width: 180, height: 26 },
    { type: 'acid', x: 980, y: 654, width: 180, height: 26 },
    { type: 'spikes', x: 620, y: 440, width: 60, height: 20, orientation: 'up' }
  ],

  mechanisms: {
    pushBoxes: [],
    pressurePlates: [
      { id: 'plate_high', x: 120, y: 292, width: 36, height: 8, targetIds: ['door_mid'], color: '#ef4444', isLatching: true }
    ],
    levers: [
      { id: 'lev_acid', x: 920, y: 604, width: 24, height: 28, targetIds: ['plat_acid_ferry'], defaultState: false }
    ],
    doors: [
      { id: 'door_mid', x: 560, y: 180, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#ef4444' }
    ],
    movingPlatforms: [
      { id: 'plat_lava', x: 250, y: 560, width: 70, height: 16, waypoints: [{ x: 390, y: 560 }], speed: 60, color: '#f59e0b', requiresTrigger: false },
      { id: 'plat_acid_ferry', x: 1000, y: 580, width: 70, height: 16, waypoints: [{ x: 1140, y: 580 }], speed: 75, color: '#22c55e', requiresTrigger: true },
      { id: 'plat_goal_lift', x: 920, y: 400, width: 70, height: 16, waypoints: [{ x: 920, y: 200 }], speed: 70, color: '#38bdf8', requiresTrigger: false }
    ],
    elementalRunes: [],
    dualSwitches: []
  },

  checkpoints: [],

  collectibles: [
    { type: 'fire', x: 320, y: 510 },
    { type: 'water', x: 690, y: 590 },
    { type: 'fire', x: 680, y: 210 },
    { type: 'water', x: 1120, y: 200 }
  ],

  emberGoal: { x: 1180, y: 58, width: 42, height: 62 },
  tideGoal: { x: 1250, y: 58, width: 42, height: 62 },

  hints: []
};
