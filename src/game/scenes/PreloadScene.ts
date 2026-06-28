import Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from "../constants";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    this.load.image("clayboy-normal", "assets/clayboy/clayboy-normal.png");
    this.createGeneratedTextures();
  }

  create(): void {
    this.scene.start("LandingScene");
  }

  private createGeneratedTextures(): void {
    this.addTileTexture("tile-ground", COLORS.grass, COLORS.stone);
    this.addTileTexture("tile-hazard", COLORS.coral, 0x9f2d36);
    this.addTileTexture("tile-exit", COLORS.blue, 0x244b7f);
    this.addFruitTexture();
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

  private addFruitTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(COLORS.gold, 1);
    graphics.fillCircle(14, 16, 11);
    graphics.fillStyle(COLORS.mint, 1);
    graphics.fillEllipse(22, 8, 12, 7);
    graphics.generateTexture("fruit", 32, 32);
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
