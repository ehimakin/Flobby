import Phaser from "phaser";

const RUN_SPEED = 227;
const GRAVITY = 980;
const FLIP_KICK = 80;
const WALL_RELEASE_NUDGE = 3;
const EDGE_OVERHANG_RATIO = 0.45;
const PLAYER_SIZE = 58;
const SOURCE_FRAME_SIZE = 256;
const SOURCE_CONTACT_Y = 232;
const BODY_WIDTH = 34;
const BODY_HEIGHT = 32;
const PRE_FLIP_DURATION = 75;
const ORIENTATION_FLIP_DELAY = 110;
const LANDING_GUARD_DURATION = 180;
const LANDING_DURATION = 85;
const BOUNCE_DURATION = 105;
const MOVEMENT_POSE_THRESHOLD = 0.08;
const MOVEMENT_POSE_LINGER = 117;
const POSE_BLEND_DURATION = 91;
const ORIENTATION_FOLD_DURATION = 59;
const ORIENTATION_UNFOLD_DURATION = 91;
const BASE_VISUAL_SCALE = PLAYER_SIZE / SOURCE_FRAME_SIZE;

const POSE = {
  idle: 0,
  squash: 1,
  stretchUp: 2,
  stretchForward: 3,
  landing: 4,
  bounce: 5
} as const;

const POSE_SCALE = [
  { x: 1, y: 1 },
  { x: 1.03, y: 0.97 },
  { x: 0.97, y: 1.03 },
  { x: 1.02, y: 0.98 },
  { x: 1.04, y: 0.96 },
  { x: 0.97, y: 1.03 }
] as const;

type PoseFrame = (typeof POSE)[keyof typeof POSE];
type PosePhase = "grounded" | "pre-flip" | "airborne" | "landing" | "bounce";

type SurfaceProbe = (worldX: number, worldY: number) => boolean;

export class Flobby extends Phaser.Physics.Arcade.Sprite {
  private gravitySign = 1;
  private visual: Phaser.GameObjects.Sprite;
  private transitionGhost?: Phaser.GameObjects.Sprite;
  private poseFrame: PoseFrame = POSE.idle;
  private posePhase: PosePhase = "grounded";
  private phaseEndsAt = 0;
  private landingAllowedAt = 0;
  private orientationFlipAt = 0;
  private orientationPending = false;
  private movementPoseUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, initialFloorY?: number) {
    super(scene, x, y, "clayboy-movement", POSE.idle);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(PLAYER_SIZE, PLAYER_SIZE);
    this.setCollideWorldBounds(true);
    this.setDragX(1100);
    this.setMaxVelocity(RUN_SPEED, 620);

    this.configureBody(false);
    this.snapToInitialFloor(initialFloorY);
    this.applyGravity();

    this.setVisible(false);
    this.visual = scene.add.sprite(this.x, this.y, "clayboy-movement", POSE.idle);
    this.visual.setDisplaySize(PLAYER_SIZE, PLAYER_SIZE);
    this.syncVisual();

    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual);
      this.transitionGhost?.destroy();
    });
  }

  move(axisX: number, hasSolidAt?: SurfaceProbe): void {
    if (axisX !== 0) {
      this.visual.setFlipX(axisX > 0);
    }

    const shouldStop =
      axisX !== 0 &&
      hasSolidAt &&
      (this.hasVerticalWallAhead(axisX, hasSolidAt) || this.wouldLeaveSurface(axisX, hasSolidAt));

    this.setVelocityX(shouldStop ? 0 : axisX * RUN_SPEED);
    this.updatePose(shouldStop ? 0 : axisX);
  }

  tryFlipGravity(): boolean {
    if (this.posePhase !== "grounded" || !this.isPinned()) {
      return false;
    }

    this.posePhase = "pre-flip";
    this.phaseEndsAt = this.scene.time.now + PRE_FLIP_DURATION;
    this.setPose(POSE.squash);
    return true;
  }

  resetGravity(): void {
    this.gravitySign = 1;
    this.posePhase = "grounded";
    this.orientationPending = false;
    this.scene.tweens.killTweensOf(this.visual);
    this.visual.setFlipY(false).setAlpha(1);
    this.configureBody(true);
    this.setPose(POSE.idle);
    this.applyGravity();
  }

  private updatePose(axisX: number): void {
    const now = this.scene.time.now;

    if (this.posePhase === "pre-flip") {
      if (now >= this.phaseEndsAt) {
        this.launchGravityFlip(now);
      } else {
        this.setPose(POSE.squash);
      }
      return;
    }

    if (this.posePhase === "airborne") {
      if (this.orientationPending && now >= this.orientationFlipAt) {
        this.orientationPending = false;
        this.beginOrientationTransition();
      }

      if (now >= this.landingAllowedAt && this.isPinned()) {
        this.posePhase = "landing";
        this.phaseEndsAt = now + LANDING_DURATION;
        this.setPose(POSE.landing);
      } else {
        this.setPose(POSE.stretchUp);
      }
      return;
    }

    if (this.posePhase === "landing") {
      if (now < this.phaseEndsAt) {
        this.setPose(POSE.landing);
        return;
      }

      this.posePhase = "bounce";
      this.phaseEndsAt = now + BOUNCE_DURATION;
    }

    if (this.posePhase === "bounce") {
      if (now < this.phaseEndsAt) {
        this.setPose(POSE.bounce);
        return;
      }

      this.posePhase = "grounded";
    }

    if (Math.abs(axisX) >= MOVEMENT_POSE_THRESHOLD) {
      this.movementPoseUntil = now + MOVEMENT_POSE_LINGER;
    }

    this.setPose(now < this.movementPoseUntil ? POSE.stretchForward : POSE.idle);
  }

  private launchGravityFlip(now: number): void {
    this.releaseWallPressure();
    this.gravitySign *= -1;
    this.setVelocityY(this.gravitySign * FLIP_KICK);
    this.applyGravity();
    this.posePhase = "airborne";
    this.orientationPending = true;
    this.orientationFlipAt = now + ORIENTATION_FLIP_DELAY;
    this.landingAllowedAt = now + LANDING_GUARD_DURATION;
    this.setPose(POSE.stretchUp);
  }

  private setPose(frame: PoseFrame): void {
    if (this.poseFrame === frame) {
      return;
    }

    if (this.transitionGhost) {
      this.scene.tweens.killTweensOf(this.transitionGhost);
      this.transitionGhost.destroy();
    }

    this.scene.tweens.killTweensOf(this.visual);

    const ghost = this.scene.add
      .sprite(this.visual.x, this.visual.y, "clayboy-movement", this.poseFrame)
      .setScale(this.visual.scaleX, this.visual.scaleY)
      .setFlipX(this.visual.flipX)
      .setFlipY(this.visual.flipY)
      .setDepth(this.visual.depth);
    this.transitionGhost = ghost;

    this.poseFrame = frame;
    const targetScale = POSE_SCALE[frame];
    this.visual.setFrame(frame).setAlpha(0);

    this.scene.tweens.add({
      targets: this.visual,
      alpha: 1,
      scaleX: BASE_VISUAL_SCALE * targetScale.x,
      scaleY: BASE_VISUAL_SCALE * targetScale.y,
      duration: POSE_BLEND_DURATION,
      ease: "Sine.easeOut"
    });
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: POSE_BLEND_DURATION,
      ease: "Sine.easeIn",
      onComplete: () => {
        if (this.transitionGhost === ghost) {
          this.transitionGhost = undefined;
        }
        ghost.destroy();
      }
    });

    this.syncVisual();
  }

  private beginOrientationTransition(): void {
    const targetFlipY = this.gravitySign < 0;
    if (this.visual.flipY === targetFlipY) {
      this.configureBody(true);
      return;
    }

    this.scene.tweens.killTweensOf(this.visual);
    this.visual.setAlpha(1);
    const targetScaleY = BASE_VISUAL_SCALE * POSE_SCALE[this.poseFrame].y;

    this.scene.tweens.add({
      targets: this.visual,
      scaleY: BASE_VISUAL_SCALE * 0.08,
      duration: ORIENTATION_FOLD_DURATION,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.visual.setFlipY(targetFlipY);
        this.transitionGhost?.setFlipY(targetFlipY);
        this.configureBody(true);
        this.syncVisual();

        this.scene.tweens.add({
          targets: this.visual,
          scaleY: targetScaleY,
          duration: ORIENTATION_UNFOLD_DURATION,
          ease: "Back.easeOut"
        });
      }
    });
  }

  private readonly syncVisual = (): void => {
    if (!this.visual?.active) {
      return;
    }

    this.syncVisualSprite(this.visual);
    if (this.transitionGhost?.active) {
      this.transitionGhost.setFlipX(this.visual.flipX).setFlipY(this.visual.flipY);
      this.syncVisualSprite(this.transitionGhost);
    }
  };

  private syncVisualSprite(sprite: Phaser.GameObjects.Sprite): void {
    const sourceContactOffset = SOURCE_CONTACT_Y - SOURCE_FRAME_SIZE / 2;
    const baseContactOffset = sourceContactOffset * BASE_VISUAL_SCALE;
    const scaledContactOffset = sourceContactOffset * Math.abs(sprite.scaleY);
    const orientationSign = sprite.flipY ? -1 : 1;
    sprite.setPosition(this.x, this.y + orientationSign * (baseContactOffset - scaledContactOffset));
  }

  private applyGravity(): void {
    (this.body as Phaser.Physics.Arcade.Body | null)?.setGravityY(GRAVITY * this.gravitySign);
  }

  private configureBody(keepWorldPosition: boolean): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) {
      return;
    }

    const scaleX = Math.abs(this.scaleX);
    const scaleY = Math.abs(this.scaleY);
    const previousOffsetY = body.offset.y * scaleY;
    const offsetX = (PLAYER_SIZE - BODY_WIDTH) / 2;
    const contactY = (SOURCE_CONTACT_Y / SOURCE_FRAME_SIZE) * PLAYER_SIZE;
    const downOffsetY = contactY - BODY_HEIGHT;
    const offsetY = this.gravitySign > 0 ? downOffsetY : PLAYER_SIZE - BODY_HEIGHT - downOffsetY;

    if (keepWorldPosition) {
      this.y += previousOffsetY - offsetY;
    }

    body
      .setSize(BODY_WIDTH / scaleX, BODY_HEIGHT / scaleY, false)
      .setOffset(offsetX / scaleX, offsetY / scaleY);
    body.updateFromGameObject();
  }

  private snapToInitialFloor(initialFloorY?: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body || initialFloorY === undefined) {
      return;
    }

    this.y += initialFloorY - body.bottom;
    body.updateFromGameObject();
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
