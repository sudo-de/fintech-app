import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types';
import { getCategoryInfo } from '../../constants/categories';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { useCurrency, getCurrencyInfo, formatCurrencyWithInfo } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime } from '../../utils/formatters';

interface TransactionItemProps {
  transaction: Transaction;
  /** History: tap opens detail screen. Same look as default. */
  variant?: 'default' | 'history';
  onPress?: (t: Transaction) => void;
  onLongPress?: (t: Transaction) => void;
}

/**
 * List row: type, category, amount + date/time (no description on the row).
 * `variant="history"`: tap → detail screen (list may wrap row in Swipeable for delete).
 */
export function TransactionItem({
  transaction,
  variant = 'default',
  onPress,
  onLongPress,
}: TransactionItemProps) {
  const { colors } = useTheme();
  const { formatCurrency, convert, currency: displayCurrency } = useCurrency();
  const txnCurrency = getCurrencyInfo(transaction.currency ?? displayCurrency.code);
  const isForeignCurrency = txnCurrency.code !== displayCurrency.code;
  const category = getCategoryInfo(transaction.category);
  const isIncome = transaction.type === 'income';
  const typeColor = isIncome ? colors.income : colors.expense;
  const typeLabel = isIncome ? 'Income' : 'Expense';
  const catTint =
    (colors.categories as Record<string, string>)[transaction.category] ?? category.color;
  const note = transaction.note?.trim() ?? '';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => onPress?.(transaction)}
      onLongPress={() => onLongPress?.(transaction)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${typeLabel}, ${category.label}, ${formatCurrencyWithInfo(transaction.amount, txnCurrency)}, ${formatDateTime(transaction.date)}, ${note || 'No description'}`}
      accessibilityHint={variant === 'history' ? 'Opens transaction details' : 'Opens transaction'}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${catTint}22` }]}>
        <Ionicons name={category.icon as any} size={22} color={catTint} />
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.typeCategoryCluster}>
            <View
              style={[
                styles.typePill,
                { backgroundColor: isIncome ? `${colors.income}22` : `${colors.expense}22` },
              ]}
            >
              <Ionicons
                name={isIncome ? 'trending-up' : 'trending-down'}
                size={12}
                color={typeColor}
              />
              <Text style={[styles.typePillText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <Text style={[styles.categoryLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {category.label}
            </Text>
          </View>
          <View style={styles.amountBlock}>
            <Text style={[styles.amountValue, { color: typeColor }]} numberOfLines={1}>
              {isIncome ? '+' : '−'}
              {formatCurrencyWithInfo(transaction.amount, txnCurrency)}
            </Text>
            {isForeignCurrency && (
              <View style={styles.convertedRow}>
                <Text style={[styles.amountConverted, { color: colors.textTertiary }]} numberOfLines={1}>
                  ≈ {formatCurrency(
                    transaction.convertedAmount !== undefined && transaction.baseCurrency
                      ? transaction.baseCurrency === displayCurrency.code
                        ? transaction.convertedAmount
                        : convert(transaction.convertedAmount, transaction.baseCurrency)
                      : convert(transaction.amount, txnCurrency.code)
                  )}
                </Text>
                {transaction.rateUsed !== undefined && (
                  <Ionicons name="lock-closed" size={9} color={colors.textTertiary} />
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
          <Text style={[styles.dateText, { color: colors.textTertiary }]} numberOfLines={2}>
            {formatDateTime(transaction.date)}
          </Text>
        </View>
      </View>

      <View style={styles.chevronWrap} pointerEvents="none">
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  typeCategoryCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    minWidth: 0,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    flexShrink: 0,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  categoryLabel: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    minWidth: 60,
  },
  amountBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  amountValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  convertedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  amountConverted: {
    fontSize: 10,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  chevronWrap: {
    justifyContent: 'center',
    paddingLeft: 4,
    marginLeft: 2,
    alignSelf: 'stretch',
  },
});
