/*
 * AuthStack.js
 *
 * Ideally, this stack should just handle Login/Signup.
 * However, in the current architecture, it includes ALL application screens.
 * This effectively makes it a "Master Stack" that starts with Login and
 * then pushes other screens on top.
 * 
 * Flow:
 * Login -> Home (TabNavigator) -> Graph/Alarm/More etc.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import DeviceInformationScreen from '../screens/DeviceInformationScreen';
import GraphScreen from '../screens/GraphScreen';
import AlarmScreen from '../screens/AlarmScreen';
import MoreScreen from '../screens/MoreScreen';
import GraphShowScreen from '../screens/GraphShowScreen';
import ExportScreen from '../screens/ExportScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationScreen from '../screens/NotificationScreen';
import AboutAppScreen from '../screens/AboutAppScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import ProfileScreen from "../screens/ProfileScreen";
import SidebarScreen from "../screens/SidebarScreen";

import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login" // Starts at login
      screenOptions={{ headerShown: false }}
    >
      {/* Authentication */}
      <Stack.Screen name="Login" component={LoginScreen} />

      {/* Main Tabbed Interface */}
      <Stack.Screen name="Home" component={TabNavigator} />

      {/* Detail Screens */}
      <Stack.Screen name="Graph" component={GraphScreen} />
      <Stack.Screen name="Alarm" component={AlarmScreen} />
      <Stack.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="GraphShow" component={GraphShowScreen} />
      <Stack.Screen name="Export" component={ExportScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="AboutApp" component={AboutAppScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="Sidebar" component={SidebarScreen} />

      {/* Device Detail Route */}
      <Stack.Screen name="Device" component={DeviceInformationScreen} />

      {/* Profile Management */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}
