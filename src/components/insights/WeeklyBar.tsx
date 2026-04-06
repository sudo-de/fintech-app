import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { WeeklyData } from '../../utils/calculations';

const BAR_HEIGHT = 140;
const BAR_WIDTH  = 72;

interface WeeklyBarProps {
  data: WeeklyData;
  /** e.g. "March 2024" — shown when viewing a past month */
  periodLabel?: string;
  isCurrentMonth?: boolean;
}

export function WeeklyBar({ data, periodLabel, isCurrentMonth = true }: WeeklyBarProps) {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();
  const { thisWeek, lastWeek, change } = data;
  const isDown = change <= 0;
  const changeAbs = Math.abs(Math.round(change));

  const lastAnim = useRef(new Animated.Value(0)).current;
  const thisAnim = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const skipCardFadeOnce = useRef(true);

  const maxVal = Math.max(lastWeek, thisWeek, 1);

  // Card fade (same feel as Modal animationType="fade") when month / weekly totals change
  useEffect(() => {
    if (skipCardFadeOnce.current) {
      skipCardFadeOnce.current = false;
      return;
    }
    cardOpacity.setValue(0);
    Animated.timing(cardOpacity, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [lastWeek, thisWeek, periodLabel, isCurrentMonth, cardOpacity]);

  useEffect(() => {
    const max = Math.max(lastWeek, thisWeek, 1);
    lastAnim.setValue(0);
    thisAnim.setValue(0);
    Animated.parallel([
      Animated.timing(lastAnim, {
        toValue: (lastWeek / max) * BAR_HEIGHT,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(thisAnim, {
        toValue: (thisWeek / max) * BAR_HEIGHT,
        duration: 750,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [lastWeek, thisWeek, lastAnim, thisAnim]);

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: cardOpacity }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>This week vs last week</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {isCurrentMonth
              ? 'Last 7 days vs the 7 days before (expenses)'
              : `Last 7 days of ${periodLabel ?? 'that month'} vs the prior 7 days`}
          </Text>
        </View>
        <View style={[styles.badge, {
          backgroundColor: isDown ? `${colors.income}18` : `${colors.expense}18`,
        }]}>
          <Ionicons
            name={isDown ? 'trending-down' : 'trending-up'}
            size={13}
            color={isDown ? colors.income : colors.expense}
          />
          <Text style={[styles.badgeText, { color: isDown ? colors.income : colors.expense }]}>
            {changeAbs === 0 ? 'flat' : `${changeAbs}%`}
          </Text>
        </View>
      </View>

      {/* Chart — fixed height container, no absolute children */}
      <View style={[styles.chartRow, { height: BAR_HEIGHT }]}>
        {/* Grid lines (flex column, evenly spaced) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[1, 0.75, 0.5, 0.25].map((pct) => (
            <View
              key={pct}
              style={[
                styles.gridLine,
                { backgroundColor: colors.border, top: BAR_HEIGHT * (1 - pct) },
              ]}
            />
          ))}
        </View>

        {/* Bars */}
        <View style={styles.barGroup}>
          <View style={[styles.barTrack, { backgroundColor: `${colors.primary}12` }]}>
            <Animated.View style={[styles.bar, { height: lastAnim, backgroundColor: `${colors.primary}90` }]} />
          </View>
        </View>
        <View style={styles.barGroup}>
          <View style={[styles.barTrack, { backgroundColor: `${colors.expense}12` }]}>
            <Animated.View style={[styles.bar, { height: thisAnim, backgroundColor: colors.expense }]} />
          </View>
        </View>
      </View>

      {/* Labels row */}
      <View style={[styles.labelsRow, { borderTopColor: colors.border }]}>
        <View style={styles.labelGroup}>
          <Text style={[styles.labelTitle, { color: colors.textTertiary }]}>Last week</Text>
          <Text style={[styles.labelValue, { color: colors.textPrimary }]}>{formatCurrency(lastWeek)}</Text>
        </View>
        <View style={[styles.labelGroup, styles.labelRight]}>
          <Text style={[styles.labelTitle, { color: colors.textTertiary }]}>This week</Text>
          <Text style={[styles.labelValue, { color: colors.expense }]}>{formatCurrency(thisWeek)}</Text>
        </View>
      </View>

      {/* Tip */}
      {isDown && thisWeek < lastWeek && lastWeek > 0 && (
        <View style={[styles.tip, { backgroundColor: `${colors.income}12`, borderTopColor: colors.border }]}>
          <Ionicons name="bulb-outline" size={14} color={colors.income} />
          <Text style={[styles.tipText, { color: colors.income }]}>
            {changeAbs}% less than last week — nice momentum.
          </Text>
        </View>
      )}
      {!isDown && thisWeek > lastWeek && lastWeek > 0 && (
        <View style={[styles.tip, { backgroundColor: `${colors.expense}12`, borderTopColor: colors.border }]}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.expense} />
          <Text style={[styles.tipText, { color: colors.expense }]}>
            {changeAbs}% more than last week — worth a quick review.
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  headerLeft: { flex: 1, marginRight: SPACING.md },
  title: { fontSize: FONTS.sizes.md, fontWeight: '800', marginBottom: 3 },
  subtitle: { fontSize: FONTS.sizes.xs, fontWeight: '500' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  badgeText: { fontSize: FONTS.sizes.sm, fontWeight: '800' },

  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.xl,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  barGroup: {
    alignItems: 'center',
    width: BAR_WIDTH,
  },
  barTrack: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: RADIUS.md,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: RADIUS.md,
  },

  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: SPACING.sm,
  },
  labelGroup: {},
  labelRight: { alignItems: 'flex-end' },
  labelTitle: { fontSize: FONTS.sizes.xs, fontWeight: '600', marginBottom: 2 },
  labelValue: { fontSize: FONTS.sizes.md, fontWeight: '800' },

  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tipText: { flex: 1, fontSize: FONTS.sizes.xs, fontWeight: '600', lineHeight: 16 },
});
