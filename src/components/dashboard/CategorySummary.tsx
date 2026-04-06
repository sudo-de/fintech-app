import React, { useRef, useEffect } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SPACING } from '../../constants/colors';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';

const RANK_COLORS = ['#FFB300', '#9898B0', '#CD7F32'];
const RANK_LABELS = ['1st', '2nd', '3rd', '4th', '5th'];

const CATEGORY_ICONS: Record<string, string> = {
  food: 'restaurant-outline',
  transport: 'car-outline',
  shopping: 'bag-outline',
  entertainment: 'game-controller-outline',
  health: 'medical-outline',
  utilities: 'flash-outline',
  housing: 'home-outline',
  education: 'school-outline',
  travel: 'airplane-outline',
  personal: 'person-outline',
  salary: 'briefcase-outline',
  freelance: 'laptop-outline',
  investment: 'trending-up-outline',
  gift: 'gift-outline',
  other: 'ellipsis-horizontal-circle-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF6B6B',
  transport: '#4ECDC4',
  shopping: '#45B7D1',
  entertainment: '#FFA07A',
  health: '#98D8C8',
  utilities: '#FFD93D',
  housing: '#C3A6FF',
  education: '#6BCF7F',
  travel: '#FF9FF3',
  personal: '#54A0FF',
  salary: '#5FF3B3',
  freelance: '#48DBFB',
  investment: '#FFEAA7',
  gift: '#FD79A8',
  other: '#9898B0',
};

export interface CategoryItem {
  category: string;
  amount: number;
  percentage: number;
}

interface CategorySummaryProps {
  items: CategoryItem[];
  title?: string;
}

export function CategorySummary({ items, title = 'Category Breakdown' }: CategorySummaryProps) {
  const { formatAmount } = useCurrency();
  const { colors } = useTheme();

  const barAnims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    barAnims.forEach((a) => a.setValue(0));
    items.slice(0, 5).forEach((item, i) => {
      Animated.timing(barAnims[i], {
        toValue: Math.min(item.percentage, 100),
        duration: 650,
        delay: i * 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  }, [items]);

  if (items.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <View style={styles.emptyBox}>
          <Ionicons name="pie-chart-outline" size={32} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No spending data this month</Text>
        </View>
      </View>
    );
  }

  const topItems = items.slice(0, 5);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.countBadgeText, { color: colors.textTertiary }]}>{topItems.length} categories</Text>
        </View>
      </View>

      {topItems.map((item, i) => {
        const color = CATEGORY_COLORS[item.category] ?? colors.textTertiary;
        const icon  = CATEGORY_ICONS[item.category] ?? 'ellipsis-horizontal-circle-outline';
        const rank  = RANK_COLORS[i] ?? colors.textTertiary;
        const anim  = i < barAnims.length ? barAnims[i] : new Animated.Value(item.percentage);

        return (
          <View key={item.category} style={styles.row}>
            {/* Rank */}
            <View style={[styles.rankPill, { backgroundColor: `${rank}22`, borderColor: `${rank}44` }]}>
              <Text style={[styles.rankText, { color: rank }]}>{RANK_LABELS[i]}</Text>
            </View>

            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon as any} size={16} color={color} />
            </View>

            {/* Info */}
            <View style={styles.info}>
              <View style={styles.topRow}>
                <Text style={[styles.catName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                </Text>
                <Text style={[styles.catAmount, { color }]}>
                  {formatAmount(item.amount)}
                </Text>
              </View>

              {/* Animated progress bar */}
              <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: color,
                      width: anim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              <Text style={[styles.pct, { color: colors.textTertiary }]}>
                {Math.round(item.percentage)}% of spending
              </Text>
            </View>
          </View>
        );
      })}
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
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  countBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  rankPill: {
    width: 32,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    flexShrink: 0,
  },
  rankText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    flex: 1,
  },
  catAmount: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  barBg: {
    height: 5,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  pct: {
    fontSize: 10,
  },
  emptyBox: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
  },
});
