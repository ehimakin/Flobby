import Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { TiltController } from "../systems/TiltController";
import { createButton } from "../ui/createButton";

export class LandingScene extends Phaser.Scene {
  private tilt = new TiltController();
  private statusText?: Phaser.GameObjects.Text;
  private diagnosticText?: Phaser.GameObjects.Text;
  private nativeTiltButton?: HTMLButtonElement;
  private lastStatus = "";

  constructor() {
    super("LandingScene");
  }

  create(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "screen-bg");
    this.addStagePreview();

    this.add
      .text(GAME_WIDTH / 2, 128, "Clayboy", {
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
      .text(GAME_WIDTH / 2, 250, this.tilt.statusLabel, {
        color: "#cbd7df",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "15px"
      })
      .setOrigin(0.5);

    this.diagnosticText = this.add
      .text(GAME_WIDTH / 2, 274, this.tilt.getDiagnosticLabel(), {
        color: "#7f8d9a",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px"
      })
      .setOrigin(0.5);

    this.createNativeTiltButton();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.removeNativeTiltButton());
  }

  update(): void {
    const snapshot = this.tilt.snapshot;
    const status =
      snapshot.state === "granted"
        ? `${this.tilt.statusLabel}  ${snapshot.axisX.toFixed(2)}  samples ${snapshot.sampleCount}`
        : this.tilt.statusLabel;

    if (status !== this.lastStatus) {
      this.statusText?.setText(status);
      this.diagnosticText?.setText(this.tilt.getDiagnosticLabel());
      this.lastStatus = status;
    }
  }

  private async enableTilt(): Promise<void> {
    this.statusText?.setText("requesting tilt...");
    const state = await this.tilt.requestAccess();
    this.statusText?.setText(this.tilt.statusLabel);

    if (state === "granted") {
      this.tilt.calibrate();
      this.nativeTiltButton?.classList.add("is-ready");
      if (this.nativeTiltButton) {
        this.nativeTiltButton.textContent = "Tilt ready";
      }
    }
  }

  private createNativeTiltButton(): void {
    this.removeNativeTiltButton();

    const button = document.createElement("button");
    button.className = "native-tilt-button";
    button.type = "button";
    button.textContent = "Enable tilt";
    button.addEventListener("click", () => {
      void this.enableTilt();
    });
    document.body.appendChild(button);
    this.nativeTiltButton = button;
  }

  private removeNativeTiltButton(): void {
    this.nativeTiltButton?.remove();
    this.nativeTiltButton = undefined;
  }

  private addStagePreview(): void {
    const platformY = 446;
    for (let index = 0; index < 12; index += 1) {
      this.add.image(282 + index * 36, platformY, "tile-ground").setAlpha(0.86);
    }

    this.add.image(394, platformY - 56, "mineral");
    this.add.image(562, platformY - 56, "mineral");
    const hero = this.add.image(482, platformY - 55, "clayboy-normal").setDisplaySize(65, 65);

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
