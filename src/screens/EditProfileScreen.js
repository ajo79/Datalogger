/*
 * EditProfileScreen.js
 *
 * This screen allows users to edit their profile information.
 * It includes fields for Name, Department, Contact No., and Email.
 *
 * Key Features:
 * - Pre-filled inputs via route params or default state.
 * - KeyboardAvoidingView for better UX on iOS/Android.
 * - Save functionality calling a callback function.
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { goBackWithFallback } from "../navigation/navHelpers";
import { hexWithAlpha, useAppTheme } from "../theme";
import { AnimatedPressable, ModernTopHeader } from "../components/ui";

export default function EditProfileScreen({ route, navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Extract initial values from navigation params
  const {
    name: initialName = "",
    department: initialDepartment = "",
    contact: initialContact = "",
    email: initialEmail = "",
    onSave,
  } =
    route.params || {};

  // Component State
  const [name, setName] = useState(initialName);
  const [department, setDepartment] = useState(initialDepartment || "R&D");
  const [contact, setContact] = useState(initialContact || "+91-8669751137");
  const [email, setEmail] = useState(initialEmail);

  /**
   * Handles Save action.
   * Calls the onSave callback if provided and navigates back to Profile.
   */
  const handleSave = () => {
    if (onSave) {
      onSave(name, department, contact, email);
    }
    navigation.navigate("Profile");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ModernTopHeader
          title="Edit Profile"
          leftIcon={require("../../assets/images/BackIcon.png")}
          onLeftPress={() => goBackWithFallback(navigation, "Profile")}
        />

        <View style={styles.container}>
          {/* Profile Picture */}
          <Image
            source={require("../../assets/images/Profilepicicon.png")}
            style={styles.profileIcon}
          />

          {/* Form Content */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Name Input */}
            <View style={styles.inputRow}>
              <Image
                source={require("../../assets/images/NameICON.png")}
                style={styles.icon}
              />
              <View style={styles.textBlock}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                />
              </View>
            </View>

            {/* Department Input */}
            <View style={styles.inputRow}>
              <Image
                source={require("../../assets/images/DeptIcon.png")}
                style={styles.icon}
              />
              <View style={styles.textBlock}>
                <Text style={styles.label}>Department</Text>
                <TextInput
                  style={styles.input}
                  value={department}
                  onChangeText={setDepartment}
                  placeholder="Enter Department"
                />
              </View>
            </View>

            {/* Contact Input */}
            <View style={styles.inputRow}>
              <Image
                source={require("../../assets/images/ContactIcon.png")}
                style={styles.icon}
              />
              <View style={styles.textBlock}>
                <Text style={styles.label}>Contact No.</Text>
                <TextInput
                  style={styles.input}
                  value={contact}
                  onChangeText={setContact}
                  keyboardType="phone-pad"
                  placeholder="Enter Contact No."
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputRow}>
              <Image
                source={require("../../assets/images/EmailIcon.png")}
                style={styles.icon}
              />
              <View style={styles.textBlock}>
                <Text style={styles.label}>Email ID</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholder="Enter Email ID"
                />
              </View>
            </View>

            {/* Save Button */}
            <AnimatedPressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </AnimatedPressable>
          </ScrollView>
        </View>

        <View style={styles.bottomNavBg} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    keyboardContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
      padding: 20,
      justifyContent: "flex-start",
    },
    profileIcon: {
      width: 120,
      height: 120,
      alignSelf: "center",
      marginBottom: 30,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    icon: {
      width: 36,
      height: 36,
      marginRight: 15,
      tintColor: theme.colors.navActive,
      top: 12,
    },
    textBlock: {
      flex: 1,
      paddingLeft: 10,
      paddingRight: 10,
    },
    label: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 5,
    },
    input: {
      borderWidth: 1,
      borderColor: hexWithAlpha(theme.colors.brand, 0.34),
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 15,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.inputBackground,
    },
    saveButton: {
      backgroundColor: theme.colors.buttonPrimary,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 30,
      borderWidth: 1,
      borderColor: hexWithAlpha(theme.colors.brandDark, 0.4),
      alignSelf: "center",
      minWidth: 150,
      alignItems: "center",
    },
    saveButtonText: {
      fontSize: 17,
      fontWeight: "bold",
      color: theme.colors.buttonPrimaryText,
    },
    bottomNavBg: {
      height: 20,
    },
  });
}
