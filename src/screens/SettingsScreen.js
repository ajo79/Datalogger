import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
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
  encodeFloatParam,
  encodeParam1Epoch,
  encodeThresholdPair,
} from "../ble/bleCodec";
import { navigateToTabRoute } from "../navigation/navHelpers";

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

function getCurrentEpochSeconds() {
  return Math.floor(Date.now() / 1000);
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
  const navigateToTab = (route) => navigateToTabRoute(navigation, route);

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
    [clearConnectionState, clearDisconnectListener, monitorBleNotifications, pushStatusLine, readSnapshot]
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
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={openMenu}
          style={styles.headerIconBtn}
        >
          <Image source={IMAGES.MoreTop} style={styles.headerIcon} />
        </TouchableOpacity>
        <Text style={styles.headerText}>BLE SETTING</Text>
        <TouchableOpacity onPress={readSnapshot} style={styles.headerIconBtn}>
          <Image source={IMAGES.SettingIcon} style={styles.headerIcon} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
                <ActivityIndicator color="#fff" />
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
                <ActivityIndicator color="#fff" />
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
                <ActivityIndicator color="#333" />
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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>Write All</Text>
              )}
            </TouchableOpacity>
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
                <ActivityIndicator color="#fff" />
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
                  <ActivityIndicator color="#fff" />
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
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.setBtn, styles.primaryBtn]}
                  onPress={() => writeSingleParam(cfg.id)}
                  disabled={!isConnected || busyParam === cfg.id || isDisconnecting}
                >
                  {busyParam === cfg.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.setBtnText}>SET</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

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

      <ImageBackground source={IMAGES.WaveBottom} style={styles.bottomNavBg} resizeMode="stretch">
        <View style={styles.navContainer}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("Home")}>
            <Image source={IMAGES.HomeIcon} style={styles.navIcon} />
            <Text style={styles.navText}>HOME</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("Dashboard")}>
            <Image source={IMAGES.GraphIcon} style={styles.navIcon} />
            <Text style={styles.navText}>DASH</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("Alarm")}>
            <Image source={IMAGES.AlarmIcon} style={styles.navIcon} />
            <Text style={styles.navText}>ALARM</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab("More")}>
            <Image source={IMAGES.MoreIcon} style={styles.navIcon} />
            <Text style={styles.navText}>MORE</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e8e5e5",
  },
  topHeader: {
    backgroundColor: "#f2b64f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    width: 30,
    height: 30,
    resizeMode: "contain",
  },
  headerText: {
    fontSize: 24,
    letterSpacing: 1,
    fontWeight: "bold",
    color: "#000",
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  infoCard: {
    backgroundColor: "#f4f2f2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#b5b2b2",
    padding: 12,
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 8,
  },
  valueText: {
    fontSize: 13,
    color: "#2f2f2f",
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
    backgroundColor: "#f9a600",
  },
  secondaryBtn: {
    backgroundColor: "#4f667a",
  },
  ghostBtn: {
    backgroundColor: "#ececec",
    borderWidth: 1,
    borderColor: "#c8c8c8",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  ghostBtnText: {
    color: "#222",
    fontWeight: "700",
    fontSize: 13,
  },
  dropdownTrigger: {
    marginTop: 10,
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#b8b8b8",
    borderRadius: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
    color: "#222",
    marginRight: 8,
  },
  dropdownArrow: {
    fontSize: 13,
    color: "#333",
  },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#b8b8b8",
    borderRadius: 10,
    backgroundColor: "#fff",
    maxHeight: 220,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
  },
  dropdownItemActive: {
    backgroundColor: "#fff7e8",
  },
  dropdownItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    columnGap: 8,
  },
  dropdownItemTitle: {
    flex: 1,
    color: "#1f1f1f",
    fontSize: 13,
    fontWeight: "700",
  },
  dropdownItemRssi: {
    color: "#545454",
    fontSize: 11,
  },
  dropdownItemSub: {
    color: "#666",
    fontSize: 11,
    marginTop: 2,
  },
  settingPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#8f8f8f",
    backgroundColor: "#ece9e9",
    overflow: "hidden",
    marginBottom: 14,
  },
  panelHeader: {
    backgroundColor: "#f2b64f",
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  panelHeaderText: {
    fontSize: 20,
    color: "#111",
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
  },
  panelBody: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoLine: {
    fontSize: 14,
    color: "#242424",
    marginBottom: 6,
  },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 12,
  },
  valueGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
  },
  valueLabel: {
    fontSize: 16,
    color: "#1f1f1f",
    minWidth: 42,
    fontFamily: Platform.OS === "ios" ? "Times New Roman" : "serif",
  },
  settingInput: {
    borderWidth: 1,
    borderColor: "#8f8f8f",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fff",
    flex: 1,
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
  setBtnText: {
    color: "#171717",
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
    borderColor: "#8f8f8f",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fff",
    flex: 1,
  },
  historyText: {
    color: "#555",
    fontSize: 12,
    marginTop: 2,
  },
  telemetryText: {
    fontSize: 12,
    color: "#333",
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
    borderBottomColor: "#f2f2f2",
  },
  telemetryLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#111",
    paddingRight: 8,
  },
  telemetryValue: {
    flex: 1,
    fontSize: 12,
    color: "#333",
    textAlign: "right",
  },
  telemetryRaw: {
    marginTop: 6,
    fontSize: 11,
    color: "#666",
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
    color: "#111",
    fontWeight: "700",
  },
});
