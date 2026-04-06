import React, { useRef, useEffect } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING } from '../../constants/colors';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';

const BAR_MAX_H = 80;
const GRID_LINES = 3;

interface SpendingChartProps {
  data: number[];
  labels: string[];
  weekChange?: number;
  title?: string;
}

export function SpendingChart({
  data,
  labels,
  weekChange,
  title = 'Weekly Trend',
}: SpendingChartProps) {
  const { formatAmount } = useCurrency();
  const { colors } = useTheme();

  const barAnims = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0))
  ).current;

  const maxVal   = Math.max(...data, 1);
  const total    = data.reduce((s, v) => s + v, 0);
  const peakIdx  = data.indexOf(Math.max(...data));
  const hasData  = data.some((v) => v > 0);

  const changePositive = (weekChange ?? 0) <= 0;
  const changeAbs = Math.abs(Math.round(weekChange ?? 0));

  useEffect(() => {
    barAnims.forEach((a) => a.setValue(0));
    data.forEach((val, i) => {
      if (i >= barAnims.length) return;
      const h = val > 0 ? Math.max((val / maxVal) * BAR_MAX_H, 5) : 2;
      Animated.timing(barAnims[i], {
        toValue: h,
        duration: 580,
        delay: i * 55,
        easing: Easing.out(Easing.back(1.15)),
        useNativeDriver: false,
      }).start();
    });
  }, [data]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {hasData && (
            <Text style={[styles.totalLabel, { color: colors.textTertiary }]}>
              {formatAmount(total)} this week
            </Text>
          )}
        </View>
        {weekChange !== undefined && (
          <View style={[
            styles.changeBadge,
            { backgroundColor: changePositive ? `${colors.income}18` : `${colors.expense}18` },
          ]}>
            <Ionicons
              name={changePositive ? 'trending-down' : 'trending-up'}
              size={13}
              color={changePositive ? colors.income : colors.expense}
            />
            <Text style={[
              styles.changeBadgeText,
              { color: changePositive ? colors.income : colors.expense },
            ]}>
              {changeAbs}%
            </Text>
          </View>
        )}
      </View>

      {!hasData ? (
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={36} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No data this week</Text>
        </View>
      ) : (
        <View style={styles.chartWrap}>
          {/* Grid lines */}
          <View style={styles.gridLines} pointerEvents="none">
            {Array.from({ length: GRID_LINES }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  {
                    bottom: ((i + 1) / (GRID_LINES + 1)) * BAR_MAX_H,
                    backgroundColor: `${colors.border}80`,
                  },
                ]}
              />
            ))}
          </View>

          {/* Bars */}
          <View style={styles.barsRow}>
            {data.map((val, i) => {
              const isToday = i === data.length - 1;
              const isPeak  = i === peakIdx && val > 0;
              const anim    = i < barAnims.length ? barAnims[i] : new Animated.Value(2);

              return (
                <View key={i} style={styles.barCol}>
                  {/* Peak / today label */}
                  <Text style={[
                    styles.peakLabel,
                    { color: isToday ? colors.primary : colors.textTertiary },
                    !(isPeak || isToday) && styles.invisible,
                  ]}>
                    {val > 0 ? formatAmount(val) : ''}
                  </Text>

                  {/* Bar */}
                  <View style={[styles.barTrack, { height: BAR_MAX_H }]}>
                    <Animated.View style={[styles.barInner, { height: anim, borderRadius: 6 }]}>
                      <LinearGradient
                        colors={
                          isToday
                            ? [colors.primary, colors.primaryDark]
                            : isPeak
                            ? [`${colors.secondary}CC`, `${colors.secondary}55`]
                            : [`${colors.primary}60`, `${colors.primary}22`]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                  </View>

                  {/* Day label */}
                  <Text style={[
                    styles.dayLabel,
                    isToday
                      ? { color: colors.primary, fontWeight: '700' }
                      : { color: colors.textTertiary },
                  ]}>
                    {labels[i]}
                  </Text>
                </View>
              );
            })}
          </View>
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
    padding: SPACING.xl,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: FONTS.sizes.xs,
    marginTop: 3,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  changeBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  chartWrap: {
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 24,
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  peakLabel: {
    fontSize: 9,
    fontWeight: '600',
    height: 13,
    textAlign: 'center',
  },
  invisible: {
    opacity: 0,
  },
  barTrack: {
    width: '88%',
    justifyContent: 'flex-end',
    borderRadius: 6,
  },
  barInner: {
    width: '100%',
    overflow: 'hidden',
  },
  dayLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  emptyChart: {
    height: BAR_MAX_H + 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
  },
});
