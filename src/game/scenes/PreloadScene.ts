import Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from "../constants";
import { TILED_LEVEL_ASSETS } from "../levels/tiled";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    this.load.image("clayboy-normal", "assets/clayboy/clayboy-normal.png");
    this.load.spritesheet("clayboy-movement", "assets/clayboy/clayboy-movement.png", {
      frameWidth: 256,
      frameHeight: 256
    });
    this.load.image("house-exterior", "assets/tiled/tilesets/house-exterior.png");
    TILED_LEVEL_ASSETS.forEach(({ images, key, url }) => {
      this.load.tilemapTiledJSON(key, url);
      images?.forEach((image) => this.load.image(image.key, image.url));
    });
    this.createGeneratedTextures();
  }

  create(): void {
    this.scene.start("LandingScene");
  }

  private createGeneratedTextures(): void {
    this.addTileTexture("tile-ground", COLORS.grass, COLORS.stone);
    this.addTileTexture("tile-hazard", COLORS.coral, 0x9f2d36);
    this.addTileTexture("tile-exit", COLORS.blue, 0x244b7f);
    this.addMineralTexture();
    this.addEnemySlugTexture();
    this.addFlobbyTexture();
    this.addButtonTexture("button-pill", COLORS.panel, COLORS.mint);
    this.addScreenGradient();
  }

  private addTileTexture(key: string, fill: number, stroke: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(fill, 1);
    graphics.fillRoundedRect(0, 0, TILE_SIZE, TILE_SIZE, 6);
    graphics.lineStyle(3, stroke, 1);
    graphics.strokeRoundedRect(1.5, 1.5, TILE_SIZE - 3, TILE_SIZE - 3, 6);
    graphics.generateTexture(key, TILE_SIZE, TILE_SIZE);
    graphics.destroy();
  }

  private addMineralTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const rock = [
      new Phaser.Geom.Point(3, 23),
      new Phaser.Geom.Point(7, 9),
      new Phaser.Geom.Point(17, 3),
      new Phaser.Geom.Point(28, 10),
      new Phaser.Geom.Point(30, 23),
      new Phaser.Geom.Point(23, 29),
      new Phaser.Geom.Point(10, 28)
    ];
    graphics.fillStyle(0x8c9498, 1);
    graphics.fillPoints(rock, true);
    graphics.lineStyle(2, 0x4d565b, 1);
    graphics.strokePoints(rock, true);
    graphics.fillStyle(0xb8bec0, 0.9);
    graphics.fillTriangle(9, 10, 17, 5, 16, 17);
    graphics.fillStyle(0x687176, 0.9);
    graphics.fillTriangle(17, 18, 28, 12, 23, 26);
    graphics.generateTexture("mineral", 32, 32);
    graphics.destroy();
  }

  private addEnemySlugTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0x778c49, 1);
    graphics.fillEllipse(25, 29, 46, 18);
    graphics.fillCircle(41, 21, 11);
    graphics.lineStyle(3, 0x778c49, 1);
    graphics.lineBetween(37, 14, 33, 6);
    graphics.lineBetween(45, 13, 49, 5);
    graphics.fillStyle(COLORS.ink, 1);
    graphics.fillCircle(33, 5, 2.5);
    graphics.fillCircle(49, 4, 2.5);
    graphics.fillCircle(43, 21, 2);
    graphics.lineStyle(2, 0x4f6034, 1);
    graphics.lineBetween(4, 35, 52, 35);
    graphics.generateTexture("enemy-slug", 56, 40);
    graphics.destroy();
  }

  private addFlobbyTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(COLORS.mint, 1);
    graphics.fillRoundedRect(2, 8, 44, 32, 16);
    graphics.fillCircle(16, 11, 9);
    graphics.fillCircle(32, 11, 9);
    graphics.fillStyle(COLORS.ink, 1);
    graphics.fillCircle(16, 11, 3);
    graphics.fillCircle(32, 11, 3);
    graphics.fillStyle(COLORS.cream, 1);
    graphics.fillCircle(15, 10, 1.2);
    graphics.fillCircle(31, 10, 1.2);
    graphics.generateTexture("flobby", 48, 48);
    graphics.destroy();
  }

  private addButtonTexture(key: string, fill: number, stroke: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(fill, 0.94);
    graphics.fillRoundedRect(0, 0, 132, 48, 18);
    graphics.lineStyle(2, stroke, 1);
    graphics.strokeRoundedRect(1, 1, 130, 46, 18);
    graphics.generateTexture(key, 132, 48);
    graphics.destroy();
  }

  private addScreenGradient(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillGradientStyle(0x17202a, 0x17202a, 0x2b3648, 0x283241, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    graphics.generateTexture("screen-bg", GAME_WIDTH, GAME_HEIGHT);
    graphics.destroy();
  }
}
