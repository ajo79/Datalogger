import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function AlarmScreen() {
  const navigation = useNavigation();

  const alarmData = [
    { id: '1', deviceId: 'BIOT1234', message: 'Temperature Raised', dateTime: '01-05-2025 01:20', status: 'NACK ACK' },
    { id: '2', deviceId: 'BIOT1235', message: 'Temperature Down', dateTime: '01-05-2025 01:20', status: 'NACK ACK' },
    { id: '3', deviceId: 'BIOT1236', message: 'Humidity Changed', dateTime: '01-05-2025 01:20', status: 'NACK ACK' },
    { id: '4', deviceId: 'BIOT1237', message: 'Temperature Raised', dateTime: '01-05-2025 01:20', status: 'NACK ACK' },
    { id: '5', deviceId: 'BIOT1238', message: 'Temperature Down', dateTime: '01-05-2025 01:20', status: 'NACK ACK' },
  ];

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
      {/* Header Image */}
      <Image source={require('./Image/WaveTop.png')} style={styles.headerImage} />

      {/* Header Title */}
      <View style={styles.topHeader}>
        <Text style={styles.headerText}>ALARM</Text>
      </View>

      {/* Table Section */}
      <ScrollView style={{ marginBottom: 90 }} horizontal>
        <View>
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
          />
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <ImageBackground
        source={require('./Image/WaveBottom.png')}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      >
        <View style={styles.navContainer}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
            <Image source={require('./Image/HomeIcon.png')} style={styles.navIcon} />
            <Text style={styles.navText}>HOME</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Graph')}>
            <Image source={require('./Image/GraphIcon.png')} style={styles.navIcon1} />
            <Text style={styles.navText}>GRAPH</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Alarm')}>
            <Image source={require('./Image/AlarmIcon.png')} style={styles.navIcon2} />
            <Text style={styles.navText}>ALARM</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('More')}>
            <Image source={require('./Image/MoreIcon.png')} style={styles.navIcon} />
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
    backgroundColor: '#fff',
  },
  headerImage: {
    width: '100%',
    height: 80,
    resizeMode: 'cover',
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#FFF8DC',
    top :10,
  },
  headerRow: {
    backgroundColor: '#FFD700',
  },
  // ---- Column widths fixed ----
  cellSrNo: {
    width: 40,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellDevice: {
    width: 80,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellMessage: {
    width: 105,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellDate: {
    width: 90,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#ddd',
  },
  cellStatus: {
    width: 95,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#000',
  },
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '120%',
    paddingHorizontal: 20,
  },
  navItem: {
    alignItems: 'center',
  },
  navIcon: {
    width: 28,
    height: 30,
  },
  navIcon1: {
    width: 35,
    height: 30,
  },
  navIcon2: {
    width: 25,
    height: 30,
  },
  navText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
});
