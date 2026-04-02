import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types';
import { getCategoryInfo } from '../../constants/categories';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/colors';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (t: Transaction) => void;
  onLongPress?: (t: Transaction) => void;
}

export function TransactionItem({ transaction, onPress, onLongPress }: TransactionItemProps) {
  const category = getCategoryInfo(transaction.category);
  const isIncome = transaction.type === 'income';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(transaction)}
      onLongPress={() => onLongPress?.(transaction)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${category.color}20` }]}>
        <Ionicons name={category.icon as any} size={20} color={category.color} />
      </View>

      <View style={styles.info}>
        <Text style={styles.note} numberOfLines={1}>
          {transaction.note || category.label}
        </Text>
        <Text style={styles.category}>{category.label}</Text>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.amount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        <Text style={styles.date}>{formatShortDate(transaction.date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  info: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  note: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  category: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  date: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
});
