// =========================================================
// Ember & Tide - Forest Temple Campaign
// 32 original single-screen co-op puzzle layouts inspired by
// classic elemental co-op platformer design. No proprietary art
// or 1:1 level geometry is used.
// =========================================================

const W = 1520;
const H = 900;

const layouts = [
  // 1-4: fundamentals
  { kind: 'intro', hazards: [['lava', 300, 814, 240, 26], ['water', 980, 814, 240, 26]] },
  { kind: 'split', hazards: [['lava', 250, 814, 220, 26], ['water', 1050, 814, 220, 26], ['acid', 650, 814, 220, 26]] },
  { kind: 'tower', hazards: [['water', 410, 814, 220, 26], ['lava', 890, 814, 220, 26], ['acid', 690, 554, 140, 20]] },
  { kind: 'zigzag', hazards: [['lava', 330, 814, 180, 26], ['water', 1010, 814, 180, 26], ['acid', 650, 694, 180, 20]] },

  // 5-11: route planning and timing
  { kind: 'basin', hazards: [['lava', 260, 814, 180, 26], ['water', 660, 814, 200, 26], ['acid', 1080, 814, 180, 26]] },
  { kind: 'bridge', hazards: [['water', 240, 814, 360, 26], ['lava', 900, 814, 360, 26]] },
  { kind: 'stairs', hazards: [['lava', 360, 814, 180, 26], ['water', 980, 814, 180, 26], ['acid', 690, 634, 140, 20]] },
  { kind: 'islands', hazards: [['water', 260, 814, 280, 26], ['lava', 980, 814, 280, 26]] },
  { kind: 'u', hazards: [['lava', 430, 814, 240, 26], ['water', 850, 814, 240, 26], ['acid', 680, 734, 160, 20]] },
  { kind: 'twin', hazards: [['lava', 220, 814, 300, 26], ['water', 1000, 814, 300, 26]] },
  { kind: 'cross', hazards: [['lava', 520, 814, 180, 26], ['water', 820, 814, 180, 26], ['acid', 700, 474, 120, 20]] },

  // 12-17: compound puzzles
  { kind: 'canyon', hazards: [['acid', 330, 814, 860, 26], ['lava', 580, 654, 160, 20], ['water', 780, 654, 160, 20]] },
  { kind: 'switchback', hazards: [['water', 240, 814, 240, 26], ['lava', 1040, 814, 240, 26], ['acid', 650, 534, 220, 20]] },
  { kind: 'threeTier', hazards: [['lava', 250, 814, 180, 26], ['water', 1090, 814, 180, 26], ['acid', 620, 694, 280, 20]] },
  { kind: 'gateHall', hazards: [['water', 300, 814, 200, 26], ['lava', 1020, 814, 200, 26], ['acid', 640, 814, 240, 26]] },
  { kind: 'spiral', hazards: [['lava', 250, 814, 180, 26], ['water', 1090, 814, 180, 26], ['acid', 650, 594, 220, 20]] },
  { kind: 'splitTower', hazards: [['lava', 220, 814, 260, 26], ['water', 1040, 814, 260, 26], ['acid', 690, 394, 140, 20]] },

  // 18-23: simultaneous/symmetrical-feeling rooms
  { kind: 'mirror', hazards: [['lava', 220, 814, 300, 26], ['water', 1000, 814, 300, 26]] },
  { kind: 'mirrorSteps', hazards: [['water', 300, 814, 220, 26], ['lava', 1000, 814, 220, 26], ['acid', 690, 694, 140, 20]] },
  { kind: 'parallel', hazards: [['lava', 240, 814, 260, 26], ['water', 1020, 814, 260, 26]] },
  { kind: 'doubleBridge', hazards: [['water', 240, 814, 420, 26], ['lava', 860, 814, 420, 26]] },
  { kind: 'symmetricCross', hazards: [['lava', 260, 814, 220, 26], ['water', 1040, 814, 220, 26], ['acid', 690, 514, 140, 20]] },
  { kind: 'dualTower', hazards: [['lava', 200, 814, 260, 26], ['water', 1060, 814, 260, 26], ['acid', 690, 334, 140, 20]] },

  // 24-32: advanced multi-switch / box / elevator layouts
  { kind: 'boxMaze', hazards: [['lava', 260, 814, 220, 26], ['water', 1040, 814, 220, 26], ['acid', 650, 754, 220, 20]] },
  { kind: 'elevator', hazards: [['water', 250, 814, 360, 26], ['lava', 910, 814, 360, 26]] },
  { kind: 'multiGate', hazards: [['lava', 220, 814, 240, 26], ['water', 1060, 814, 240, 26], ['acid', 650, 614, 220, 20]] },
  { kind: 'deepPit', hazards: [['acid', 180, 814, 1160, 26], ['lava', 420, 654, 180, 20], ['water', 920, 654, 180, 20]] },
  { kind: 'fourRooms', hazards: [['lava', 230, 814, 180, 26], ['water', 1110, 814, 180, 26], ['acid', 650, 714, 220, 20]] },
  { kind: 'verticalCore', hazards: [['lava', 280, 814, 220, 26], ['water', 1020, 814, 220, 26], ['acid', 690, 454, 140, 20]] },
  { kind: 'diamondRun', hazards: [['water', 240, 814, 220, 26], ['lava', 1060, 814, 220, 26], ['acid', 690, 574, 140, 20]] },
  { kind: 'finale', hazards: [['lava', 200, 814, 260, 26], ['water', 1060, 814, 260, 26], ['acid', 600, 814, 320, 26], ['acid', 690, 394, 140, 20]] }
];

function platform(x, y, width, height = 24) {
  return { x, y, width, height, solid: true };
}

function basePlatforms() {
  return [
    platform(0, 0, W, 30),
    platform(0, 0, 30, H),
    platform(W - 30, 0, 30, H)
  ];
}

function shape(kind) {
  switch (kind) {
    case 'intro': return [platform(0, 840, 300, 60), platform(540, 840, 440, 60), platform(1220, 840, 300, 60), platform(180, 680, 300), platform(600, 560, 300), platform(1020, 680, 320)];
    case 'split': return [platform(0, 840, 250, 60), platform(470, 840, 180), platform(870, 840, 180), platform(1270, 840, 250), platform(120, 690, 280), platform(500, 570, 260), platform(920, 570, 260), platform(1140, 690, 260)];
    case 'tower': return [platform(0, 840, 410, 60), platform(630, 840, 260, 60), platform(1110, 840, 410, 60), platform(160, 690, 300), platform(1060, 690, 300), platform(390, 540, 300), platform(830, 540, 300), platform(610, 390, 300), platform(430, 240, 260), platform(830, 240, 260)];
    case 'zigzag': return [platform(0, 840, 330, 60), platform(510, 840, 500, 60), platform(1190, 840, 330, 60), platform(160, 700, 300), platform(520, 610, 300), platform(880, 700, 300), platform(1160, 610, 220), platform(640, 460, 260), platform(340, 320, 260), platform(920, 320, 260)];
    case 'basin': return [platform(0, 840, 260, 60), platform(440, 840, 220, 60), platform(860, 840, 220, 60), platform(1260, 840, 260, 60), platform(180, 680, 260), platform(520, 590, 260), platform(860, 680, 260), platform(1120, 590, 260), platform(600, 430, 320), platform(420, 280, 240), platform(860, 280, 240)];
    case 'bridge': return [platform(0, 840, 240, 60), platform(600, 840, 300, 60), platform(1260, 840, 260, 60), platform(120, 700, 340), platform(500, 700, 520), platform(1060, 700, 340), platform(280, 520, 280), platform(960, 520, 280), platform(600, 340, 320), platform(600, 180, 320)];
    case 'stairs': return [platform(0, 840, 360, 60), platform(540, 840, 440, 60), platform(1160, 840, 360, 60), platform(180, 700, 300), platform(500, 610, 300), platform(820, 520, 300), platform(1140, 430, 220), platform(680, 330, 280), platform(400, 230, 220), platform(900, 170, 220)];
    case 'islands': return [platform(0, 840, 260, 60), platform(540, 840, 440, 60), platform(1260, 840, 260, 60), platform(120, 690, 260), platform(440, 590, 260), platform(780, 690, 260), platform(1120, 590, 260), platform(560, 430, 400), platform(300, 280, 260), platform(960, 280, 260)];
    case 'u': return [platform(0, 840, 430, 60), platform(670, 840, 180, 60), platform(1090, 840, 430, 60), platform(160, 680, 280), platform(1080, 680, 280), platform(400, 560, 720), platform(520, 400, 480), platform(650, 240, 220)];
    case 'twin': return [platform(0, 840, 220, 60), platform(520, 840, 480, 60), platform(1300, 840, 220, 60), platform(120, 700, 320), platform(1080, 700, 320), platform(260, 550, 280), platform(980, 550, 280), platform(420, 400, 680), platform(560, 230, 400)];
    case 'cross': return [platform(0, 840, 520, 60), platform(700, 840, 120, 60), platform(1000, 840, 520, 60), platform(180, 700, 280), platform(1060, 700, 280), platform(480, 620, 560), platform(620, 470, 280), platform(300, 320, 300), platform(920, 320, 300), platform(620, 180, 280)];
    case 'canyon': return [platform(0, 840, 330, 60), platform(1190, 840, 330, 60), platform(220, 690, 280), platform(1020, 690, 280), platform(470, 560, 580), platform(610, 430, 300), platform(360, 300, 300), platform(860, 300, 300), platform(620, 170, 280)];
    case 'switchback': return [platform(0, 840, 240, 60), platform(500, 840, 520, 60), platform(1280, 840, 240, 60), platform(150, 700, 300), platform(1070, 700, 300), platform(420, 590, 300), platform(800, 500, 300), platform(500, 390, 300), platform(900, 280, 300), platform(600, 160, 300)];
    case 'threeTier': return [platform(0, 840, 250, 60), platform(430, 840, 660, 60), platform(1270, 840, 250, 60), platform(170, 700, 260), platform(1090, 700, 260), platform(300, 560, 920), platform(440, 410, 640), platform(600, 260, 320), platform(520, 130, 480)];
    case 'gateHall': return [platform(0, 840, 300, 60), platform(500, 840, 520, 60), platform(1220, 840, 300, 60), platform(160, 680, 1180), platform(300, 520, 240), platform(980, 520, 240), platform(520, 360, 480), platform(600, 200, 320)];
    case 'spiral': return [platform(0, 840, 250, 60), platform(1270, 840, 250, 60), platform(250, 760, 1020, 24), platform(150, 620, 300), platform(1070, 620, 300), platform(350, 480, 820), platform(500, 340, 520), platform(650, 200, 220)];
    case 'splitTower': return [platform(0, 840, 220, 60), platform(500, 840, 520, 60), platform(1300, 840, 220, 60), platform(130, 690, 300), platform(1090, 690, 300), platform(330, 540, 300), platform(890, 540, 300), platform(500, 390, 520), platform(610, 240, 300), platform(650, 100, 220)];
    case 'mirror': return [platform(0, 840, 220, 60), platform(520, 840, 480, 60), platform(1300, 840, 220, 60), platform(120, 700, 320), platform(1080, 700, 320), platform(240, 550, 300), platform(980, 550, 300), platform(400, 400, 720), platform(520, 250, 480), platform(650, 110, 220)];
    case 'mirrorSteps': return [platform(0, 840, 300, 60), platform(520, 840, 480, 60), platform(1220, 840, 300, 60), platform(160, 690, 300), platform(1060, 690, 300), platform(330, 560, 260), platform(930, 560, 260), platform(500, 430, 520), platform(420, 290, 240), platform(860, 290, 240), platform(650, 150, 220)];
    case 'parallel': return [platform(0, 840, 500, 60), platform(1020, 840, 500, 60), platform(180, 690, 360), platform(980, 690, 360), platform(300, 540, 300), platform(920, 540, 300), platform(420, 390, 680), platform(540, 240, 440), platform(650, 100, 220)];
    case 'doubleBridge': return [platform(0, 840, 240, 60), platform(660, 840, 200, 60), platform(1280, 840, 240, 60), platform(120, 700, 480), platform(920, 700, 480), platform(260, 540, 420), platform(840, 540, 420), platform(500, 380, 520), platform(600, 220, 320)];
    case 'symmetricCross': return [platform(0, 840, 260, 60), platform(1260, 840, 260, 60), platform(520, 840, 480, 60), platform(140, 690, 300), platform(1080, 690, 300), platform(340, 550, 300), platform(880, 550, 300), platform(520, 430, 480), platform(620, 300, 280), platform(620, 150, 280)];
    case 'dualTower': return [platform(0, 840, 200, 60), platform(1320, 840, 200, 60), platform(500, 840, 520, 60), platform(80, 690, 320), platform(1120, 690, 320), platform(220, 520, 300), platform(1000, 520, 300), platform(380, 350, 260), platform(880, 350, 260), platform(600, 210, 320), platform(650, 70, 220)];
    case 'boxMaze': return [platform(0, 840, 260, 60), platform(480, 840, 560, 60), platform(1260, 840, 260, 60), platform(130, 700, 280), platform(1110, 700, 280), platform(330, 570, 260), platform(930, 570, 260), platform(520, 430, 480), platform(420, 280, 260), platform(840, 280, 260), platform(650, 130, 220)];
    case 'elevator': return [platform(0, 840, 250, 60), platform(610, 840, 300, 60), platform(1270, 840, 250, 60), platform(150, 690, 300), platform(1070, 690, 300), platform(330, 540, 860), platform(480, 390, 560), platform(600, 240, 320), platform(650, 100, 220)];
    case 'multiGate': return [platform(0, 840, 220, 60), platform(500, 840, 520, 60), platform(1300, 840, 220, 60), platform(100, 690, 360), platform(1060, 690, 360), platform(300, 560, 280), platform(940, 560, 280), platform(500, 420, 520), platform(620, 270, 280), platform(620, 120, 280)];
    case 'deepPit': return [platform(0, 840, 180, 60), platform(1340, 840, 180, 60), platform(200, 700, 260), platform(1060, 700, 260), platform(360, 560, 800), platform(500, 410, 520), platform(620, 260, 280), platform(650, 100, 220)];
    case 'fourRooms': return [platform(0, 840, 230, 60), platform(410, 840, 220, 60), platform(890, 840, 220, 60), platform(1290, 840, 230, 60), platform(100, 690, 280), platform(1140, 690, 280), platform(360, 560, 800), platform(480, 410, 560), platform(600, 260, 320), platform(650, 110, 220)];
    case 'verticalCore': return [platform(0, 840, 280, 60), platform(500, 840, 520, 60), platform(1240, 840, 280, 60), platform(130, 690, 300), platform(1090, 690, 300), platform(350, 560, 820), platform(480, 410, 560), platform(600, 260, 320), platform(650, 110, 220)];
    case 'diamondRun': return [platform(0, 840, 240, 60), platform(480, 840, 560, 60), platform(1280, 840, 240, 60), platform(120, 700, 300), platform(1100, 700, 300), platform(300, 580, 300), platform(920, 580, 300), platform(480, 440, 560), platform(380, 300, 260), platform(880, 300, 260), platform(620, 160, 280)];
    case 'finale': return [platform(0, 840, 200, 60), platform(460, 840, 140, 60), platform(920, 840, 140, 60), platform(1320, 840, 200, 60), platform(100, 700, 300), platform(1120, 700, 300), platform(300, 560, 280), platform(940, 560, 280), platform(500, 420, 520), platform(600, 280, 320), platform(650, 140, 220), platform(600, 30, 320)];
    default: return [platform(0, 840, W, 60), platform(300, 650, 300), platform(920, 650, 300), platform(610, 450, 300), platform(610, 250, 300)];
  }
}

function makeMechanisms(id, kind) {
  const m = { pushBoxes: [], pressurePlates: [], levers: [], elementalRunes: [], doors: [], movingPlatforms: [], dualSwitches: [] };

  if (id >= 2) {
    m.pressurePlates.push({ id: `p${id}a`, x: 470, y: 812, width: 38, height: 8, targetIds: [`d${id}a`], color: '#ef4444', isLatching: false });
    m.doors.push({ id: `d${id}a`, x: 740, y: 760, width: 18, height: 80, openDirection: 'up', defaultOpen: false, color: '#ef4444' });
  }

  if (id >= 5) {
    m.pushBoxes.push({ id: `b${id}a`, x: 390, y: 800, width: 38, height: 38 });
    m.levers.push({ id: `l${id}a`, x: 1080, y: 650, width: 26, height: 30, targetIds: [`d${id}b`], defaultState: false });
    m.doors.push({ id: `d${id}b`, x: 520, y: 520, width: 18, height: 90, openDirection: 'up', defaultOpen: false, color: '#eab308' });
  }

  if (id >= 9) {
    m.movingPlatforms.push({ id: `mp${id}a`, x: 600, y: 760, width: 110, height: 16, waypoints: [{ x: 600, y: 560 }, { x: 900, y: 560 }], speed: 90, color: '#38bdf8', requiresTrigger: false });
  }

  if (id >= 15) {
    m.pressurePlates.push({ id: `p${id}b`, x: 1010, y: 680, width: 38, height: 8, targetIds: [`d${id}c`], color: '#38bdf8', isLatching: true });
    m.doors.push({ id: `d${id}c`, x: 760, y: 390, width: 18, height: 90, openDirection: 'up', defaultOpen: false, color: '#38bdf8' });
  }

  if (id >= 18) {
    m.dualSwitches.push({ id: `ds${id}`, x1: 360, y1: 520, x2: 1120, y2: 520, targetIds: [`d${id}d`], timeLimit: 3.2 });
    m.doors.push({ id: `d${id}d`, x: 740, y: 220, width: 18, height: 90, openDirection: 'up', defaultOpen: false, color: '#a855f7' });
  }

  if (id >= 24) {
    m.pushBoxes.push({ id: `b${id}b`, x: 1090, y: 650, width: 38, height: 38 });
    m.movingPlatforms.push({ id: `mp${id}b`, x: 680, y: 700, width: 100, height: 16, waypoints: [{ x: 680, y: 420 }, { x: 980, y: 420 }], speed: 80, color: '#f59e0b', requiresTrigger: false });
  }

  return m;
}

function buildLevel(id, spec) {
  const platforms = [...basePlatforms(), ...shape(spec.kind)];
  const hazards = spec.hazards.map(([type, x, y, width, height]) => ({ type, x, y, width, height }));

  const collectibles = [
    { type: 'fire', x: 250 + (id * 17) % 180, y: 780 },
    { type: 'water', x: 1070 - (id * 13) % 180, y: 780 },
    { type: 'universal', x: 650 + (id * 19) % 180, y: 340 }
  ];

  return {
    id,
    name: `Temple Chamber ${String(id).padStart(2, '0')}`,
    nameAr: `غرفة المعبد ${String(id).padStart(2, '0')}`,
    theme: id >= 24 ? 'sanctum' : 'forest-temple',
    description: 'A compact elemental co-op chamber. Route both heroes through distinct paths, switches and hazards.',
    parTime: Math.max(38, 92 - id),
    width: W,
    height: H,
    emberSpawn: { x: 72, y: 790 },
    tideSpawn: { x: 118, y: 790 },
    platforms,
    hazards,
    mechanisms: makeMechanisms(id, spec.kind),
    checkpoints: id >= 20 ? [{ id: `cp${id}`, x: 730, y: 700, width: 30, height: 50 }] : [],
    collectibles,
    emberGoal: { x: 690, y: 48, width: 44, height: 62 },
    tideGoal: { x: 786, y: 48, width: 44, height: 62 },
    hints: []
  };
}

export const FOREST_LEVELS = layouts.map((spec, i) => buildLevel(i + 1, spec));
