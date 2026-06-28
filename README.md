# Flobby

A Phaser 3 + Vite + TypeScript web game scaffold for a tilt-friendly puzzle platformer.

## Sprint 1 Target

- Landing screen with start/settings affordances.
- Tutorial level that teaches movement, flipping gravity, collecting fruit, and reaching the exit.
- Keyboard, touch, and optional iPhone tilt controls.

## Run

```bash
npm install
npm run dev
```

The Vite dev server uses local HTTPS through `@vitejs/plugin-basic-ssl`, which is useful for testing iPhone motion/orientation APIs. On iOS, tilt input must be enabled from a tap gesture inside the game.

## Controls

- Move: left/right arrows, A/D, touch buttons, or tilt after permission is granted.
- Flip gravity: space, W/up arrow, or the on-screen flip button.
- Reset tutorial: R.

## Structure

```text
src/
  assets/              Static asset imports live here later.
  game/
    config.ts          Phaser game configuration.
    constants.ts       Shared sizing and tuning values.
    levels/            Level data and tile vocabulary.
    objects/           Gameplay object classes.
    scenes/            Phaser scene flow.
    systems/           Input, motion, and reusable game systems.
    ui/                Scene UI helpers.
  styles/
    global.css         Page-level shell styling.
```
