import Phaser from "phaser";
import type { LevelDefinition, LevelId, LevelRoom, LevelTile } from "./types";

const TILED_MAP_KEYS: Record<LevelId, string> = {
  tutorial: "tiled-level-01",
  "level-2": "tiled-level-02",
  "level-3": "tiled-level-03"
};

export const TILED_LEVEL_ASSETS: Array<{
  id: LevelId;
  images?: Array<{ key: string; source: string; url: string }>;
  key: string;
  url: string;
}> = [
  {
    id: "tutorial",
    key: TILED_MAP_KEYS.tutorial,
    url: "assets/tiled/maps/level-01.tmj",
    images: [
      {
        key: "tiled-level-01-background",
        source: "../../levels/Level_1_bg.png",
        url: "assets/levels/Level_1_bg.png"
      }
    ]
  },
  {
    id: "level-2",
    key: TILED_MAP_KEYS["level-2"],
    url: "assets/tiled/maps/level-02.tmj",
    images: [
      {
        key: "tiled-level-02-background",
        source: "../../levels/Level_2_bg.png",
        url: "assets/levels/Level_2_bg.png"
      }
    ]
  },
  { id: "level-3", key: TILED_MAP_KEYS["level-3"], url: "assets/tiled/maps/level-03.tmj" }
];

type TiledProperty = {
  name: string;
  type: string;
  value: unknown;
};

type TiledPoint = {
  x: number;
  y: number;
};

type TiledTileLayer = {
  data: number[];
  height: number;
  name: string;
  type: "tilelayer";
  width: number;
};

type TiledObject = {
  height: number;
  name: string;
  point?: boolean;
  polygon?: TiledPoint[];
  properties?: TiledProperty[];
  type: string;
  visible?: boolean;
  width: number;
  x: number;
  y: number;
};

type TiledObjectLayer = {
  name: string;
  objects: TiledObject[];
  type: "objectgroup";
};

type TiledImageLayer = {
  image: string;
  name: string;
  offsetx?: number;
  offsety?: number;
  opacity?: number;
  type: "imagelayer";
  visible?: boolean;
  x?: number;
  y?: number;
};

type TiledMapJson = {
  height: number;
  layers: Array<TiledTileLayer | TiledObjectLayer | TiledImageLayer>;
  properties?: TiledProperty[];
  tileheight: number;
  tilesets?: unknown[];
  tilewidth: number;
  width: number;
};

type TilemapCacheEntry = {
  data: TiledMapJson;
  format: number;
};

export type TiledCollisionObject = {
  height: number;
  name: string;
  polygon?: TiledPoint[];
  width: number;
  x: number;
  y: number;
};

export type TiledWorldEntity = {
  height: number;
  name: string;
  point: boolean;
  properties?: TiledProperty[];
  type: string;
  width: number;
  x: number;
  y: number;
};

export type TiledWorldImage = {
  key: string;
  opacity: number;
  x: number;
  y: number;
};

export type TiledObjectWorld = {
  collisions: TiledCollisionObject[];
  entities: TiledWorldEntity[];
  height: number;
  images: TiledWorldImage[];
  width: number;
};

export type LoadedTiledLevel = {
  definition: LevelDefinition;
  exitStyle?: string;
  map?: Phaser.Tilemaps.Tilemap;
  objectWorld?: TiledObjectWorld;
};

export const getTiledProperty = <T>(
  properties: TiledProperty[] | undefined,
  name: string,
  fallback: T
): T => {
  const value = properties?.find((candidate) => candidate.name === name)?.value;
  return (value === undefined ? fallback : value) as T;
};

const normalizeEntityType = (entity: TiledObject): string => {
  const value = (entity.type || entity.name).trim().toLowerCase();
  if (value === "player_spawn" || value === "player-spawn") {
    return "spawn";
  }
  if (value === "finish" || value === "goal") {
    return "exit";
  }
  return value;
};

const loadObjectWorld = (
  raw: TiledMapJson,
  collisionLayer: TiledObjectLayer,
  entityLayer: TiledObjectLayer,
  levelId: LevelId
): TiledObjectWorld => {
  const asset = TILED_LEVEL_ASSETS.find((candidate) => candidate.id === levelId);
  const imageLayers = raw.layers.filter(
    (layer): layer is TiledImageLayer => layer.type === "imagelayer" && layer.visible !== false
  );
  const images = imageLayers.map((layer) => {
    const image = asset?.images?.find((candidate) => candidate.source === layer.image);
    if (!image) {
      throw new Error(
        `Tiled image layer ${layer.name} in ${levelId} uses ${layer.image}, but it is not registered in TILED_LEVEL_ASSETS.`
      );
    }
    return {
      key: image.key,
      opacity: layer.opacity ?? 1,
      x: (layer.x ?? 0) + (layer.offsetx ?? 0),
      y: (layer.y ?? 0) + (layer.offsety ?? 0)
    };
  });

  return {
    collisions: collisionLayer.objects
      .filter((object) => object.visible !== false)
      .map((object) => ({
        height: object.height,
        name: object.name,
        polygon: object.polygon,
        width: object.width,
        x: object.x,
        y: object.y
      })),
    entities: entityLayer.objects.map((entity) => ({
      height: entity.height,
      name: entity.name,
      point: entity.point === true,
      properties: entity.properties,
      type: normalizeEntityType(entity),
      width: entity.width,
      x: entity.x,
      y: entity.y
    })),
    height: raw.height * raw.tileheight,
    images,
    width: raw.width * raw.tilewidth
  };
};

export function loadTiledLevel(
  scene: Phaser.Scene,
  levelId: LevelId,
  fallback: LevelDefinition
): LoadedTiledLevel {
  const key = TILED_MAP_KEYS[levelId];
  const cached = scene.cache.tilemap.get(key) as TilemapCacheEntry | undefined;

  if (!cached?.data) {
    return { definition: fallback };
  }

  const raw = cached.data;
  const tileCollisionLayer = raw.layers.find(
    (layer): layer is TiledTileLayer =>
      layer.type === "tilelayer" && ["Collision", "Collisions"].includes(layer.name)
  );
  const objectCollisionLayer = raw.layers.find(
    (layer): layer is TiledObjectLayer =>
      layer.type === "objectgroup" && ["Collision", "Collisions"].includes(layer.name)
  );
  const entityLayer = raw.layers.find(
    (layer): layer is TiledObjectLayer => layer.type === "objectgroup" && layer.name === "Entities"
  );
  const roomLayer = raw.layers.find(
    (layer): layer is TiledObjectLayer => layer.type === "objectgroup" && layer.name === "Rooms"
  );

  if (!entityLayer || (!tileCollisionLayer && !objectCollisionLayer)) {
    throw new Error(`Tiled level ${levelId} requires Collision and Entities layers.`);
  }

  if (objectCollisionLayer) {
    const nextLevelId = getTiledProperty<string>(raw.properties, "nextLevelId", "");
    return {
      definition: {
        ...fallback,
        name: getTiledProperty(raw.properties, "levelName", fallback.name),
        nextLevelId: nextLevelId ? (nextLevelId as LevelId) : fallback.nextLevelId,
        number: getTiledProperty(raw.properties, "levelNumber", fallback.number)
      },
      objectWorld: loadObjectWorld(raw, objectCollisionLayer, entityLayer, levelId)
    };
  }

  if (!tileCollisionLayer) {
    throw new Error(`Tiled level ${levelId} has no supported Collision layer.`);
  }

  if (raw.tilewidth !== raw.tileheight) {
    throw new Error(`Tile-based Tiled level ${levelId} must use square tiles.`);
  }

  const tiles: LevelTile[][] = Array.from({ length: raw.height }, (_, tileY) =>
    Array.from({ length: raw.width }, (_, tileX) =>
      tileCollisionLayer.data[tileY * raw.width + tileX] > 0 ? "#" : "."
    )
  );

  let exitStyle: string | undefined;
  for (const entity of entityLayer.objects) {
    const tileX = Math.floor(entity.x / raw.tilewidth);
    const tileY = Math.floor(entity.y / raw.tileheight);
    const entityType = normalizeEntityType(entity);
    const symbol =
      entityType === "spawn"
        ? "S"
        : entityType === "fruit" || entityType === "mineral"
          ? "F"
          : entityType === "hazard"
            ? "^"
            : entityType === "exit"
              ? "E"
              : undefined;

    if (!symbol || !tiles[tileY]?.[tileX]) {
      continue;
    }

    if (tiles[tileY][tileX] === "#") {
      throw new Error(`Tiled ${entityType} in ${levelId} overlaps collision at ${tileX},${tileY}.`);
    }

    tiles[tileY][tileX] = symbol;
    if (entityType === "exit") {
      exitStyle = getTiledProperty(entity.properties, "exitStyle", "prototype");
    }
  }

  const rooms: LevelRoom[] = (roomLayer?.objects ?? []).map((room) => ({
    id: room.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name: room.name,
    x: Math.floor(room.x / raw.tilewidth),
    y: Math.floor(room.y / raw.tileheight),
    width: Math.floor(room.width / raw.tilewidth),
    height: Math.floor(room.height / raw.tileheight)
  }));

  const nextLevelId = getTiledProperty<string>(raw.properties, "nextLevelId", "");
  const definition: LevelDefinition = {
    id: levelId,
    number: getTiledProperty(raw.properties, "levelNumber", fallback.number),
    name: getTiledProperty(raw.properties, "levelName", fallback.name),
    tiles: tiles.map((row) => row.join("")),
    rooms: rooms.length ? rooms : undefined,
    nextLevelId: nextLevelId ? (nextLevelId as LevelId) : undefined
  };

  return {
    definition,
    exitStyle,
    map: scene.make.tilemap({ key })
  };
}
