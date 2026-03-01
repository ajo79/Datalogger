// import React, { useRef } from 'react';
// import {
//   View,
//   Animated,
//   TouchableOpacity,
//   StyleSheet,
// } from 'react-native';

// export default function BallAnimation() {
//   const position = useRef(new Animated.Value(0)).current;

//   const moveBall = () => {
//     Animated.timing(position, {
//       toValue: 200, 
//       duration: 1000, 
//       useNativeDriver: false, 
//     }).start();
//   };

//   return (
//     <View style={styles.container}>
//       <TouchableOpacity onPress={moveBall}>
//         <Animated.View style={[styles.ball, { marginLeft: position }]} />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     paddingHorizontal: 20,
//     backgroundColor: '#f9f9f9',
//   },
//   ball: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     backgroundColor: 'orange',
//   },
// });


import React, { useRef, useEffect } from 'react';
import { Animated, View, Text, StyleSheet, Button } from 'react-native';

export default function FadeInViewExample() {
  const fadeAnim = useRef(new Animated.Value(0)).current; // सुरुवातीची opacity = 0

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.box,
          {
            opacity: fadeAnim, 
          },
        ]}
      >
        <Text style={styles.text}>Hello World</Text>
      </Animated.View>

      <View style={styles.buttons}>
        <Button title="Fade In" onPress={fadeIn} />
        <Button title="Fade Out" onPress={fadeOut} color="red" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },
  box: {
    width: 250,
    height: 150,
    backgroundColor: '#3399ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 12,
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttons: {
    flexDirection: 'row',
    gap: 20,
  },
});

