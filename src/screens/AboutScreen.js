/*
 * AboutScreen.js
 *
 * This screen appears to be a basic screen used for testing or specific logout functionality.
 * It contains a simple "About Screen" title and a large Logout button.
 *
 * Key Features:
 * - User Logout functionality via `userStorage`.
 * - Navigation redirection to Auth stack.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { clearSession, clearUser } from '../storage/userStorage';
import { logoutToAuthRoot } from '../navigation/navHelpers';
import { useAppTheme } from '../theme';

const AboutScreen = ({ navigation }) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /**
   * Handles user logout.
   * Clears stored user data and navigates to Login screen.
   */
  const handleLogout = async () => {
    await clearSession();
    await clearUser();
    logoutToAuthRoot(navigation);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>About Screen</Text>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

/* ------------------------- STYLES ------------------------- */

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.canvas,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      color: theme.colors.textPrimary,
    },
    button: {
      backgroundColor: theme.colors.buttonPrimary,
      padding: 15,
      borderRadius: 10,
      width: '80%',
      alignItems: 'center',
    },
    buttonText: {
      color: theme.colors.buttonPrimaryText,
      fontSize: 18,
      fontWeight: 'bold',
    },
  });
}

export default AboutScreen;
