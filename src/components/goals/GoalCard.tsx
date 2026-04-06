import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavingsGoal } from '../../types';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { formatMonth, getCurrentMonth } from '../../utils/formatters';
import { useCurrency } from '../../context/CurrencyContext';
import { convertCurrency } from '../../utils/exchangeRates';
import { useTheme } from '../../context/ThemeContext';
import { getSavingsPaceInsight, SavingsPaceStatus } from '../../utils/calculations';

interface GoalCardProps {
  goal: SavingsGoal;
  savedForMonth: number;
  onDelete: (id: string) => void;
}

function paceShortLabel(status: SavingsPaceStatus): string {
  switch (status) {
    case 'achieved': return 'Goal reached';
    case 'ahead':    return 'Ahead of pace';
    case 'on_track': return 'On pace';
    case 'behind':   return 'Catch up';
    case 'past_miss':return 'Missed';
    default: return '';
  }
}

function paceIcon(status: SavingsPaceStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'achieved': return 'trophy';
    case 'ahead':    return 'rocket-outline';
    case 'on_track': return 'pulse-outline';
    case 'behind':   return 'alert-circle-outline';
    case 'past_miss':return 'time-outline';
    default: return 'flag-outline';
  }
}

export function GoalCard({ goal, savedForMonth, onDelete }: GoalCardProps) {
  const { colors } = useTheme();
  const { formatCurrency, currency: displayCurrency } = useCurrency();

  // Convert target to the current display currency so progress is accurate
  const targetInDisplay = useMemo(() => {
    if (!goal.currency || goal.currency === displayCurrency.code) return goal.targetAmount;
    return convertCurrency(goal.targetAmount, goal.currency, displayCurrency.code);
  }, [goal.targetAmount, goal.currency, displayCurrency.code]);

  const progress = Math.min(savedForMonth / (targetInDisplay || 1), 1);
  const percent = Math.round(progress * 100);
  const isAchieved = savedForMonth >= targetInDisplay;
  const isCurrentMonth = goal.month === getCurrentMonth();

  const insight = useMemo(
    () => isCurrentMonth
      ? getSavingsPaceInsight(savedForMonth, targetInDisplay, goal.month)
      : null,
    [isCurrentMonth, savedForMonth, targetInDisplay, goal.month]
  );

  const paceTint = insight?.paceStatus === 'behind'
    ? colors.warning
    : insight?.paceStatus === 'ahead' || insight?.paceStatus === 'achieved'
      ? colors.income
      : colors.primary;

  const fillColor = isAchieved ? colors.income : paceTint;

  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: Math.min(percent, 100),
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: isAchieved ? `${colors.income}40` : colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: isAchieved ? `${colors.income}18` : `${colors.primary}18` }]}>
          <Ionicons
            name={isAchieved ? 'trophy' : 'flag'}
            size={20}
            color={isAchieved ? colors.income : colors.primary}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{goal.name}</Text>
          <Text style={[styles.month, { color: colors.textTertiary }]}>{formatMonth(goal.month)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => onDelete(goal.id)}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Pace chip */}
      {insight && (
        <View style={[styles.paceChip, { backgroundColor: `${paceTint}14`, borderColor: `${paceTint}35` }]}>
          <Ionicons name={paceIcon(insight.paceStatus)} size={12} color={paceTint} />
          <Text style={[styles.paceChipText, { color: paceTint }]}>
            {paceShortLabel(insight.paceStatus)}
          </Text>
        </View>
      )}

      {/* Amounts */}
      <View style={styles.amounts}>
        <Text style={[styles.saved, { color: colors.textPrimary }]}>{formatCurrency(savedForMonth)}</Text>
        <Text style={[styles.target, { color: colors.textSecondary }]}>
          {' '}/ {formatCurrency(targetInDisplay)}
        </Text>
      </View>

      {/* Animated progress bar */}
      <View style={[styles.track, { backgroundColor: colors.divider }]}>
        <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: fillColor }]} />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.pctLabel, { color: fillColor }]}>
          {percent}%{isAchieved ? ' · Goal reached' : ' of target'}
        </Text>
        <Text style={[styles.remaining, { color: colors.textSecondary }]}>
          {isAchieved
            ? `+${formatCurrency(savedForMonth - targetInDisplay)} above`
            : `${formatCurrency(Math.max(0, targetInDisplay - savedForMonth))} to go`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  name: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  month: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  paceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  paceChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  saved: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  target: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  track: {
    height: 8,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  pctLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  remaining: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
});
