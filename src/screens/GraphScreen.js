/*
 * GraphScreen.js
 *
 * This screen allows users to query and visualize device data over a date range.
 * It features a date picker for Start/End dates and displays logs in a table.
 * (Note: The actual graph visual might be in GraphShowScreen; this screen seems to focus on querying logs.)
 *
 * Key Features:
 * - Date Range Filter (Start Date, End Date).
 * - Datetime Picker integration.
 * - Tabular display of device logs (Temperature, Humidity, Status).
 * - Navigation to specific graph views or other main screens.
 */

import React, { useState, useEffect } from 'react';     //useRef
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  TextInput,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { LineChart } from "react-native-chart-kit";
import { fetchRealTimeDataMonitor, fetchDashboardData } from '../api/dataService';

const { width } = Dimensions.get('window');

// Dummy data for visualization purposes
const data = [
  { srNo: 1, deviceId: 'GT001', message: 'Temperature High', dateTime: '12-10-2024 10:30 AM', status: 'Alarm' },
  { srNo: 2, deviceId: 'GT002', message: 'Humidity Low', dateTime: '12-10-2024 11:00 AM', status: 'Alarm' },
  { srNo: 3, deviceId: 'GT001', message: 'System Normal', dateTime: '12-10-2024 12:00 PM', status: 'Online' },
  { srNo: 4, deviceId: 'GT003', message: 'Connection Lost', dateTime: '12-10-2024 01:15 PM', status: 'Offline' },
];

export default function GraphScreen({ navigation }) {
  const navigateToTab = (route) => {
    if (navigation?.navigate) {
      navigation.navigate(route);
      return;
    }
    navigation.getParent()?.navigate('Home', { screen: route });
  };
  // --- State for Date Management ---
  const getToday = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const getSevenDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const [startDate, setStartDate] = useState(getSevenDaysAgo()); // Default to 1 week ago
  const [endDate, setEndDate] = useState(getToday()); // Default end to today
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'start' or 'end'

  // --- Date Picker Handlers ---

  /**
   * Opens the date picker for a specific field.
   * @param {string} field - 'start' or 'end'
   */
  const showDatePicker = (field) => {
    setActiveField(field);
    setDatePickerVisibility(true);
  };

  /**
   * Closes the date picker.
   */
  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  /**
   * Handles date selection confirmation.
   * Formats date as DD-MM-YYYY.
   */
  const handleConfirm = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    if (activeField === 'start') {
      setStartDate(formattedDate);
    } else {
      setEndDate(formattedDate);
    }
    hideDatePicker();
  };

  /**
   * Validates manual date input format (DD-MM-YYYY).
   * Also checks if it's a valid calendar date.
   */
  const validateDate = (dateStr) => {
    const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
    if (!regex.test(dateStr)) return false;

    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  // --- View Mode State ---
  const [viewMode, setViewMode] = useState('live'); // 'live' or 'history'
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Helper: Parse DD-MM-YYYY string to Start of Day Timestamp (ms).
   */
  const parseDateToTs = (dateStr, isEndOfDay = false) => {
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (isEndOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date.getTime();
  };

  /**
   * Handles text changes in the date input fields.
   * Allows manual typing with simple regex filtering.
   */
  const handleManualDate = (text, field) => {
    let cleaned = text.replace(/[^0-9-]/g, '');
    if (field === 'start') setStartDate(cleaned);
    else setEndDate(cleaned);
  };

  // --- Helpers ---
  const clampMetric = (value) => {
    const n = Number(value) || 0;
    return Math.min(100, Math.max(0, n));
  };

  // --- Real-time Chart Data (Multi-Device) ---
  // Structure: { [deviceId]: { labels: [], temp: [], hum: [] } }
  const [deviceHistory, setDeviceHistory] = useState({});

  useEffect(() => {
    // Only poll if in Live Mode
    if (viewMode !== 'live') return;

    // Poll every 5 seconds for new data points
    const interval = setInterval(async () => {
      try {
        const raw = await fetchRealTimeDataMonitor();
        if (raw && Array.isArray(raw)) {
          const now = new Date();
          const timeLabel = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

          setDeviceHistory(prevHistory => {
            const nextHistory = { ...prevHistory };

            raw.forEach(item => {
              // Flatten payload if needed
              const source = item.payload ? { ...item, ...item.payload } : item;
              const deviceId = String(source.deviceId || "Unknown");
              const t = clampMetric(source.temperature);
              const h = clampMetric(source.humidity);

              // Initialize if new device
              if (!nextHistory[deviceId]) {
                nextHistory[deviceId] = { labels: [], temp: [], hum: [] };
              }

              // Append new data point
              const devData = nextHistory[deviceId];
              const newLabels = [...devData.labels.slice(-5), timeLabel];
              const newTemp = [...devData.temp.slice(-5), t];
              const newHum = [...devData.hum.slice(-5), h];

              nextHistory[deviceId] = {
                labels: newLabels,
                temp: newTemp,
                hum: newHum
              };
            });
            return nextHistory;
          });
        }
      } catch (e) {
        // quiet error
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [viewMode]); // Depend on viewMode

  // --- Historical Data Handling ---

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      alert("Please select Start and End dates.");
      return;
    }

    setIsLoading(true);
    setViewMode('history');
    setDeviceHistory({}); // Clear current live data
    console.log("GraphScreen: Starting History Search...");

    try {
      // 1. Fetch full payload
      const { IoTReadings } = await fetchDashboardData();
      console.log("GraphScreen: Fetched IoTReadings count:", IoTReadings ? IoTReadings.length : 0);

      // 2. Parse range
      console.log(`GraphScreen: Date Strings: Start=${startDate}, End=${endDate}`);
      const startTs = parseDateToTs(startDate, false);
      const endTs = parseDateToTs(endDate, true);
      console.log(`GraphScreen: Date Range TS: ${startTs} - ${endTs}`);

      // 3. Filter and Group
      const nextHistory = {};

      // Sort readings by time ascending first (if not already)
      const sortedReadings = (IoTReadings || []).sort((a, b) => a.ts - b.ts);

      let processedCount = 0;
      let matchCount = 0;

      sortedReadings.forEach(item => {
        processedCount++;
        // Flatten payload if needed (same as live data logic)
        const reading = item.payload ? { ...item, ...item.payload } : item;
        const ts = Number(reading.ts);

        // Debug first few items
        if (processedCount <= 3) {
          console.log("GraphScreen: Processing Item:", JSON.stringify(item));
          console.log("GraphScreen: Unwrapped Item:", JSON.stringify(reading));
          console.log(`GraphScreen: Item TS: ${ts}`);
        }

        // Filter by date range
        if (ts < startTs || ts > endTs) return;

        matchCount++;
        const deviceId = String(reading.deviceId || "Unknown");

        // Initialize if new
        if (!nextHistory[deviceId]) {
          nextHistory[deviceId] = { labels: [], temp: [], hum: [] };
        }

        // Format label
        const dateObj = new Date(ts);
        const timeLabel = `${dateObj.getHours()}:${dateObj.getMinutes()}`;

        // Append (No slicing here, we want ALL points in range)
        nextHistory[deviceId].labels.push(timeLabel);
        nextHistory[deviceId].temp.push(clampMetric(reading.temperature));
        nextHistory[deviceId].hum.push(clampMetric(reading.humidity));
      });

      console.log(`GraphScreen: Processed ${processedCount} items. Matches found: ${matchCount}`);

      // --- Limit to Latest 10 Records ---
      const MAX_POINTS = 10;
      Object.keys(nextHistory).forEach(deviceId => {
        const dataset = nextHistory[deviceId];
        const total = dataset.labels.length;

        if (total > MAX_POINTS) {
          // Take the last 10 items (latest in time)
          console.log(`GraphScreen: Limiting ${deviceId} - Keeping latest ${MAX_POINTS} from ${total} points.`);
          nextHistory[deviceId] = {
            labels: dataset.labels.slice(-MAX_POINTS),
            temp: dataset.temp.slice(-MAX_POINTS),
            hum: dataset.hum.slice(-MAX_POINTS)
          };
        }
      });
      // --------------------------

      console.log("GraphScreen: Resulting History Keys:", Object.keys(nextHistory));

      setDeviceHistory(nextHistory);

    } catch (e) {
      alert("Failed to fetch historical data.");
      console.error(e);
      setViewMode('live'); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToLive = () => {
    setViewMode('live');
    setDeviceHistory({}); // Clear history to restart standard polling accumulation
  };

  // --- Render Helpers ---

  /**
   * Renders a single row in the data table.
   * @param {object} item - The data record
   */
  const renderRow = (item) => (
    <View key={item.srNo} style={styles.row}>
      <Text style={[styles.cellSrNo, styles.cellText]}>{item.srNo}</Text>
      <Text style={[styles.cellDevice, styles.cellText]}>{item.deviceId}</Text>
      <Text style={[styles.cellMessage, styles.cellText]}>{item.message}</Text>
      <Text style={[styles.cellDate, styles.cellText]}>{item.dateTime}</Text>
      <Text style={[styles.cellStatus, styles.cellText]}>{item.status}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Wave Image */}
      <Image
        source={require('../../assets/images/WaveTop.png')}
        style={styles.headerImage}
      />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        {/* Left Side: Sidebar Button */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Sidebar')}
          >
            <Image
              source={require('../../assets/images/MoreTop.png')}
              style={styles.iconSmall1}
            />
          </TouchableOpacity>
        </View>

        {/* Center Title */}
        <Text style={styles.headerText}>GRAPH</Text>

        {/* Right Side: Spacer/Placeholder */}
        <View style={styles.headerLeft} />
      </View>

      {/* Main Content ScrollView */}
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* --- Date Filter Section --- */}
        <View style={styles.dateFilter}>
          {/* Start Date Input */}
          <View style={styles.dateField}>
            <Text style={styles.label}>Start Date</Text>
            <View style={styles.dateInputContainer}>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={(text) => handleManualDate(text, 'start')}
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity onPress={() => showDatePicker('start')}>
                <Image
                  source={require('../../assets/images/Calender.png')}
                  style={styles.calendarIcon}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* End Date Input */}
          <View style={styles.dateField}>
            <Text style={styles.label}>End Date</Text>
            <View style={styles.dateInputContainer}>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={(text) => handleManualDate(text, 'end')}
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity onPress={() => showDatePicker('end')}>
                <Image
                  source={require('../../assets/images/Calender.png')}
                  style={styles.calendarIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* --- Search / Reset Actions --- */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[
              styles.themedButton,
              styles.buttonPrimary,
              isLoading && styles.buttonDisabled
            ]}
            onPress={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.buttonTextTheme}>Loading...</Text>
            ) : (
              <>
                <Image
                  source={require('../../assets/images/Search_Icon.png')}
                  style={styles.searchIconTheme}
                />
                <Text style={styles.buttonTextTheme}>Search History</Text>
              </>
            )}
          </TouchableOpacity>

          {viewMode === 'history' && (
            <TouchableOpacity
              style={[styles.themedButton, styles.buttonSecondary]}
              onPress={handleResetToLive}
            >
              <Text style={styles.buttonTextTheme}>Show Live</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* --- Graph Visualizations (Multi-Device) --- */}
        {/* <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 16, color: 'blue', fontWeight: '600' }}> */}
          <View style={styles.centerBox}>
          <Text style={styles.modeText}>

            Mode: {viewMode === 'live' ? "Live Monitor (Last 30s)" : "Historical Analysis"}
          </Text>
          {/* Debug Render State */}
          {console.log("GraphScreen RENDER: deviceHistory Keys:", Object.keys(deviceHistory))}
        </View>
        {!isLoading && Object.keys(deviceHistory).length === 0 && (
          <Text style={styles.waitingText}>Waiting for data...</Text>
        )}

        {Object.keys(deviceHistory).map((deviceId) => {
          const history = deviceHistory[deviceId];
          // Ensure we have at least one valid data point to avoid crash
          if (!history.labels.length) return null;

          // Default dataset if empty
        const tData = history.temp.length ? history.temp : [0];
        const hData = history.hum.length ? history.hum : [0];
        const labels = history.labels.length ? history.labels : ["0"];

          return (
            <View key={deviceId} style={styles.chartContainer}>
              <Text style={styles.chartTitle}>{deviceId} Trends</Text>

              <LineChart
                data={{
                  labels: labels,
                  datasets: [
                    {
                      data: tData, // Live Temperature
                      color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})`, // Orange
                      strokeWidth: 2
                    },
                    {
                      data: hData, // Live Humidity
                      color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`, // Blue
                      strokeWidth: 2
                    }
                  ],
                  legend: ["Temp", "Humidity"]
                }}
                width={width - 20} // Full width minus padding
                height={220}
                yAxisSuffix=""
                yAxisInterval={1}
                fromZero
                fromNumber={100} // lock top of axis to 100
                segments={5}
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 1, // 1 decimal for precision
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "#ffa726"
                  }
                }}
                bezier
                style={styles.chartStyle}
              />
            </View>
          );
        })}
      </ScrollView>

      {/* Date Picker Modal (Hidden by default) */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
      />

      {/* --- Bottom Navigation Bar --- */}
      <ImageBackground
        source={require('../../assets/images/WaveBottom.png')}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      >
        <View style={styles.navContainer}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigateToTab("Dashboard")}
          >
            <Image
              source={require('../../assets/images/HomeIcon.png')}
              style={styles.navIcon}
            />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>HOME</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigateToTab("Graph")}
          >
            <Image
              source={require('../../assets/images/GraphIcon.png')}
              style={styles.navIcon1}
            />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>GRAPH</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigateToTab("Alarm")}
          >
            <Image
              source={require('../../assets/images/AlarmIcon.png')}
              style={styles.navIcon2}
            />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>ALARM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigateToTab("More")}
          >
            <Image
              source={require('../../assets/images/MoreIcon.png')}
              style={styles.navIcon}
            />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>MORE</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  /* Header Layout */
  headerImage: {
    width: '100%',
    height: 80,
    resizeMode: 'cover',
  },
  topHeader: {
    position: 'absolute',
    top: 25,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    zIndex: 10,
  },
  iconSmall1: {
    width: 28,
    height: 24,
    resizeMode: 'contain',
  },
  headerLeft: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    flex: 1,
  },

  /* Scrollable Content */
  scrollContent: {
    paddingBottom: 100, // Space for bottom navigation
  },

  /* Date Filter Form */
  dateFilter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    alignItems: 'flex-start',
  },
  dateField: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 5,
    paddingHorizontal: 5,
    marginTop: 5,
    width: width * 0.42,
    height: 40,
    backgroundColor: '#f9f9f9',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    paddingVertical: 0,
  },
  calendarIcon: {
    width: 20,
    height: 20,
    marginLeft: 5,
  },



  /* Themed Buttons (New) */
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  themedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // Rounded pill shape like Login
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 140,
    marginHorizontal: 8,
  },
  buttonPrimary: {
    backgroundColor: '#004080', // Deep Blue (Theme)
  },
  buttonSecondary: {
    backgroundColor: '#28a745', // Success Green
  },
  centerBox: {
    alignItems: 'center',
    marginBottom: 10,
  },
  modeText: {
    fontSize: 16,
    color: 'blue',
    fontWeight: '600',
  },
  waitingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  buttonDisabled: {
    opacity: 0.7,
    backgroundColor: '#6c757d',
  },
  buttonTextTheme: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  searchIconTheme: {
    width: 20,
    height: 20,
    tintColor: '#fff',
    marginRight: 8,
    resizeMode: 'contain',
  },

  searchIcon: {
    width: 18,
    height: 18,
    tintColor: '#fff',
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  /* Data Table */
  tableScroll: {
    marginHorizontal: 10,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: '#fff',
  },
  headerRow: {
    backgroundColor: '#f0f0f0',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
  },
  cellText: {
    color: '#000',
    textAlign: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    fontSize: 12,
  },
  // Column Widths
  cellSrNo: { width: 50 },
  cellDevice: { width: 80 },
  cellMessage: { width: 140 }, // wider for message
  cellDate: { width: 120 },
  cellStatus: { width: 80, borderRightWidth: 0 },

  /* Bottom Navigation Stack */
  bottomNavBg: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 86,
    justifyContent: 'center',
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 10,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { width: 28, height: 30, resizeMode: 'contain', marginBottom: 4 },
  navIcon1: { width: 35, height: 30, resizeMode: 'contain', marginBottom: 4 },
  navIcon2: { width: 25, height: 30, resizeMode: 'contain', marginBottom: 4 },
  navText: { fontWeight: 'bold', fontSize: 12, color: '#000', textAlign: 'center' },

  /* Chart Styles */
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
});
