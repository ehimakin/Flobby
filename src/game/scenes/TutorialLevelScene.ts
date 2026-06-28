import Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from "../constants";
import { tutorialLevel } from "../levels/tutorial";
import { Flobby } from "../objects/Flobby";
import { InputController } from "../systems/InputController";
import { TiltController } from "../systems/TiltController";

const LEVEL_ORIGIN = {
  x: 48,
  y: 72
};

export class TutorialLevelScene extends Phaser.Scene {
  private player?: Flobby;
  private inputController?: InputController;
  private platforms?: Phaser.Physics.Arcade.StaticGroup;
  private hazards?: Phaser.Physics.Arcade.StaticGroup;
  private fruits?: Phaser.Physics.Arcade.StaticGroup;
  private exit?: Phaser.Physics.Arcade.StaticImage;
  private fruitCount = 0;
  private fruitText?: Phaser.GameObjects.Text;

  constructor() {
    super("TutorialLevelScene");
  }

  create(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "screen-bg");
    this.physics.world.setBounds(LEVEL_ORIGIN.x, LEVEL_ORIGIN.y, tutorialLevel.tiles[0].length * TILE_SIZE, tutorialLevel.tiles.length * TILE_SIZE);

    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.fruits = this.physics.add.staticGroup();

    const spawn = this.buildLevel();
    this.player = new Flobby(this, spawn.x, spawn.y);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.fruits, (_, fruit) => this.collectFruit(fruit as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.player, this.hazards, () => this.restartLevel());

    if (this.exit) {
      this.physics.add.overlap(this.player, this.exit, () => this.tryExit());
    }

    const tilt = this.registry.get("tilt") as TiltController | undefined;
    this.inputController = new InputController(this, tilt);
    this.createHud();
    this.createTouchControls();
  }

  update(): void {
    if (!this.player || !this.inputController) {
      return;
    }

    const input = this.inputController.read();
    this.player.move(input.moveX);

    if (input.flipPressed) {
      this.player.tryFlipGravity();
    }

    if (this.inputController.resetPressed) {
      this.restartLevel();
    }
  }

  private buildLevel(): Phaser.Math.Vector2 {
    let spawn = new Phaser.Math.Vector2(LEVEL_ORIGIN.x + TILE_SIZE * 2.5, LEVEL_ORIGIN.y + TILE_SIZE * 8.5);

    tutorialLevel.tiles.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        const worldX = LEVEL_ORIGIN.x + x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = LEVEL_ORIGIN.y + y * TILE_SIZE + TILE_SIZE / 2;

        if (tile === "#") {
          this.platforms?.create(worldX, worldY, "tile-ground");
        }

        if (tile === "^") {
          this.hazards?.create(worldX, worldY, "tile-hazard");
        }

        if (tile === "F") {
          this.fruits?.create(worldX, worldY, "fruit");
          this.fruitCount += 1;
        }

        if (tile === "S") {
          spawn = new Phaser.Math.Vector2(worldX, worldY);
        }

        if (tile === "E") {
          this.exit = this.physics.add.staticImage(worldX, worldY, "tile-exit");
        }
      });
    });

    return spawn;
  }

  private createHud(): void {
    this.add
      .text(48, 24, tutorialLevel.name, {
        color: "#f8f4e8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "800"
      })
      .setOrigin(0, 0.5);

    this.add.image(GAME_WIDTH - 120, 26, "fruit");
    this.fruitText = this.add
      .text(GAME_WIDTH - 96, 24, `0/${this.fruitCount}`, {
        color: "#f8f4e8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "20px",
        fontStyle: "800"
      })
      .setOrigin(0, 0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, "←   →        ⤴", {
        color: "#cbd7df",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "24px"
      })
      .setOrigin(0.5);
  }

  private createTouchControls(): void {
    if (!this.inputController) {
      return;
    }

    const left = this.addControlButton(88, GAME_HEIGHT - 70, "‹");
    const right = this.addControlButton(164, GAME_HEIGHT - 70, "›");
    const flip = this.addControlButton(GAME_WIDTH - 104, GAME_HEIGHT - 70, "⤴");

    this.inputController.bindTouchButton(left, "left");
    this.inputController.bindTouchButton(right, "right");
    this.inputController.bindTouchButton(flip, "flip");
  }

  private addControlButton(x: number, y: number, label: string): Phaser.GameObjects.Container {
    const bg = this.add.circle(0, 0, 28, COLORS.panel, 0.92).setStrokeStyle(2, COLORS.mint);
    const text = this.add
      .text(0, -3, label, {
        color: "#f8f4e8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "30px",
        fontStyle: "800"
      })
      .setOrigin(0.5);

    const button = this.add.container(x, y, [bg, text]);
    button.setSize(56, 56);
    return button;
  }

  private collectFruit(fruit: Phaser.Physics.Arcade.Image): void {
    fruit.disableBody(true, true);
    const collected = this.fruits?.countActive(false) ?? 0;
    this.fruitText?.setText(`${collected}/${this.fruitCount}`);
  }

  private tryExit(): void {
    if ((this.fruits?.countActive(true) ?? 0) > 0) {
      this.cameras.main.shake(90, 0.003);
      return;
    }

    this.scene.start("LandingScene");
  }

  private restartLevel(): void {
    this.scene.restart();
  }
}
