import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { TabParamList } from './tabTypes';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { LockScreen } from '../screens/auth/LockScreen';
import { MPINSetupScreen } from '../screens/auth/MPINSetupScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { TransactionDetailScreen } from '../screens/TransactionDetailScreen';
import { Transaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Lock: undefined;
  MainTabs: { screen?: keyof TabParamList } | undefined;
  Account: undefined;
  AddTransaction: { transaction?: Transaction };
  TransactionDetail: { transaction: Transaction };
  MPINSetup: { mode: 'setup' | 'change' };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function RootNavigator() {
  const { authReady, isRegistered, isLocked } = useAuth();
  const { colors, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.surface,
    },
  };

  if (!authReady) {
    return <LoadingSpinner />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!isRegistered ? (
          // ── Unauthenticated: Login (default) + Register ──────────────────
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        ) : isLocked ? (
          // ── Authenticated but locked (MPIN / biometric) ───────────────────
          <Stack.Screen
            name="Lock"
            component={LockScreen}
            options={{ gestureEnabled: false }}
          />
        ) : (
          // ── Authenticated & unlocked: main app ────────────────────────────
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} options={{ animation: 'fade' }} />
            <Stack.Screen
              name="Account"
              component={AccountScreen}
              options={{ animation: 'slide_from_right', gestureEnabled: true }}
            />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{ animation: 'slide_from_right', gestureEnabled: true }}
            />
            <Stack.Screen
              name="AddTransaction"
              component={AddTransactionScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }}
            />
            <Stack.Screen
              name="MPINSetup"
              component={MPINSetupScreen}
              options={{ animation: 'slide_from_right', gestureEnabled: true }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
