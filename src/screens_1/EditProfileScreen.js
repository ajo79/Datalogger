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
  Platform
} from "react-native";

export default function EditProfileScreen({ route, navigation }) {
  const { name: initialName, email: initialEmail, onSave } = route.params;

  const [name, setName] = useState(initialName || "");
  const [department, setDepartment] = useState("R&D");
  const [contact, setContact] = useState("+91-8669751137");
  const [email, setEmail] = useState(initialEmail || "");

  const handleSave = () => {
    if (onSave) {
      onSave(name, email);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Keyboard handling */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <ImageBackground
          source={require("./Image/WaveTop.png")}
          style={styles.header}
          resizeMode="cover"
        >
          <Text style={styles.headerText}>Edit Profile</Text>
        </ImageBackground>

        <View style={styles.container}>
          {/* Profile Icon */}
          <Image
            source={require("./Image/Profilepicicon.png")}
            style={styles.profileIcon}
          />

          {/* Name */}
          <ScrollView>
          <View style={styles.inputRow}>
            <Image source={require("./Image/NameICON.png")} style={styles.icon} />
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

          {/* Department */}
          <View style={styles.inputRow}>
            <Image source={require("./Image/DeptIcon.png")} style={styles.icon} />
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

          {/* Contact */}
          <View style={styles.inputRow}>
            <Image source={require("./Image/ContactIcon.png")} style={styles.icon} />
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

          {/* Email */}
          <View style={styles.inputRow}>
            <Image source={require("./Image/EmailIcon.png")} style={styles.icon} />
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
          </ScrollView>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <ImageBackground
          source={require("./Image/WaveBottom.png")}
          style={styles.bottomNavBg}
          resizeMode="stretch"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 80,
    backgroundColor: "#FFCC66",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
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
    marginBottom: 38,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 15,
    tintColor: "black",
    top :10,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#FFCC66",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 2,
    borderColor: "#004080",
    alignSelf: "center",
    minWidth: 150,
    alignItems: "center",
    bottom: 100,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  bottomNavBg: {
    position: "absolute",
    bottom: 0,
    // top :100,
    width: "100%",
    height: 80,
  },
});
