import Phaser from "phaser";
import { TiltController } from "./TiltController";

export type PlayerInputState = {
  moveX: number;
  flipPressed: boolean;
};

export class InputController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<"left" | "right" | "flip" | "space" | "reset" | "calibrate", Phaser.Input.Keyboard.Key>;
  private readonly touchState = {
    left: false,
    right: false,
    flip: false
  };
  private flipWasDown = false;
  private readonly onScreenTap = (
    _pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[]
  ): void => {
    const tappedControl = currentlyOver.some((gameObject) => gameObject.getData("blocks-screen-flip") === true);

    if (!tappedControl) {
      this.touchState.flip = true;
    }
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tilt?: TiltController
  ) {
    if (!scene.input.keyboard) {
      throw new Error("Keyboard input is required for Flobby controls.");
    }

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = {
      left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      flip: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      space: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      reset: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      calibrate: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)
    };

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onScreenTap);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onScreenTap);
    });
  }

  read(): PlayerInputState {
    const keyboardX = Number(this.cursors.right.isDown || this.keys.right.isDown) - Number(this.cursors.left.isDown || this.keys.left.isDown);
    const touchX = Number(this.touchState.right) - Number(this.touchState.left);
    const tiltX = this.tilt?.enabled ? this.tilt.horizontalAxis : 0;
    const moveX = Phaser.Math.Clamp(keyboardX || touchX || tiltX, -1, 1);

    const flipDown = this.cursors.up.isDown || this.keys.flip.isDown || this.keys.space.isDown || this.touchState.flip;
    const flipPressed = flipDown && !this.flipWasDown;
    this.flipWasDown = flipDown;
    this.touchState.flip = false;

    return { moveX, flipPressed };
  }

  get resetPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.reset);
  }

  get calibratePressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.calibrate);
  }

  bindTouchButton(button: Phaser.GameObjects.GameObject, control: "left" | "right"): void {
    button.setData("blocks-screen-flip", true);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => {
      this.touchState[control] = true;
    });
    button.on("pointerup", () => {
      this.touchState[control] = false;
    });
    button.on("pointerout", () => {
      this.touchState[control] = false;
    });
  }
}
