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

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  SafeAreaView,
  TouchableOpacity,
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";

export default function EditProfileScreen({ route, navigation }) {
  // Extract initial values from navigation params
  const { name: initialName = "", email: initialEmail = "", onSave } =
    route.params || {};

  // Component State
  const [name, setName] = useState(initialName);
  const [department, setDepartment] = useState("R&D"); // Default department
  const [contact, setContact] = useState("+91-8669751137"); // Default contact
  const [email, setEmail] = useState(initialEmail);

  /**
   * Handles Save action.
   * Calls the onSave callback if provided and navigates back to Profile.
   */
  const handleSave = () => {
    if (onSave) {
      onSave(name, email);
    }
    navigation.navigate("Profile");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        {/* ===== Header Section ===== */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/WaveTop.png")}
            style={styles.headerImage}
          />
          <View style={styles.topHeader}>
            {/* Back Button */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Image
                source={require("../../assets/images/BackIcon.png")}
                style={styles.iconSmall1}
              />
            </TouchableOpacity>
            <Text style={styles.headerText}>Edit Profile</Text>
          </View>
        </View>

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
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Footer */}
        <ImageBackground
          source={require("../../assets/images/WaveBottom.png")}
          style={styles.bottomNavBg}
          resizeMode="stretch"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------------- STYLES ------------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardContainer: {
    flex: 1,
  },

  /* Header Styles */
  header: {
    height: 80,
    justifyContent: "center",
  },
  headerImage: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 80,
    resizeMode: "cover",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    height: "100%",
  },
  headerText: {
    flex: 1,
    textAlign: "center",
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
    marginRight: 32, // Offset close to back button width
  },
  iconSmall1: {
    width: 32,
    height: 32,
    top: 5,
  },

  /* Content Styles */
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
    paddingBottom: 100,
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
    tintColor: "black",
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
    color: "#000",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#FFCC66",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 30,
    borderWidth: 2,
    borderColor: "#004080",
    alignSelf: "center",
    minWidth: 150,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
  },

  /* Footer Styles */
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
  },
});
