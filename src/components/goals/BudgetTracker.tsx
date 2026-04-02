import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Budget } from '../../types';
import { getCategoryInfo } from '../../constants/categories';
import { FlatCard } from '../common/GradientCard';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatters';
import { getBudgetStatus } from '../../utils/calculations';
import { Transaction } from '../../types';

interface BudgetTrackerProps {
  budget: Budget;
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export function BudgetTrackerCard({ budget, transactions, onDelete }: BudgetTrackerProps) {
  const category = getCategoryInfo(budget.category);
  const { spent, remaining, percentage, isOver } = getBudgetStatus(
    transactions,
    budget.category,
    budget.limit,
    budget.month
  );

  const barColor = isOver
    ? COLORS.expense
    : percentage > 80
    ? COLORS.warning
    : COLORS.income;

  return (
    <FlatCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.left}>
          <View style={[styles.icon, { backgroundColor: `${category.color}20` }]}>
            <Ionicons name={category.icon as any} size={18} color={category.color} />
          </View>
          <View>
            <Text style={styles.categoryName}>{category.label}</Text>
            <Text style={styles.limitText}>Limit: {formatCurrency(budget.limit)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => onDelete(budget.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="close-circle-outline" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.spentText, { color: isOver ? COLORS.expense : COLORS.textSecondary }]}>
          Spent: {formatCurrency(spent)}
        </Text>
        <Text style={[styles.remainingText, { color: isOver ? COLORS.expense : COLORS.income }]}>
          {isOver ? `Over by ${formatCurrency(-remaining)}` : `${formatCurrency(remaining)} left`}
        </Text>
      </View>
    </FlatCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  icon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  limitText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spentText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  remainingText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
});
