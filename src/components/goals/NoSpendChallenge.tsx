import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoSpendChallenge } from '../../types';
import { Transaction } from '../../types';
import { GradientCard } from '../common/GradientCard';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/colors';
import { getNoSpendStreakDays } from '../../utils/calculations';

interface NoSpendChallengeCardProps {
  challenge: NoSpendChallenge;
  transactions: Transaction[];
}

export function NoSpendChallengeCard({ challenge, transactions }: NoSpendChallengeCardProps) {
  const streakDays = getNoSpendStreakDays(transactions, challenge.startDate);
  const totalDays = challenge.durationDays;
  const progress = Math.min(streakDays / totalDays, 1);
  const isComplete = streakDays >= totalDays;

  const today = new Date();
  const start = new Date(challenge.startDate);
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const dayTiles = Array.from({ length: Math.min(totalDays, 14) }, (_, i) => {
    const isInStreak = i < streakDays;
    const isToday = i === daysSinceStart;
    return { day: i + 1, isInStreak, isToday };
  });

  return (
    <GradientCard colors={isComplete ? COLORS.gradients.gold : ['#1C2040', '#252A50']} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{isComplete ? '🏆' : '🎯'}</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>No-Spend Challenge</Text>
          <Text style={styles.subtitle}>{totalDays}-day challenge</Text>
        </View>
        {isComplete && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Complete!</Text>
          </View>
        )}
      </View>

      <View style={styles.streakRow}>
        <Text style={styles.streakNumber}>{streakDays}</Text>
        <Text style={styles.streakLabel}>day{streakDays !== 1 ? 's' : ''} streak</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{streakDays} of {totalDays} days</Text>

      {dayTiles.length > 0 && (
        <View style={styles.tiles}>
          {dayTiles.map((tile) => (
            <View
              key={tile.day}
              style={[
                styles.tile,
                tile.isInStreak && styles.tileActive,
                tile.isToday && styles.tileToday,
              ]}
            >
              <Ionicons
                name={tile.isInStreak ? 'checkmark' : 'remove'}
                size={10}
                color={tile.isInStreak ? '#fff' : COLORS.textTertiary}
              />
            </View>
          ))}
        </View>
      )}
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  emoji: { fontSize: 28 },
  headerText: { flex: 1 },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  badge: {
    backgroundColor: COLORS.income,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: '#fff',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  streakLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.full,
  },
  progressLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tile: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActive: {
    backgroundColor: COLORS.secondary,
  },
  tileToday: {
    borderWidth: 1.5,
    borderColor: COLORS.textPrimary,
  },
});
