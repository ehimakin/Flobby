# Clayboy Tiled Levels

Open `clayboy.tiled-project` in Tiled, then open a map from `maps/`.

The game supports two Tiled authoring styles. Levels 2 and 3 currently use the original
`36 x 36` tile workflow. Level 1 uses a full-background image with native pixel collision.

## Layer Contract

- `Background`: non-colliding wall or window surfaces.
- `Architecture`: visible bricks, frames, ledges, and structural details.
- `Collision`: the locked gameplay geometry. Do not repaint this while styling.
- `Decoration`: cracks, pipes, ivy, grime, and exit artwork.
- `Entities`: `spawn`, `mineral`, `hazard`, and `exit` objects.
- `Rooms`: Level 3 camera-room rectangles.

To move an exit, move its `exit` object on `Entities` and move the corresponding artwork on `Decoration` to the same grid cell. The `exitStyle` and `nextLevel` custom properties remain on the exit object.

The maps embed the tileset definition because Phaser does not parse external Tiled tilesets. The sibling `.tsj` file is a reusable source for new maps; replacing the shared PNG updates the artwork in all existing maps.

## Image-background maps

Use these exact layers:

- `Background`: a Tiled image layer. Register its file in `TILED_LEVEL_ASSETS` in
  `src/game/levels/tiled.ts` so Phaser preloads it.
- `Collision` or `Collisions`: an object layer containing axis-aligned rectangles or polygons. These objects
  stay invisible in the game.
- `Entities`: an object layer. Use `spawn` or `player_spawn`, plus optional `mineral`, `hazard`,
  `exit`, and `enemy_slug` objects.

The aliases `finish` and `goal` are also accepted as `exit`.

Image maps do not need a tileset or a populated tile layer. Their coordinates are used as
native pixels, so the Tiled map dimensions should match the background image dimensions.

For `enemy_slug`, optional float properties are `speed`, `patrol_min_x`, and `patrol_max_x`.
Patrol values are distances to the left and right of the enemy's starting position. The loader
also accepts the existing `patrol_mix_x` typo as `patrol_min_x`.

Run `npm run tiled:generate` only when intentionally rebuilding all three maps from the original TypeScript layouts. It overwrites map edits.
