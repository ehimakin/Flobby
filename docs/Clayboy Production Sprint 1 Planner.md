# Clayboy Production Sprint 1 Planner

## Sprint Goal

Turn the current gameplay prototype into a production-quality vertical slice. Sprint 1 will establish Clayboy's visual identity, the asset pipeline, scalable level authoring, and the reusable systems needed for Levels 4-20.

## 1. Lock Clayboy's Visual Design

- [x] Define Clayboy's final silhouette and proportions.
- [x] Create a normal-form character turnaround.
- [x] Design movement squash and stretch poses. Runtime frames: `public/assets/clayboy/movement/`.
- [ ] Design gravity-flip and edge-overhang poses.
- [ ] Design Hardened, Glue, and Super states.
- [ ] Design Brick, Arrow, and Cup form silhouettes.
- [ ] Define damage, cracking, recovery, and expression poses.
- [ ] Confirm sprite dimensions and collision-body proportions.
- [ ] Ensure every state is distinguishable by shape and material, not colour alone.

## 2. Replace Prototype Graphics

- [x] Produce Clayboy's first production sprite animations: gravity flip and directional movement.
- [ ] Create the first house-interior dungeon tileset.
- [ ] Create fruit, exit, door, and switch assets.
- [ ] Create spike, lava, and moving-platform assets.
- [ ] Create transformation and impact effects.
- [ ] Create mobile control and HUD icons.
- [ ] Retain generated prototype geometry as an optional debug view.

## 3. Move Level Authoring Into Tiled

- [x] Define the Tiled tileset and project configuration.
- [x] Add terrain and collision layers.
- [x] Add entity, fruit, exit, and hazard object layers.
- [x] Add camera-room boundaries.
- [ ] Add door, switch, enemy-path, and puzzle-trigger layers.
- [x] Build the Phaser Tiled JSON loader.
- [x] Migrate Levels 1-3 from string maps.
- [ ] Validate spawn points, exits, passages, and reachable objectives during loading.

## 4. Build Reusable Game Systems

- [ ] Implement the Clayboy state machine: Normal, Hardened, Glue, and Super.
- [ ] Implement the transformation-form framework: Brick, Arrow, and Cup.
- [ ] Implement reusable switches and doors.
- [ ] Implement toggle, pressure, and timed switch behaviours.
- [ ] Implement the enemy behaviour framework.
- [ ] Implement reusable environmental hazards.
- [ ] Add level progression and local save data.
- [ ] Add audio and mobile haptic feedback hooks.

## 5. Build Level 4 as the Vertical Slice

- [ ] Introduce switches and doors safely.
- [ ] Combine switches with existing gravity navigation.
- [ ] Use near-final Clayboy and environment art.
- [ ] Include final-feel animation, audio, camera transitions, and mobile controls.
- [ ] Test on iPhone in landscape and Home Screen modes.
- [ ] Use Level 4 quality as the baseline for all subsequent production levels.

## Definition of Done

- Clayboy has an approved visual design and readable state language.
- The first production tileset and core gameplay assets are in-game.
- Levels 1-3 load from Tiled JSON and retain their intended behaviour.
- Reusable state, transformation, switch, door, enemy, and hazard foundations exist.
- Progress can be saved locally.
- Level 4 is playable from start to finish as a polished vertical slice.
- Desktop, iPhone Safari, and installed Home Screen builds pass functional testing.

## Deferred Until Later Sprints

- Full enemy roster and final boss implementation.
- Final Levels 5-10 layouts.
- Cup-and-water simulation beyond a dedicated mechanic prototype.
- World 2 and Levels 11-20.
- Final music, cinematic animation, localisation, monetisation, and release operations.
