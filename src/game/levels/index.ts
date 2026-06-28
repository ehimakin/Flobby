import { levelTwo } from "./levelTwo";
import { levelThree } from "./levelThree";
import { tutorialLevel } from "./tutorial";
import type { LevelDefinition, LevelId } from "./types";

const levels: Record<LevelId, LevelDefinition> = {
  tutorial: tutorialLevel,
  "level-2": levelTwo,
  "level-3": levelThree
};

export function getLevel(levelId: LevelId): LevelDefinition {
  const level = levels[levelId];
  const width = level.tiles[0]?.length ?? 0;
  const map = level.tiles.join("");
  const validTiles = new Set(["#", ".", "F", "S", "E", "^"]);

  if (width === 0 || level.tiles.some((row) => row.length !== width)) {
    throw new Error(`Level ${level.id} has inconsistent row widths.`);
  }

  if ([...map].some((tile) => !validTiles.has(tile))) {
    throw new Error(`Level ${level.id} contains an unknown tile.`);
  }

  if ([...map].filter((tile) => tile === "S").length !== 1) {
    throw new Error(`Level ${level.id} must contain exactly one spawn.`);
  }

  if ([...map].filter((tile) => tile === "E").length !== 1) {
    throw new Error(`Level ${level.id} must contain exactly one exit.`);
  }

  return level;
}

export type { LevelDefinition, LevelId, LevelRoom } from "./types";
