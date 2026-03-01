/*
 * AppNavigator.js
 *
 * The root navigator for the application.
 * It manages the high-level flow between the Intro/Animation, Authentication, and Main App stacks.
 *
 * Structure:
 * - Animation: Initial splash/start animation.
 * - Auth: Login/Signup flow (though locally it seems to include all screens too).
 * - Main: The main tab/dashboard application flow.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import AnimationScreen from '../screens/AnimationScreen';

const AppStack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <AppStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Animation">
        {/* Entry Point: Animation Screen */}
        <AppStack.Screen name="Animation" component={AnimationScreen} options={{ headerShown: false }} />

        {/* Auth Stack: Contains Login and subsequently the full App for authenticated users */}
        <AppStack.Screen name="Auth" component={AuthStack} />

        {/* Main Stack: Alternative entry point for already logged-in sessions */}
        <AppStack.Screen name="Main" component={MainStack} />
      </AppStack.Navigator>
    </NavigationContainer>
  );
}