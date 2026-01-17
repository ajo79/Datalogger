import React, { Profiler } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack"; 
import SignUpScreen from "./SignUpScreen";
import DeviceInformationScreen from "./DeviceInformationScreen";
import PageFirst from "./PageFirst";
import Animation from "./Animation";
import LoginScreen from "./LoginScreen";
import Animationpage from "./Animationpage";
import GraphScreen from "./GraphScreen";
import HomeScreen from "./HomeScreen";
import AlarmScreen from "./AlarmScreen";
import MoreScreen from "./MoreScreen";
import ProfileScreen from "./ProfileScreen";
import EditProfileScreen from "./EditProfileScreen";
import SettingsScreen from "./SettingsScreen";
import HelpSupportScreen from "./HelpSupportScreen";
import AboutAppScreen from "./AboutAppScreen";
import NotificationScreen from "./NotificationScreen"; 
// import QRscanner from "./QRscanner";


const Stack = createNativeStackNavigator(); 

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Animation" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Graph" component={GraphScreen} />
        <Stack.Screen name="Alarm" component={AlarmScreen} />
        <Stack.Screen name="More" component={MoreScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Device" component={DeviceInformationScreen} />  
        <Stack.Screen name="Page" component={PageFirst} />
        <Stack.Screen name="Animat" component={Animation} />
        {/* <Stack.Screen name="QR" component={QRscanner} /> */}
        <Stack.Screen name="Animation" component={Animationpage} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Notifications" component={NotificationScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="AboutApp" component={AboutAppScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
