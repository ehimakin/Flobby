import Phaser from "phaser";

type TiltPermissionState = "idle" | "granted" | "denied" | "insecure" | "unsupported";

type TiltSnapshot = {
  axisX: number;
  rawX: number;
  calibratedX: number;
  beta: number;
  gamma: number;
  motionX: number;
  motionY: number;
  sampleCount: number;
  source: "motion-x" | "motion-y" | "none";
  state: TiltPermissionState;
  detail: string;
};

const DEAD_ZONE = 0.1;
const MAX_TILT_ACCELERATION = 3.8;
const SMOOTHING = 0.22;

export class TiltController {
  private rawX = 0;
  private beta = 0;
  private gamma = 0;
  private motionX = 0;
  private motionY = 0;
  private axisX = 0;
  private calibratedX = 0;
  private neutralX = 0;
  private hasSample = false;
  private sampleCount = 0;
  private source: "motion-x" | "motion-y" | "none" = "none";
  private detail = "";
  private permissionState: TiltPermissionState = "idle";
  private readonly onMotion = (event: DeviceMotionEvent): void => {
    const reading = this.getScreenHorizontalAcceleration(event);

    if (reading === null) {
      return;
    }

    this.motionX = reading.motionX;
    this.motionY = reading.motionY;
    this.source = reading.source;
    this.sampleCount += 1;

    if (!this.hasSample) {
      this.neutralX = reading.rawX;
      this.hasSample = true;
    }

    this.rawX = reading.rawX;
    this.calibratedX = this.rawX - this.neutralX;
    const targetAxis = Phaser.Math.Clamp(this.calibratedX / MAX_TILT_ACCELERATION, -1, 1);
    this.axisX = Phaser.Math.Linear(this.axisX, targetAxis, SMOOTHING);
  };

  get state(): TiltPermissionState {
    return this.permissionState;
  }

  get enabled(): boolean {
    return this.permissionState === "granted";
  }

  get horizontalAxis(): number {
    return Math.abs(this.axisX) < DEAD_ZONE ? 0 : this.axisX;
  }

  get snapshot(): TiltSnapshot {
    return {
      axisX: this.horizontalAxis,
      rawX: this.rawX,
      calibratedX: this.calibratedX,
      beta: this.beta,
      gamma: this.gamma,
      motionX: this.motionX,
      motionY: this.motionY,
      sampleCount: this.sampleCount,
      source: this.source,
      state: this.permissionState,
      detail: this.detail
    };
  }

  get statusLabel(): string {
    if (this.permissionState === "granted") {
      return "tilt ready";
    }

    if (this.permissionState === "insecure") {
      return "tilt needs trusted HTTPS";
    }

    if (this.permissionState === "denied") {
      return this.detail || "tilt permission denied";
    }

    if (this.permissionState === "unsupported") {
      return "tilt unsupported here";
    }

    return "keyboard / touch ready";
  }

  async requestAccess(): Promise<TiltPermissionState> {
    if (!window.isSecureContext) {
      this.permissionState = "insecure";
      this.detail = "tilt needs trusted HTTPS";
      return this.permissionState;
    }

    if (!("DeviceMotionEvent" in window)) {
      this.permissionState = "unsupported";
      this.detail = "motion API missing";
      return this.permissionState;
    }

    try {
      const motion = DeviceMotionEvent as DeviceMotionEventConstructor;

      if (motion.requestPermission) {
        const permission = await motion.requestPermission();
        this.permissionState = permission === "granted" ? "granted" : "denied";
        this.detail = permission === "granted" ? "" : "Safari returned denied";
      } else {
        this.permissionState = "granted";
        this.detail = "";
      }
    } catch (error) {
      this.permissionState = "denied";
      this.detail = this.formatPermissionError(error);
    }

    if (this.permissionState === "granted") {
      window.removeEventListener("devicemotion", this.onMotion);
      window.addEventListener("devicemotion", this.onMotion);
    }

    return this.permissionState;
  }

  calibrate(): void {
    this.neutralX = this.rawX;
    this.axisX = 0;
    this.calibratedX = 0;
    this.hasSample = true;
  }

  destroy(): void {
    window.removeEventListener("devicemotion", this.onMotion);
  }

  getDiagnosticLabel(): string {
    const motion = "DeviceMotionEvent" in window ? (DeviceMotionEvent as DeviceMotionEventConstructor) : undefined;
    const permissionApi = motion?.requestPermission ? "motion prompt yes" : "motion prompt no";
    const secure = window.isSecureContext ? "secure yes" : "secure no";
    return `${secure} / ${permissionApi}`;
  }

  private getScreenHorizontalAcceleration(
    event: DeviceMotionEvent
  ): { rawX: number; motionX: number; motionY: number; source: "motion-x" | "motion-y" } | null {
    const acceleration = event.accelerationIncludingGravity;

    if (!acceleration || (acceleration.x === null && acceleration.y === null)) {
      return null;
    }

    const motionX = acceleration.x ?? 0;
    const motionY = acceleration.y ?? 0;
    const legacyAngle = (window as Window & { orientation?: number }).orientation;
    const angle = typeof legacyAngle === "number" ? legacyAngle : screen.orientation?.angle ?? 0;
    const isLandscape = window.innerWidth > window.innerHeight || Math.abs(angle) === 90;

    if (isLandscape) {
      const direction = angle === 90 ? -1 : 1;
      return {
        rawX: Phaser.Math.Clamp(motionY * direction, -10, 10),
        motionX,
        motionY,
        source: "motion-y"
      };
    }

    return {
      rawX: Phaser.Math.Clamp(motionX, -10, 10),
      motionX,
      motionY,
      source: "motion-x"
    };
  }

  private formatPermissionError(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        return "Safari blocked tilt";
      }

      return `${error.name}: ${error.message}`.slice(0, 44);
    }

    return "tilt request failed";
  }
}
