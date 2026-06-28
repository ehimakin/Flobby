import Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { TiltController } from "../systems/TiltController";
import { createButton } from "../ui/createButton";

export class LandingScene extends Phaser.Scene {
  private tilt = new TiltController();
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super("LandingScene");
  }

  create(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "screen-bg");
    this.addStagePreview();

    this.add
      .text(GAME_WIDTH / 2, 128, "Flobby", {
        color: "#f8f4e8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "78px",
        fontStyle: "800"
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 190, "squish, stick, flip", {
        color: "#70d6a8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "700"
      })
      .setOrigin(0.5);

    createButton(this, GAME_WIDTH / 2 - 78, 322, "Start", () => {
      this.registry.set("tilt", this.tilt);
      this.scene.start("TutorialLevelScene");
    });

    createButton(this, GAME_WIDTH / 2 + 78, 322, "Tilt", () => {
      void this.enableTilt();
    });

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 382, "keyboard / touch ready", {
        color: "#cbd7df",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "15px"
      })
      .setOrigin(0.5);
  }

  shutdown(): void {
    this.tilt.destroy();
  }

  private async enableTilt(): Promise<void> {
    const state = await this.tilt.requestAccess();
    const status = {
      granted: "tilt ready",
      denied: "tilt unavailable",
      unsupported: "tilt unsupported",
      idle: "keyboard / touch ready"
    }[state];

    this.statusText?.setText(status);
  }

  private addStagePreview(): void {
    const platformY = 446;
    for (let index = 0; index < 12; index += 1) {
      this.add.image(282 + index * 36, platformY, "tile-ground").setAlpha(0.86);
    }

    this.add.image(394, platformY - 56, "fruit");
    this.add.image(562, platformY - 56, "fruit");
    const hero = this.add.image(482, platformY - 55, "flobby").setScale(1.35);

    this.tweens.add({
      targets: hero,
      y: hero.y - 10,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut"
    });
  }
}
