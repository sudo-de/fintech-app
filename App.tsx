import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LoadingSpinner } from './src/components/common/LoadingSpinner';

function AppContent() {
  const { state } = useApp();
  if (state.isLoading) return <LoadingSpinner />;
  return (
    <>
      <RootNavigator />
      <StatusBar style="light" />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
