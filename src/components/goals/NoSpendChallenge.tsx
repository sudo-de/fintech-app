import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NoSpendChallenge, Transaction } from '../../types';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { getNoSpendStreakDays } from '../../utils/calculations';

interface NoSpendChallengeCardProps {
  challenge: NoSpendChallenge;
  transactions: Transaction[];
}

export function NoSpendChallengeCard({ challenge, transactions }: NoSpendChallengeCardProps) {
  const { colors } = useTheme();
  const streakDays = getNoSpendStreakDays(transactions, challenge.startDate);
  const totalDays = challenge.durationDays;
  const progress = Math.min(streakDays / totalDays, 1);
  const isComplete = streakDays >= totalDays;

  const today = new Date();
  const start = new Date(challenge.startDate);
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysSinceStart - 1);

  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: progress * 100,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  const tileCount = Math.min(totalDays, 21);
  const tiles = Array.from({ length: tileCount }, (_, i) => ({
    day: i + 1,
    done: i < streakDays,
    isToday: i === daysSinceStart,
  }));

  const gradColors: [string, string] = isComplete
    ? ['#FFB30030', '#FFB30008']
    : [`${colors.primary}20`, `${colors.primary}06`];
  const borderColor = isComplete ? '#FFB30050' : `${colors.primary}35`;
  const accentColor = isComplete ? '#FFB300' : colors.primary;

  return (
    <View style={[styles.cardWrap, { backgroundColor: colors.card, borderColor }]}>
      <LinearGradient
        colors={gradColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.cardInner}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
          <Ionicons
            name={isComplete ? 'trophy' : 'flame'}
            size={22}
            color={accentColor}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>No-spend challenge</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{totalDays}-day streak</Text>
        </View>
        {isComplete ? (
          <View style={[styles.badge, { backgroundColor: '#FFB30025', borderColor: '#FFB30060' }]}>
            <Ionicons name="checkmark-circle" size={12} color="#FFB300" />
            <Text style={[styles.badgeText, { color: '#FFB300' }]}>Done!</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{daysRemaining}d left</Text>
          </View>
        )}
      </View>

      {/* Big streak number */}
      <View style={styles.streakRow}>
        <Text style={[styles.streakNum, { color: accentColor }]}>{streakDays}</Text>
        <View style={styles.streakMeta}>
          <Text style={[styles.streakLabel, { color: colors.textPrimary }]}>
            day{streakDays !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.streakSub, { color: colors.textSecondary }]}>
            of {totalDays} target
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.track, { backgroundColor: `${accentColor}20` }]}>
        <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: accentColor }]} />
      </View>
      <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
        {Math.round(progress * 100)}% complete
      </Text>

      {/* Day tiles */}
      {tiles.length > 0 && (
        <View style={styles.tilesWrap}>
          {tiles.map((tile) => (
            <View
              key={tile.day}
              style={[
                styles.tile,
                { backgroundColor: tile.done ? accentColor : `${accentColor}15` },
                tile.isToday && !tile.done && { borderWidth: 1.5, borderColor: accentColor },
              ]}
            >
              {tile.done ? (
                <Ionicons name="checkmark" size={9} color="#fff" />
              ) : tile.isToday ? (
                <Ionicons name="ellipse" size={5} color={accentColor} />
              ) : null}
            </View>
          ))}
        </View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  cardInner: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerInfo: { flex: 1 },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  streakNum: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 56,
  },
  streakMeta: { gap: 2 },
  streakLabel: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  streakSub: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  track: {
    height: 8,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  progressLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  tilesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tile: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
