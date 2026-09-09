// =========================================================
// Ember & Tide - Level Registry & Loader
// =========================================================

import { level1 } from './level1.js';
import { level2 } from './level2.js';
import { level3 } from './level3.js';
import { level4 } from './level4.js';
import { level5 } from './level5.js';

export const ALL_LEVELS = [
  level1,
  level2,
  level3,
  level4,
  level5
];

export function getLevelById(id) {
  const numId = Number(id);
  return ALL_LEVELS.find(lvl => lvl.id === numId) || level1;
}
