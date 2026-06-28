import Phaser from "phaser";
import { COLORS } from "../constants";

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void
): Phaser.GameObjects.Container {
  const sprite = scene.add.image(0, 0, "button-pill");
  const text = scene.add
    .text(0, -1, label, {
      color: "#f8f4e8",
      fontFamily: "Inter, system-ui, sans-serif",
      fontSize: "18px",
      fontStyle: "700"
    })
    .setOrigin(0.5);

  const button = scene.add.container(x, y, [sprite, text]);
  button.setSize(sprite.width, sprite.height);
  button.setInteractive({ useHandCursor: true });
  button.on("pointerover", () => sprite.setTint(COLORS.mint));
  button.on("pointerout", () => sprite.clearTint());
  button.on("pointerdown", () => {
    scene.tweens.add({
      targets: button,
      scale: 0.96,
      duration: 70,
      yoyo: true
    });
    onClick();
  });

  return button;
}
