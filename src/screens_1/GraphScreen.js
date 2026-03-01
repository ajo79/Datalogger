import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

const screenWidth = Dimensions.get('window').width;

export default function GraphScreen() {
  const navigation = useNavigation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [activeField, setActiveField] = useState(null);

  // Calendar Open
  const showDatePicker = (field) => {
    setActiveField(field);
    setDatePickerVisibility(true);
  };

  // Calendar Hide
  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  // Date Select from Calendar
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

  // Validate function
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


  // Manual typing handle
 const handleManualDate = (text, field) => {
  let cleaned = text.replace(/[^0-9-]/g, ''); 

  if (/^\d{2}$/.test(cleaned)) {
    cleaned = cleaned + '-';
  } else if (/^\d{2}-\d{2}$/.test(cleaned)) {
    cleaned = cleaned + '-';
  }

  if (field === 'start') {
    setStartDate(cleaned);
    if (cleaned.length === 10 && !validateDate(cleaned)) {
      alert("Invalid Start Date");
      setStartDate('');
    }
  } else {
    setEndDate(cleaned);
    if (cleaned.length === 10 && !validateDate(cleaned)) {
      alert("Invalid End Date");
      setEndDate('');
    }
  }
};


  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
    labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#fff',
    },
  };

  const CabinGraph = ({ cabin }) => (
    <View style={styles.graphBox}>
      <Text style={styles.graphTitle}>Graph {"\n"}{cabin}</Text>
      <LineChart
        data={{
          labels: ['', '5', '10', '15', '20'],
          datasets: [
            {
              data: [18, 28, 25, 35, 37],
              color: (opacity = 1) => `rgba(255,165,0, ${opacity})`,
              strokeWidth: 2,
            },
            {
              data: [10, 18, 12, 30, 25],
              color: (opacity = 1) => `rgba(0,0,255, ${opacity})`,
              strokeWidth: 2,
            },
          ],
          legend: ['Temp', 'Humidity'],
        }}
        width={screenWidth * 0.9}
        height={220}
        chartConfig={{
          ...chartConfig,
          formatYLabel: (value) => {
            const num = Math.round(value);
            return num % 10 === 0 ? num.toString() : '';
          },
        }}
        fromZero={true}
        withHorizontalLines={true}
        withVerticalLines={true}
        bezier={false}
      />
      <Text style={styles.yLabel}>Degree</Text>
      <Text style={styles.xLabel}>Time</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Image source={require('./Image/WaveTop.png')} style={styles.headerImage} />
      <View style={styles.topHeader}>
        <Text style={styles.headerText}>GRAPH</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date Filter */}
        <View style={styles.dateRow}>
          <Text>Start Date</Text>
          <View style={styles.dateInputContainer}>
            <TextInput
              style={styles.dateInput}
              value={startDate}
              placeholder="DD-MM-YYYY"
              onChangeText={(text) => handleManualDate(text, 'start')}
              keyboardType="numeric"
            />
            <TouchableOpacity onPress={() => showDatePicker('start')}>
              <Image source={require('./Image/Calender.png')} style={styles.dateIcon} />
            </TouchableOpacity>
          </View>

          <Text>End Date</Text>
          <View style={styles.dateInputContainer}>
            <TextInput
              style={styles.dateInput}
              value={endDate}
              placeholder="DD-MM-YYYY"
              onChangeText={(text) => handleManualDate(text, 'end')}
              keyboardType="numeric"
            />
            <TouchableOpacity onPress={() => showDatePicker('end')}>
              <Image source={require('./Image/Calender.png')} style={styles.dateIcon} />
            </TouchableOpacity>
          </View>
        </View>

        {['Cabin1', 'Cabin2', 'Cabin3', 'Cabin4'].map((cabin, index) => (
          <CabinGraph key={index} cabin={cabin} />
        ))}
      </ScrollView>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
      />

      {/* Bottom Footer */}
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
  safeArea: { flex: 1, backgroundColor: '#fff' },
  headerImage: { width: '100%', height: 80, resizeMode: 'cover' },
  topHeader: {
    position: 'absolute',
    top: 25,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#000' },

  scrollContent: { paddingBottom: 100 },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    alignItems: 'center',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 5,
    paddingHorizontal: 5,
    minWidth: 130,
  },
  dateInput: {
    flex: 1,
    padding: 5,
  },
  dateIcon: {
    width: 20,
    height: 20,
    marginLeft: 5,
  },

  graphBox: { alignItems: 'center', marginVertical: 20 },
  graphTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  yLabel: {
    position: 'absolute',
    left: 25,
    top: 170,
    transform: [{ rotate: '-90deg' }],
    fontSize: 12,
    fontWeight: 'bold',
  },
  xLabel: { marginTop: -10, fontSize: 12, fontWeight: 'bold' },

  bottomNavBg: { width: '100%', height: 80, marginTop: 20 },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '120%',
    paddingHorizontal: 20,
  },
  navItem: { alignItems: 'center' },
  navIcon: { width: 28, height: 30 },
  navIcon1: { width: 35, height: 30 },
  navIcon2: { width: 25, height: 30 },
  navText: { fontWeight: 'bold', fontSize: 12 },
});
