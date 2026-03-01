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
import { BLE_CHAR_UUIDS, BLE_DEVICE_NAME, BLE_SERVICE_UUID } from "../ble/bleContract";
import { decodeUtf8Text, encodeUtf8Text } from "../ble/bleCodec";

const FACTORY_UNLOCK_PASSWORD = "blackstar";
const SCAN_TIMEOUT_MS = 12000;

function getBleDeviceDisplayName(device) {
  const name = device?.name || device?.localName || BLE_DEVICE_NAME;
  const shortId = String(device?.id || "").slice(-8);
  return shortId ? `${name} (${shortId})` : name;
}

export default function FactorySettingsScreen({ navigation }) {
  const managerRef = useRef(new BleManager());
  const connectedDeviceRef = useRef(null);
  const disconnectSubRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const isUnmountingRef = useRef(false);

  const [accessPassword, setAccessPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const [deviceLabel, setDeviceLabel] = useState("Disconnected");
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [scannedDevices, setScannedDevices] = useState([]);

  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [deviceIdValue, setDeviceIdValue] = useState("");

  const [statusLine, setStatusLine] = useState("-");

  const isConnected = !!connectedDeviceRef.current;

  const pushStatus = useCallback((message) => {
    setStatusLine(`${new Date().toLocaleTimeString()} - ${message}`);
  }, []);

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

  const clearDisconnectListener = useCallback(() => {
    try {
      disconnectSubRef.current?.remove?.();
    } catch {
      // ignore native teardown errors
    }
    disconnectSubRef.current = null;
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

  const clearConnectionState = useCallback(() => {
    connectedDeviceRef.current = null;
    setDeviceLabel("Disconnected");
    setDeviceIdValue("");
    setIsConnecting(false);
    setIsDisconnecting(false);
    setIsSending(false);
  }, []);

  const readDeviceIdFromBle = useCallback(
    async (deviceOverride = null, { silent = false } = {}) => {
      const device = deviceOverride || connectedDeviceRef.current;
      if (!device) {
        if (!silent) {
          Alert.alert("BLE", "Connect to a BLE device first.");
        }
        return "";
      }

      try {
        const characteristic = await device.readCharacteristicForService(
          BLE_SERVICE_UUID,
          BLE_CHAR_UUIDS.deviceId
        );
        const currentId = decodeUtf8Text(characteristic?.value || "").trim();
        setDeviceIdValue(currentId);
        if (!silent) {
          pushStatus(`Current Device ID: ${currentId || "-"}`);
        }
        return currentId;
      } catch (e) {
        if (!silent) {
          Alert.alert("Read failed", e?.message || "Unable to read Device ID.");
        }
        return "";
      }
    },
    [pushStatus]
  );

  const connectToDevice = useCallback(
    async (device) => {
      if (!device || isConnecting || isDisconnecting) return;

      setIsConnecting(true);
      try {
        if (connectedDeviceRef.current?.id && connectedDeviceRef.current.id !== device.id) {
          await managerRef.current.cancelDeviceConnection(connectedDeviceRef.current.id).catch(() => {});
          clearConnectionState();
        }

        const connected = await device.connect();
        const ready = await connected.discoverAllServicesAndCharacteristics();
        connectedDeviceRef.current = ready;
        setSelectedDeviceId(ready.id);
        setDeviceLabel(getBleDeviceDisplayName(ready));
        setIsDeviceDropdownOpen(false);
        pushStatus(`Connected to ${getBleDeviceDisplayName(ready)}`);
        await readDeviceIdFromBle(ready, { silent: true });

        clearDisconnectListener();
        disconnectSubRef.current = managerRef.current.onDeviceDisconnected(ready.id, (error) => {
          if (isUnmountingRef.current) return;
          clearConnectionState();
          if (error?.message) {
            pushStatus(`Disconnected (${error.message})`);
            return;
          }
          pushStatus("Disconnected");
        });
      } catch (e) {
        clearConnectionState();
        Alert.alert("BLE connect failed", e?.message || "Unable to connect.");
      } finally {
        setIsConnecting(false);
      }
    },
    [
      clearConnectionState,
      clearDisconnectListener,
      isConnecting,
      isDisconnecting,
      pushStatus,
      readDeviceIdFromBle,
    ]
  );

  const scanForBleDevices = useCallback(async () => {
    if (isScanning || isConnecting || isDisconnecting) return;

    const hasPermission = await requestBlePermissions();
    if (!hasPermission) {
      Alert.alert("Permissions required", "Bluetooth permissions are required to scan devices.");
      return;
    }

    setScannedDevices([]);
    setSelectedDeviceId("");
    setIsDeviceDropdownOpen(true);
    setIsScanning(true);
    pushStatus("Scanning BLE devices...");

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
      pushStatus("Scan complete");
    }, SCAN_TIMEOUT_MS);
  }, [isConnecting, isDisconnecting, isScanning, pushStatus, requestBlePermissions, stopScan]);

  const connectSelectedDevice = useCallback(async () => {
    const selected = scannedDevices.find((item) => item.id === selectedDeviceId);
    if (!selected?.device) {
      Alert.alert("BLE", "Select a BLE device first.");
      return;
    }
    stopScan();
    await connectToDevice(selected.device);
  }, [connectToDevice, scannedDevices, selectedDeviceId, stopScan]);

  const disconnect = useCallback(async () => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    pushStatus("Disconnecting...");
    try {
      stopScan();
      clearDisconnectListener();
      const deviceId = connectedDeviceRef.current?.id;
      if (deviceId) {
        await managerRef.current.cancelDeviceConnection(deviceId);
      }
    } catch (e) {
      pushStatus(`Disconnect warning: ${e?.message || "unknown"}`);
    } finally {
      clearConnectionState();
      setIsDeviceDropdownOpen(false);
      pushStatus("Disconnected");
    }
  }, [clearConnectionState, clearDisconnectListener, isDisconnecting, pushStatus, stopScan]);

  const sendDeviceId = useCallback(async () => {
    if (!isUnlocked) {
      Alert.alert("Access denied", "Unlock factory settings first.");
      return;
    }

    const device = connectedDeviceRef.current;
    if (!device) {
      Alert.alert("BLE", "Connect to a BLE device first.");
      return;
    }

    const nextId = deviceIdValue.trim();
    if (!nextId) {
      Alert.alert("Missing data", "Device ID is required.");
      return;
    }

    setIsSending(true);
    try {
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_CHAR_UUIDS.deviceId,
        encodeUtf8Text(nextId)
      );
      setDeviceIdValue(nextId);
      pushStatus(`Device ID updated: ${nextId}`);
      Alert.alert(
        "Success",
        `Device ID updated to ${nextId}. Reboot ESP32 to advertise with the new BLE name.`
      );
    } catch (e) {
      Alert.alert("Send failed", e?.message || "Unable to update Device ID.");
    } finally {
      setIsSending(false);
    }
  }, [deviceIdValue, isUnlocked, pushStatus]);

  const sendWifiCredentials = useCallback(async () => {
    if (!isUnlocked) {
      Alert.alert("Access denied", "Unlock factory settings first.");
      return;
    }

    const device = connectedDeviceRef.current;
    if (!device) {
      Alert.alert("BLE", "Connect to a BLE device first.");
      return;
    }

    const ssid = wifiSsid;
    const pwd = wifiPassword;
    if (!ssid.trim() || pwd.length === 0) {
      Alert.alert("Missing data", "Both Wi-Fi SSID and password are required.");
      return;
    }

    setIsSending(true);
    try {
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
      pushStatus("Wi-Fi credentials sent to device");
      Alert.alert("Success", "Wi-Fi credentials sent to ESP32.");
    } catch (e) {
      Alert.alert("Send failed", e?.message || "Unable to send Wi-Fi credentials.");
    } finally {
      setIsSending(false);
    }
  }, [isUnlocked, pushStatus, wifiPassword, wifiSsid]);

  const handleUnlock = useCallback(() => {
    if (accessPassword === FACTORY_UNLOCK_PASSWORD) {
      setIsUnlocked(true);
      setUnlockError("");
      setAccessPassword("");
      pushStatus("Factory settings unlocked");
      return;
    }
    setUnlockError("Invalid password.");
    Alert.alert("Invalid password", "Factory Settings password is incorrect.");
  }, [accessPassword, pushStatus]);

  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      isUnmountingRef.current = true;
      manager.stopDeviceScan();
      clearScanTimer();
      clearDisconnectListener();
      const deviceId = connectedDeviceRef.current?.id;
      connectedDeviceRef.current = null;
      if (deviceId) {
        manager.cancelDeviceConnection(deviceId).catch(() => {});
      }
      manager.destroy();
    };
  }, [clearDisconnectListener, clearScanTimer]);

  const selectedScannedDevice = scannedDevices.find((item) => item.id === selectedDeviceId);
  const selectedBleLabel = selectedScannedDevice?.device
    ? getBleDeviceDisplayName(selectedScannedDevice.device)
    : isConnected
      ? deviceLabel
      : "";

  return (
    <SafeAreaView style={styles.safeArea}>
      <Image source={IMAGES.WaveTop} style={styles.headerImage} />
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image source={IMAGES.BackIcon} style={styles.iconSmall} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Factory Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!isUnlocked ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Protected Access</Text>
            <Text style={styles.panelText}>Enter factory password to continue.</Text>
            <TextInput
              style={styles.input}
              value={accessPassword}
              onChangeText={setAccessPassword}
              placeholder="Factory password"
              secureTextEntry
            />
            {unlockError ? <Text style={styles.errorText}>{unlockError}</Text> : null}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUnlock}>
              <Text style={styles.primaryBtnText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>BLE Connection</Text>
              <Text style={styles.panelText}>Connected: {deviceLabel}</Text>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={scanForBleDevices}
                disabled={isScanning || isConnecting || isDisconnecting}
              >
                {isScanning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Scan BLE</Text>
                )}
              </TouchableOpacity>

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
                      onPress={() => setSelectedDeviceId(item.id)}
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
                  style={[styles.secondaryBtn, styles.actionBtn]}
                  onPress={connectSelectedDevice}
                  disabled={!selectedDeviceId || isConnecting || isDisconnecting}
                >
                  {isConnecting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>Connect</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ghostBtn, styles.actionBtn]}
                  onPress={disconnect}
                  disabled={!isConnected || isDisconnecting}
                >
                  {isDisconnecting ? (
                    <ActivityIndicator color="#333" />
                  ) : (
                    <Text style={styles.ghostBtnText}>Disconnect</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Device Identity</Text>
              <TextInput
                style={styles.input}
                value={deviceIdValue}
                onChangeText={setDeviceIdValue}
                placeholder="Device ID (BLE name)"
                autoCapitalize="characters"
              />
              <View style={styles.rowButtons}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, styles.actionBtn]}
                  onPress={() => readDeviceIdFromBle()}
                  disabled={!isConnected || isSending || isDisconnecting}
                >
                  <Text style={styles.secondaryBtnText}>Read ID</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, styles.actionBtn]}
                  onPress={sendDeviceId}
                  disabled={!isConnected || isSending || isDisconnecting}
                >
                  {isSending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Update ID</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Device ID is used for MQTT payload and BLE advertising name.
              </Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Wi-Fi Credentials</Text>
              <TextInput
                style={styles.input}
                value={wifiSsid}
                onChangeText={setWifiSsid}
                placeholder="SSID ID"
                placeholderTextColor="#7a7a7a"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                value={wifiPassword}
                onChangeText={setWifiPassword}
                placeholder="password"
                placeholderTextColor="#7a7a7a"
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={sendWifiCredentials}
                disabled={!isConnected || isSending || isDisconnecting}
              >
                {isSending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send To Device</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Writes SSID and password to ESP32 using BLE characteristics.
              </Text>
            </View>
          </>
        )}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Status</Text>
          <Text style={styles.panelText}>{statusLine}</Text>
        </View>
      </ScrollView>

      <ImageBackground source={IMAGES.WaveBottom} style={styles.bottomNavBg} resizeMode="stretch" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerImage: {
    width: "100%",
    height: 86,
    resizeMode: "cover",
  },
  topHeader: {
    position: "absolute",
    top: 22,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    zIndex: 10,
  },
  iconSmall: {
    width: 28,
    height: 24,
    resizeMode: "contain",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 28,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 110,
  },
  panel: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dedede",
    padding: 12,
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  panelText: {
    fontSize: 13,
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#b8b8b8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fff",
  },
  primaryBtn: {
    backgroundColor: "#2f6bb2",
    borderRadius: 20,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 2,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  rowButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    columnGap: 10,
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    backgroundColor: "#4f667a",
  },
  secondaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  ghostBtn: {
    backgroundColor: "#ececec",
    borderWidth: 1,
    borderColor: "#c8c8c8",
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
  helperText: {
    color: "#6b6b6b",
    fontSize: 12,
    marginTop: 8,
  },
  errorText: {
    color: "#c62828",
    fontSize: 12,
    marginBottom: 8,
  },
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 86,
  },
});
