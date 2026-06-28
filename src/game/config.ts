import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { LandingScene } from "./scenes/LandingScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { TutorialLevelScene } from "./scenes/TutorialLevelScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#17202a",
  pixelArt: false,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0, x: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  input: {
    activePointers: 3
  },
  scene: [BootScene, PreloadScene, LandingScene, TutorialLevelScene]
};
