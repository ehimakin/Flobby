interface DeviceOrientationEventConstructor {
  requestPermission?: () => Promise<PermissionState>;
}

interface DeviceMotionEventConstructor {
  requestPermission?: () => Promise<PermissionState>;
}
