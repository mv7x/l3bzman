// =========================================================
// Ember & Tide - Level Registry & Loader
// =========================================================

import { FOREST_LEVELS } from './forestLevels.js';

// 32 distinct single-screen campaign chambers with deliberately varied silhouettes.
export const ALL_LEVELS = FOREST_LEVELS;

export function getLevelById(id) {
  const numId = Number(id);
  return ALL_LEVELS.find(lvl => lvl.id === numId) || ALL_LEVELS[0];
}
