import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, RADIUS } from '../../constants/colors';

interface PinPadProps {
  value: string;
  maxLength?: number;
  onPress: (digit: string) => void;
  onBackspace: () => void;
  onBiometric?: () => void;
  label?: string;
  error?: string;
  shakeRef?: React.MutableRefObject<() => void>;
}

export function PinPad({
  value,
  maxLength = 4,
  onPress,
  onBackspace,
  onBiometric,
  label,
  error,
  shakeRef,
}: PinPadProps) {
  const { colors } = useTheme();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  if (shakeRef) {
    shakeRef.current = shake;
  }

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [onBiometric ? 'bio' : '', '0', 'back'],
  ];

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}

      {/* PIN dots */}
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < value.length ? colors.primary : 'transparent',
                borderColor: i < value.length ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Error message */}
      <Text style={[styles.error, { color: colors.expense, opacity: error ? 1 : 0 }]}>
        {error ?? ' '}
      </Text>

      {/* Keypad */}
      <View style={styles.keypad}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key, ki) => {
              if (key === '') {
                return <View key={ki} style={styles.keySlot} />;
              }
              if (key === 'back') {
                return (
                  <TouchableOpacity
                    key={ki}
                    style={styles.keySlot}
                    onPress={onBackspace}
                    activeOpacity={0.5}
                  >
                    <Ionicons name="backspace-outline" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              }
              if (key === 'bio') {
                return (
                  <TouchableOpacity
                    key={ki}
                    style={styles.keySlot}
                    onPress={onBiometric}
                    activeOpacity={0.5}
                  >
                    <Ionicons name="finger-print-outline" size={28} color={colors.primary} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={ki}
                  style={[styles.keySlot, styles.digitKey, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => onPress(key)}
                  activeOpacity={0.65}
                >
                  <Text style={[styles.digit, { color: colors.textPrimary }]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const KEY_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    marginBottom: 28,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 22,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  error: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    height: 18,
  },
  keypad: {
    marginTop: 28,
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  keySlot: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitKey: {
    borderWidth: 1,
  },
  digit: {
    fontSize: 22,
    fontWeight: '500',
  },
});
