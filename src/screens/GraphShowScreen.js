/*
 * GraphShowScreen.js
 *
 * This screen displays a detailed graph view for a specific device context (e.g., Cabin1).
 * It includes date filtering to adjust the graph range.
 *
 * Key Features:
 * - LineChart visualization of Temperature and Humidity.
 * - Date Range Filter with DateTimePicker.
 * - Custom Legend for chart series.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Image,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LineChart } from "react-native-chart-kit";
import { fetchDashboardData } from '../api/dataService';

const screenWidth = Dimensions.get("window").width;

export default function GraphShowScreen({ route, navigation }) {
  const navigateToTab = (routeName) => {
    const parent = navigation.getParent();
    if (parent?.navigate) {
      parent.navigate(routeName);
    } else {
      navigation.navigate('Home', { screen: routeName });
    }
  };
  // Get params from navigation (provided by HomeScreen)
  const { deviceId } = route.params || { deviceId: "Unknown" };

  // --- State for Data ---
  const [isLoading, setIsLoading] = useState(false);
  const [graphData, setGraphData] = useState({
    labels: ["0"],
    temp: [0],
    hum: [0]
  });

  // --- State for Date Filter ---
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

  // --- Fetch Data Effect ---
  useEffect(() => {
    fetchHistory();
  }, [startDate, endDate]); // Refetch when dates change

  const fetchHistory = async () => {
    setIsLoading(true);
    console.log(`GraphShowScreen: Fetching history for ${deviceId} from ${startDate} to ${endDate}`);

    try {
      // 1. Fetch all data
      const { IoTReadings } = await fetchDashboardData();
      console.log("GraphShowScreen: Total IoTReadings:", IoTReadings ? IoTReadings.length : 0);

      // 2. Filter for this device and date range
      const startTs = parseDateToTs(startDate, false);
      const endTs = parseDateToTs(endDate, true);
      console.log(`GraphShowScreen: Target Range TS: ${startTs} - ${endTs}`);

      const filtered = (IoTReadings || [])
        .map(item => ({ ...item, ...(item.payload || {}) })) // Unwrap payload
        .filter(item => {
          const dId = String(item.deviceId || "Unknown");
          const ts = Number(item.ts);
          return dId === deviceId && ts >= startTs && ts <= endTs;
        })
        .sort((a, b) => a.ts - b.ts); // Chronological order

      console.log(`GraphShowScreen: Found ${filtered.length} points for ${deviceId}`);

      // 3. Process limit (latest 10 or 20 for visibility)
      // Showing more points here since this is a detailed view, but slicing if too many to avoid overlap
      const DISPLAY_LIMIT = 15;
      const sliced = filtered.slice(-DISPLAY_LIMIT);

      if (sliced.length > 0) {
        setGraphData({
          labels: sliced.map(item => {
            const d = new Date(Number(item.ts));
            return `${d.getHours()}:${d.getMinutes()}`;
          }),
          temp: sliced.map(item => Number(item.temperature) || 0),
          hum: sliced.map(item => Number(item.humidity) || 0)
        });
      } else {
        // No data found
        console.log("GraphShowScreen: No data after filtering.");
        setGraphData({ labels: ["No Data"], temp: [0], hum: [0] });
      }

    } catch (e) {
      console.error("GraphShow fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Opens the date picker for 'start' or 'end' field.
   */
  const showDatePicker = (field) => {
    setCurrentField(field);
    setShowPicker(true);
  };

  /**
   * Handles date selection.
   * Formats date as DD-MM-YYYY.
   */
  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      // Manual formatting to match DD-MM-YYYY
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
      {/* Header */}
      <ImageBackground
        source={require("../../assets/images/WaveTop.png")}
        style={styles.header}
        resizeMode="cover"
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={require("../../assets/images/graph_Icon1.png")}
              style={styles.icon}
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>{deviceId}</Text>
        </View>
      </ImageBackground>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Date Filter Inputs */}
        <View style={styles.filterRow}>
          {/* Start Date */}
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

          {/* End Date */}
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

          {/* Filter Button */}
          <TouchableOpacity style={styles.filterBtn} onPress={fetchHistory}>
            <Text style={styles.filterText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Graph Display */}
        <View style={styles.graphContainer}>
          <Text style={styles.title}>History Analysis</Text>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "orange" }]} />
              <Text style={styles.legendText}>Temp</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "blue" }]} />
              <Text style={styles.legendText}>Humidity</Text>
            </View>
          </View>

          {/* Loading Indicator */}
          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" style={{ marginVertical: 20 }} />
          ) : (
            <LineChart
              data={{
                labels: graphData.labels,
                datasets: [
                  {
                    data: graphData.temp,
                    color: (opacity = 1) => `rgba(255,165,0,${opacity})`, // Orange
                    strokeWidth: 2,
                  },
                  {
                    data: graphData.hum,
                    color: (opacity = 1) => `rgba(0,0,255,${opacity})`, // Blue
                    strokeWidth: 2,
                  },
                ],
              }}
              width={screenWidth - 20}
              height={220}
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#ffa726",
                },
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
            />
          )}

          {/* Axis Labels */}
          <Text style={styles.xLabel}>Time</Text>
          <Text style={styles.yLabel}>Val</Text>
        </View>

        {/* Download Data Button */}
        <TouchableOpacity style={styles.downloadBtn}>
          <Text style={styles.downloadText}>Download Data</Text>
        </TouchableOpacity>
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
    width: 42,
    height: 38,
    marginRight: 10
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    paddingLeft: 100
  },

  /* Content Styles */
  content: {
    flexGrow: 1,
    alignItems: "center",
    padding: 10,
    paddingBottom: 100, // Clear footer
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
    paddingHorizontal: 6,
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
    fontWeight: "600"
  },
  input: {
    borderWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: 100,
    fontSize: 12
  },
  filterBtn: {
    backgroundColor: "#f5a623",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 5,
    marginLeft: 8,
    marginTop: 18,
  },
  filterText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 14
  },

  /* Graph Styles */
  graphContainer: {
    alignItems: "center",
    marginTop: 10
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center"
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 5
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5
  },
  legendText: {
    fontSize: 12,
    color: "#000"
  },
  xLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#000",
    fontWeight: "bold"
  },
  yLabel: {
    position: "absolute",
    left: -15,
    top: 150,
    transform: [{ rotate: "-90deg" }],
    fontSize: 14,
    fontWeight: "bold",
  },
  downloadBtn: {
    backgroundColor: "green",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 15,
  },
  downloadText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14
  },

  /* Footer Styles */
  footer: {
    height: 80,
    width: "100%"
  },
});
