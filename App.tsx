import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { RootNavigator, navigationRef } from './src/navigation/RootNavigator';
import { LoadingSpinner } from './src/components/common/LoadingSpinner';
import { LottieSplashGate } from './src/components/splash/LottieSplashGate';
import { useNotifications, useNotificationNavigation } from './src/hooks/useNotifications';
import { StatusBar } from 'expo-status-bar';

function AppContent() {
  const { state } = useApp();
  const { isDark, colors } = useTheme();
  useNotifications();
  useNotificationNavigation((screen, params) => {
    if (navigationRef.isReady()) navigationRef.navigate(screen as any, params as any);
  });

  // This View is the true root background — it sits below every navigator and
  // screen, so any "gap" during transitions shows this color instead of white.
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {state.isLoading ? (
        <LoadingSpinner />
      ) : (
        <RootNavigator />
      )}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LottieSplashGate>
        <SafeAreaProvider>
          <ThemeProvider>
            <CurrencyProvider>
              <AuthProvider>
                <AppProvider>
                  <AppContent />
                </AppProvider>
              </AuthProvider>
            </CurrencyProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </LottieSplashGate>
    </GestureHandlerRootView>
  );
}
