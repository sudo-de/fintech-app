import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { PinPad } from '../../components/common/PinPad';
import { FONTS } from '../../constants/colors';
import { RootStackParamList } from '../../navigation/RootNavigator';

type MPINSetupNavProp = NativeStackNavigationProp<RootStackParamList, 'MPINSetup'>;
type MPINSetupRouteProp = RouteProp<RootStackParamList, 'MPINSetup'>;

type Step = 'current' | 'new' | 'confirm';

const PIN_LENGTH = 4;

const STEP_LABELS: Record<Step, string> = {
  current: 'Enter your current PIN',
  new: 'Create a new PIN',
  confirm: 'Confirm your PIN',
};

export function MPINSetupScreen() {
  const { colors } = useTheme();
  const { setMPIN, validateMPIN, mpinEnabled } = useAuth();
  const navigation = useNavigation<MPINSetupNavProp>();
  const route = useRoute<MPINSetupRouteProp>();
  const { mode } = route.params;

  // For 'setup' mode: step goes new → confirm
  // For 'change' mode: step goes current → new → confirm
  const initialStep: Step = mode === 'change' && mpinEnabled ? 'current' : 'new';
  const [step, setStep] = useState<Step>(initialStep);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const shakeRef = useRef<() => void>(() => {});

  const handleDigit = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    setError('');

    if (next.length === PIN_LENGTH) {
      setTimeout(() => processPin(next), 200);
    }
  };

  const processPin = (entered: string) => {
    if (step === 'current') {
      if (!validateMPIN(entered)) {
        shakeRef.current?.();
        setError('Incorrect PIN');
        setTimeout(() => setPin(''), 300);
        return;
      }
      setPin('');
      setStep('new');
      return;
    }

    if (step === 'new') {
      setNewPin(entered);
      setPin('');
      setStep('confirm');
      return;
    }

    if (step === 'confirm') {
      if (entered !== newPin) {
        shakeRef.current?.();
        setError('PINs do not match');
        setTimeout(() => {
          setPin('');
          setNewPin('');
          setStep(mode === 'change' && mpinEnabled ? 'current' : 'new');
        }, 400);
        return;
      }
      setMPIN(entered).then(() => {
        navigation.goBack();
      });
    }
  };

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const stepIndex = (() => {
    if (mode === 'setup') return step === 'new' ? 1 : 2;
    return step === 'current' ? 1 : step === 'new' ? 2 : 3;
  })();
  const totalSteps = mode === 'setup' ? 2 : 3;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {mode === 'setup' ? 'Set Up PIN' : 'Change PIN'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.stepDot,
              {
                backgroundColor: i + 1 <= stepIndex ? colors.primary : colors.border,
                width: i + 1 === stepIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={[styles.iconWrapper, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="keypad" size={32} color={colors.primary} />
        </View>

        <PinPad
          value={pin}
          maxLength={PIN_LENGTH}
          onPress={handleDigit}
          onBackspace={handleBackspace}
          label={STEP_LABELS[step]}
          error={error}
          shakeRef={shakeRef}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  iconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
});
