export type LevelTile = "#" | "." | "F" | "S" | "E" | "^";

export type LevelId = "tutorial" | "level-2" | "level-3";

export type LevelRoom = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LevelDefinition = {
  id: LevelId;
  number: number;
  name: string;
  tiles: string[];
  rooms?: LevelRoom[];
  nextLevelId?: LevelId;
};
