import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
} from "react-native";

import IMAGES from "../constants/images";
import { goBackWithFallback } from "../navigation/navHelpers";
import { useAppTheme } from "../theme";
import { ModernTopHeader } from "../components/ui";

export default function ProfileScreen({ navigation }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState("Anil Patil");
  const [department, setDepartment] = useState("R&D");
  const [contact, setContact] = useState("+91-8669751135");
  const [email, setEmail] = useState("blackstarproductsrnd@gmail.com");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ModernTopHeader
        title="Profile"
        leftIcon={IMAGES.BackIcon}
        onLeftPress={() => goBackWithFallback(navigation, "More")}
        rightIcon={IMAGES.EditIcon}
        onRightPress={() =>
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
      />

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

      <View style={styles.bottomNavBg} />
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
    },
    profileContainer: {
      marginTop: 20,
      paddingHorizontal: 20,
    },
    profileImage: {
      width: 120,
      height: 120,
      alignSelf: "center",
      marginBottom: 25,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 25,
      marginLeft: 30,
    },
    icon: {
      width: 40,
      height: 40,
      marginRight: 20,
      tintColor: theme.colors.navActive,
    },
    textBlock: { flexDirection: "column" },
    label: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.textPrimary,
    },
    value: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    bottomNavBg: {
      height: 20,
    },
  });
}
