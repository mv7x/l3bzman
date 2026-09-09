// =========================================================
// Level 5: The Molten Core (Theme: Core)
// Obsidian stone, pulsing magma veins & grand finale gateway
// =========================================================

export const level5 = {
  id: 5,
  name: "The Molten Core",
  nameAr: "القلب العنصري الأسطوري",
  theme: "core",
  description: "The deepest sanctuary of the temple. Combine all elemental abilities to restore equilibrium.",
  parTime: 90,
  width: 1520,
  height: 900,

  emberSpawn: { x: 70, y: 760 },
  tideSpawn: { x: 120, y: 760 },

  platforms: [
    { x: 0, y: 0, width: 32, height: 900, solid: true },
    { x: 1488, y: 0, width: 32, height: 900, solid: true },
    { x: 0, y: 0, width: 1520, height: 32, solid: true },

    { x: 0, y: 820, width: 260, height: 80, solid: true },
    { x: 440, y: 820, width: 220, height: 80, solid: true },
    { x: 840, y: 820, width: 260, height: 80, solid: true },
    { x: 1260, y: 820, width: 260, height: 80, solid: true },

    { x: 140, y: 640, width: 340, height: 24, solid: true },
    { x: 600, y: 640, width: 380, height: 24, solid: true },
    { x: 1100, y: 640, width: 388, height: 24, solid: true },

    { x: 60, y: 460, width: 380, height: 24, solid: true },
    { x: 560, y: 460, width: 440, height: 24, solid: true },
    { x: 1120, y: 460, width: 368, height: 24, solid: true },

    { x: 180, y: 280, width: 380, height: 24, solid: true },
    { x: 660, y: 260, width: 360, height: 24, solid: true },
    { x: 1140, y: 280, width: 348, height: 24, solid: true },

    { x: 560, y: 120, width: 440, height: 24, solid: true }
  ],

  hazards: [
    { type: 'lava', x: 260, y: 834, width: 180, height: 26 },
    { type: 'lava', x: 660, y: 834, width: 180, height: 26 },
    { type: 'water', x: 1100, y: 834, width: 160, height: 26 },
    { type: 'acid', x: 300, y: 620, width: 100, height: 20 },
    { type: 'acid', x: 800, y: 440, width: 100, height: 20 },
    { type: 'spikes', x: 700, y: 620, width: 60, height: 20, orientation: 'up' },
    { type: 'spikes', x: 300, y: 260, width: 60, height: 20, orientation: 'up' }
  ],

  mechanisms: {
    pushBoxes: [
      { id: 'box_core_1', x: 180, y: 600, width: 36, height: 36 }
    ],
    pressurePlates: [
      { id: 'plate_core_1', x: 200, y: 632, width: 36, height: 8, targetIds: ['door_core_t2'], color: '#ef4444', isLatching: false },
      { id: 'plate_core_2', x: 1380, y: 632, width: 36, height: 8, targetIds: ['lift_core_center'], color: '#38bdf8', isLatching: true }
    ],
    levers: [
      { id: 'lev_core_main', x: 100, y: 424, width: 24, height: 28, targetIds: ['door_core_t3'], defaultState: false },
      { id: 'lev_sanctuary', x: 1400, y: 244, width: 24, height: 28, targetIds: ['door_sanctuary_left'], defaultState: false }
    ],
    doors: [
      { id: 'door_core_t2', x: 600, y: 560, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#ef4444' },
      { id: 'door_core_t3', x: 560, y: 380, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#fbbf24' },
      { id: 'door_sanctuary_left', x: 560, y: 40, width: 16, height: 80, openDirection: 'up', defaultOpen: false, color: '#a855f7' }
    ],
    movingPlatforms: [
      { id: 'lift_core_center', x: 480, y: 760, width: 80, height: 16, waypoints: [{ x: 480, y: 460 }], speed: 80, color: '#38bdf8', requiresTrigger: true },
      { id: 'lift_core_left', x: 60, y: 440, width: 70, height: 16, waypoints: [{ x: 60, y: 280 }], speed: 75, color: '#eab308', requiresTrigger: false },
      { id: 'lift_core_right', x: 1400, y: 440, width: 70, height: 16, waypoints: [{ x: 1400, y: 280 }], speed: 75, color: '#a855f7', requiresTrigger: false },
      { id: 'lift_core_summit', x: 740, y: 260, width: 80, height: 16, waypoints: [{ x: 740, y: 120 }], speed: 70, color: '#22c55e', requiresTrigger: false }
    ],
    elementalRunes: [],
    dualSwitches: [
      { id: 'dual_core_apex', x1: 700, y1: 228, x2: 920, y2: 228, targetIds: ['door_sanctuary_left'], timeLimit: 2.5 }
    ]
  },

  checkpoints: [],

  collectibles: [
    { type: 'fire', x: 340, y: 780 },
    { type: 'water', x: 1180, y: 780 },
    { type: 'fire', x: 260, y: 210 },
    { type: 'water', x: 980, y: 210 },
    { type: 'universal', x: 780, y: 70 }
  ],

  emberGoal: { x: 710, y: 58, width: 42, height: 62 },
  tideGoal: { x: 800, y: 58, width: 42, height: 62 },

  hints: []
};
