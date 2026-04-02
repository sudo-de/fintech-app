import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavingsGoal } from '../../types';
import { FlatCard } from '../common/GradientCard';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/colors';
import { formatCurrency, formatMonth } from '../../utils/formatters';

interface GoalCardProps {
  goal: SavingsGoal;
  currentSavings: number;
  onDelete: (id: string) => void;
}

export function GoalCard({ goal, currentSavings, onDelete }: GoalCardProps) {
  const progress = Math.min(currentSavings / goal.targetAmount, 1);
  const percent = Math.round(progress * 100);
  const isAchieved = currentSavings >= goal.targetAmount;

  return (
    <FlatCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBadge, { backgroundColor: isAchieved ? `${COLORS.income}20` : `${COLORS.primary}20` }]}>
            <Ionicons
              name={isAchieved ? 'trophy' : 'flag'}
              size={18}
              color={isAchieved ? COLORS.income : COLORS.primary}
            />
          </View>
          <View style={styles.titleInfo}>
            <Text style={styles.name}>{goal.name}</Text>
            <Text style={styles.month}>{formatMonth(goal.month)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => onDelete(goal.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="trash-outline" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.amounts}>
        <Text style={styles.current}>{formatCurrency(currentSavings)}</Text>
        <Text style={styles.target}>of {formatCurrency(goal.targetAmount)}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: isAchieved ? COLORS.income : COLORS.primary }]} />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.percentLabel, { color: isAchieved ? COLORS.income : COLORS.primary }]}>
          {percent}% {isAchieved ? '🎉 Goal achieved!' : 'saved'}
        </Text>
        <Text style={styles.remaining}>
          {isAchieved
            ? `+${formatCurrency(currentSavings - goal.targetAmount)} over`
            : `${formatCurrency(goal.targetAmount - currentSavings)} to go`}
        </Text>
      </View>
    </FlatCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInfo: {},
  name: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  month: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  current: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  target: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  progressTrack: {
    height: 8,
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
    alignItems: 'center',
  },
  percentLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  remaining: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
});
