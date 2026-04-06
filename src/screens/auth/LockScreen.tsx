import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { PinPad } from '../../components/common/PinPad';
import { FONTS } from '../../constants/colors';
import { showAppAlert } from '../../utils/appAlert';

const PIN_LENGTH = 4;

export function LockScreen() {
  const { colors, isDark } = useTheme();
  const { user, mpinEnabled, biometricEnabled, unlock, biometricUnlock, signOut } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const shakeRef = useRef<() => void>(() => {});

  const handleBiometric = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock FinTech App',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      if (result.success) {
        biometricUnlock();
      }
    } catch {
      // biometric not available or cancelled — fall back to PIN
    }
  }, [biometricUnlock]);

  // Auto-trigger biometric on mount if enabled
  useEffect(() => {
    if (biometricEnabled) {
      // Small delay so the screen renders first
      const t = setTimeout(handleBiometric, 400);
      return () => clearTimeout(t);
    }
  }, [biometricEnabled, handleBiometric]);

  const handleDigit = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    setError('');

    if (next.length === PIN_LENGTH) {
      const ok = unlock(next);
      if (!ok) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        shakeRef.current?.();
        setError(newAttempts >= 3 ? `Incorrect PIN (${newAttempts} attempts)` : 'Incorrect PIN');
        setTimeout(() => setPin(''), 300);
      }
    }
  };

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const handleSignOut = () => {
    showAppAlert(
      isDark,
      'Sign out?',
      'End this session on this device. You can sign in again anytime; your server account is not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* App icon */}
        <View style={[styles.iconWrapper, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="lock-closed" size={36} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Welcome back, {firstName}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {mpinEnabled
            ? biometricEnabled
              ? 'Use biometric or enter your PIN'
              : 'Enter your PIN to continue'
            : 'Use biometric to unlock'}
        </Text>

        {/* PIN pad — show only if MPIN is enabled */}
        {mpinEnabled ? (
          <PinPad
            value={pin}
            maxLength={PIN_LENGTH}
            onPress={handleDigit}
            onBackspace={handleBackspace}
            onBiometric={biometricEnabled ? handleBiometric : undefined}
            error={error}
            shakeRef={shakeRef}
          />
        ) : (
          /* Biometric-only mode */
          <View style={styles.biometricOnly}>
            <TouchableOpacity
              style={[styles.biometricBtn, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}
              onPress={handleBiometric}
              activeOpacity={0.7}
            >
              <Ionicons name="finger-print" size={52} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.biometricHint, { color: colors.textTertiary }]}>
              Tap to authenticate
            </Text>
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn} activeOpacity={0.6}>
          <Text style={[styles.signOutText, { color: colors.textTertiary }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginBottom: 40,
  },
  biometricOnly: {
    alignItems: 'center',
    marginTop: 16,
  },
  biometricBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  biometricHint: {
    fontSize: FONTS.sizes.sm,
  },
  signOutBtn: {
    position: 'absolute',
    bottom: 32,
  },
  signOutText: {
    fontSize: FONTS.sizes.sm,
    textDecorationLine: 'underline',
  },
});
