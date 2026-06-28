import Phaser from "phaser";
import "./styles/global.css";
import { gameConfig } from "./game/config";

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
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

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIphone = /iPhone|iPod/.test(navigator.userAgent);
const fullscreenButton = document.querySelector<HTMLButtonElement>("#fullscreen-button");
const installHint = document.querySelector<HTMLElement>("#install-hint");
const dismissInstallHint = installHint?.querySelector<HTMLButtonElement>("button");
const fullscreenRoot = document.documentElement as FullscreenElement;
const canRequestFullscreen =
  document.fullscreenEnabled === true &&
  (typeof fullscreenRoot.requestFullscreen === "function" || typeof fullscreenRoot.webkitRequestFullscreen === "function");

fullscreenButton?.classList.toggle("is-visible", !isStandalone && canRequestFullscreen);
installHint?.classList.toggle("is-visible", !isStandalone && isIphone);

fullscreenButton?.addEventListener("click", async () => {
  try {
    if (fullscreenRoot.requestFullscreen) {
      await fullscreenRoot.requestFullscreen();
    } else {
      await fullscreenRoot.webkitRequestFullscreen?.();
    }
    await lockLandscape();
  } catch {
    fullscreenButton.classList.remove("is-visible");
  }
});

dismissInstallHint?.addEventListener("click", () => {
  installHint?.classList.remove("is-visible");
});

new Phaser.Game(gameConfig);
