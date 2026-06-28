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

The default Vite dev server uses HTTP so the Codex in-app browser can load `http://localhost:5173`.

For iPhone motion/orientation testing, run:

```bash
npm run dev:https
```

The HTTPS script uses a local certificate through `@vitejs/plugin-basic-ssl`. On iOS, tilt input must be enabled from a tap gesture inside the game.

## Tilt Testing

1. Start the HTTPS server with `npm run dev:https`.
2. Open the network URL on the iPhone, for example `https://192.168.1.150:5174`.
3. Tap `Tilt` on the landing screen.
4. Allow motion/orientation access.
5. Hold the phone in a comfortable neutral position and tap `Cal` in the tutorial if movement drifts.

The browser must report a secure context for tilt access. Plain HTTP is useful for desktop/in-app browser testing, but iPhone motion permissions generally require HTTPS.

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
