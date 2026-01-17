import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { getUser } from '../storage/userStorage';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const checkUser = async () => {
      const user = await getUser();
      setTimeout(() => {
        if (user) {
          navigation.replace('Main');
        } else {
          navigation.replace('Auth');
        }
      }, 1000); // Show splash for 1 second
    };

    checkUser();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/new_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Data Guard</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 300,
    height: 70,
    marginBottom: 30,
  },
  title: {
    height: 45,
    fontSize: 40,
    color: '#FF5733',
    fontWeight: 'bold',
    marginBottom: 1,
  },
});

export default SplashScreen;