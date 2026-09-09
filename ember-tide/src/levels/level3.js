// =========================================================
// Level 3: Silver & Crystal Palace (Theme: Silver)
// Gleaming silver masonry, crystal platforms & vertical towers
// =========================================================

export const level3 = {
  id: 3,
  name: "Silver Crystal Palace",
  nameAr: "قصر البلور الفضي",
  theme: "silver",
  description: "Ascend the gleaming silver towers and synchronize crystal switches.",
  parTime: 65,
  width: 1280,
  height: 900,

  emberSpawn: { x: 80, y: 760 },
  tideSpawn: { x: 130, y: 760 },

  platforms: [
    { x: 0, y: 0, width: 32, height: 900, solid: true },
    { x: 1248, y: 0, width: 32, height: 900, solid: true },
    { x: 0, y: 0, width: 1280, height: 32, solid: true },

    { x: 0, y: 820, width: 440, height: 80, solid: true },
    { x: 600, y: 820, width: 680, height: 80, solid: true },

    { x: 120, y: 640, width: 320, height: 24, solid: true },
    { x: 580, y: 640, width: 560, height: 24, solid: true },

    { x: 60, y: 460, width: 480, height: 24, solid: true },
    { x: 700, y: 460, width: 480, height: 24, solid: true },

    { x: 180, y: 280, width: 360, height: 24, solid: true },
    { x: 740, y: 280, width: 360, height: 24, solid: true },

    { x: 440, y: 140, width: 400, height: 24, solid: true }
  ],

  hazards: [
    { type: 'lava', x: 440, y: 834, width: 80, height: 26 },
    { type: 'water', x: 520, y: 834, width: 80, height: 26 },
    { type: 'spikes', x: 260, y: 440, width: 72, height: 20, orientation: 'up' },
    { type: 'spikes', x: 880, y: 440, width: 72, height: 20, orientation: 'up' }
  ],

  mechanisms: {
    pushBoxes: [
      { id: 'box_silver_f2', x: 200, y: 600, width: 36, height: 36 }
    ],
    pressurePlates: [
      { id: 'plate_f2', x: 340, y: 632, width: 36, height: 8, targetIds: ['door_lift_f2'], color: '#38bdf8', isLatching: false }
    ],
    levers: [
      { id: 'lev_summit', x: 220, y: 244, width: 24, height: 28, targetIds: ['door_summit'], defaultState: false }
    ],
    doors: [
      { id: 'door_lift_f2', x: 580, y: 560, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#38bdf8' },
      { id: 'door_summit', x: 440, y: 60, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#f59e0b' }
    ],
    movingPlatforms: [
      { id: 'lift_bottom', x: 480, y: 800, width: 80, height: 16, waypoints: [{ x: 480, y: 640 }], speed: 70, color: '#38bdf8', requiresTrigger: false },
      { id: 'lift_left', x: 60, y: 440, width: 70, height: 16, waypoints: [{ x: 60, y: 280 }], speed: 85, color: '#a855f7', requiresTrigger: true },
      { id: 'lift_right', x: 1140, y: 440, width: 70, height: 16, waypoints: [{ x: 1140, y: 280 }], speed: 85, color: '#eab308', requiresTrigger: true }
    ],
    elementalRunes: [],
    dualSwitches: [
      { id: 'dual_f4', x1: 440, y1: 252, x2: 800, y2: 252, targetIds: ['door_summit'], timeLimit: 2.5 }
    ]
  },

  checkpoints: [],

  collectibles: [
    { type: 'fire', x: 460, y: 780 },
    { type: 'water', x: 540, y: 780 },
    { type: 'fire', x: 100, y: 420 },
    { type: 'water', x: 1180, y: 420 },
    { type: 'universal', x: 640, y: 90 }
  ],

  emberGoal: { x: 570, y: 78, width: 42, height: 62 },
  tideGoal: { x: 650, y: 78, width: 42, height: 62 },

  hints: []
};
