import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GradientCard } from '../common/GradientCard';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { formatCurrency, formatMonth, getCurrentMonth } from '../../utils/formatters';

interface BalanceCardProps {
  balance: number;
  income: number;
  expenses: number;
}

export function BalanceCard({ balance, income, expenses }: BalanceCardProps) {
  return (
    <GradientCard colors={COLORS.gradients.primary} style={styles.card}>
      <Text style={styles.label}>Total Balance</Text>
      <Text style={styles.balance}>{formatCurrency(balance)}</Text>
      <Text style={styles.month}>{formatMonth(getCurrentMonth())}</Text>

      <View style={styles.row}>
        <View style={styles.stat}>
          <View style={styles.statDot}>
            <View style={[styles.dot, { backgroundColor: COLORS.income }]} />
          </View>
          <View>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={styles.statValue}>{formatCurrency(income)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <View style={styles.statDot}>
            <View style={[styles.dot, { backgroundColor: COLORS.expense }]} />
          </View>
          <View>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={styles.statValue}>{formatCurrency(expenses)}</Text>
          </View>
        </View>
      </View>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balance: {
    fontSize: FONTS.sizes.hero,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  month: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    padding: SPACING.md,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 1,
  },
  statValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: SPACING.lg,
  },
});
