import Phaser from "phaser";

type TiltPermissionState = "idle" | "granted" | "denied" | "unsupported";

export class TiltController {
  private axisX = 0;
  private permissionState: TiltPermissionState = "idle";
  private readonly onOrientation = (event: DeviceOrientationEvent): void => {
    const gamma = event.gamma ?? 0;
    this.axisX = Phaser.Math.Clamp(gamma / 24, -1, 1);
  };

  get state(): TiltPermissionState {
    return this.permissionState;
  }

  get enabled(): boolean {
    return this.permissionState === "granted";
  }

  get horizontalAxis(): number {
    return Math.abs(this.axisX) < 0.12 ? 0 : this.axisX;
  }

  async requestAccess(): Promise<TiltPermissionState> {
    if (!("DeviceOrientationEvent" in window)) {
      this.permissionState = "unsupported";
      return this.permissionState;
    }

    const orientation = DeviceOrientationEvent as DeviceOrientationEventConstructor;

    if (orientation.requestPermission) {
      const permission = await orientation.requestPermission();
      this.permissionState = permission === "granted" ? "granted" : "denied";
    } else {
      this.permissionState = "granted";
    }

    if (this.permissionState === "granted") {
      window.addEventListener("deviceorientation", this.onOrientation);
    }

    return this.permissionState;
  }

  destroy(): void {
    window.removeEventListener("deviceorientation", this.onOrientation);
  }
}
