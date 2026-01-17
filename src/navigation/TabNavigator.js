/*
 * TabNavigator.js
 *
 * This navigator manages the "logical" tabs of the application (Dashboard, Data, Graph, More).
 *
 * CRITICAL DESIGN NOTE:
 * The default Tab Bar UI is completely HIDDEN (`tabBar={() => null}`).
 * This is because the application uses a custom visual design where each Screen
 * renders its own bottom navigation bar (WaveBottom image with icons).
 * This navigator exists solely to provide the routing mechanism between these main views.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen';
import DataScreen from '../screens/DataScreen';
import GraphScreen from '../screens/GraphScreen';
import MoreScreen from '../screens/MoreScreen';
import AlarmScreen from '../screens/AlarmScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      // We hide the default tab bar to prevent double rendering.
      // The visual tab bar is implemented manually inside each screen's layout.
      tabBar={() => null}
      screenOptions={({ route }) => ({
        headerShown: false,
        // These tab bar options are technically unused since the bar is hidden,
        // but kept for reference if we ever switch back to native tabs.
        tabBarActiveTintColor: '#F6B85C',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Data') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Graph') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Data" component={DataScreen} />
      <Tab.Screen name="Graph" component={GraphScreen} />
      <Tab.Screen name="Alarm" component={AlarmScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
