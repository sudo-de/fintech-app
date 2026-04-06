/**
 * SavingsStreakCard — streak-based saving habit system.
 *
 * Tracks consecutive months where net savings > 0 and rewards
 * users with escalating levels (Spark → Flame → Blaze → Inferno)
 * plus four milestone badges. The streak turns saving into a habit
 * loop: build the streak, hit milestones, keep the flame alive.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SavingsStreak, StreakLevel } from '../../utils/calculations';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  streak: SavingsStreak;
}

// ── level palette ──────────────────────────────────────────────────────────
const LEVEL_COLORS: Record<StreakLevel, { primary: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  dormant: { primary: '#6B7280', bg: '#6B728018', icon: 'moon-outline'     },
  spark:   { primary: '#F59E0B', bg: '#F59E0B18', icon: 'flash-outline'    },
  flame:   { primary: '#F97316', bg: '#F9731618', icon: 'flame-outline'    },
  blaze:   { primary: '#EF4444', bg: '#EF444418', icon: 'flame'            },
  inferno: { primary: '#DC2626', bg: '#DC262618', icon: 'nuclear-outline'  },
};

// Short 3-char month label e.g. "Jan"
function shortMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

export function SavingsStreakCard({ streak }: Props) {
  const { colors } = useTheme();
  const { count, level, levelLabel, monthHistory, milestones, nextMilestone } = streak;
  const palette = LEVEL_COLORS[level];

  // Animate progress bar toward next milestone
  const progressTarget = nextMilestone
    ? Math.min((count / nextMilestone) * 100, 100)
    : 100;
  const barAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: progressTarget,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (count > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [count, progressTarget]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  const motivationalLine = () => {
    if (count === 0) return "Save more than you spend this month to start your streak.";
    if (count === 1) return "Great start! Keep saving next month to build momentum.";
    if (nextMilestone) return `${nextMilestone - count} more month${nextMilestone - count !== 1 ? 's' : ''} to unlock "${milestones.find(m => m.count === nextMilestone)?.label}".`;
    return "You've unlocked every milestone. You're a saving legend!";
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: level === 'dormant' ? colors.border : `${palette.primary}35` }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.iconWrap, { backgroundColor: palette.bg }, count > 0 && { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name={palette.icon} size={22} color={palette.primary} />
          </Animated.View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Saving Streak</Text>
            <Text style={[styles.cardSub, { color: colors.textTertiary }]}>Consecutive months saved</Text>
          </View>
        </View>
        {/* Level badge */}
        <View style={[styles.levelBadge, { backgroundColor: palette.bg, borderColor: `${palette.primary}50` }]}>
          <Text style={[styles.levelText, { color: palette.primary }]}>{levelLabel.toUpperCase()}</Text>
        </View>
      </View>

      {/* Big streak number */}
      <LinearGradient
        colors={[`${palette.primary}14`, `${palette.primary}04`]}
        style={styles.streakHero}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.streakNum, { color: palette.primary }]}>{count}</Text>
        <View>
          <Text style={[styles.streakLabel, { color: colors.textPrimary }]}>
            month{count !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.streakSub, { color: colors.textTertiary }]}>in a row</Text>
        </View>
      </LinearGradient>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Progress to {milestones.find(m => m.count === nextMilestone)?.label}
            </Text>
            <Text style={[styles.progressLabel, { color: palette.primary, fontWeight: '800' }]}>
              {count}/{nextMilestone}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.divider }]}>
            <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: palette.primary }]} />
          </View>
        </View>
      )}

      {/* Month history dots */}
      <View style={styles.historyRow}>
        {monthHistory.map((pt) => {
          const dot = !pt.hasData
            ? colors.divider
            : pt.saved
              ? colors.income
              : colors.expense;
          return (
            <View key={pt.month} style={styles.historyCol}>
              <View style={[styles.dot, { backgroundColor: dot }]}>
                {pt.hasData && pt.saved && (
                  <Ionicons name="checkmark" size={8} color="#fff" />
                )}
                {pt.hasData && !pt.saved && (
                  <Ionicons name="close" size={8} color="#fff" />
                )}
              </View>
              <Text style={[styles.dotLabel, { color: colors.textTertiary }]}>{shortMonth(pt.month)}</Text>
            </View>
          );
        })}
      </View>

      {/* Milestone badges */}
      <View style={styles.milestonesRow}>
        {milestones.map((ms) => (
          <View
            key={ms.count}
            style={[
              styles.milestone,
              {
                backgroundColor: ms.unlocked ? `${palette.primary}14` : colors.surface,
                borderColor: ms.unlocked ? `${palette.primary}40` : colors.border,
              },
            ]}
          >
            <Ionicons
              name={ms.unlocked ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={ms.unlocked ? palette.primary : colors.textTertiary}
            />
            <Text style={[styles.milestoneCount, { color: ms.unlocked ? palette.primary : colors.textTertiary }]}>
              {ms.count}mo
            </Text>
            <Text
              style={[styles.milestoneLabel, { color: ms.unlocked ? colors.textSecondary : colors.textTertiary }]}
              numberOfLines={1}
            >
              {ms.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Motivational line */}
      <View style={[styles.tip, { backgroundColor: `${palette.primary}10`, borderColor: `${palette.primary}25` }]}>
        <Ionicons name="bulb-outline" size={14} color={palette.primary} />
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>{motivationalLine()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  levelBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  streakHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  streakNum: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 60,
  },
  streakLabel: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  streakSub: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  progressSection: {
    marginBottom: SPACING.lg,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  progressLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  track: {
    height: 8,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  historyCol: {
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  milestonesRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  milestone: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  milestoneCount: {
    fontSize: 11,
    fontWeight: '800',
  },
  milestoneLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  tipText: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    lineHeight: 17,
  },
});
