import Phaser from "phaser";
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from "../constants";
import { getLevel, type LevelDefinition, type LevelId, type LevelRoom } from "../levels";
import {
  getTiledProperty,
  loadTiledLevel,
  type TiledCollisionObject,
  type TiledObjectWorld,
  type TiledWorldEntity
} from "../levels/tiled";
import { Flobby } from "../objects/Flobby";
import { InputController } from "../systems/InputController";
import { TiltController } from "../systems/TiltController";

const LEVEL_ORIGIN = {
  x: 48,
  y: 72
};

const POLYGON_COLLISION_STEP = 8;

type LevelBuildResult = {
  floorY?: number;
  spawn: Phaser.Math.Vector2;
};

export class TutorialLevelScene extends Phaser.Scene {
  private level: LevelDefinition = getLevel("tutorial");
  private player?: Flobby;
  private inputController?: InputController;
  private platforms?: Phaser.Physics.Arcade.StaticGroup;
  private hazards?: Phaser.Physics.Arcade.StaticGroup;
  private minerals?: Phaser.Physics.Arcade.StaticGroup;
  private enemies?: Phaser.Physics.Arcade.Group;
  private readonly solidTiles = new Set<string>();
  private exit?: Phaser.Physics.Arcade.Image;
  private mineralCount = 0;
  private mineralText?: Phaser.GameObjects.Text;
  private tilt?: TiltController;
  private tiltText?: Phaser.GameObjects.Text;
  private roomText?: Phaser.GameObjects.Text;
  private activeRoomId?: string;
  private isTransitioning = false;
  private tiledMap?: Phaser.Tilemaps.Tilemap;
  private tiledObjectWorld?: TiledObjectWorld;
  private exitStyle = "prototype";

  constructor() {
    super("TutorialLevelScene");
  }

  init(data: { levelId?: LevelId } = {}): void {
    this.level = getLevel(data.levelId ?? "tutorial");
  }

  create(): void {
    const tiledLevel = loadTiledLevel(this, this.level.id, this.level);
    this.level = tiledLevel.definition;
    this.tiledMap = tiledLevel.map;
    this.tiledObjectWorld = tiledLevel.objectWorld;
    this.exitStyle = tiledLevel.exitStyle ?? "prototype";
    this.mineralCount = 0;
    this.solidTiles.clear();
    this.exit = undefined;
    this.activeRoomId = undefined;
    this.isTransitioning = false;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "screen-bg").setScrollFactor(0).setDepth(-10);
    const worldBounds = this.getWorldBounds();
    this.physics.world.setBounds(worldBounds.x, worldBounds.y, worldBounds.width, worldBounds.height);
    this.cameras.main.fadeIn(220, 23, 32, 42);
    this.createTiledVisuals();

    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.minerals = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group({ allowGravity: false });

    const build = this.buildLevel();
    this.player = new Flobby(this, build.spawn.x, build.spawn.y, build.floorY);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.minerals, (_, mineral) =>
      this.collectMineral(mineral as Phaser.Physics.Arcade.Image)
    );
    this.physics.add.overlap(this.player, this.hazards, () => this.restartLevel());
    this.physics.add.overlap(this.player, this.enemies, () => this.restartLevel());

    if (this.exit) {
      this.physics.add.overlap(this.player, this.exit, () => this.tryExit());
    }

    this.physics.add.collider(this.enemies, this.platforms);

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
    this.updateEnemies();
    this.updateTiltHud();
  }

  private buildLevel(): LevelBuildResult {
    if (this.tiledObjectWorld) {
      return this.buildObjectLevel(this.tiledObjectWorld);
    }

    let spawn = new Phaser.Math.Vector2(LEVEL_ORIGIN.x + TILE_SIZE * 2.5, LEVEL_ORIGIN.y + TILE_SIZE * 8.5);

    this.level.tiles.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        const worldX = LEVEL_ORIGIN.x + x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = LEVEL_ORIGIN.y + y * TILE_SIZE + TILE_SIZE / 2;

        if (tile === "#") {
          this.solidTiles.add(`${x},${y}`);
          this.platforms?.create(worldX, worldY, "tile-ground").setVisible(!this.tiledMap);
        }

        if (tile === "^") {
          this.hazards?.create(worldX, worldY, "tile-hazard");
        }

        if (tile === "F") {
          this.minerals?.create(worldX, worldY, "mineral");
          this.mineralCount += 1;
        }

        if (tile === "S") {
          spawn = new Phaser.Math.Vector2(worldX, worldY);
        }

        if (tile === "E") {
          this.exit = this.physics.add.staticImage(worldX, worldY, "tile-exit");
          this.exit.setVisible(!this.tiledMap);
        }
      });
    });

    return { floorY: spawn.y + TILE_SIZE / 2, spawn };
  }

  private buildObjectLevel(world: TiledObjectWorld): LevelBuildResult {
    world.collisions.forEach((collision) => this.addObjectCollision(collision));

    let spawn = new Phaser.Math.Vector2(world.width * 0.2, world.height * 0.8);
    for (const entity of world.entities) {
      const center = this.getEntityCenter(entity);

      if (entity.type === "spawn") {
        spawn = center;
      } else if (entity.type === "mineral" || entity.type === "fruit") {
        this.minerals?.create(center.x, center.y, "mineral");
        this.mineralCount += 1;
      } else if (entity.type === "hazard") {
        this.hazards?.create(center.x, center.y, "tile-hazard");
      } else if (entity.type === "exit") {
        this.exit = this.physics.add.staticImage(center.x, center.y, "tile-exit");
        this.exitStyle = getTiledProperty(entity.properties, "exitStyle", "prototype");
      } else if (entity.type === "enemy_slug") {
        this.addEnemySlug(entity, center);
      }
    }

    return {
      floorY: this.findFloorBelow(spawn),
      spawn
    };
  }

  private getEntityCenter(entity: TiledWorldEntity): Phaser.Math.Vector2 {
    if (entity.point || entity.width === 0 || entity.height === 0) {
      return new Phaser.Math.Vector2(entity.x, entity.y);
    }
    return new Phaser.Math.Vector2(entity.x + entity.width / 2, entity.y + entity.height / 2);
  }

  private addEnemySlug(entity: TiledWorldEntity, center: Phaser.Math.Vector2): void {
    const enemy = this.enemies?.create(center.x, center.y, "enemy-slug") as
      | Phaser.Physics.Arcade.Sprite
      | undefined;
    if (!enemy) {
      return;
    }

    const speed = Math.abs(getTiledProperty(entity.properties, "speed", 20));
    const patrolLeft = Math.abs(
      getTiledProperty(
        entity.properties,
        "patrol_min_x",
        getTiledProperty(entity.properties, "patrol_mix_x", 80)
      )
    );
    const patrolRight = Math.abs(getTiledProperty(entity.properties, "patrol_max_x", patrolLeft));

    enemy
      .setDisplaySize(entity.width || 36, entity.height || 36)
      .setData("patrolLeft", center.x - patrolLeft)
      .setData("patrolRight", center.x + patrolRight)
      .setData("speed", speed)
      .setVelocityX(speed);
    (enemy.body as Phaser.Physics.Arcade.Body).setGravityY(980);
  }

  private addObjectCollision(collision: TiledCollisionObject): void {
    if (collision.polygon?.length) {
      this.addPolygonCollision(collision);
      return;
    }

    if (collision.width > 0 && collision.height > 0) {
      this.addCollisionRectangle(collision.x, collision.y, collision.width, collision.height);
    }
  }

  private addPolygonCollision(collision: TiledCollisionObject): void {
    const points = collision.polygon?.map(
      (point) => new Phaser.Geom.Point(collision.x + point.x, collision.y + point.y)
    );
    if (!points?.length) {
      return;
    }

    const polygon = new Phaser.Geom.Polygon(points);
    const bounds = Phaser.Geom.Polygon.GetAABB(polygon);
    const startY = Math.floor(bounds.top / POLYGON_COLLISION_STEP) * POLYGON_COLLISION_STEP;
    const endY = Math.ceil(bounds.bottom / POLYGON_COLLISION_STEP) * POLYGON_COLLISION_STEP;

    for (let y = startY; y < endY; y += POLYGON_COLLISION_STEP) {
      let spanStart: number | undefined;
      const startX = Math.floor(bounds.left / POLYGON_COLLISION_STEP) * POLYGON_COLLISION_STEP;
      const endX = Math.ceil(bounds.right / POLYGON_COLLISION_STEP) * POLYGON_COLLISION_STEP;

      for (let x = startX; x <= endX; x += POLYGON_COLLISION_STEP) {
        const inside = Phaser.Geom.Polygon.Contains(
          polygon,
          x + POLYGON_COLLISION_STEP / 2,
          y + POLYGON_COLLISION_STEP / 2
        );
        if (inside && spanStart === undefined) {
          spanStart = x;
        }
        if ((!inside || x === endX) && spanStart !== undefined) {
          const spanEnd = inside ? x + POLYGON_COLLISION_STEP : x;
          this.addCollisionRectangle(
            spanStart,
            y,
            spanEnd - spanStart,
            POLYGON_COLLISION_STEP + 1
          );
          spanStart = undefined;
        }
      }
    }
  }

  private addCollisionRectangle(x: number, y: number, width: number, height: number): void {
    const platform = this.add.rectangle(x + width / 2, y + height / 2, width, height, 0xffffff, 0);
    this.physics.add.existing(platform, true);
    this.platforms?.add(platform);
  }

  private findFloorBelow(spawn: Phaser.Math.Vector2): number | undefined {
    const candidates = this.tiledObjectWorld?.collisions
      .filter(
        (collision) =>
          !collision.polygon &&
          spawn.x >= collision.x &&
          spawn.x <= collision.x + collision.width &&
          collision.y >= spawn.y
      )
      .map((collision) => collision.y)
      .sort((left, right) => left - right);
    return candidates?.[0];
  }

  private createTiledVisuals(): void {
    if (this.tiledObjectWorld) {
      this.tiledObjectWorld.images.forEach((image) => {
        this.add
          .image(image.x, image.y, image.key)
          .setOrigin(0)
          .setAlpha(image.opacity)
          .setDepth(-3);
      });
      return;
    }

    if (!this.tiledMap) {
      return;
    }

    const tileset = this.tiledMap.addTilesetImage("house-exterior", "house-exterior");
    if (!tileset) {
      throw new Error(`Could not attach the house exterior tileset for ${this.level.id}.`);
    }

    ["Background", "Architecture", "Decoration"].forEach((layerName, index) => {
      this.tiledMap
        ?.createLayer(layerName, tileset, LEVEL_ORIGIN.x, LEVEL_ORIGIN.y)
        ?.setDepth(index - 3);
    });
  }

  private readonly hasSolidAtWorldPosition = (worldX: number, worldY: number): boolean => {
    if (this.tiledObjectWorld) {
      return this.tiledObjectWorld.collisions.some((collision) =>
        this.collisionContainsPoint(collision, worldX, worldY)
      );
    }

    const tileX = Math.floor((worldX - LEVEL_ORIGIN.x) / TILE_SIZE);
    const tileY = Math.floor((worldY - LEVEL_ORIGIN.y) / TILE_SIZE);
    return this.solidTiles.has(`${tileX},${tileY}`);
  };

  private getWorldBounds(): Phaser.Geom.Rectangle {
    if (this.tiledObjectWorld) {
      return new Phaser.Geom.Rectangle(0, 0, this.tiledObjectWorld.width, this.tiledObjectWorld.height);
    }

    return new Phaser.Geom.Rectangle(
      LEVEL_ORIGIN.x,
      LEVEL_ORIGIN.y,
      this.level.tiles[0].length * TILE_SIZE,
      this.level.tiles.length * TILE_SIZE
    );
  }

  private collisionContainsPoint(
    collision: TiledCollisionObject,
    worldX: number,
    worldY: number
  ): boolean {
    if (collision.polygon?.length) {
      const polygon = new Phaser.Geom.Polygon(
        collision.polygon.map(
          (point) => new Phaser.Geom.Point(collision.x + point.x, collision.y + point.y)
        )
      );
      return Phaser.Geom.Polygon.Contains(polygon, worldX, worldY);
    }

    return Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(collision.x, collision.y, collision.width, collision.height),
      worldX,
      worldY
    );
  }

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

    this.add.image(GAME_WIDTH - 120, 26, "mineral").setScrollFactor(0);
    this.mineralText = this.add
      .text(GAME_WIDTH - 96, 24, `0/${this.mineralCount}`, {
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
    if (this.tiledObjectWorld) {
      const camera = this.cameras.main;
      camera.setBounds(
        0,
        0,
        Math.max(GAME_WIDTH, this.tiledObjectWorld.width),
        Math.max(GAME_HEIGHT, this.tiledObjectWorld.height)
      );
      if (this.player) {
        camera.centerOn(this.player.x, this.player.y);
      }
      this.roomText?.setText("");
      return;
    }

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

  private updateEnemies(): void {
    this.enemies?.children.each((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      const body = enemy.body as Phaser.Physics.Arcade.Body | null;
      if (!body) {
        return true;
      }

      const left = enemy.getData("patrolLeft") as number;
      const right = enemy.getData("patrolRight") as number;
      const speed = enemy.getData("speed") as number;
      if (enemy.x <= left || body.blocked.left) {
        enemy.setVelocityX(speed).setFlipX(false);
      } else if (enemy.x >= right || body.blocked.right) {
        enemy.setVelocityX(-speed).setFlipX(true);
      }
      return true;
    });
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

  private collectMineral(mineral: Phaser.Physics.Arcade.Image): void {
    mineral.disableBody(true, true);
    const remaining = this.minerals?.countActive(true) ?? 0;
    const collected = this.mineralCount - remaining;
    this.mineralText?.setText(`${collected}/${this.mineralCount}`);
  }

  private tryExit(): void {
    if (this.isTransitioning) {
      return;
    }

    if ((this.minerals?.countActive(true) ?? 0) > 0) {
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
