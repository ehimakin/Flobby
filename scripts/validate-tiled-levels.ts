import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { tutorialLevel } from "../src/game/levels/tutorial.ts";
import { levelTwo } from "../src/game/levels/levelTwo.ts";
import { levelThree } from "../src/game/levels/levelThree.ts";
import type { LevelDefinition } from "../src/game/levels/types.ts";

const TILE_SIZE = 36;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const maps: Array<{ filename: string; level: LevelDefinition }> = [
  { filename: "level-01.tmj", level: tutorialLevel },
  { filename: "level-02.tmj", level: levelTwo },
  { filename: "level-03.tmj", level: levelThree }
];

const positionsFromDefinition = (level: LevelDefinition, symbol: string) =>
  level.tiles.flatMap((row, y) =>
    [...row].flatMap((candidate, x) => (candidate === symbol ? [`${x},${y}`] : []))
  );

const samePositions = (actual: string[], expected: string[], label: string) => {
  const left = [...actual].sort().join("|");
  const right = [...expected].sort().join("|");
  if (left !== right) {
    throw new Error(`${label} changed. Expected [${right}], received [${left}].`);
  }
};

for (const { filename, level } of maps) {
  const path = resolve(root, "public/assets/tiled/maps", filename);
  const map = JSON.parse(await readFile(path, "utf8"));
  const collision = map.layers.find((layer: { name: string }) =>
    ["Collision", "Collisions"].includes(layer.name)
  );
  const entities = map.layers.find((layer: { name: string }) => layer.name === "Entities");
  const rooms = map.layers.find((layer: { name: string }) => layer.name === "Rooms");

  if (!collision || !entities) {
    throw new Error(`${filename} is missing required Collision or Entities layers.`);
  }

  if (collision.type === "objectgroup") {
    const imageLayers = map.layers.filter(
      (layer: { image?: string; type: string; visible?: boolean }) =>
        layer.type === "imagelayer" && layer.visible !== false && layer.image
    );
    if (imageLayers.length === 0) {
      throw new Error(`${filename} uses object collision but has no visible image layer.`);
    }

    for (const layer of imageLayers) {
      await access(resolve(dirname(path), layer.image));
    }

    const spawns = entities.objects.filter((object: { name: string; type: string }) =>
      ["spawn", "player_spawn", "player-spawn"].includes((object.type || object.name).toLowerCase())
    );
    if (spawns.length !== 1) {
      throw new Error(`${filename} must contain exactly one spawn/player_spawn object.`);
    }

    const exits = entities.objects.filter((object: { name: string; type: string }) =>
      ["exit", "finish", "goal"].includes((object.type || object.name).toLowerCase())
    );
    if (exits.length > 1) {
      throw new Error(`${filename} may contain at most one exit/finish/goal object.`);
    }

    const invalidCollision = collision.objects.find(
      (object: { height: number; polygon?: unknown[]; width: number }) =>
        !(object.polygon?.length || (object.width > 0 && object.height > 0))
    );
    if (invalidCollision) {
      throw new Error(`${filename} has a Collision object without a rectangle or polygon shape.`);
    }

    console.log(`${filename}: image background, object collision, and entities validated`);
    continue;
  }

  if (map.tilewidth !== TILE_SIZE || map.tileheight !== TILE_SIZE) {
    throw new Error(`${filename} tile collision must use the ${TILE_SIZE}px gameplay grid.`);
  }

  const collisionPositions = collision.data.flatMap((gid: number, index: number) =>
    gid > 0 ? [`${index % map.width},${Math.floor(index / map.width)}`] : []
  );
  samePositions(collisionPositions, positionsFromDefinition(level, "#"), `${level.id} collision`);

  for (const [type, symbol] of [["spawn", "S"], ["mineral", "F"], ["hazard", "^"]] as const) {
    const actual = entities.objects
      .filter((object: { type: string }) =>
        type === "mineral" ? object.type === "mineral" || object.type === "fruit" : object.type === type
      )
      .map((object: { x: number; y: number }) => `${Math.floor(object.x / TILE_SIZE)},${Math.floor(object.y / TILE_SIZE)}`);
    samePositions(actual, positionsFromDefinition(level, symbol), `${level.id} ${type}`);
  }

  const exits = entities.objects.filter((object: { type: string }) => object.type === "exit");
  if (exits.length !== 1) {
    throw new Error(`${level.id} must contain exactly one Tiled exit object.`);
  }

  if ((level.rooms?.length ?? 0) !== (rooms?.objects.length ?? 0)) {
    throw new Error(`${level.id} room count changed during Tiled conversion.`);
  }

  console.log(`${filename}: geometry and entities validated`);
}
