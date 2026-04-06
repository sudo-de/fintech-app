import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { MonthlyPoint } from '../../utils/calculations';

const BAR_HEIGHT = 120;
const BAR_WIDTH  = 14;
const BAR_GAP    = 4;

interface MonthlyTrendProps {
  data: MonthlyPoint[];
  /** e.g. "March 2024" — clarifies which month the trend ends on */
  endingLabel?: string;
}

export function MonthlyTrend({ data, endingLabel }: MonthlyTrendProps) {
  const { colors } = useTheme();
  const hasData = data.some((p) => p.income > 0 || p.expenses > 0);

  const barAnims = useRef<Animated.Value[]>([]);
  if (barAnims.current.length !== data.length) {
    barAnims.current = data.map(() => new Animated.Value(0));
  }

  const maxVal = Math.max(...data.map((p) => Math.max(p.income, p.expenses)), 1);

  useEffect(() => {
    barAnims.current.forEach((a) => a.setValue(0));
    Animated.parallel(
      barAnims.current.map((anim, i) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 550,
          delay: i * 60,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        })
      )
    ).start();
  }, [data]);

  const peakIndex = data.reduce(
    (best, p, i) => (p.expenses > (data[best]?.expenses ?? 0) ? i : best),
    0
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Monthly trend</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {data.length} months ending {endingLabel ?? 'now'} · income vs expenses
          </Text>
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Expense</Text>
          </View>
        </View>
      </View>

      {hasData ? (
        /* Chart — fixed height, overflow hidden, no absolute outside bounds */
        <View style={styles.chartWrap}>
          {/* Grid lines inside fixed-height container */}
          <View style={[styles.chartInner, { height: BAR_HEIGHT }]}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <View
                  key={pct}
                  style={[
                    styles.gridLine,
                    { backgroundColor: colors.border, top: BAR_HEIGHT * (1 - pct) },
                  ]}
                />
              ))}
            </View>

            {/* Bar groups */}
            {data.map((point, i) => {
              const anim = barAnims.current[i];
              const incH  = (point.income   / maxVal) * BAR_HEIGHT;
              const expH  = (point.expenses / maxVal) * BAR_HEIGHT;
              const isPeak = i === peakIndex && point.expenses > 0;

              return (
                <View key={point.yearMonth} style={styles.group}>
                  {/* Income bar */}
                  <View style={[styles.track, { backgroundColor: `${colors.income}15` }]}>
                    <Animated.View style={[
                      styles.bar,
                      { backgroundColor: `${colors.income}CC`,
                        height: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(incH, 2)] }) },
                    ]} />
                  </View>
                  {/* Expense bar */}
                  <View style={[styles.track, { backgroundColor: `${colors.expense}15` }]}>
                    <Animated.View style={[
                      styles.bar,
                      { backgroundColor: isPeak ? colors.expense : `${colors.expense}BB`,
                        height: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(expH, 2)] }) },
                    ]} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Month labels row — outside the chart so they don't overflow it */}
          <View style={[styles.labelsRow, { borderTopColor: colors.border }]}>
            {data.map((point, i) => {
              const isPeak = i === peakIndex && point.expenses > 0;
              return (
                <View key={point.yearMonth} style={styles.labelGroup}>
                  <Text style={[
                    styles.monthLabel,
                    { color: isPeak ? colors.expense : colors.textTertiary },
                  ]}>
                    {point.month}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            Add transactions to see your trend
          </Text>
        </View>
      )}
    </View>
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
  legend: { gap: 5, alignItems: 'flex-end' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },

  chartWrap: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  chartInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  group: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: BAR_GAP,
  },
  track: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: RADIUS.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: RADIUS.sm,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
  },
  labelGroup: {
    flex: 1,
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  empty: {
    height: BAR_HEIGHT + SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: { fontSize: FONTS.sizes.sm, fontWeight: '500', textAlign: 'center' },
});
