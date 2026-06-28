import Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from "../constants";
import { getLevel, type LevelDefinition, type LevelId, type LevelRoom } from "../levels";
import { Flobby } from "../objects/Flobby";
import { InputController } from "../systems/InputController";
import { TiltController } from "../systems/TiltController";

const LEVEL_ORIGIN = {
  x: 48,
  y: 72
};

export class TutorialLevelScene extends Phaser.Scene {
  private level: LevelDefinition = getLevel("tutorial");
  private player?: Flobby;
  private inputController?: InputController;
  private platforms?: Phaser.Physics.Arcade.StaticGroup;
  private hazards?: Phaser.Physics.Arcade.StaticGroup;
  private fruits?: Phaser.Physics.Arcade.StaticGroup;
  private readonly solidTiles = new Set<string>();
  private exit?: Phaser.Physics.Arcade.Image;
  private fruitCount = 0;
  private fruitText?: Phaser.GameObjects.Text;
  private tilt?: TiltController;
  private tiltText?: Phaser.GameObjects.Text;
  private roomText?: Phaser.GameObjects.Text;
  private activeRoomId?: string;
  private isTransitioning = false;

  constructor() {
    super("TutorialLevelScene");
  }

  init(data: { levelId?: LevelId } = {}): void {
    this.level = getLevel(data.levelId ?? "tutorial");
  }

  create(): void {
    this.fruitCount = 0;
    this.solidTiles.clear();
    this.exit = undefined;
    this.activeRoomId = undefined;
    this.isTransitioning = false;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "screen-bg").setScrollFactor(0);
    this.physics.world.setBounds(
      LEVEL_ORIGIN.x,
      LEVEL_ORIGIN.y,
      this.level.tiles[0].length * TILE_SIZE,
      this.level.tiles.length * TILE_SIZE
    );
    this.cameras.main.fadeIn(220, 23, 32, 42);

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

    this.tilt = this.registry.get("tilt") as TiltController | undefined;
    this.inputController = new InputController(this, this.tilt);
    this.createHud();
    this.createTouchControls();
    this.configureCamera();
  }

  update(): void {
    if (!this.player || !this.inputController || this.isTransitioning) {
      return;
    }

    const input = this.inputController.read();
    this.player.move(input.moveX, this.hasSolidAtWorldPosition);

    if (input.flipPressed) {
      this.player.tryFlipGravity();
    }

    if (this.inputController.resetPressed) {
      this.restartLevel();
    }

    if (this.inputController.calibratePressed) {
      this.calibrateTilt();
    }

    this.updateRoomCamera();
    this.updateTiltHud();
  }

  private buildLevel(): Phaser.Math.Vector2 {
    let spawn = new Phaser.Math.Vector2(LEVEL_ORIGIN.x + TILE_SIZE * 2.5, LEVEL_ORIGIN.y + TILE_SIZE * 8.5);

    this.level.tiles.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        const worldX = LEVEL_ORIGIN.x + x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = LEVEL_ORIGIN.y + y * TILE_SIZE + TILE_SIZE / 2;

        if (tile === "#") {
          this.solidTiles.add(`${x},${y}`);
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

  private readonly hasSolidAtWorldPosition = (worldX: number, worldY: number): boolean => {
    const tileX = Math.floor((worldX - LEVEL_ORIGIN.x) / TILE_SIZE);
    const tileY = Math.floor((worldY - LEVEL_ORIGIN.y) / TILE_SIZE);
    return this.solidTiles.has(`${tileX},${tileY}`);
  };

  private createHud(): void {
    this.add
      .text(48, 24, `Level ${this.level.number}: ${this.level.name}`, {
        color: "#f8f4e8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "800"
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    this.roomText = this.add
      .text(48, 50, "", {
        color: "#70d6a8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        fontStyle: "700"
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    this.add.image(GAME_WIDTH - 120, 26, "fruit").setScrollFactor(0);
    this.fruitText = this.add
      .text(GAME_WIDTH - 96, 24, `0/${this.fruitCount}`, {
        color: "#f8f4e8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "20px",
        fontStyle: "800"
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    this.tiltText = this.add
      .text(GAME_WIDTH - 272, 24, this.tilt?.statusLabel ?? "keyboard / touch ready", {
        color: "#cbd7df",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px"
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    this.addCalibrateButton();

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, "←   →        ⤴", {
        color: "#cbd7df",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "24px"
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
  }

  private createTouchControls(): void {
    if (!this.inputController) {
      return;
    }

    const left = this.addControlButton(88, GAME_HEIGHT - 70, "‹");
    const right = this.addControlButton(164, GAME_HEIGHT - 70, "›");

    this.inputController.bindTouchButton(left, "left");
    this.inputController.bindTouchButton(right, "right");
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
    button.setScrollFactor(0);
    return button;
  }

  private addCalibrateButton(): void {
    const bg = this.add.rectangle(0, 0, 72, 32, COLORS.panel, 0.92).setStrokeStyle(2, COLORS.mint);
    const text = this.add
      .text(0, -1, "Cal", {
        color: "#f8f4e8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        fontStyle: "800"
      })
      .setOrigin(0.5);
    const button = this.add.container(GAME_WIDTH - 350, 26, [bg, text]);
    button.setSize(72, 32);
    button.setScrollFactor(0);
    button.setData("blocks-screen-flip", true);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => this.calibrateTilt());
  }

  private configureCamera(): void {
    const worldWidth = LEVEL_ORIGIN.x * 2 + this.level.tiles[0].length * TILE_SIZE;
    const worldHeight = LEVEL_ORIGIN.y * 2 + this.level.tiles.length * TILE_SIZE;
    const camera = this.cameras.main;

    camera.setBounds(0, 0, Math.max(GAME_WIDTH, worldWidth), Math.max(GAME_HEIGHT, worldHeight));

    if (this.level.rooms?.length) {
      this.updateRoomCamera(true);
      return;
    }

    camera.setScroll(0, 0);
    this.roomText?.setText("");
  }

  private updateRoomCamera(immediate = false): void {
    const room = this.getPlayerRoom();

    if (!room || room.id === this.activeRoomId) {
      return;
    }

    this.activeRoomId = room.id;
    this.roomText?.setText(room.name);

    const centerX = LEVEL_ORIGIN.x + (room.x + room.width / 2) * TILE_SIZE;
    const centerY = LEVEL_ORIGIN.y + (room.y + room.height / 2) * TILE_SIZE;

    if (immediate) {
      this.cameras.main.centerOn(centerX, centerY);
      return;
    }

    this.cameras.main.pan(centerX, centerY, 320, "Sine.easeInOut", true);
  }

  private getPlayerRoom(): LevelRoom | undefined {
    if (!this.player || !this.level.rooms) {
      return undefined;
    }

    const tileX = Math.floor((this.player.x - LEVEL_ORIGIN.x) / TILE_SIZE);
    const tileY = Math.floor((this.player.y - LEVEL_ORIGIN.y) / TILE_SIZE);

    return this.level.rooms.find(
      (room) =>
        tileX >= room.x &&
        tileX < room.x + room.width &&
        tileY >= room.y &&
        tileY < room.y + room.height
    );
  }

  private collectFruit(fruit: Phaser.Physics.Arcade.Image): void {
    fruit.disableBody(true, true);
    const remaining = this.fruits?.countActive(true) ?? 0;
    const collected = this.fruitCount - remaining;
    this.fruitText?.setText(`${collected}/${this.fruitCount}`);
  }

  private tryExit(): void {
    if (this.isTransitioning) {
      return;
    }

    if ((this.fruits?.countActive(true) ?? 0) > 0) {
      this.cameras.main.shake(90, 0.003);
      return;
    }

    this.isTransitioning = true;
    this.player?.setVelocity(0, 0);

    if (this.level.nextLevelId) {
      this.transitionTo(this.level.nextLevelId, 280);
      return;
    }

    this.showLevelClear();
  }

  private restartLevel(): void {
    this.scene.restart({ levelId: this.level.id });
  }

  private transitionTo(levelId: LevelId, delay: number): void {
    this.time.delayedCall(delay, () => {
      this.cameras.main.fadeOut(260, 23, 32, 42);
      this.time.delayedCall(280, () => this.scene.restart({ levelId }));
    });
  }

  private showLevelClear(): void {
    const message = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Level ${this.level.number} clear`, {
        color: "#f8f4e8",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "42px",
        fontStyle: "800"
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0)
      .setDepth(20);

    this.tweens.add({
      targets: message,
      alpha: 1,
      y: message.y - 12,
      duration: 260,
      ease: "Sine.out"
    });

    this.time.delayedCall(900, () => {
      this.cameras.main.fadeOut(300, 23, 32, 42);
      this.time.delayedCall(320, () => this.scene.start("LandingScene"));
    });
  }

  private calibrateTilt(): void {
    this.tilt?.calibrate();
    this.tiltText?.setText("tilt calibrated");
  }

  private updateTiltHud(): void {
    if (!this.tiltText || !this.tilt) {
      return;
    }

    const snapshot = this.tilt.snapshot;

    if (snapshot.state === "granted") {
      this.tiltText.setText(
        `tilt ${snapshot.axisX.toFixed(2)} ${snapshot.source} x${snapshot.motionX.toFixed(1)} y${snapshot.motionY.toFixed(1)} #${snapshot.sampleCount}`
      );
      return;
    }

    this.tiltText.setText(this.tilt.statusLabel);
  }
}
