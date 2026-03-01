import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const cabins = [
  { name: 'Cabin1', id: 'BIOT1234', status: 'online' },
  { name: 'Cabin2', id: 'BIOT1235', status: 'online' },
  { name: 'Cabin3', id: 'BIOT1236', status: 'offline' },
  { name: 'Cabin4', id: 'BIOT1237', status: 'online' },
  { name: 'Cabin5', id: 'BIOT1238', status: 'offline' },
];

 
export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <Image
        source={require('./Image/WaveTop.png')}
        style={styles.headerImage}
      />
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity>
            <Image
              source={require('./Image/MoreTop.png')}
              style={styles.iconSmall1}
            />
          </TouchableOpacity>
          <TouchableOpacity>
            <Image
              source={require('./Image/Profilepicicon.png')}
              style={[styles.iconSmall2, { marginLeft: 10 }]}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerText}>BIOT</Text>
        <TouchableOpacity>
          <Image
            source={require('./Image/SettingIconpng.png')}
            style={styles.settingicon}
          />
        </TouchableOpacity>
      </View>

      {/* Scrollable Cabin Section */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {cabins.map((cabin, index) => (
          <View key={index} style={styles.cabinBox}>
            <View style={styles.cabinHeader}>
              <Text style={styles.cabinName}>{cabin.name}</Text>
              <Text style={styles.cabinID}>ID: {cabin.id}</Text>
            </View>

            <View style={styles.row}>
            <Text style={styles.label}>Temperature</Text>
            <Text style={styles.valueText}>27°C</Text>
            <Text style={styles.status}>
              {cabin.status === 'online' ? '🟢 Online' : '🔴 Offline'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Humidity</Text>
            <Text style={styles.valueText}>100%</Text>
            <TouchableOpacity>
              <Image
                source={require('./Image/graph_Icon.png')}
                style={styles.icongraph}
              />
            </TouchableOpacity>
            <TouchableOpacity>
              <Image
                source={require('./Image/Export_Icon.png')}
                style={styles.icon}
              />
            </TouchableOpacity>
          </View>

          </View>
        ))}
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
    // backgroundColor: '#fff5e6',
    backgroundColor: "#fff",
  },
  scrollContainer: {
    paddingBottom: 20,
    // backgroundColor: '#fff5e6',
    backgroundColor: "#fff",
  },
  headerImage: {
    width: '100%',
    height: 80,
    resizeMode: 'contain',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: -65,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSmall1: {
    width: 28,
    height: 24,
  },
  iconSmall2: {
    width: 33,
    height: 33,
  },
  settingicon: {
    width: 32,
    height: 32,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  cabinBox: {
    borderWidth: 1,
    borderRadius: 8,
    margin: 10,
    padding: 10,
    backgroundColor: '#fff',
    elevation: 3,
  },
  cabinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffcc80',
    padding: 5,
    borderRadius: 4,
  },
  cabinName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  cabinID: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
    fontSize: 14,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    borderRadius: 4,
    backgroundColor: '#f2f2f2',
    fontSize: 14,
  },
  status: {
    color: 'Black',
    fontWeight: 'bold',
  },
  icon: {
    width: 25,
    height: 28,
    marginLeft: 10,
  },
    icongraph: {
    width: 27,
    height: 24,
    marginLeft: 5,
  },
  bottomNavBg: {
    width: '100%',
    height: 80,
    marginTop: 20,
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
    marginBottom: 0,
  },
  navIcon1: {
    width: 35,
    height: 30,
    marginBottom: 0,
  },
  navIcon2: {
    width: 25,
    height: 30,
    marginBottom: 0,
  },
  navText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  valueText: {
  flex: 1,
  fontSize: 15,
  fontWeight: 'bold',
  color: '#000',
  marginHorizontal: 5,
  paddingLeft:55,
},
});
