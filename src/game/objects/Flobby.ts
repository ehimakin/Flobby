import Phaser from "phaser";

const RUN_SPEED = 210;
const GRAVITY = 980;
const FLIP_KICK = 80;
const WALL_RELEASE_NUDGE = 3;
const EDGE_OVERHANG_RATIO = 0.45;
const PLAYER_SIZE = 48;
const BODY_WIDTH = 34;
const BODY_HEIGHT = 32;
const BODY_OFFSET_X = 7;
const BODY_OFFSET_Y = 10;

type SurfaceProbe = (worldX: number, worldY: number) => boolean;

export class Flobby extends Phaser.Physics.Arcade.Sprite {
  private gravitySign = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "clayboy-normal");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(PLAYER_SIZE, PLAYER_SIZE);
    this.setCollideWorldBounds(true);
    this.setDragX(1100);
    this.setMaxVelocity(RUN_SPEED, 620);

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      // Arcade body dimensions are source pixels, so compensate for the 256px art scale.
      body
        .setSize(BODY_WIDTH / Math.abs(this.scaleX), BODY_HEIGHT / Math.abs(this.scaleY))
        .setOffset(BODY_OFFSET_X / Math.abs(this.scaleX), BODY_OFFSET_Y / Math.abs(this.scaleY));
    }

    this.applyGravity();
  }

  move(axisX: number, hasSolidAt?: SurfaceProbe): void {
    if (axisX !== 0) {
      this.setFlipX(axisX < 0);
    }

    if (
      axisX !== 0 &&
      hasSolidAt &&
      (this.hasVerticalWallAhead(axisX, hasSolidAt) || this.wouldLeaveSurface(axisX, hasSolidAt))
    ) {
      this.setVelocityX(0);
      return;
    }

    this.setVelocityX(axisX * RUN_SPEED);
  }

  tryFlipGravity(): boolean {
    if (!this.isPinned()) {
      return false;
    }

    this.releaseWallPressure();
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
    (this.body as Phaser.Physics.Arcade.Body | null)?.setGravityY(GRAVITY * this.gravitySign);
  }

  private isPinned(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body | null;

    if (!body) {
      return false;
    }

    return this.gravitySign > 0
      ? body.blocked.down || body.touching.down
      : body.blocked.up || body.touching.up;
  }

  private wouldLeaveSurface(axisX: number, hasSolidAt: SurfaceProbe): boolean {
    if (!this.isPinned()) {
      return false;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const overhang = body.width * EDGE_OVERHANG_RATIO;
    const probeX = axisX > 0 ? body.right - overhang : body.left + overhang;
    const probeY = this.gravitySign > 0 ? body.bottom + 2 : body.top - 2;
    return !hasSolidAt(probeX, probeY);
  }

  private hasVerticalWallAhead(axisX: number, hasSolidAt: SurfaceProbe): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const probeX = axisX > 0 ? body.right + 2 : body.left - 2;
    return hasSolidAt(probeX, body.center.y);
  }

  private releaseWallPressure(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;

    if (!body) {
      return;
    }

    this.setVelocityX(0);

    if (body.blocked.left || body.touching.left) {
      this.setX(this.x + WALL_RELEASE_NUDGE);
      body.updateFromGameObject();
    } else if (body.blocked.right || body.touching.right) {
      this.setX(this.x - WALL_RELEASE_NUDGE);
      body.updateFromGameObject();
    }
  }
}
