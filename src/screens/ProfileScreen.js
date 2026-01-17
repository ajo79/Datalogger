import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import IMAGES from "../constants/images";

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState("Anil Patil");
  const [department, setDepartment] = useState("R&D");
  const [contact, setContact] = useState("+91-8669751135");
  const [email, setEmail] = useState("blackstarproductsrnd@gmail.com");

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={IMAGES.WaveTop}
          style={styles.headerImage}
        />
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={IMAGES.BackIcon}
              style={styles.iconSmall1}
            />
          </TouchableOpacity>
          <Text style={styles.headerText}>Profile</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("EditProfile", {
                name,
                department,
                contact,
                email,
                onSave: (newName, newDept, newContact, newEmail) => {
                  setName(newName);
                  setDepartment(newDept);
                  setContact(newContact);
                  setEmail(newEmail);
                },
              })
            }
          >
            <Image
              source={IMAGES.EditIcon}
              style={styles.iconSmall2}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Info Section */}
        <View style={styles.profileContainer}>
          <Image
            source={IMAGES.ProfilePic}
            style={styles.profileImage}
          />

          {/* Name */}
          <View style={styles.infoRow}>
            <Image source={IMAGES.NameIcon} style={styles.icon} />
            <View style={styles.textBlock}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{name}</Text>
            </View>
          </View>

          {/* Department */}
          <View style={styles.infoRow}>
            <Image source={IMAGES.DeptIcon} style={styles.icon} />
            <View style={styles.textBlock}>
              <Text style={styles.label}>Department</Text>
              <Text style={styles.value}>{department}</Text>
            </View>
          </View>

          {/* Contact No */}
          <View style={styles.infoRow}>
            <Image
              source={IMAGES.ContactIcon}
              style={styles.icon}
            />
            <View style={styles.textBlock}>
              <Text style={styles.label}>Contact No.</Text>
              <Text style={styles.value}>{contact}</Text>
            </View>
          </View>

          {/* Email */}
          <View style={styles.infoRow}>
            <Image
              source={IMAGES.EmailIcon}
              style={styles.icon}
            />
            <View style={styles.textBlock}>
              <Text style={styles.label}>Email ID</Text>
              <Text style={styles.value}>{email}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <ImageBackground
        source={IMAGES.WaveBottom}
        style={styles.bottomNavBg}
        resizeMode="stretch"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    height: 80,
    justifyContent: "center"
  },
  headerImage: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 80,
    resizeMode: "cover"
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    height: "100%"
  },
  headerText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000"
  },
  iconSmall1: {
    width: 32,
    height: 32,
    top: 6
  },
  iconSmall2: {
    width: 28,
    height: 28
  },
  profileContainer: {
    marginTop: 20,
    paddingHorizontal: 20
  },
  profileImage: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 25
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    marginLeft: 30
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 20,
    tintColor: "black"
  },
  textBlock: { flexDirection: "column" },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000"
  },
  value: {
    fontSize: 16,
    color: "#444"
  },
  bottomNavBg: {
    position: "absolute",
    bottom: 0, width: "100%",
    height: 80
  },
});
