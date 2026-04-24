import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BleManager } from "react-native-ble-plx";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import IMAGES from "../constants/images";
import {
  BLE_CHAR_UUIDS,
  BLE_DEVICE_NAME,
  BLE_SERVICE_UUID,
  PARAM_CHAR_BY_ID,
  STATUS_CODE_TEXT,
} from "../ble/bleContract";
import {
  decodeAllParamsSnapshot,
  decodeStatus,
  decodeTelemetry,
  decodeUtf8Text,
  encodeFloatParam,
  encodeParam1Epoch,
  encodeThresholdPair,
  encodeUtf8Text,
} from "../ble/bleCodec";
import { useAppTheme } from "../theme";
import { ModernBottomNav, ModernTopHeader } from "../components/ui";

const defaultForm = {
  param1Epoch: "",
  param2Lower: "",
  param2Upper: "",
  param3Lower: "",
  param3Upper: "",
  param4Lower: "",
  param4Upper: "",
  param5Lower: "",
  param5Upper: "",
  param6: "",
  param7: "",
  param8: "",
  param9: "",
};

const thresholdDefs = [
  { id: 2, title: "Threshold 1", lowerKey: "param2Lower", upperKey: "param2Upper" },
  { id: 3, title: "Threshold 2", lowerKey: "param3Lower", upperKey: "param3Upper" },
  { id: 4, title: "Threshold 3", lowerKey: "param4Lower", upperKey: "param4Upper" },
  { id: 5, title: "Threshold 4", lowerKey: "param5Lower", upperKey: "param5Upper" },
];

const multiplierDefs = [
  { id: 6, title: "Multiplier 1", key: "param6" },
  { id: 7, title: "Multiplier 2", key: "param7" },
  { id: 8, title: "Multiplier 3", key: "param8" },
  { id: 9, title: "Multiplier 4", key: "param9" },
];

const defaultShiftForm = {
  shift1Start: "",
  shift1End: "",
  shift2Start: "",
  shift2End: "",
  shift3Start: "",
  shift3End: "",
};

const shiftScheduleDefs = [
  { id: 1, title: "Shift 1", startKey: "shift1Start", endKey: "shift1End", charUuidKey: "shift1Time" },
  { id: 2, title: "Shift 2", startKey: "shift2Start", endKey: "shift2End", charUuidKey: "shift2Time" },
  { id: 3, title: "Shift 3", startKey: "shift3Start", endKey: "shift3End", charUuidKey: "shift3Time" },
];

const shiftFieldLabels = {
  shift1Start: "Shift 1 Start Time",
  shift1End: "Shift 1 End Time",
  shift2Start: "Shift 2 Start Time",
  shift2End: "Shift 2 End Time",
  shift3Start: "Shift 3 Start Time",
  shift3End: "Shift 3 End Time",
};

function buildEmptyShiftFieldErrors() {
  return {
    shift1Start: "",
    shift1End: "",
    shift2Start: "",
    shift2End: "",
    shift3Start: "",
    shift3End: "",
  };
}

function getCurrentEpochSeconds() {
  return Math.floor(Date.now() / 1000);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatMinutesTo24h(minutes) {
  const total = Number(minutes);
  if (!Number.isInteger(total) || total < 0 || total > 1439) {
    throw new Error("Time value must be within 00:00 to 23:59.");
  }
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function formatShiftPayload24h(startMin, endMin) {
  return `${formatMinutesTo24h(startMin)}-${formatMinutesTo24h(endMin)}`;
}

function formatMinutesTo12h(minutes) {
  const total = Number(minutes);
  if (!Number.isInteger(total) || total < 0 || total > 1439) {
    return "";
  }
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = (hour24 % 12) || 12;
  return `${hour12}:${pad2(minute)} ${ampm}`;
}

function parse12hTime(value, label) {
  const raw = String(value || "").trim().replace(/\s+/g, " ");
  const match = raw.match(/^(0?[1-9]|1[0-2])\s*:\s*([0-5]\d)\s*([AP]M)$/i);
  if (!match) {
    throw new Error(`${label} must be in h:mm AM/PM format.`);
  }

  const hour12 = Number(match[1]);
  const minute = Number(match[2]);
  const ampm = match[3].toUpperCase();
  const hour24 = (hour12 % 12) + (ampm === "PM" ? 12 : 0);
  return hour24 * 60 + minute;
}

function normalize12hTimeInput(value, label) {
  const minutes = parse12hTime(value, label);
  return {
    minutes,
    text: formatMinutesTo12h(minutes),
  };
}

function parseShiftPayload24h(payload, label) {
  const raw = String(payload || "").trim();
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    throw new Error(`${label} payload is invalid. Expected HH:MM-HH:MM.`);
  }

  const startHour = Number(match[1]);
  const startMinute = Number(match[2]);
  const endHour = Number(match[3]);
  const endMinute = Number(match[4]);

  return {
    startMin: startHour * 60 + startMinute,
    endMin: endHour * 60 + endMinute,
  };
}

function validateShiftSchedule(windows) {
  if (!Array.isArray(windows) || windows.length !== 3) {
    throw new Error("Shift schedule must include exactly 3 shifts.");
  }

  windows.forEach((window) => {
    if (window.startMin >= window.endMin) {
      throw new Error(`${window.title}: start time must be earlier than end time.`);
    }
    if (window.startMin < 0 || window.endMin > 1439) {
      throw new Error(`${window.title}: time must be within 12:00 AM to 11:59 PM.`);
    }
  });

  for (let i = 1; i < windows.length; i += 1) {
    const prev = windows[i - 1];
    const current = windows[i];
    if (current.startMin < prev.startMin) {
      throw new Error(`${current.title} cannot start before ${prev.title}.`);
    }
    if (current.startMin < prev.endMin) {
      throw new Error(`${current.title} overlaps with ${prev.title}.`);
    }
  }
}

function getBleDeviceDisplayName(device) {
  const name = device?.name || device?.localName || BLE_DEVICE_NAME;
  const shortId = String(device?.id || "").slice(-8);
  return shortId ? `${name} (${shortId})` : name;
}

function toInputFloat(num) {
  if (!Number.isFinite(num)) return "";
  return String(Number(num.toFixed(4)));
}

function statusText(statusCode) {
  if (Object.prototype.hasOwnProperty.call(STATUS_CODE_TEXT, statusCode)) {
    return STATUS_CODE_TEXT[statusCode];
  }
  return `unknown code (${statusCode})`;
}

const EMPTY_TELEMETRY = { raw: "-", fields: [] };
const DEVICE_NAME_MAX_LENGTH = 63;

function formatNumber(value, decimals = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const fixed = n.toFixed(decimals);
  return fixed.replace(/\.?0+$/, "");
}

function normalizeTelemetryPart(part) {
  return String(part || "")
    .replace(/\[(\d+)\]/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-zA-Z])/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeTelemetryPart(part) {
  const normalized = normalizeTelemetryPart(part);
  const lower = normalized.toLowerCase();

  const pressMatch =
    normalized.match(/press\s*([0-9]+)\s*amps?/i) ||
    normalized.match(/press\s*([0-9]+)\s*current/i) ||
    normalized.match(/press\s*([0-9]+)\s*amp/i);
  if (pressMatch) return `Phase-${pressMatch[1]} Amps`;

  if (["temp", "temperature", "temperature deg", "temperature c", "temp c"].includes(lower)) {
    return "Temperature";
  }
  if (["hum", "humidity", "humidity %"].includes(lower)) return "Humidity";
  if (["ts", "timestamp"].includes(lower)) return "Timestamp";
  if (["epoch"].includes(lower)) return "Epoch";
  if (["rssi"].includes(lower)) return "RSSI";
  if (["vbat", "battery", "batt", "battery voltage"].includes(lower)) return "Battery";
  if (["device id", "deviceid", "device_id"].includes(lower)) return "Device ID";

  return titleCase(normalized);
}

function humanizeTelemetryKey(key) {
  const parts = String(key || "").split(".");
  return parts.map((part) => humanizeTelemetryPart(part)).join(" / ");
}

function formatTelemetryTimestamp(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const ms = n > 1e12 ? n : n > 1e9 ? n * 1000 : null;
  if (!ms) return String(n);
  return new Date(ms).toLocaleString();
}

function formatTelemetryValue(key, value) {
  if (value == null) return "-";
  const keyLower = String(key || "").toLowerCase();

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "number") {
    if (/(^|[._\s-])(ts|timestamp|epoch)([._\s-]|$)/i.test(keyLower)) {
      return formatTelemetryTimestamp(value);
    }
    if (keyLower.includes("temp")) return formatNumber(value, 1);
    if (keyLower.includes("hum")) return formatNumber(value, 1);
    if (keyLower.includes("amp") || keyLower.includes("current")) return formatNumber(value, 1);
    if (keyLower.includes("volt") || keyLower.includes("vbat") || keyLower.includes("battery")) {
      return formatNumber(value, 2);
    }
    return formatNumber(value, 3);
  }

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const rendered = value.map((item) =>
      typeof item === "number" ? formatNumber(item, 3) : String(item)
    );
    return `[${rendered.join(", ")}]`;
  }

  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}

function collectTelemetryEntries(value, path = "", out = []) {
  if (value && typeof value === "object") {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        out.push({ key: path || "value", value: [] });
        return out;
      }
      value.forEach((item, idx) => {
        const nextPath = path ? `${path}[${idx}]` : `[${idx}]`;
        collectTelemetryEntries(item, nextPath, out);
      });
      return out;
    }

    const entries = Object.entries(value);
    if (entries.length === 0) {
      out.push({ key: path || "value", value: {} });
      return out;
    }
    entries.forEach(([k, v]) => {
      const nextPath = path ? `${path}.${k}` : k;
      collectTelemetryEntries(v, nextPath, out);
    });
    return out;
  }

  out.push({ key: path || "value", value });
  return out;
}

function buildTelemetryView(parsed) {
  if (parsed == null) return EMPTY_TELEMETRY;

  if (typeof parsed === "string") {
    return { raw: parsed || "-", fields: [] };
  }

  if (typeof parsed === "object" && !Array.isArray(parsed)) {
    if ("raw" in parsed && Object.keys(parsed).length === 1) {
      return { raw: String(parsed.raw ?? "-"), fields: [] };
    }
  }

  const entries = collectTelemetryEntries(parsed);
  const fields = entries.map((entry) => ({
    key: entry.key,
    label: humanizeTelemetryKey(entry.key),
    value: formatTelemetryValue(entry.key, entry.value),
  }));

  return { raw: "", fields };
}

export default function SettingsScreen({ navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const openMenu = () => {
    try {
      navigation.navigate("Sidebar");
    } catch {
      if (navigation?.canGoBack?.()) navigation.goBack();
    }
  };

  const managerRef = useRef(new BleManager());
  const connectedDeviceRef = useRef(null);
  const disconnectSubRef = useRef(null);
  const notifSubsRef = useRef([]);
  const scanTimeoutRef = useRef(null);
  const connectingRef = useRef(false);
  const disconnectingRef = useRef(false);
  const isUnmountingRef = useRef(false);

  const [deviceLabel, setDeviceLabel] = useState("Disconnected");
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [busyParam, setBusyParam] = useState(null);
  const [form, setForm] = useState(() => ({
    ...defaultForm,
    param1Epoch: String(getCurrentEpochSeconds()),
  }));
  const [mobileEpochNow, setMobileEpochNow] = useState(getCurrentEpochSeconds());
  const [esp32EpochNow, setEsp32EpochNow] = useState(null);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const [lastStatusLine, setLastStatusLine] = useState("-");
  const [statusHistory, setStatusHistory] = useState([]);
  const [liveTelemetry, setLiveTelemetry] = useState(EMPTY_TELEMETRY);
  const [deviceNameValue, setDeviceNameValue] = useState("");
  const [busyDeviceNameAction, setBusyDeviceNameAction] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [busyRecipientAction, setBusyRecipientAction] = useState(null);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [busyWifiAction, setBusyWifiAction] = useState(false);
  const [shiftForm, setShiftForm] = useState(() => ({ ...defaultShiftForm }));
  const [shiftFieldErrors, setShiftFieldErrors] = useState(() => buildEmptyShiftFieldErrors());
  const [busyShiftScheduleAction, setBusyShiftScheduleAction] = useState(null);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [activeShiftField, setActiveShiftField] = useState(null);

  const telemetryView = (() => {
    if (
      liveTelemetry &&
      typeof liveTelemetry === "object" &&
      Array.isArray(liveTelemetry.fields) &&
      "raw" in liveTelemetry
    ) {
      return liveTelemetry;
    }
    return buildTelemetryView(liveTelemetry);
  })();

  const isConnected = !!connectedDeviceRef.current;

  const clearScanTimer = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, []);

  const stopScan = useCallback(() => {
    managerRef.current.stopDeviceScan();
    clearScanTimer();
    setIsScanning(false);
  }, [clearScanTimer]);

  const clearSubscriptions = useCallback((options = {}) => {
    const { removeNative = true } = options;
    if (removeNative) {
      notifSubsRef.current.forEach((sub) => {
        try {
          sub?.remove?.();
        } catch {
          // ignore teardown errors from native BLE subscriptions
        }
      });
    }
    notifSubsRef.current = [];
  }, []);

  const clearDisconnectListener = useCallback(() => {
    try {
      disconnectSubRef.current?.remove?.();
    } catch {
      // ignore teardown errors from native BLE listener
    }
    disconnectSubRef.current = null;
  }, []);

  const applySnapshotToForm = useCallback((snapshot) => {
    if (isUnmountingRef.current) return;
    const snapshotEpoch = Number(snapshot.param1Epoch);
    setEsp32EpochNow(Number.isFinite(snapshotEpoch) && snapshotEpoch > 0 ? snapshotEpoch : null);

    setForm({
      param1Epoch: String(snapshot.param1Epoch ?? ""),
      param2Lower: String(snapshot.param2?.lower ?? ""),
      param2Upper: String(snapshot.param2?.upper ?? ""),
      param3Lower: String(snapshot.param3?.lower ?? ""),
      param3Upper: String(snapshot.param3?.upper ?? ""),
      param4Lower: String(snapshot.param4?.lower ?? ""),
      param4Upper: String(snapshot.param4?.upper ?? ""),
      param5Lower: String(snapshot.param5?.lower ?? ""),
      param5Upper: String(snapshot.param5?.upper ?? ""),
      param6: toInputFloat(snapshot.param6),
      param7: toInputFloat(snapshot.param7),
      param8: toInputFloat(snapshot.param8),
      param9: toInputFloat(snapshot.param9),
    });
  }, []);

  const requestBlePermissions = useCallback(async () => {
    if (Platform.OS !== "android") return true;

    if (Platform.Version >= 31) {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];
      const result = await PermissionsAndroid.requestMultiple(permissions);
      return permissions.every((perm) => result[perm] === PermissionsAndroid.RESULTS.GRANTED);
    }

    const fineLocation = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return fineLocation === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const clearConnectionState = useCallback((options = {}) => {
    const { removeDisconnectListener = true, removeSubscriptions = true } = options;
    connectedDeviceRef.current = null;
    if (!isUnmountingRef.current) {
      setDeviceLabel("Disconnected");
      setIsConnecting(false);
      setIsDisconnecting(false);
      setBusyParam(null);
      setDeviceNameValue("");
      setBusyDeviceNameAction(null);
      setRecipientEmail("");
      setBusyRecipientAction(null);
      setWifiSsid("");
      setWifiPassword("");
      setBusyWifiAction(false);
      setShiftForm({ ...defaultShiftForm });
      setShiftFieldErrors(buildEmptyShiftFieldErrors());
      setBusyShiftScheduleAction(null);
      setIsTimePickerVisible(false);
      setActiveShiftField(null);
    }
    clearSubscriptions({ removeNative: removeSubscriptions });
    if (removeDisconnectListener) {
      clearDisconnectListener();
    } else {
      // Avoid removing the same subscription from inside its callback.
      disconnectSubRef.current = null;
    }
  }, [clearDisconnectListener, clearSubscriptions]);

  const pushStatusLine = useCallback((line) => {
    if (isUnmountingRef.current) return;
    setLastStatusLine(line);
    setStatusHistory((prev) => [line, ...prev].slice(0, 8));
  }, []);

  const monitorBleNotifications = useCallback(
    (device) => {
      clearSubscriptions();

      const statusSub = device.monitorCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_UUIDS.status,
        (error, characteristic) => {
          if (error) return;
          if (!characteristic?.value) return;
          const status = decodeStatus(characteristic.value);
          if (!status) return;
          const line = `${new Date().toLocaleTimeString()} - Param ${status.paramId}: ${statusText(
            status.statusCode
          )}`;
          pushStatusLine(line);
        }
      );

      const allParamSub = device.monitorCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_UUIDS.allParams,
        (error, characteristic) => {
          if (error) return;
          if (!characteristic?.value) return;
          try {
            const snapshot = decodeAllParamsSnapshot(characteristic.value);
            applySnapshotToForm(snapshot);
          } catch (e) {
            pushStatusLine(`Snapshot decode error: ${e?.message || "unknown error"}`);
          }
        }
      );

      const telemetrySub = device.monitorCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_UUIDS.liveTelemetry,
        (error, characteristic) => {
          if (error) return;
          if (disconnectingRef.current || isUnmountingRef.current) return;
          if (!characteristic?.value) return;
          const parsed = decodeTelemetry(characteristic.value);
          if (!parsed) return;
          setLiveTelemetry(buildTelemetryView(parsed));
        }
      );

      notifSubsRef.current = [statusSub, allParamSub, telemetrySub];
    },
    [applySnapshotToForm, clearSubscriptions, pushStatusLine]
  );

  const readSnapshot = useCallback(async () => {
    const device = connectedDeviceRef.current;
    if (!device) {
      if (!disconnectingRef.current && !isUnmountingRef.current) {
        Alert.alert("BLE", "Connect to BIOT BLE device first.");
      }
      return;
    }
    try {
      const characteristic = await device.readCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_UUIDS.allParams
      );
      if (!characteristic?.value) {
        throw new Error("No snapshot payload received.");
      }
      const snapshot = decodeAllParamsSnapshot(characteristic.value);
      applySnapshotToForm(snapshot);
      pushStatusLine(`${new Date().toLocaleTimeString()} - Snapshot read complete`);
    } catch (e) {
      if (!disconnectingRef.current && !isUnmountingRef.current) {
        Alert.alert("Read failed", e?.message || "Unable to read snapshot.");
      }
    }
  }, [applySnapshotToForm, pushStatusLine]);

  const readBleTextCharacteristic = useCallback(async (charUuid) => {
    const device = connectedDeviceRef.current;
    if (!device) throw new Error("Connect to BIOT BLE device first.");
    const characteristic = await device.readCharacteristicForService(BLE_SERVICE_UUID, charUuid);
    return decodeUtf8Text(characteristic?.value || "").trim();
  }, []);

  const sendWifiCredentials = useCallback(async () => {
    const device = connectedDeviceRef.current;
    if (!device) {
      Alert.alert("BLE", "Connect to BIOT BLE device first.");
      return;
    }

    const ssid = wifiSsid;
    const pwd = wifiPassword;
    if (!ssid.trim() || pwd.length === 0) {
      Alert.alert("Missing data", "Both Wi-Fi SSID and password are required.");
      return;
    }

    try {
      setBusyWifiAction(true);
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_UUIDS.wifiSsid,
        encodeUtf8Text(ssid)
      );
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_UUIDS.wifiPassword,
        encodeUtf8Text(pwd)
      );
      pushStatusLine(`${new Date().toLocaleTimeString()} - Wi-Fi credentials sent to device`);
      Alert.alert("Success", "Wi-Fi credentials sent to ESP32.");
    } catch (e) {
      Alert.alert("Send failed", e?.message || "Unable to send Wi-Fi credentials.");
    } finally {
      if (!isUnmountingRef.current) {
        setBusyWifiAction(false);
      }
    }
  }, [pushStatusLine, wifiPassword, wifiSsid]);

  const readShiftSchedule = useCallback(
    async ({ silent = false } = {}) => {
      const device = connectedDeviceRef.current;
      if (!device) {
        if (!silent && !disconnectingRef.current && !isUnmountingRef.current) {
          Alert.alert("BLE", "Connect to BIOT BLE device first.");
        }
        return false;
      }

      try {
        setBusyShiftScheduleAction("read");
        const nextForm = { ...defaultShiftForm };

        for (const cfg of shiftScheduleDefs) {
          const payload = await readBleTextCharacteristic(BLE_CHAR_UUIDS[cfg.charUuidKey]);
          const parsed = parseShiftPayload24h(payload, cfg.title);
          nextForm[cfg.startKey] = formatMinutesTo12h(parsed.startMin);
          nextForm[cfg.endKey] = formatMinutesTo12h(parsed.endMin);
        }

        if (isUnmountingRef.current) return false;
        setShiftForm(nextForm);
        setShiftFieldErrors(buildEmptyShiftFieldErrors());
        pushStatusLine(`${new Date().toLocaleTimeString()} - Shift schedule read`);
        return true;
      } catch (e) {
        if (!silent && !disconnectingRef.current && !isUnmountingRef.current) {
          Alert.alert("Read failed", e?.message || "Unable to read shift schedule.");
        }
        return false;
      } finally {
        if (!isUnmountingRef.current) {
          setBusyShiftScheduleAction(null);
        }
      }
    },
    [pushStatusLine, readBleTextCharacteristic]
  );

  const normalizeShiftFormValues = useCallback((sourceForm) => {
    const nextForm = { ...defaultShiftForm };
    const nextErrors = buildEmptyShiftFieldErrors();
    const windows = [];
    let hasFieldError = false;

    for (const cfg of shiftScheduleDefs) {
      const startLabel = shiftFieldLabels[cfg.startKey] || `${cfg.title} start time`;
      const endLabel = shiftFieldLabels[cfg.endKey] || `${cfg.title} end time`;
      const startRaw = String(sourceForm[cfg.startKey] || "").trim();
      const endRaw = String(sourceForm[cfg.endKey] || "").trim();

      let startMin = null;
      let endMin = null;

      if (!startRaw) {
        hasFieldError = true;
        nextErrors[cfg.startKey] = `${startLabel} is required.`;
      } else {
        try {
          const normalized = normalize12hTimeInput(startRaw, startLabel);
          startMin = normalized.minutes;
          nextForm[cfg.startKey] = normalized.text;
        } catch (e) {
          hasFieldError = true;
          nextErrors[cfg.startKey] = e?.message || `${startLabel} is invalid.`;
          nextForm[cfg.startKey] = startRaw;
        }
      }

      if (!endRaw) {
        hasFieldError = true;
        nextErrors[cfg.endKey] = `${endLabel} is required.`;
      } else {
        try {
          const normalized = normalize12hTimeInput(endRaw, endLabel);
          endMin = normalized.minutes;
          nextForm[cfg.endKey] = normalized.text;
        } catch (e) {
          hasFieldError = true;
          nextErrors[cfg.endKey] = e?.message || `${endLabel} is invalid.`;
          nextForm[cfg.endKey] = endRaw;
        }
      }

      if (Number.isInteger(startMin) && Number.isInteger(endMin)) {
        windows.push({
          ...cfg,
          startMin,
          endMin,
        });
      }
    }

    return {
      nextForm,
      nextErrors,
      windows,
      hasFieldError,
    };
  }, []);

  const writeShiftSchedule = useCallback(async () => {
    const device = connectedDeviceRef.current;
    if (!device) {
      Alert.alert("BLE", "Connect to BIOT BLE device first.");
      return;
    }

    try {
      const { nextForm, nextErrors, windows, hasFieldError } = normalizeShiftFormValues(shiftForm);
      setShiftForm(nextForm);
      setShiftFieldErrors(nextErrors);
      if (hasFieldError) {
        throw new Error("Please correct highlighted shift time fields.");
      }
      validateShiftSchedule(windows);
      setBusyShiftScheduleAction("write");

      const orderedWrites = [...windows].sort((a, b) => b.id - a.id);
      for (const window of orderedWrites) {
        const payload = formatShiftPayload24h(window.startMin, window.endMin);
        try {
          await device.writeCharacteristicWithResponseForService(
            BLE_SERVICE_UUID,
            BLE_CHAR_UUIDS[window.charUuidKey],
            encodeUtf8Text(payload)
          );
        } catch (e) {
          throw new Error(`Failed to write ${window.title}: ${e?.message || "unknown error"}`);
        }
      }

      const normalizedForm = { ...defaultShiftForm };
      windows.forEach((window) => {
        normalizedForm[window.startKey] = formatMinutesTo12h(window.startMin);
        normalizedForm[window.endKey] = formatMinutesTo12h(window.endMin);
      });
      setShiftForm(normalizedForm);
      setShiftFieldErrors(buildEmptyShiftFieldErrors());
      pushStatusLine(`${new Date().toLocaleTimeString()} - Shift schedule saved`);
    } catch (e) {
      Alert.alert("Write failed", e?.message || "Unable to update shift schedule.");
    } finally {
      if (!isUnmountingRef.current) {
        setBusyShiftScheduleAction(null);
      }
    }
  }, [normalizeShiftFormValues, pushStatusLine, shiftForm]);

  const readDeviceName = useCallback(
    async ({ silent = false } = {}) => {
      const device = connectedDeviceRef.current;
      if (!device) {
        if (!silent && !disconnectingRef.current && !isUnmountingRef.current) {
          Alert.alert("BLE", "Connect to BIOT BLE device first.");
        }
        return false;
      }

      try {
        setBusyDeviceNameAction("read");
        const name = await readBleTextCharacteristic(BLE_CHAR_UUIDS.deviceName);

        if (isUnmountingRef.current) return false;
        setDeviceNameValue(name || "");
        pushStatusLine(`${new Date().toLocaleTimeString()} - Device name read`);
        return true;
      } catch (e) {
        if (!silent && !disconnectingRef.current && !isUnmountingRef.current) {
          Alert.alert("Read failed", e?.message || "Unable to read device name.");
        }
        return false;
      } finally {
        if (!isUnmountingRef.current) {
          setBusyDeviceNameAction(null);
        }
      }
    },
    [pushStatusLine, readBleTextCharacteristic]
  );

  const writeDeviceName = useCallback(async () => {
    const device = connectedDeviceRef.current;
    if (!device) {
      Alert.alert("BLE", "Connect to BIOT BLE device first.");
      return;
    }

    const value = String(deviceNameValue || "").trim();
    if (!value) {
      Alert.alert("Missing data", "Device name is required.");
      return;
    }
    if (value.length > DEVICE_NAME_MAX_LENGTH) {
      Alert.alert(
        "Too long",
        `Device name must be ${DEVICE_NAME_MAX_LENGTH} characters or less.`
      );
      return;
    }

    try {
      setBusyDeviceNameAction("write");
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_UUIDS.deviceName,
        encodeUtf8Text(value)
      );
      setDeviceNameValue(value);
      pushStatusLine(`${new Date().toLocaleTimeString()} - Device name updated`);
    } catch (e) {
      Alert.alert("Write failed", e?.message || "Unable to update device name.");
    } finally {
      if (!isUnmountingRef.current) {
        setBusyDeviceNameAction(null);
      }
    }
  }, [deviceNameValue, pushStatusLine]);

  const readRecipientEmail = useCallback(
    async ({ silent = false } = {}) => {
      const device = connectedDeviceRef.current;
      if (!device) {
        if (!silent && !disconnectingRef.current && !isUnmountingRef.current) {
          Alert.alert("BLE", "Connect to BIOT BLE device first.");
        }
        return false;
      }

      try {
        setBusyRecipientAction("read");
        const recipient = await readBleTextCharacteristic(BLE_CHAR_UUIDS.emailRecipient);

        if (isUnmountingRef.current) return false;
        setRecipientEmail(recipient || "");
        pushStatusLine(`${new Date().toLocaleTimeString()} - Receiver email read`);
        return true;
      } catch (e) {
        if (!silent && !disconnectingRef.current && !isUnmountingRef.current) {
          Alert.alert("Read failed", e?.message || "Unable to read receiver email.");
        }
        return false;
      } finally {
        if (!isUnmountingRef.current) {
          setBusyRecipientAction(null);
        }
      }
    },
    [pushStatusLine, readBleTextCharacteristic]
  );

  const writeRecipientEmail = useCallback(async () => {
    const device = connectedDeviceRef.current;
    if (!device) {
      Alert.alert("BLE", "Connect to BIOT BLE device first.");
      return;
    }

    const value = String(recipientEmail || "").trim();
    if (!value) {
      Alert.alert("Missing data", "Receiver email is required.");
      return;
    }

    try {
      setBusyRecipientAction("write");
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_UUIDS.emailRecipient,
        encodeUtf8Text(value)
      );
      setRecipientEmail(value);
      pushStatusLine(`${new Date().toLocaleTimeString()} - Updated receiver email`);
    } catch (e) {
      Alert.alert("Write failed", e?.message || "Unable to update receiver email.");
    } finally {
      if (!isUnmountingRef.current) {
        setBusyRecipientAction(null);
      }
    }
  }, [pushStatusLine, recipientEmail]);

  const connectToDevice = useCallback(
    async (device) => {
      if (connectingRef.current || disconnectingRef.current) return;
      connectingRef.current = true;
      setIsConnecting(true);
      try {
        if (connectedDeviceRef.current?.id && connectedDeviceRef.current.id !== device.id) {
          try {
            await managerRef.current.cancelDeviceConnection(connectedDeviceRef.current.id);
          } catch {
            // ignore; we'll still attempt the new connection
          }
          clearConnectionState({ removeSubscriptions: false });
        }

        const connected = await device.connect();
        const ready = await connected.discoverAllServicesAndCharacteristics();
        if (disconnectingRef.current || isUnmountingRef.current) {
          await managerRef.current.cancelDeviceConnection(ready.id).catch(() => {});
          return;
        }

        connectedDeviceRef.current = ready;
        setSelectedDeviceId(ready.id);
        setDeviceLabel(getBleDeviceDisplayName(ready));
        pushStatusLine(`${new Date().toLocaleTimeString()} - Connected`);
        monitorBleNotifications(ready);

        clearDisconnectListener();
        disconnectSubRef.current = managerRef.current.onDeviceDisconnected(ready.id, (error) => {
          if (disconnectingRef.current || isUnmountingRef.current) return;
          clearConnectionState({ removeDisconnectListener: false, removeSubscriptions: false });
          if (error?.message) {
            pushStatusLine(`${new Date().toLocaleTimeString()} - Disconnected (${error.message})`);
            return;
          }
          pushStatusLine(`${new Date().toLocaleTimeString()} - Disconnected`);
        });

        await readSnapshot();
        await readDeviceName({ silent: true });
        await readRecipientEmail({ silent: true });
        await readShiftSchedule({ silent: true });
      } catch (e) {
        if (!disconnectingRef.current && !isUnmountingRef.current) {
          Alert.alert("BLE connect failed", e?.message || "Unable to connect.");
        }
        clearConnectionState({ removeSubscriptions: false });
      } finally {
        connectingRef.current = false;
        if (!isUnmountingRef.current) {
          setIsConnecting(false);
        }
      }
    },
    [
      clearConnectionState,
      clearDisconnectListener,
      monitorBleNotifications,
      readDeviceName,
      pushStatusLine,
      readRecipientEmail,
      readShiftSchedule,
      readSnapshot,
    ]
  );

  const scanForBleDevices = useCallback(async () => {
    if (isScanning || isConnecting || isDisconnecting) return;

    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      Alert.alert(
        "Permissions required",
        "Bluetooth permissions are required to scan and connect."
      );
      return;
    }

    setScannedDevices([]);
    setSelectedDeviceId("");
    setIsDeviceDropdownOpen(true);
    setIsScanning(true);
    pushStatusLine(`${new Date().toLocaleTimeString()} - Scanning BLE devices...`);

    managerRef.current.startDeviceScan(null, { allowDuplicates: false }, (error, scanned) => {
      if (error) {
        stopScan();
        Alert.alert("Scan error", error.message || "Unable to scan.");
        return;
      }
      if (!scanned) return;
      setScannedDevices((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === scanned.id);
        const nextItem = {
          id: scanned.id,
          name: scanned.name || scanned.localName || "Unknown device",
          rssi: Number.isFinite(scanned.rssi) ? scanned.rssi : null,
          device: scanned,
        };
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = nextItem;
          return next;
        }
        return [...prev, nextItem];
      });
    });

    scanTimeoutRef.current = setTimeout(() => {
      stopScan();
      pushStatusLine(`${new Date().toLocaleTimeString()} - Scan complete`);
    }, 12000);
  }, [isConnecting, isDisconnecting, isScanning, pushStatusLine, requestBlePermissions, stopScan]);

  const connectSelectedDevice = useCallback(async () => {
    if (disconnectingRef.current || isDisconnecting) return;
    const selected = scannedDevices.find((item) => item.id === selectedDeviceId);
    if (!selected?.device) {
      Alert.alert("BLE", "Select a BLE device first.");
      return;
    }
    stopScan();
    setIsDeviceDropdownOpen(false);
    await connectToDevice(selected.device);
  }, [connectToDevice, isDisconnecting, scannedDevices, selectedDeviceId, stopScan]);

  const handleDeviceRowPress = useCallback(
    async (item) => {
      if (disconnectingRef.current || isDisconnecting) return;
      setSelectedDeviceId(item.id);
      stopScan();
      setIsDeviceDropdownOpen(false);
      await connectToDevice(item.device);
    },
    [connectToDevice, isDisconnecting, stopScan]
  );

  const disconnect = useCallback(async () => {
    if (disconnectingRef.current) return;
    disconnectingRef.current = true;
    setIsDisconnecting(true);
    pushStatusLine(`${new Date().toLocaleTimeString()} - Disconnecting...`);
    try {
      stopScan();
      const deviceId = connectedDeviceRef.current?.id;
      clearDisconnectListener();

      if (deviceId) {
        await managerRef.current.cancelDeviceConnection(deviceId);
      }
    } catch (e) {
      pushStatusLine(
        `${new Date().toLocaleTimeString()} - Disconnect warning: ${e?.message || "unknown"}`
      );
    } finally {
      clearConnectionState({ removeDisconnectListener: false, removeSubscriptions: false });
      setIsDeviceDropdownOpen(false);
      disconnectingRef.current = false;
      pushStatusLine(`${new Date().toLocaleTimeString()} - Disconnected`);
    }
  }, [
    clearConnectionState,
    clearDisconnectListener,
    pushStatusLine,
    stopScan,
  ]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setShiftField = useCallback((key, value) => {
    setShiftForm((prev) => ({ ...prev, [key]: value }));
    setShiftFieldErrors((prev) => {
      if (!prev[key]) return prev;
      return { ...prev, [key]: "" };
    });
  }, []);

  const normalizeShiftFieldOnBlur = useCallback(
    (fieldKey) => {
      const label = shiftFieldLabels[fieldKey] || "Shift time";
      const raw = String(shiftForm[fieldKey] || "").trim();
      if (!raw) {
        setShiftForm((prev) => ({ ...prev, [fieldKey]: "" }));
        setShiftFieldErrors((prev) => ({ ...prev, [fieldKey]: `${label} is required.` }));
        return;
      }

      try {
        const normalized = normalize12hTimeInput(raw, label);
        setShiftForm((prev) => ({ ...prev, [fieldKey]: normalized.text }));
        setShiftFieldErrors((prev) => ({ ...prev, [fieldKey]: "" }));
      } catch (e) {
        setShiftForm((prev) => ({ ...prev, [fieldKey]: raw }));
        setShiftFieldErrors((prev) => ({
          ...prev,
          [fieldKey]: e?.message || `${label} is invalid.`,
        }));
      }
    },
    [shiftForm]
  );

  const openShiftTimePicker = useCallback((fieldKey) => {
    setActiveShiftField(fieldKey);
    setIsTimePickerVisible(true);
  }, []);

  const closeShiftTimePicker = useCallback(() => {
    setIsTimePickerVisible(false);
    setActiveShiftField(null);
  }, []);

  const shiftPickerInitialDate = useMemo(() => {
    const fallback = new Date();
    fallback.setSeconds(0, 0);
    if (!activeShiftField) {
      return fallback;
    }

    const fieldValue = String(shiftForm[activeShiftField] || "").trim();
    if (!fieldValue) {
      return fallback;
    }

    try {
      const minutes = parse12hTime(fieldValue, shiftFieldLabels[activeShiftField] || "Shift time");
      const nextDate = new Date();
      nextDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      return nextDate;
    } catch {
      return fallback;
    }
  }, [activeShiftField, shiftForm]);

  const onShiftTimePickerConfirm = useCallback(
    (selectedDate) => {
      if (!activeShiftField) {
        closeShiftTimePicker();
        return;
      }
      const minutes = selectedDate.getHours() * 60 + selectedDate.getMinutes();
      const normalized = formatMinutesTo12h(minutes);
      setShiftForm((prev) => ({ ...prev, [activeShiftField]: normalized }));
      setShiftFieldErrors((prev) => ({ ...prev, [activeShiftField]: "" }));
      closeShiftTimePicker();
    },
    [activeShiftField, closeShiftTimePicker]
  );

  const writeParamBase64 = useCallback(async (paramId, base64Payload) => {
    const device = connectedDeviceRef.current;
    if (!device) throw new Error("Connect to BIOT BLE device first.");
    const charUuid = PARAM_CHAR_BY_ID[paramId];
    if (!charUuid) throw new Error(`Unknown parameter ${paramId}.`);
    await device.writeCharacteristicWithResponseForService(
      BLE_SERVICE_UUID,
      charUuid,
      base64Payload
    );
  }, []);

  const parseRequiredInt = (value, label) => {
    if (value === "") throw new Error(`${label} is required.`);
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) throw new Error(`${label} must be an integer.`);
    return parsed;
  };

  const parseRequiredFloat = (value, label) => {
    if (value === "") throw new Error(`${label} is required.`);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number.`);
    return parsed;
  };

  const validateU16 = (value, label) => {
    if (value < 0 || value > 65535) {
      throw new Error(`${label} must be 0..65535.`);
    }
  };

  const buildParamPayload = useCallback((paramId, sourceForm) => {
    if (paramId === 1) {
      const epoch = parseRequiredInt(sourceForm.param1Epoch, "Param 1 epoch");
      if (epoch < 0) throw new Error("Param 1 epoch must be >= 0.");
      return encodeParam1Epoch(epoch);
    }

    if (paramId >= 2 && paramId <= 5) {
      const cfg = thresholdDefs.find((x) => x.id === paramId);
      const lower = parseRequiredInt(sourceForm[cfg.lowerKey], `${cfg.title} lower`);
      const upper = parseRequiredInt(sourceForm[cfg.upperKey], `${cfg.title} upper`);
      validateU16(lower, `${cfg.title} lower`);
      validateU16(upper, `${cfg.title} upper`);
      if (lower > upper) {
        throw new Error(`${cfg.title}: lower must be <= upper.`);
      }
      return encodeThresholdPair(lower, upper);
    }

    if (paramId >= 6 && paramId <= 9) {
      const cfg = multiplierDefs.find((x) => x.id === paramId);
      const value = parseRequiredFloat(sourceForm[cfg.key], cfg.title);
      return encodeFloatParam(value);
    }

    throw new Error(`Unsupported parameter ${paramId}.`);
  }, []);

  const writeSingleParam = useCallback(
    async (paramId, sourceForm = form) => {
      try {
        setBusyParam(paramId);
        const payload = buildParamPayload(paramId, sourceForm);

        await writeParamBase64(paramId, payload);
        pushStatusLine(`${new Date().toLocaleTimeString()} - Wrote Param ${paramId}`);
      } catch (e) {
        Alert.alert("Write failed", e?.message || "Unable to write parameter.");
      } finally {
        setBusyParam(null);
      }
    },
    [buildParamPayload, form, pushStatusLine, writeParamBase64]
  );

  const writeAllParams = useCallback(async () => {
    const nowEpoch = getCurrentEpochSeconds();
    const formToWrite = { ...form, param1Epoch: String(nowEpoch) };
    try {
      setBusyParam("all");
      for (let id = 1; id <= 9; id += 1) {
        const payload = buildParamPayload(id, formToWrite);
        await writeParamBase64(id, payload);
        pushStatusLine(`${new Date().toLocaleTimeString()} - Wrote Param ${id}`);
      }
      await readSnapshot();
    } catch (e) {
      Alert.alert("Write failed", e?.message || "Unable to write all parameters.");
    } finally {
      setBusyParam(null);
    }
  }, [buildParamPayload, form, pushStatusLine, readSnapshot, writeParamBase64]);

  const mobileNowReadable = new Date(mobileEpochNow * 1000).toLocaleString();
  const esp32NowReadable =
    Number.isFinite(esp32EpochNow) && esp32EpochNow > 0
      ? new Date(esp32EpochNow * 1000).toLocaleString()
      : "-";
  const selectedScannedDevice = scannedDevices.find((item) => item.id === selectedDeviceId);
  const selectedBleLabel = selectedScannedDevice?.device
    ? getBleDeviceDisplayName(selectedScannedDevice.device)
    : isConnected
      ? deviceLabel
      : "";

  const writeParam1WithMobileNow = useCallback(async () => {
    const nowEpoch = getCurrentEpochSeconds();
    setMobileEpochNow(nowEpoch);
    await writeSingleParam(1, { param1Epoch: String(nowEpoch) });
    await readSnapshot();
  }, [readSnapshot, writeSingleParam]);

  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      isUnmountingRef.current = true;
      disconnectingRef.current = true;
      stopScan();
      clearSubscriptions({ removeNative: false });
      clearDisconnectListener();
      connectedDeviceRef.current = null;
      manager.destroy();
    };
  }, [clearDisconnectListener, clearSubscriptions, stopScan]);

  useEffect(() => {
    const timerId = setInterval(() => {
      setMobileEpochNow(getCurrentEpochSeconds());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ModernTopHeader
        title="SETTINGS"
        leftIcon={IMAGES.MoreTop}
        onLeftPress={openMenu}
        rightIcon={IMAGES.SettingIcon}
        onRightPress={readSnapshot}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.settingPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelHeaderText}>Appearance</Text>
          </View>
          <View style={styles.panelBody}>
            <Text style={styles.infoLine}>Open Themes to switch app appearance.</Text>
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn, styles.themeOpenBtn]}
              onPress={() => navigation.navigate("Themes")}
            >
              <Text style={styles.actionBtnText}>Themes</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>BLE Connection</Text>
          <Text style={styles.valueText}>Connected: {deviceLabel}</Text>

          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={scanForBleDevices}
              disabled={isScanning || isConnecting || isDisconnecting}
            >
              {isScanning || isConnecting || isDisconnecting ? (
                <ActivityIndicator color={theme.colors.buttonPrimaryText} />
              ) : (
                <Text style={styles.actionBtnText}>Scan BLE</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.dropdownTrigger}
            disabled={!scannedDevices.length}
            onPress={() => setIsDeviceDropdownOpen((prev) => !prev)}
          >
            <Text style={styles.dropdownText}>
              {selectedBleLabel
                ? selectedBleLabel
                : scannedDevices.length
                  ? "Select BLE device"
                  : "No devices scanned"}
            </Text>
            <Text style={styles.dropdownArrow}>{isDeviceDropdownOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {isDeviceDropdownOpen ? (
            <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
              {scannedDevices.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.dropdownItem,
                    selectedDeviceId === item.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => handleDeviceRowPress(item)}
                >
                  <View style={styles.dropdownItemTop}>
                    <Text style={styles.dropdownItemTitle}>{item.name}</Text>
                    {typeof item.rssi === "number" ? (
                      <Text style={styles.dropdownItemRssi}>{item.rssi} dBm</Text>
                    ) : null}
                  </View>
                  <Text style={styles.dropdownItemSub}>{item.id}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={connectSelectedDevice}
              disabled={!selectedDeviceId || isConnecting || isDisconnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color={theme.colors.buttonPrimaryText} />
              ) : (
                <Text style={styles.actionBtnText}>Connect</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.ghostBtn]}
              onPress={disconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <ActivityIndicator color={theme.colors.buttonGhostText} />
              ) : (
                <Text style={styles.ghostBtnText}>Disconnect</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={readSnapshot}
              disabled={!isConnected || isDisconnecting}
            >
              <Text style={styles.actionBtnText}>Read All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={writeAllParams}
              disabled={!isConnected || busyParam === "all" || isDisconnecting}
            >
              {busyParam === "all" ? (
                <ActivityIndicator color={theme.colors.buttonPrimaryText} />
              ) : (
                <Text style={styles.actionBtnText}>Write All</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelHeaderText}>Wi-Fi Credentials</Text>
          </View>
          <View style={styles.panelBody}>
            <Text style={styles.fieldHeading}>Wi-Fi SSID</Text>
            <TextInput
              style={styles.settingInputStandalone}
              value={wifiSsid}
              onChangeText={setWifiSsid}
              placeholder="SSID ID"
              placeholderTextColor={theme.colors.inputPlaceholder}
              autoCapitalize="none"
            />

            <Text style={styles.fieldHeading}>Wi-Fi Password</Text>
            <TextInput
              style={styles.settingInputStandalone}
              value={wifiPassword}
              onChangeText={setWifiPassword}
              placeholder="password"
              placeholderTextColor={theme.colors.inputPlaceholder}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.setBtn, styles.primaryBtn, styles.fullWidthActionBtn]}
              onPress={sendWifiCredentials}
              disabled={!isConnected || isDisconnecting || busyWifiAction}
            >
              {busyWifiAction ? (
                <ActivityIndicator color={theme.colors.buttonPrimaryText} />
              ) : (
                <Text style={styles.setBtnText}>Send To Device</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.infoLine}>Writes SSID and password to ESP32 using BLE characteristics.</Text>
          </View>
        </View>

        <View style={styles.settingPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelHeaderText}>Date Time Sync</Text>
          </View>
          <View style={styles.panelBody}>
            <Text style={styles.infoLine}>Current Date/Time: {mobileNowReadable}</Text>
            <Text style={styles.infoLine}>Device: {esp32NowReadable}</Text>

            <TouchableOpacity
              style={[styles.setBtn, styles.primaryBtn]}
              onPress={writeParam1WithMobileNow}
              disabled={!isConnected || busyParam === 1 || isDisconnecting}
            >
              {busyParam === 1 ? (
                <ActivityIndicator color={theme.colors.buttonPrimaryText} />
              ) : (
                <Text style={styles.setBtnText}>SET TIME</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {thresholdDefs.map((cfg) => (
          <View key={cfg.id} style={styles.settingPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelHeaderText}>{cfg.title}</Text>
            </View>
            <View style={styles.panelBody}>
              <View style={styles.thresholdRow}>
                <View style={styles.valueGroup}>
                  <Text style={styles.valueLabel}>Low:</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={form[cfg.lowerKey]}
                    onChangeText={(txt) => setField(cfg.lowerKey, txt.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.valueGroup}>
                  <Text style={styles.valueLabel}>High:</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={form[cfg.upperKey]}
                    onChangeText={(txt) => setField(cfg.upperKey, txt.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.setBtn, styles.primaryBtn]}
                onPress={() => writeSingleParam(cfg.id)}
                disabled={!isConnected || busyParam === cfg.id || isDisconnecting}
              >
                {busyParam === cfg.id ? (
                  <ActivityIndicator color={theme.colors.buttonPrimaryText} />
                ) : (
                  <Text style={styles.setBtnText}>SET</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {multiplierDefs.map((cfg) => (
          <View key={cfg.id} style={styles.settingPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelHeaderText}>{cfg.title}</Text>
            </View>
            <View style={styles.panelBody}>
              <View style={styles.multiplierRow}>
                <TextInput
                  style={styles.settingInputWide}
                  value={form[cfg.key]}
                  onChangeText={(txt) => setField(cfg.key, txt)}
                  placeholder="Value"
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.setBtn, styles.primaryBtn]}
                  onPress={() => writeSingleParam(cfg.id)}
                  disabled={!isConnected || busyParam === cfg.id || isDisconnecting}
                >
                  {busyParam === cfg.id ? (
                    <ActivityIndicator color={theme.colors.buttonPrimaryText} />
                  ) : (
                    <Text style={styles.setBtnText}>SET</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.settingPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelHeaderText}>Shift Schedule</Text>
          </View>
          <View style={styles.panelBody}>
            <Text style={styles.infoLine}>BLE: shift windows (...00f4, ...00f3, ...00f2)</Text>

            <TouchableOpacity
              style={[styles.setBtn, styles.secondaryBtn, styles.readEmailBtn]}
              onPress={() => readShiftSchedule()}
              disabled={!isConnected || isDisconnecting || busyShiftScheduleAction !== null}
            >
              {busyShiftScheduleAction === "read" ? (
                <ActivityIndicator color={theme.colors.buttonSecondaryText} />
              ) : (
                <Text style={styles.readEmailBtnText}>READ SHIFTS</Text>
              )}
            </TouchableOpacity>

            {shiftScheduleDefs.map((cfg) => (
              <View key={cfg.id}>
                <Text style={styles.fieldHeading}>{cfg.title}</Text>
                <View style={styles.shiftRow}>
                  <View style={styles.shiftValueGroup}>
                    <Text style={styles.valueLabel}>Start:</Text>
                    <View style={styles.shiftFieldColumn}>
                      <View style={styles.shiftInputRow}>
                        <TextInput
                          style={[
                            styles.settingInput,
                            shiftFieldErrors[cfg.startKey] ? styles.settingInputError : null,
                          ]}
                          value={shiftForm[cfg.startKey]}
                          onChangeText={(txt) => setShiftField(cfg.startKey, txt)}
                          onBlur={() => normalizeShiftFieldOnBlur(cfg.startKey)}
                          placeholder="8:00 AM"
                          placeholderTextColor={theme.colors.inputPlaceholder}
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          style={[styles.pickBtn, styles.secondaryBtn]}
                          onPress={() => openShiftTimePicker(cfg.startKey)}
                          disabled={isDisconnecting || busyShiftScheduleAction !== null}
                        >
                          <Text style={styles.pickBtnText}>Pick</Text>
                        </TouchableOpacity>
                      </View>
                      {shiftFieldErrors[cfg.startKey] ? (
                        <Text style={styles.fieldErrorText}>{shiftFieldErrors[cfg.startKey]}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.shiftValueGroup}>
                    <Text style={styles.valueLabel}>End:</Text>
                    <View style={styles.shiftFieldColumn}>
                      <View style={styles.shiftInputRow}>
                        <TextInput
                          style={[
                            styles.settingInput,
                            shiftFieldErrors[cfg.endKey] ? styles.settingInputError : null,
                          ]}
                          value={shiftForm[cfg.endKey]}
                          onChangeText={(txt) => setShiftField(cfg.endKey, txt)}
                          onBlur={() => normalizeShiftFieldOnBlur(cfg.endKey)}
                          placeholder="1:00 PM"
                          placeholderTextColor={theme.colors.inputPlaceholder}
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          style={[styles.pickBtn, styles.secondaryBtn]}
                          onPress={() => openShiftTimePicker(cfg.endKey)}
                          disabled={isDisconnecting || busyShiftScheduleAction !== null}
                        >
                          <Text style={styles.pickBtnText}>Pick</Text>
                        </TouchableOpacity>
                      </View>
                      {shiftFieldErrors[cfg.endKey] ? (
                        <Text style={styles.fieldErrorText}>{shiftFieldErrors[cfg.endKey]}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.setBtn, styles.primaryBtn]}
              onPress={writeShiftSchedule}
              disabled={!isConnected || isDisconnecting || busyShiftScheduleAction !== null}
            >
              {busyShiftScheduleAction === "write" ? (
                <ActivityIndicator color={theme.colors.buttonPrimaryText} />
              ) : (
                <Text style={styles.setBtnText}>SAVE ALL</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelHeaderText}>Device Identity</Text>
          </View>
          <View style={styles.panelBody}>
            <Text style={styles.infoLine}>BLE: device name (...00f5)</Text>

            <TouchableOpacity
              style={[styles.setBtn, styles.secondaryBtn, styles.readEmailBtn]}
              onPress={() => readDeviceName()}
              disabled={!isConnected || isDisconnecting || busyDeviceNameAction !== null}
            >
              {busyDeviceNameAction === "read" ? (
                <ActivityIndicator color={theme.colors.buttonSecondaryText} />
              ) : (
                <Text style={styles.readEmailBtnText}>READ NAME</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.fieldHeading}>Device Name</Text>
            <View style={styles.multiplierRow}>
              <TextInput
                style={styles.settingInputWide}
                value={deviceNameValue}
                onChangeText={setDeviceNameValue}
                placeholder="Device name"
                placeholderTextColor={theme.colors.inputPlaceholder}
                autoCorrect={false}
                maxLength={DEVICE_NAME_MAX_LENGTH}
              />
              <TouchableOpacity
                style={[styles.setBtn, styles.primaryBtn, styles.inlineSetBtn]}
                onPress={writeDeviceName}
                disabled={!isConnected || isDisconnecting || busyDeviceNameAction !== null}
              >
                {busyDeviceNameAction === "write" ? (
                  <ActivityIndicator color={theme.colors.buttonPrimaryText} />
                ) : (
                  <Text style={styles.setBtnText}>SET</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.settingPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelHeaderText}>Email Alert Config</Text>
          </View>
          <View style={styles.panelBody}>
            <Text style={styles.infoLine}>BLE: recipient (...00f6)</Text>

            <TouchableOpacity
              style={[styles.setBtn, styles.secondaryBtn, styles.readEmailBtn]}
              onPress={() => readRecipientEmail()}
              disabled={!isConnected || isDisconnecting || busyRecipientAction !== null}
            >
              {busyRecipientAction === "read" ? (
                <ActivityIndicator color={theme.colors.buttonSecondaryText} />
              ) : (
                <Text style={styles.readEmailBtnText}>READ RECEIVER</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.fieldHeading}>Receiver Email</Text>
            <View style={styles.multiplierRow}>
              <TextInput
                style={styles.settingInputWide}
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                placeholder="Recipient email"
                placeholderTextColor={theme.colors.inputPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={[styles.setBtn, styles.primaryBtn, styles.inlineSetBtn]}
                onPress={writeRecipientEmail}
                disabled={!isConnected || isDisconnecting || busyRecipientAction !== null}
              >
                {busyRecipientAction === "write" ? (
                  <ActivityIndicator color={theme.colors.buttonPrimaryText} />
                ) : (
                  <Text style={styles.setBtnText}>SET</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>BLE Activity</Text>
          <Text style={styles.valueText}>{lastStatusLine}</Text>
          {statusHistory.map((line, index) => (
            <Text key={`${line}_${index}`} style={styles.historyText}>
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Live Telemetry</Text>
          {telemetryView.fields.length ? (
            <View style={styles.telemetryList}>
              {telemetryView.fields.map((item) => (
                <View key={item.key} style={styles.telemetryRow}>
                  <Text style={styles.telemetryLabel}>{item.label}</Text>
                  <Text style={styles.telemetryValue}>{item.value}</Text>
                </View>
              ))}
              {telemetryView.raw && telemetryView.raw !== "-" ? (
                <Text style={styles.telemetryRaw}>Raw: {telemetryView.raw}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.telemetryText}>{telemetryView.raw}</Text>
          )}
        </View>
      </ScrollView>

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        date={shiftPickerInitialDate}
        is24Hour={false}
        onConfirm={onShiftTimePickerConfirm}
        onCancel={closeShiftTimePicker}
      />

      <ModernBottomNav
        navigation={navigation}
        activeRoute="More"
        items={[
          { key: "HOME", label: "HOME", route: "Home", icon: IMAGES.HomeIcon },
          { key: "DASH", label: "DASH", route: "Dashboard", icon: IMAGES.GraphIcon },
          { key: "ALARM", label: "ALARM", route: "Alarm", icon: IMAGES.AlarmIcon },
          { key: "MORE", label: "MORE", route: "More", icon: IMAGES.MoreIcon },
        ]}
      />
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 116,
    },
    infoCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      padding: 12,
      marginBottom: 14,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    valueText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    rowButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
      columnGap: 10,
    },
    actionBtn: {
      flex: 1,
      minHeight: 42,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    primaryBtn: {
      backgroundColor: theme.colors.buttonPrimary,
    },
    secondaryBtn: {
      backgroundColor: theme.colors.buttonSecondary,
    },
    ghostBtn: {
      backgroundColor: theme.colors.buttonGhost,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
    actionBtnText: {
      color: theme.colors.buttonPrimaryText,
      fontWeight: "700",
      fontSize: 13,
    },
    ghostBtnText: {
      color: theme.colors.buttonGhostText,
      fontWeight: "700",
      fontSize: 13,
    },
    dropdownTrigger: {
      marginTop: 10,
      minHeight: 42,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 10,
      backgroundColor: theme.colors.inputBackground,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
    },
    dropdownText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.inputText,
      marginRight: 8,
    },
    dropdownArrow: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    dropdownMenu: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 10,
      backgroundColor: theme.colors.surfaceElevated,
      maxHeight: 220,
      overflow: "hidden",
    },
    dropdownItem: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    dropdownItemActive: {
      backgroundColor: theme.colors.chipActiveBackground,
    },
    dropdownItemTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      columnGap: 8,
    },
    dropdownItemTitle: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    dropdownItemRssi: {
      color: theme.colors.textSecondary,
      fontSize: 11,
    },
    dropdownItemSub: {
      color: theme.colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    settingPanel: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.surfaceAlt,
      overflow: "hidden",
      marginBottom: 14,
    },
    panelHeader: {
      backgroundColor: theme.colors.cardHeader,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    panelHeaderText: {
      fontSize: 20,
      color: theme.colors.textPrimary,
      fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
    },
    panelBody: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    infoLine: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    themeOpenBtn: {
      marginTop: 6,
    },
    thresholdRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      columnGap: 12,
    },
    shiftRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      columnGap: 12,
      marginBottom: 8,
    },
    valueGroup: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      columnGap: 6,
    },
    shiftValueGroup: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      columnGap: 6,
    },
    shiftFieldColumn: {
      flex: 1,
    },
    shiftInputRow: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 8,
    },
    valueLabel: {
      fontSize: 16,
      color: theme.colors.textPrimary,
      minWidth: 42,
      fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
    },
    settingInput: {
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 14,
      color: theme.colors.inputText,
      backgroundColor: theme.colors.inputBackground,
      flex: 1,
    },
    settingInputError: {
      borderColor: theme.colors.danger || "#d14343",
    },
    fieldErrorText: {
      color: theme.colors.danger || "#d14343",
      fontSize: 11,
      marginTop: 4,
    },
    pickBtn: {
      marginTop: 0,
      alignSelf: "auto",
      minWidth: 56,
      minHeight: 34,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 10,
    },
    pickBtnText: {
      color: theme.colors.buttonSecondaryText,
      fontWeight: "700",
      fontSize: 12,
      letterSpacing: 0.2,
    },
    setBtn: {
      minHeight: 36,
      minWidth: 104,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
      alignSelf: "flex-end",
      paddingHorizontal: 16,
    },
    inlineSetBtn: {
      marginTop: 0,
      alignSelf: "auto",
      minWidth: 82,
    },
    readEmailBtn: {
      marginTop: 0,
      marginBottom: 12,
      alignSelf: "flex-start",
    },
    readEmailBtnText: {
      color: theme.colors.buttonSecondaryText,
      fontWeight: "700",
      fontSize: 12,
      letterSpacing: 0.3,
    },
    fieldHeading: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    setBtnText: {
      color: theme.colors.buttonPrimaryText,
      fontWeight: "800",
      fontSize: 13,
      letterSpacing: 0.4,
    },
    multiplierRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      columnGap: 12,
    },
    settingInputWide: {
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 14,
      color: theme.colors.inputText,
      backgroundColor: theme.colors.inputBackground,
      flex: 1,
    },
    settingInputStandalone: {
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: theme.colors.inputText,
      backgroundColor: theme.colors.inputBackground,
      marginBottom: 12,
    },
    fullWidthActionBtn: {
      alignSelf: "stretch",
    },
    historyText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    telemetryText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    telemetryList: {
      rowGap: 2,
    },
    telemetryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    telemetryLabel: {
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      paddingRight: 8,
    },
    telemetryValue: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "right",
    },
    telemetryRaw: {
      marginTop: 6,
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    bottomNavBg: {
      position: "absolute",
      bottom: 0,
      width: "100%",
      height: 86,
    },
    navContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-around",
      paddingBottom: 10,
      paddingHorizontal: 10,
      flex: 1,
    },
    navItem: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 62,
    },
    navIcon: {
      width: 24,
      height: 24,
      resizeMode: "contain",
      marginBottom: 2,
    },
    navText: {
      fontSize: 11,
      color: theme.colors.textPrimary,
      fontWeight: "700",
    },
  });
}
