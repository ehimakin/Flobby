import Phaser from "phaser";

const RUN_SPEED = 210;
const GRAVITY = 980;
const FLIP_KICK = 80;

export class Flobby extends Phaser.Physics.Arcade.Sprite {
  private gravitySign = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "flobby");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDragX(1100);
    this.setMaxVelocity(RUN_SPEED, 620);
    this.body?.setSize(38, 34).setOffset(5, 10);
    this.applyGravity();
  }

  move(axisX: number): void {
    this.setVelocityX(axisX * RUN_SPEED);
    if (axisX !== 0) {
      this.setFlipX(axisX < 0);
    }
  }

  tryFlipGravity(): boolean {
    if (!this.isPinned()) {
      return false;
    }

    this.gravitySign *= -1;
    this.setVelocityY(this.gravitySign * FLIP_KICK);
    this.setFlipY(this.gravitySign < 0);
    this.applyGravity();
    return true;
  }

  resetGravity(): void {
    this.gravitySign = 1;
    this.setFlipY(false);
    this.applyGravity();
  }

  private applyGravity(): void {
    this.body?.setGravityY(GRAVITY * this.gravitySign);
  }

  private isPinned(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    return Boolean(body?.blocked.down || body?.blocked.up);
  }
}
