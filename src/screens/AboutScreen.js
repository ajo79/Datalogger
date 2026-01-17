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

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { clearUser } from '../storage/userStorage';

const AboutScreen = ({ navigation }) => {

  /**
   * Handles user logout.
   * Clears stored user data and navigates to Login screen.
   */
  const handleLogout = async () => {
    await clearUser();
    navigation.navigate('Auth', { screen: 'Login' });
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF7F50',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AboutScreen;
