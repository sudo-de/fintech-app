/**
 * LoadingOverlay
 *
 * Full-screen activity indicator shown during the very first data fetch.
 * Sits above the screen content via absolute positioning.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, SPACING } from '../../constants/colors';

interface Props {
  message?: string;
}

export function LoadingOverlay({ message = 'Syncing…' }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {!!message && (
        <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  text: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
});
