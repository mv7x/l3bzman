// =========================================================
// Level 4: Desert & Sandstone Temple (Theme: Desert)
// Sun-baked sandstone, golden dunes & reciprocal labyrinths
// =========================================================

export const level4 = {
  id: 4,
  name: "Sandstone Labyrinth",
  nameAr: "متاهة الرمال الذهبية",
  theme: "desert",
  description: "Split your paths across the ancient golden dunes and coordinate reciprocal switches.",
  parTime: 75,
  width: 1440,
  height: 720,

  emberSpawn: { x: 70, y: 580 },
  tideSpawn: { x: 120, y: 580 },

  platforms: [
    { x: 0, y: 0, width: 32, height: 720, solid: true },
    { x: 1408, y: 0, width: 32, height: 720, solid: true },
    { x: 0, y: 0, width: 1440, height: 32, solid: true },

    { x: 0, y: 640, width: 220, height: 80, solid: true },
    { x: 380, y: 640, width: 180, height: 80, solid: true },
    { x: 720, y: 640, width: 220, height: 80, solid: true },
    { x: 1100, y: 640, width: 340, height: 80, solid: true },

    { x: 180, y: 460, width: 380, height: 24, solid: true },
    { x: 680, y: 460, width: 440, height: 24, solid: true },

    { x: 80, y: 280, width: 340, height: 24, solid: true },
    { x: 540, y: 260, width: 320, height: 24, solid: true },
    { x: 960, y: 280, width: 448, height: 24, solid: true },

    { x: 1140, y: 140, width: 268, height: 24, solid: true }
  ],

  hazards: [
    { type: 'lava', x: 220, y: 654, width: 160, height: 26 },
    { type: 'lava', x: 560, y: 654, width: 160, height: 26 },
    { type: 'water', x: 940, y: 654, width: 160, height: 26 },
    { type: 'water', x: 420, y: 440, width: 120, height: 20 },
    { type: 'spikes', x: 760, y: 440, width: 60, height: 20, orientation: 'up' },
    { type: 'spikes', x: 240, y: 260, width: 60, height: 20, orientation: 'up' }
  ],

  mechanisms: {
    pushBoxes: [
      { id: 'box_desert_1', x: 260, y: 420, width: 36, height: 36 }
    ],
    pressurePlates: [
      { id: 'plate_recip_ember', x: 440, y: 632, width: 36, height: 8, targetIds: ['door_upper_tide'], color: '#f59e0b', isLatching: false },
      { id: 'plate_recip_tide', x: 620, y: 252, width: 36, height: 8, targetIds: ['door_lower_ember'], color: '#38bdf8', isLatching: false }
    ],
    levers: [
      { id: 'lev_mid_ferry', x: 740, y: 604, width: 24, height: 28, targetIds: ['plat_twin_ferry'], defaultState: false },
      { id: 'lev_goal_gate', x: 1040, y: 244, width: 24, height: 28, targetIds: ['door_goal_final'], defaultState: false }
    ],
    doors: [
      { id: 'door_upper_tide', x: 540, y: 180, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#f59e0b' },
      { id: 'door_lower_ember', x: 720, y: 560, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#38bdf8' },
      { id: 'door_goal_final', x: 1140, y: 60, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#10b981' }
    ],
    movingPlatforms: [
      { id: 'plat_twin_ferry', x: 570, y: 580, width: 70, height: 16, waypoints: [{ x: 700, y: 580 }], speed: 70, color: '#f59e0b', requiresTrigger: true },
      { id: 'lift_right_ascent', x: 1020, y: 500, width: 70, height: 16, waypoints: [{ x: 1020, y: 280 }], speed: 80, color: '#38bdf8', requiresTrigger: false }
    ],
    elementalRunes: [],
    dualSwitches: [
      { id: 'dual_twin_end', x1: 960, y1: 252, x2: 1300, y2: 252, targetIds: ['door_goal_final'], timeLimit: 3.0 }
    ]
  },

  checkpoints: [],

  collectibles: [
    { type: 'fire', x: 300, y: 600 },
    { type: 'water', x: 480, y: 400 },
    { type: 'fire', x: 800, y: 420 },
    { type: 'water', x: 1240, y: 230 }
  ],

  emberGoal: { x: 1200, y: 78, width: 42, height: 62 },
  tideGoal: { x: 1280, y: 78, width: 42, height: 62 },

  hints: []
};
