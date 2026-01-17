/*
 * MainStack.js
 *
 * This stack mirrors the AuthStack structure but is likely intended for
 * users who are already logged in (auto-login flow).
 * It defines the same routes to ensure seamless navigation regardless of entry point.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import DataScreen from '../screens/DataScreen';
import GraphScreen from '../screens/GraphScreen';
import AlarmScreen from '../screens/AlarmScreen';
import ExportScreen from '../screens/ExportScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AboutAppScreen from '../screens/AboutAppScreen';
import LoginScreen from '../screens/LoginScreen';
import AnimationScreen from '../screens/AnimationScreen';
import MoreScreen from '../screens/MoreScreen';
import GraphShowScreen from '../screens/GraphShowScreen';
import NotificationScreen from '../screens/NotificationScreen'
import HelpSupportScreen from '../screens/HelpSupportScreen';
import ProfileScreen from "../screens/ProfileScreen";
import SidebarScreen from "../screens/SidebarScreen";
import SettingsScreen from "../screens/SettingsScreen";

import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      {/* Initial Landing (can be customized) */}
      <Stack.Screen name="Animation" component={AnimationScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />

      {/* Main Tabbed Interface */}
      <Stack.Screen name="Home" component={TabNavigator} />
      

      {/* Individual Screens */}
      <Stack.Screen name="Graph" component={GraphScreen} />
      <Stack.Screen name="Data" component={DataScreen} />
      <Stack.Screen name="Alarm" component={AlarmScreen} />
      <Stack.Screen name="Export" component={ExportScreen} />
      <Stack.Screen name="Sidebar" component={SidebarScreen} />
      <Stack.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="GraphShow" component={GraphShowScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="AboutApp" component={AboutAppScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
