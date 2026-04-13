import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { getSession } from '../storage/userStorage';
import { useAppTheme } from '../theme';

const SplashScreen = ({ navigation }) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    const checkUser = async () => {
      const session = await getSession();
      setTimeout(() => {
        if (session?.userId) {
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

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.canvas,
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
      color: theme.colors.brandDark,
      fontWeight: 'bold',
      marginBottom: 1,
    },
  });
}

export default SplashScreen;
