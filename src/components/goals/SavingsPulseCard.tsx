import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Budget, SavingsGoal, Transaction } from '../../types';
import { FONTS, SPACING, RADIUS, SHADOW } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { convertCurrency } from '../../utils/exchangeRates';
import {
  getSavingsPaceInsight,
  getSmartSpendingNudge,
  SavingsPaceStatus,
} from '../../utils/calculations';
import { formatMonth } from '../../utils/formatters';

interface SavingsPulseCardProps {
  goalsThisMonth: SavingsGoal[];
  netSavedThisMonth: number;
  transactions: Transaction[];
  budgets: Budget[];
  monthKey: string;
  onAddGoal: () => void;
}

function paceCopy(status: SavingsPaceStatus): { label: string; icon: keyof typeof Ionicons.glyphMap } {
  switch (status) {
    case 'achieved':
      return { label: 'Target reached', icon: 'checkmark-circle' };
    case 'ahead':
      return { label: 'Ahead of pace', icon: 'rocket-outline' };
    case 'on_track':
      return { label: 'On track', icon: 'pulse-outline' };
    case 'behind':
      return { label: 'Behind pace', icon: 'alert-circle-outline' };
    case 'past_miss':
      return { label: 'Past month', icon: 'time-outline' };
  }
}

export function SavingsPulseCard({
  goalsThisMonth,
  netSavedThisMonth,
  transactions,
  budgets,
  monthKey,
  onAddGoal,
}: SavingsPulseCardProps) {
  const { colors } = useTheme();
  const { formatCurrency, currency: displayCurrency } = useCurrency();

  // Convert each goal's target to the current display currency before summing
  const combinedTarget = useMemo(
    () =>
      goalsThisMonth.reduce((s, g) => {
        const t =
          !g.currency || g.currency === displayCurrency.code
            ? g.targetAmount
            : convertCurrency(g.targetAmount, g.currency, displayCurrency.code);
        return s + t;
      }, 0),
    [goalsThisMonth, displayCurrency.code]
  );

  const insight = useMemo(
    () => getSavingsPaceInsight(netSavedThisMonth, combinedTarget, monthKey),
    [netSavedThisMonth, combinedTarget, monthKey]
  );

  const nudge = useMemo(
    () => getSmartSpendingNudge(transactions, budgets, monthKey),
    [transactions, budgets, monthKey]
  );

  const titleNames =
    goalsThisMonth.length === 0
      ? ''
      : goalsThisMonth.length === 1
        ? goalsThisMonth[0].name
        : `${goalsThisMonth.length} goals · ${goalsThisMonth.map((g) => g.name).join(' · ')}`;

  if (goalsThisMonth.length === 0) {
    return (
      <TouchableOpacity
        style={[styles.emptyPulse, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={onAddGoal}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[`${colors.primary}18`, `${colors.secondary}10`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyGradient}
        >
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}22` }]}>
            <Ionicons name="sparkles-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Savings pulse</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            Set a monthly savings target. We compare your net income minus expenses to that goal and show whether
            you are ahead or behind a steady month-long pace — plus budget nudges when spend is heating up.
          </Text>
          <View style={[styles.ctaPill, { backgroundColor: colors.primary }]}>
            <Text style={styles.ctaPillText}>Add a savings goal</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const { label: paceLabel, icon: paceIcon } = paceCopy(insight.paceStatus);
  const barPct = Math.min(100, Math.round(insight.progress * 100));
  const paceColor =
    insight.paceStatus === 'achieved' || insight.paceStatus === 'ahead'
      ? colors.income
      : insight.paceStatus === 'behind'
        ? colors.warning
        : insight.paceStatus === 'past_miss'
          ? colors.textTertiary
          : colors.primary;

  const secondaryLine =
    insight.paceStatus === 'achieved'
      ? 'Nice work — consider raising the bar next month.'
      : insight.paceStatus === 'past_miss'
        ? 'This month is closed; add a fresh goal or review spend.'
        : insight.paceStatus === 'behind'
          ? `Benchmark for today if you spread savings evenly: ${formatCurrency(insight.expectedByToday)}. Catch-up pace: about ${formatCurrency(insight.dailyCatchUp)}/day (incl. today).`
          : insight.paceStatus === 'ahead'
            ? 'You are beating an even month-long pace — optional buffer for surprises.'
            : `Steady-month benchmark by today: ${formatCurrency(insight.expectedByToday)}. You have ${formatCurrency(Math.max(0, combinedTarget - netSavedThisMonth))} left to go.`;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }, SHADOW.small]}>
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: `${paceColor}20` }]}>
          <Ionicons name={paceIcon} size={16} color={paceColor} />
          <Text style={[styles.badgeText, { color: paceColor }]}>{paceLabel}</Text>
        </View>
        <Text style={[styles.monthTag, { color: colors.textTertiary }]}>{formatMonth(monthKey)}</Text>
      </View>

      <Text style={[styles.pulseTitle, { color: colors.textPrimary }]} numberOfLines={2}>
        {titleNames}
      </Text>

      <View style={styles.bigNumbers}>
        <Text style={[styles.savedBig, { color: colors.textPrimary }]}>{formatCurrency(netSavedThisMonth)}</Text>
        <Text style={[styles.targetInline, { color: colors.textSecondary }]}>
          {' '}
          / {formatCurrency(combinedTarget)}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: colors.divider }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${barPct}%`,
              backgroundColor: insight.paceStatus === 'behind' ? colors.warning : colors.primary,
            },
          ]}
        />
      </View>

      <Text style={[styles.paceDetail, { color: colors.textSecondary }]}>{secondaryLine}</Text>

      {nudge ? (
        <View style={[styles.nudge, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}35` }]}>
          <Ionicons name="bulb-outline" size={18} color={colors.warning} />
          <Text style={[styles.nudgeText, { color: colors.textPrimary }]}>{nudge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  monthTag: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pulseTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    lineHeight: 22,
  },
  bigNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  savedBig: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  targetInline: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  track: {
    height: 10,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  paceDetail: {
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    fontWeight: '500',
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  nudgeText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    fontWeight: '500',
  },
  emptyPulse: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    borderWidth: 1,
  },
  emptyGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  emptyBody: {
    fontSize: FONTS.sizes.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  ctaPillText: {
    color: '#fff',
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
});
