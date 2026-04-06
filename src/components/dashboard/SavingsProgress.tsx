import React, { useRef, useEffect } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING } from '../../constants/colors';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';

interface SavingsProgressProps {
  income: number;
  spent: number;
  saved: number;
  savingsRate: number;
}

export function SavingsProgress({ income, spent, saved, savingsRate }: SavingsProgressProps) {
  const { formatCurrency } = useCurrency();
  const { colors } = useTheme();

  const spentPct = income > 0 ? Math.min((spent / income) * 100, 100) : 0;
  const savedPct = income > 0 ? Math.min((Math.max(saved, 0) / income) * 100, 100 - spentPct) : 0;
  const clampedRate = Math.min(Math.max(savingsRate, 0), 100);

  const isHealthy = savingsRate >= 20;
  const isWarning = savingsRate > 0 && savingsRate < 20;

  const statusColor = isHealthy ? colors.income : isWarning ? colors.warning : colors.expense;
  const statusIcon  = isHealthy ? 'checkmark-circle' : isWarning ? 'alert-circle' : 'close-circle';
  const statusText  = isHealthy
    ? 'Great savings!'
    : isWarning
    ? 'Room to improve'
    : income === 0
    ? 'No income yet'
    : 'Over budget';

  const spentAnim = useRef(new Animated.Value(0)).current;
  const savedAnim = useRef(new Animated.Value(0)).current;
  const rateAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    spentAnim.setValue(0);
    savedAnim.setValue(0);
    rateAnim.setValue(0);

    Animated.parallel([
      Animated.timing(spentAnim, {
        toValue: spentPct,
        duration: 800,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(savedAnim, {
        toValue: savedPct,
        duration: 800,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(rateAnim, {
        toValue: clampedRate,
        duration: 1000,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [spentPct, savedPct, clampedRate]);

  const spentWidth = spentAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const savedWidth = savedAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Savings Overview</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <Ionicons name={statusIcon as any} size={12} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      {/* Main content: rate ring + breakdown */}
      <View style={styles.body}>
        {/* Circular rate indicator */}
        <View style={styles.ringWrap}>
          <View style={[styles.ringOuter, { borderColor: `${statusColor}30` }]}>
            <View style={[styles.ringInner, { borderColor: statusColor, borderTopColor: 'transparent',
              transform: [{ rotate: `${(clampedRate / 100) * 360 - 90}deg` }] }]} />
            <View style={styles.ringCenter}>
              <Text style={[styles.rateValue, { color: statusColor }]}>
                {Math.round(clampedRate)}%
              </Text>
              <Text style={[styles.rateLabel, { color: colors.textTertiary }]}>saved</Text>
            </View>
          </View>
        </View>

        {/* Right: segmented bar + legend */}
        <View style={styles.right}>
          <Text style={[styles.barTitle, { color: colors.textTertiary }]}>Income split</Text>
          <View style={styles.segBarContainer}>
            {/* Background (remaining) */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.border, borderRadius: RADIUS.full }]} />
            {/* Spent segment */}
            <Animated.View style={[styles.seg, { width: spentWidth, backgroundColor: colors.expense }]} />
            {/* Saved segment */}
            <Animated.View style={[styles.seg, { width: savedWidth, backgroundColor: colors.income }]} />
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.expense }]} />
              <View>
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Spent</Text>
                <Text style={[styles.legendVal, { color: colors.expense }]}>
                  {formatCurrency(spent)}
                </Text>
              </View>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.income }]} />
              <View>
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Saved</Text>
                <Text style={[styles.legendVal, { color: colors.income }]}>
                  {formatCurrency(Math.max(saved, 0))}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ringOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: 'transparent',
  },
  ringCenter: {
    alignItems: 'center',
  },
  rateValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  rateLabel: {
    fontSize: 9,
    fontWeight: '500',
  },
  right: {
    flex: 1,
    gap: SPACING.sm,
  },
  barTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  segBarContainer: {
    height: 10,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
  },
  seg: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  legend: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  legendLabel: {
    fontSize: 10,
  },
  legendVal: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
});
