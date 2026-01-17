/*
 * ExportScreen.js
 *
 * This screen allows users to select a date range and export/download device data.
 * The data is converted to CSV and shared via the native share sheet.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { fetchDashboardData } from '../api/dataService';

export default function ExportScreen({ navigation }) {
  // State for Date Selection
  const getToday = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const getSevenDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const [startDate, setStartDate] = useState(getSevenDaysAgo());
  const [endDate, setEndDate] = useState(getToday());

  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [currentField, setCurrentField] = useState(null);

  // Helper: Parse DD-MM-YYYY to Timestamp
  const parseDateToTs = (dateStr, isEndOfDay = false) => {
    if (!dateStr) return 0;
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isEndOfDay) date.setHours(23, 59, 59, 999);
    else date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      Alert.alert("Missing Dates", "Please select both Start and End dates.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Fetch Data
      const { IoTReadings } = await fetchDashboardData();

      // 2. Filter Data
      const startTs = parseDateToTs(startDate, false);
      const endTs = parseDateToTs(endDate, true);

      const filtered = (IoTReadings || [])
        .map(item => ({ ...item, ...(item.payload || {}) }))
        .filter(item => {
          const ts = Number(item.ts);
          return ts >= startTs && ts <= endTs;
        })
        .sort((a, b) => a.ts - b.ts);

      if (filtered.length === 0) {
        Alert.alert("No Data", "No readings found for the selected date range.");
        return;
      }

      // 3. Convert to CSV
      const header = "DeviceID,Temperature,Humidity,Timestamp,Date Time\n";
      const rows = filtered.map(item => {
        const dateObj = new Date(Number(item.ts));
        const dateStr = dateObj.toLocaleString(); // Local readable format
        return `${item.deviceId || "Unknown"},${item.temperature || 0},${item.humidity || 0},${item.ts},"${dateStr}"`;
      }).join("\n");

      const csvContent = header + rows;

      // 4. Handle Platform Specifics
      // 4. Handle Platform Specifics
      if (Platform.OS === 'android') {
        const fileName = `datalogger_export_${Date.now()}.csv`;
        // Always write to cache first (safe zone)
        const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
        await RNFS.writeFile(cachePath, csvContent, 'utf8');

        // Try to save to Downloads (Android < 13 or if permissions exist)
        try {
          const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

          // Check/Request Permission only on < Android 13
          if (Platform.Version < 33) {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              throw new Error("Storage permission denied");
            }
          }

          // Attempt copy (might fail on Android 11+ without MediaStore)
          await RNFS.copyFile(cachePath, downloadPath);
          Alert.alert(
            "Success",
            `File saved to Downloads folder:\n${fileName}`,
            [{ text: "OK" }]
          );

        } catch (err) {
          console.log("Direct download failed, falling back to Share:", err);
          // Fallback: Share Sheet (100% reliable)
          const shareOptions = {
            title: "Save Data",
            url: `file://${cachePath}`,
            type: 'text/csv',
            failOnCancel: false,
          };
          await Share.open(shareOptions);
        }

      } else {
        // --- iOS: Share Sheet (Save to Files) ---
        const path = `${RNFS.CachesDirectoryPath}/export_data.csv`;
        await RNFS.writeFile(path, csvContent, 'utf8');

        const shareOptions = {
          title: "Export Data",
          url: `file://${path}`,
          type: 'text/csv',
          failOnCancel: false,
        };
        await Share.open(shareOptions);
      }

    } catch (e) {
      console.error(e);
      Alert.alert("Export Failed", "An error occurred while exporting data.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Opens the date picker
   */
  const showDatePicker = (field) => {
    setCurrentField(field);
    setShowPicker(true);
  };

  /**
   * Handles date selection
   */
  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      const formatted = `${day}-${month}-${year}`;

      if (currentField === "start") {
        setStartDate(formatted);
      } else if (currentField === "end") {
        setEndDate(formatted);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <ImageBackground
        source={require("../../assets/images/WaveTop.png")}
        style={styles.header}
        resizeMode="cover"
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={require("../../assets/images/Export_Icon.png")}
              style={styles.icon}
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>Export</Text>
        </View>
      </ImageBackground>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Date Filter Row */}
        <View style={styles.filterRow}>
          {/* Start Date Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Start Date</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                placeholder="DD-MM-YYYY"
                value={startDate}
                onChangeText={setStartDate}
              />
              <TouchableOpacity onPress={() => showDatePicker("start")}>
                <Image
                  source={require("../../assets/images/Calender.png")}
                  style={styles.calendarIcon}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* End Date Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>End Date</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                placeholder="DD-MM-YYYY"
                value={endDate}
                onChangeText={setEndDate}
              />
              <TouchableOpacity onPress={() => showDatePicker("end")}>
                <Image
                  source={require("../../assets/images/Calender.png")}
                  style={styles.calendarIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Download Button */}
        <TouchableOpacity
          style={[styles.downloadBtn, isLoading && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.downloadText}>Download Data (CSV)</Text>
          )}
        </TouchableOpacity>

        <Text style={{ marginTop: 20, fontStyle: 'italic', color: '#666', textAlign: 'center', paddingHorizontal: 20 }}>
          Note: Data will be shared as comma-separated values. You can copy it or save it to a file.
        </Text>
      </ScrollView>

      {/* Footer */}
      <ImageBackground
        source={require("../../assets/images/WaveBottom.png")}
        style={styles.footer}
        resizeMode="cover"
      />

      {/* Date Picker Modal */}
      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF"
  },

  /* Header Styles */
  header: {
    height: 80,
    justifyContent: "flex-end",
    paddingHorizontal: 20
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20
  },
  icon: {
    width: 34,
    height: 38,
    marginRight: 10
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    paddingLeft: 100 // Visual centering hack
  },

  /* Content Styles */
  content: {
    flexGrow: 1,
    alignItems: "center",
    padding: 10
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 15,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  inputContainer: { marginHorizontal: 8 },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  calendarIcon: {
    width: 20,
    height: 20,
    marginLeft: 5
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: "#000",
    fontWeight: "600",
    textAlign: "center"
  },
  input: {
    borderWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: 100,
    fontSize: 12
  },
  downloadBtn: {
    backgroundColor: "green",
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 50,
  },
  downloadText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 14
  },
  footer: {
    height: 80,
    width: "100%"
  },
});
