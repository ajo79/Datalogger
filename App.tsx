import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AppThemeProvider } from './src/theme';

const App = () => {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AppNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
