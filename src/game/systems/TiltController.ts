import Phaser from "phaser";

type TiltPermissionState = "idle" | "granted" | "denied" | "insecure" | "unsupported";

type TiltSnapshot = {
  axisX: number;
  rawX: number;
  calibratedX: number;
  beta: number;
  gamma: number;
  sampleCount: number;
  source: "beta" | "gamma" | "none";
  state: TiltPermissionState;
  detail: string;
};

const DEAD_ZONE = 0.1;
const MAX_TILT_DEGREES = 22;
const SMOOTHING = 0.22;

export class TiltController {
  private rawX = 0;
  private beta = 0;
  private gamma = 0;
  private axisX = 0;
  private calibratedX = 0;
  private neutralX = 0;
  private neutralBeta = 0;
  private neutralGamma = 0;
  private hasSample = false;
  private sampleCount = 0;
  private source: "beta" | "gamma" | "none" = "none";
  private detail = "";
  private permissionState: TiltPermissionState = "idle";
  private readonly onOrientation = (event: DeviceOrientationEvent): void => {
    const reading = this.getGameHorizontalTilt(event);

    if (reading === null) {
      return;
    }

    this.beta = reading.beta;
    this.gamma = reading.gamma;
    this.source = reading.source;
    this.sampleCount += 1;

    if (!this.hasSample) {
      this.neutralBeta = reading.beta;
      this.neutralGamma = reading.gamma;
      this.neutralX = reading.rawX;
      this.hasSample = true;
    }

    this.rawX = reading.rawX;
    this.calibratedX = reading.source === "beta" ? this.beta - this.neutralBeta : this.gamma - this.neutralGamma;
    const targetAxis = Phaser.Math.Clamp(this.calibratedX / MAX_TILT_DEGREES, -1, 1);
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

    if (!("DeviceOrientationEvent" in window)) {
      this.permissionState = "unsupported";
      this.detail = "orientation API missing";
      return this.permissionState;
    }

    try {
      const orientation = DeviceOrientationEvent as DeviceOrientationEventConstructor;

      if (orientation.requestPermission) {
        const permission = await orientation.requestPermission();
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
      window.removeEventListener("deviceorientation", this.onOrientation);
      window.addEventListener("deviceorientation", this.onOrientation);
    }

    return this.permissionState;
  }

  calibrate(): void {
    this.neutralBeta = this.beta;
    this.neutralGamma = this.gamma;
    this.neutralX = this.rawX;
    this.axisX = 0;
    this.calibratedX = 0;
    this.hasSample = true;
  }

  destroy(): void {
    window.removeEventListener("deviceorientation", this.onOrientation);
  }

  getDiagnosticLabel(): string {
    const orientation = "DeviceOrientationEvent" in window ? (DeviceOrientationEvent as DeviceOrientationEventConstructor) : undefined;
    const permissionApi = orientation?.requestPermission ? "prompt api yes" : "prompt api no";
    const secure = window.isSecureContext ? "secure yes" : "secure no";
    return `${secure} / ${permissionApi}`;
  }

  private getGameHorizontalTilt(
    event: DeviceOrientationEvent
  ): { rawX: number; beta: number; gamma: number; source: "beta" | "gamma" } | null {
    const beta = event.beta ?? 0;
    const gamma = event.gamma ?? 0;

    if (event.beta === null && event.gamma === null) {
      return null;
    }

    const windowOrientation = (window as Window & { orientation?: number }).orientation;
    const angle = screen.orientation?.angle ?? windowOrientation ?? 0;
    const isLandscape = window.innerWidth > window.innerHeight || Math.abs(angle) === 90;
    const betaDelta = beta - this.neutralBeta;
    const gammaDelta = gamma - this.neutralGamma;
    const preferredSource = isLandscape ? "beta" : "gamma";
    const fallbackSource = preferredSource === "beta" ? "gamma" : "beta";
    const preferredDelta = preferredSource === "beta" ? betaDelta : gammaDelta;
    const fallbackDelta = fallbackSource === "beta" ? betaDelta : gammaDelta;
    const source = this.hasSample && Math.abs(fallbackDelta) > Math.abs(preferredDelta) + 2 ? fallbackSource : preferredSource;
    const rawX = source === "beta" ? beta : gamma;

    return {
      rawX: Phaser.Math.Clamp(rawX, -90, 90),
      beta: Phaser.Math.Clamp(beta, -180, 180),
      gamma: Phaser.Math.Clamp(gamma, -90, 90),
      source
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
