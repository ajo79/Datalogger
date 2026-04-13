const UUID_ROOT = "8d4d3c10-2a4c-4d1f-9b3a-6f001234";

const withSuffix = (suffix) => `${UUID_ROOT}${suffix}`;

export const BLE_DEVICE_NAME = "BIOT";
export const BLE_SERVICE_UUID = withSuffix("0000");

export const BLE_CHAR_UUIDS = {
  param1: withSuffix("0001"),
  param2: withSuffix("0002"),
  param3: withSuffix("0003"),
  param4: withSuffix("0004"),
  param5: withSuffix("0005"),
  param6: withSuffix("0006"),
  param7: withSuffix("0007"),
  param8: withSuffix("0008"),
  param9: withSuffix("0009"),
  deviceName: withSuffix("00f5"),
  deviceId: withSuffix("00f9"),
  // Factory credential writes (firmware must expose matching characteristics)
  wifiSsid: withSuffix("00fb"),
  wifiPassword: withSuffix("00fa"),
  // Alarm-email configuration (firmware with email support)
  emailSender: withSuffix("00f8"),
  emailAppPassword: withSuffix("00f7"),
  emailRecipient: withSuffix("00f6"),
  allParams: withSuffix("00ff"),
  status: withSuffix("00fe"),
  liveTelemetry: withSuffix("00fd"),
};

export const PARAM_CHAR_BY_ID = {
  1: BLE_CHAR_UUIDS.param1,
  2: BLE_CHAR_UUIDS.param2,
  3: BLE_CHAR_UUIDS.param3,
  4: BLE_CHAR_UUIDS.param4,
  5: BLE_CHAR_UUIDS.param5,
  6: BLE_CHAR_UUIDS.param6,
  7: BLE_CHAR_UUIDS.param7,
  8: BLE_CHAR_UUIDS.param8,
  9: BLE_CHAR_UUIDS.param9,
};

export const STATUS_CODE_TEXT = {
  0: "OK",
  1: "bad param",
  2: "bad length",
  3: "bad value",
  4: "RTC set failed",
};
