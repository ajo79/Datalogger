/*
 * AlarmScreen.js
 *
 * This screen displays a log of system alarms and events.
 * Currently, it uses hardcoded dummy data to demonstrate the table layout.
 *
 * Key Features:
 * - Tabular display of alarm history (SrNo, DeviceID, Message, Date, Status).
 * - Horizontal scrolling for wider table content.
 * - Standard navigation and header layout.
 */

import React, { useState, useCallback } from 'react';     // useEffect,
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  FlatList,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAlarms } from '../storage/alarmStorage';

const { width } = Dimensions.get('window');

export default function AlarmScreen() {
  const navigation = useNavigation();
  const navigateToTab = (route) => {
    if (navigation?.navigate) {
      navigation.navigate(route);
      return;
    }
    navigation.getParent()?.navigate('Home', { screen: route });
  };
  const [alarmData, setAlarmData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load alarms from storage
  const loadAlarms = async () => {
    const data = await getAlarms();
    setAlarmData(data);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAlarms();
    setRefreshing(false);
  }, []);

  // Reload when screen comes into focus, and poll every 5s
  useFocusEffect(
    useCallback(() => {
      loadAlarms();
      const interval = setInterval(loadAlarms, 5000);
      return () => clearInterval(interval);
    }, [])
  );

  /**
   * Renders a single row of the alarm table.
   */
  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.cellSrNo}>{item.id}</Text>
      <Text style={styles.cellDevice}>{item.deviceId}</Text>
      <Text style={styles.cellMessage}>{item.message}</Text>
      <Text style={styles.cellDate}>{item.dateTime}</Text>
      <Text style={styles.cellStatus}>{item.status}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Wave Image */}
      <Image source={require('../../assets/images/WaveTop.png')} style={styles.headerImage} />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        {/* Left Sidebar Toggle */}
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Sidebar')}>
            <Image
              source={require('../../assets/images/MoreTop.png')}
              style={styles.iconSmall1}
            />
          </TouchableOpacity>
        </View>

        {/* Screen Title */}
        <Text style={styles.headerText}>ALARM</Text>

        {/* Right Spacer for Symmetry */}
        <View style={styles.headerLeft} />
      </View>

      {/* --- Data Table Section --- */}
      <ScrollView style={{ marginBottom: 90 }} horizontal>
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cellSrNo, styles.headerCell]}>Sr. No.</Text>
            <Text style={[styles.cellDevice, styles.headerCell]}>Device ID</Text>
            <Text style={[styles.cellMessage, styles.headerCell]}>Message</Text>
            <Text style={[styles.cellDate, styles.headerCell]}>Date Time</Text>
            <Text style={[styles.cellStatus, styles.headerCell]}>Status</Text>
          </View>

          {/* Table Rows */}
          <FlatList
            data={alarmData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No alarm history found.</Text>
            }
          />
        </View>
      </ScrollView>

      {/* --- Bottom Navigation Bar --- */}
      <ImageBackground
        source={require('../../assets/images/WaveBottom.png')}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      >
        <View style={styles.navContainer}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab('Dashboard')}>
            <Image source={require('../../assets/images/HomeIcon.png')} style={styles.navIcon} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>HOME</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab('Graph')}>
            <Image source={require('../../assets/images/GraphIcon.png')} style={styles.navIcon1} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>GRAPH</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab('Alarm')}>
            <Image source={require('../../assets/images/AlarmIcon.png')} style={styles.navIcon2} />
            <Text style={styles.navText} numberOfLines={1} adjustsFontSizeToFit>ALARM</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigateToTab('More')}>
            <Image source={require('../../assets/images/MoreIcon.png')} style={styles.navIcon} />
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

  /* Table Layout */
  tableContainer: {
    minWidth: width, // Ensure it takes at least full screen width
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: '#f1f1f1',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#000',
  },

  // Column Styles
  cellSrNo: {
    width: 60,
    padding: 8,
    fontSize: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellDevice: {
    width: 80,
    padding: 8,
    fontSize: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellMessage: {
    width: 150, // Flexible width for longer text
    padding: 8,
    fontSize: 12,
    textAlign: 'left',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellDate: {
    width: 120,
    padding: 8,
    fontSize: 12,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellStatus: {
    width: 75,
    padding: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    margin: 20,
    color: '#888',
  },


  /* Bottom Navigation Layout */
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
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    width: 28,
    height: 30,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  navIcon1: {
    width: 35,
    height: 30,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  navIcon2: {
    width: 25,
    height: 30,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  navText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
  },
});
