/**
 * SyncErrorBanner
 *
 * A reusable inline error strip shown when a background sync fails.
 * Provides an optional Retry button and a dismiss × icon.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, RADIUS, SPACING } from '../../constants/colors';

interface Props {
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

export function SyncErrorBanner({ message, onRetry, onDismiss }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: `${colors.expense}20`,
          borderColor: `${colors.expense}44`,
          marginHorizontal: SPACING.xl,
          marginBottom: SPACING.md,
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={colors.expense} />
      <Text style={[styles.text, { color: colors.expense }]} numberOfLines={2}>
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.retryBtn, { borderColor: `${colors.expense}55` }]}
        >
          <Text style={[styles.retryText, { color: colors.expense }]}>Retry</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={16} color={colors.expense} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    lineHeight: 16,
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  retryText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
});
