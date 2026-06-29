import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { tutorialLevel } from "../src/game/levels/tutorial.ts";
import { levelTwo } from "../src/game/levels/levelTwo.ts";
import { levelThree } from "../src/game/levels/levelThree.ts";
import type { LevelDefinition } from "../src/game/levels/types.ts";

const TILE_SIZE = 36;
const FIRST_GID = 1;

const TILE = {
  brick: 1,
  plaster: 2,
  darkPlaster: 3,
  timber: 4,
  windowGlass: 5,
  windowFrame: 6,
  mortarCrack: 7,
  glowingCrack: 8,
  drainpipe: 9,
  ledge: 10,
  ivy: 11,
  roofShingle: 12,
  grass: 13,
  foundation: 14,
  boardedWood: 15,
  brokenWindow: 16
} as const;

type ExitConfig = {
  tileX: number;
  tileY: number;
  style: "upper-drainpipe" | "window-ledge" | "window-crack";
  decorationGid: number;
};

type MapConfig = {
  filename: string;
  level: LevelDefinition;
  exit: ExitConfig;
  surface: "wall" | "window";
};

const maps: MapConfig[] = [
  {
    filename: "level-01.tmj",
    level: tutorialLevel,
    exit: { tileX: 22, tileY: 1, style: "upper-drainpipe", decorationGid: TILE.drainpipe },
    surface: "wall"
  },
  {
    filename: "level-02.tmj",
    level: levelTwo,
    exit: { tileX: 22, tileY: 1, style: "window-ledge", decorationGid: TILE.ledge },
    surface: "wall"
  },
  {
    filename: "level-03.tmj",
    level: levelThree,
    exit: { tileX: 69, tileY: 1, style: "window-crack", decorationGid: TILE.glowingCrack },
    surface: "window"
  }
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tiledRoot = resolve(root, "public/assets/tiled");
const mapsDir = resolve(tiledRoot, "maps");
const tilesetsDir = resolve(tiledRoot, "tilesets");

const property = (name: string, type: string, value: unknown) => ({ name, type, value });

const tilesetDefinition = (imagePath: string) => ({
  columns: 4,
  image: imagePath,
  imageheight: 144,
  imagewidth: 144,
  margin: 0,
  name: "house-exterior",
  spacing: 0,
  tilecount: 16,
  tileheight: TILE_SIZE,
  tilewidth: TILE_SIZE,
  tiles: [
    { id: 0, properties: [property("collision", "bool", true)] },
    { id: 5, properties: [property("collision", "bool", true)] },
    { id: 6, properties: [property("exitStyle", "string", "mortar-crack")] },
    { id: 7, properties: [property("exitStyle", "string", "window-crack")] },
    { id: 8, properties: [property("exitStyle", "string", "drainpipe-gap")] },
    { id: 9, properties: [property("collision", "bool", true)] },
    { id: 12, properties: [property("collision", "bool", true)] },
    { id: 13, properties: [property("collision", "bool", true)] }
  ],
  type: "tileset",
  version: "1.10"
});

const makeTileLayer = (id: number, name: string, width: number, height: number, data: number[], options = {}) => ({
  data,
  height,
  id,
  name,
  opacity: 1,
  type: "tilelayer",
  visible: true,
  width,
  x: 0,
  y: 0,
  ...options
});

function makeEntity(
  id: number,
  type: "spawn" | "mineral" | "hazard" | "exit",
  tileX: number,
  tileY: number,
  properties: Array<{ name: string; type: string; value: unknown }> = []
) {
  return {
    height: TILE_SIZE,
    id,
    name: type === "exit" ? "Level Exit" : `${type}-${id}`,
    properties,
    rotation: 0,
    type,
    visible: true,
    width: TILE_SIZE,
    x: tileX * TILE_SIZE,
    y: tileY * TILE_SIZE
  };
}

function createMap(config: MapConfig) {
  const { level, exit, surface } = config;
  const width = level.tiles[0].length;
  const height = level.tiles.length;
  const background = Array<number>(width * height).fill(0);
  const architecture = Array<number>(width * height).fill(0);
  const collision = Array<number>(width * height).fill(0);
  const decoration = Array<number>(width * height).fill(0);
  const entities = [];
  let nextObjectId = 1;

  level.tiles.forEach((row, tileY) => {
    [...row].forEach((symbol, tileX) => {
      const index = tileY * width + tileX;
      const isSolid = symbol === "#";

      if (isSolid) {
        collision[index] = TILE.brick;
        const exposedAbove = tileY > 0 && level.tiles[tileY - 1][tileX] !== "#";

        if (surface === "window") {
          architecture[index] = TILE.windowFrame;
        } else if (level.id === "tutorial" && tileY === height - 1) {
          architecture[index] = TILE.grass;
        } else if (tileY === height - 1) {
          architecture[index] = TILE.foundation;
        } else if (tileY === 0) {
          architecture[index] = level.id === "level-2" ? TILE.roofShingle : TILE.timber;
        } else {
          architecture[index] = exposedAbove ? TILE.ledge : TILE.brick;
        }

        if (surface === "wall" && (tileX * 7 + tileY * 11) % 41 === 0) {
          decoration[index] = TILE.ivy;
        }
      } else {
        background[index] =
          surface === "window"
            ? TILE.windowGlass
            : level.id === "level-2" && (tileX + tileY) % 5 === 0
              ? TILE.darkPlaster
              : TILE.plaster;
      }

      if (symbol === "S") {
        entities.push(makeEntity(nextObjectId++, "spawn", tileX, tileY));
      } else if (symbol === "F") {
        entities.push(makeEntity(nextObjectId++, "mineral", tileX, tileY));
      } else if (symbol === "^") {
        entities.push(makeEntity(nextObjectId++, "hazard", tileX, tileY));
      }
    });
  });

  if (level.id === "tutorial") {
    for (let tileY = 2; tileY < height - 1; tileY += 1) {
      decoration[tileY * width] = TILE.drainpipe;
    }
    background[4 * width + 4] = TILE.boardedWood;
  }

  if (level.id === "level-2") {
    for (let tileY = 1; tileY < height - 1; tileY += 1) {
      decoration[tileY * width + (width - 1)] = TILE.drainpipe;
    }
    background[3 * width + 5] = TILE.brokenWindow;
    background[3 * width + 6] = TILE.boardedWood;
  }

  decoration[exit.tileY * width + exit.tileX] = exit.decorationGid;
  entities.push(
    makeEntity(nextObjectId++, "exit", exit.tileX, exit.tileY, [
      property("exitStyle", "string", exit.style),
      property("nextLevel", "string", level.nextLevelId ?? "")
    ])
  );

  const roomObjects = (level.rooms ?? []).map((room) => ({
    height: room.height * TILE_SIZE,
    id: nextObjectId++,
    name: room.name,
    rotation: 0,
    type: "room",
    visible: true,
    width: room.width * TILE_SIZE,
    x: room.x * TILE_SIZE,
    y: room.y * TILE_SIZE
  }));

  const layers = [
    makeTileLayer(1, "Background", width, height, background, { locked: false }),
    makeTileLayer(2, "Architecture", width, height, architecture, { locked: false }),
    makeTileLayer(3, "Collision", width, height, collision, {
      locked: true,
      properties: [property("collision", "bool", true)],
      visible: false
    }),
    makeTileLayer(4, "Decoration", width, height, decoration, { locked: false }),
    {
      color: "#ffd166",
      draworder: "topdown",
      id: 5,
      name: "Entities",
      objects: entities,
      opacity: 1,
      type: "objectgroup",
      visible: true,
      x: 0,
      y: 0
    },
    {
      color: "#70d6a8",
      draworder: "topdown",
      id: 6,
      name: "Rooms",
      objects: roomObjects,
      opacity: 1,
      type: "objectgroup",
      visible: roomObjects.length > 0,
      x: 0,
      y: 0
    }
  ];

  return {
    compressionlevel: -1,
    height,
    infinite: false,
    layers,
    nextlayerid: 7,
    nextobjectid: nextObjectId,
    orientation: "orthogonal",
    properties: [
      property("levelId", "string", level.id),
      property("levelNumber", "int", level.number),
      property(
        "levelName",
        "string",
        level.id === "tutorial" ? "Thrown to the Grass" : level.id === "level-2" ? "Up the Old Wall" : "The Cracked Pane"
      ),
      property("nextLevelId", "string", level.nextLevelId ?? ""),
      property("setting", "string", surface === "window" ? "exterior-window" : "exterior-wall")
    ],
    renderorder: "right-down",
    tiledversion: "1.10.2",
    tileheight: TILE_SIZE,
    tilesets: [{ firstgid: FIRST_GID, ...tilesetDefinition("../tilesets/house-exterior.png") }],
    tilewidth: TILE_SIZE,
    type: "map",
    version: "1.10",
    width
  };
}

await mkdir(mapsDir, { recursive: true });
await mkdir(tilesetsDir, { recursive: true });

for (const config of maps) {
  await writeFile(resolve(mapsDir, config.filename), `${JSON.stringify(createMap(config), null, 2)}\n`);
}

await writeFile(
  resolve(tilesetsDir, "house-exterior.tsj"),
  `${JSON.stringify(tilesetDefinition("house-exterior.png"), null, 2)}\n`
);

await writeFile(
  resolve(tiledRoot, "clayboy.tiled-project"),
  `${JSON.stringify({ folders: ["."], extensions: ["tmj", "tsj"] }, null, 2)}\n`
);

console.log(`Generated ${maps.length} Tiled maps in ${mapsDir}`);
