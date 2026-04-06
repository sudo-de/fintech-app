import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { CategoryTotal } from '../../utils/calculations';
import { getCategoryInfo } from '../../constants/categories';

interface CategoryPieChartProps {
  data: CategoryTotal[];
  periodLabel?: string;
}

export function CategoryPieChart({ data, periodLabel }: CategoryPieChartProps) {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();

  const topCategories = useMemo(() => data.slice(0, 6), [data]);
  const total = useMemo(() => topCategories.reduce((s, c) => s + c.amount, 0), [topCategories]);

  // One animated opacity value for the whole bar row (simpler than per-segment stagger)
  const barOpacity = useRef(new Animated.Value(0)).current;
  // Per-segment scale anims (staggered)
  const segAnims = useRef<Animated.Value[]>([]);

  if (segAnims.current.length !== topCategories.length) {
    segAnims.current = topCategories.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    barOpacity.setValue(0);
    segAnims.current.forEach((a) => a.setValue(0));

    const segAnimations = segAnims.current.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: i * 50,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      })
    );

    Animated.parallel([
      Animated.timing(barOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      ...segAnimations,
    ]).start();
  }, [data]);

  if (data.length === 0) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>Category split</Text>
        {periodLabel ? (
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{periodLabel}</Text>
        ) : null}
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No expense data this period
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Category split</Text>
      {periodLabel ? (
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{periodLabel}</Text>
      ) : null}

      {/* Stacked proportional bar */}
      <Animated.View style={[styles.stackedBar, { opacity: barOpacity }]}>
        {topCategories.map((item, i) => {
          const catInfo = getCategoryInfo(item.category);
          const sliceColor =
            (colors.categories as Record<string, string>)[item.category] ?? catInfo.color;
          const pct = total > 0 ? (item.amount / total) * 100 : 0;
          const anim = segAnims.current[i];
          const animatedFlex = anim
            ? anim.interpolate({ inputRange: [0, 1], outputRange: [0, pct] })
            : pct;

          return (
            <Animated.View
              key={item.category}
              style={[
                styles.segment,
                {
                  flex: animatedFlex as any,
                  backgroundColor: sliceColor,
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Legend */}
      <View style={styles.legend}>
        {topCategories.map((item) => {
          const catInfo = getCategoryInfo(item.category);
          const sliceColor =
            (colors.categories as Record<string, string>)[item.category] ?? catInfo.color;
          const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;

          return (
            <View key={item.category} style={styles.legendItem}>
              <View style={[styles.legendIconWrap, { backgroundColor: `${sliceColor}22` }]}>
                <Ionicons
                  name={catInfo.icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={sliceColor}
                />
              </View>
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {catInfo.label}
              </Text>
              <Text style={[styles.legendAmount, { color: colors.textPrimary }]}>
                {formatCurrency(item.amount)}
              </Text>
              <View style={[styles.pctPill, { backgroundColor: `${sliceColor}22` }]}>
                <Text style={[styles.pctText, { color: sliceColor }]}>{pct}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  segment: {
    height: '100%',
  },
  empty: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  legend: {
    gap: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendIconWrap: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  legendLabel: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  legendAmount: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    flexShrink: 0,
  },
  pctPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    flexShrink: 0,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
