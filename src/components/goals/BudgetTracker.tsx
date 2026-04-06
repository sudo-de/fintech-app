import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Budget, Transaction } from '../../types';
import { getCategoryInfo } from '../../constants/categories';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { useCurrency } from '../../context/CurrencyContext';
import { convertCurrency } from '../../utils/exchangeRates';
import { useTheme } from '../../context/ThemeContext';
import { getBudgetStatus } from '../../utils/calculations';

interface BudgetTrackerProps {
  budget: Budget;
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export function BudgetTrackerCard({ budget, transactions, onDelete }: BudgetTrackerProps) {
  const { colors } = useTheme();
  const { formatCurrency, currency: displayCurrency } = useCurrency();
  const category = getCategoryInfo(budget.category);

  // Convert limit to the current display currency so comparison with (converted) transactions is accurate
  const limitInDisplay =
    !budget.currency || budget.currency === displayCurrency.code
      ? budget.limit
      : convertCurrency(budget.limit, budget.currency, displayCurrency.code);

  const { spent, remaining, percentage, isOver } = getBudgetStatus(
    transactions,
    budget.category,
    limitInDisplay,
    budget.month
  );

  const clampedPct = Math.min(percentage, 100);
  const barColor = isOver ? colors.expense : percentage > 80 ? colors.warning : colors.income;

  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: clampedPct,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedPct]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: isOver ? `${colors.expense}50` : colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${category.color}20` }]}>
          <Ionicons name={category.icon as any} size={20} color={category.color} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{category.label}</Text>
          <Text style={[styles.limitText, { color: colors.textTertiary }]}>
            Limit · {formatCurrency(limitInDisplay)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.pctPill, { backgroundColor: `${barColor}18`, borderColor: `${barColor}40` }]}>
            <Text style={[styles.pctText, { color: barColor }]}>{Math.round(percentage)}%</Text>
          </View>
          <TouchableOpacity
            onPress={() => onDelete(budget.id)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: colors.divider }]}>
        <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.spentText, { color: colors.textSecondary }]}>
          Spent <Text style={{ color: isOver ? colors.expense : colors.textPrimary, fontWeight: '700' }}>{formatCurrency(spent)}</Text>
        </Text>
        <Text style={[styles.remainingText, { color: isOver ? colors.expense : colors.income }]}>
          {isOver ? `Over by ${formatCurrency(-remaining)}` : `${formatCurrency(remaining)} left`}
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
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerInfo: { flex: 1 },
  categoryName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  limitText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pctPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  },
  spentText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  remainingText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
});
