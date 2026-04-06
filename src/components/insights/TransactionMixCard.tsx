import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import type { TransactionTypeMix } from '../../utils/calculations';

interface TransactionMixCardProps {
  mix: TransactionTypeMix;
  periodLabel: string;
}

export function TransactionMixCard({ mix, periodLabel }: TransactionMixCardProps) {
  const { colors } = useTheme();
  const { incomeCount, expenseCount, total, dominant, incomePercent } = mix;

  const incomeW = total > 0 ? (incomeCount / total) * 100 : 50;
  const expenseW = total > 0 ? (expenseCount / total) * 100 : 50;

  // Animated values on a 0–100 scale
  const incomeAnim = useRef(new Animated.Value(0)).current;
  const expenseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    incomeAnim.setValue(0);
    expenseAnim.setValue(0);

    Animated.parallel([
      Animated.timing(incomeAnim, {
        toValue: incomeW,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(expenseAnim, {
        toValue: expenseW,
        duration: 700,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [incomeW, expenseW]);

  const incomeWidthPct = incomeAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  const expenseWidthPct = expenseAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const headline =
    total === 0
      ? 'Log transactions to see your mix'
      : dominant === 'balanced'
        ? 'Balanced logging'
        : dominant === 'expense'
          ? 'Most entries are expenses'
          : 'Most entries are income';

  const sub =
    total === 0
      ? 'Income and expense rows are counted separately.'
      : `${incomeCount} income · ${expenseCount} expense · ${total} total this period`;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}22` }]}>
          <Ionicons name="git-compare-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Transaction mix</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{periodLabel}</Text>
        </View>
      </View>

      <Text style={[styles.headline, { color: colors.textPrimary }]}>{headline}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{sub}</Text>

      {total > 0 ? (
        <>
          {/* Animated split bar — uses a container with flexDirection: row */}
          <View style={[styles.splitTrack, { backgroundColor: colors.divider }]}>
            <Animated.View
              style={[
                styles.splitSegment,
                {
                  width: incomeWidthPct,
                  backgroundColor: colors.income,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.splitSegment,
                {
                  width: expenseWidthPct,
                  backgroundColor: colors.expense,
                },
              ]}
            />
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Income {incomePercent}%
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Expense {100 - incomePercent}%
              </Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    marginBottom: 4,
  },
  sub: {
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  splitTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  splitSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
});
