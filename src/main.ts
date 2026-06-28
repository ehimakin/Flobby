import Phaser from "phaser";
import "./styles/global.css";
import { gameConfig } from "./game/config";

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

const lockLandscape = async (): Promise<void> => {
  try {
    const orientation = screen.orientation as LockableScreenOrientation | undefined;
    if (orientation?.lock) {
      await orientation.lock("landscape");
    }
  } catch {
    // Browsers often allow orientation lock only after install/fullscreen.
  }
};

window.addEventListener("pointerdown", () => void lockLandscape(), { once: true });
void lockLandscape();

new Phaser.Game(gameConfig);
