import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useCurrency } from '../../context/CurrencyContext';
import { CategoryTotal } from '../../utils/calculations';
import { getCategoryInfo } from '../../constants/categories';

const RANK_COLORS: Record<number, string> = {
  1: '#FFB300',
  2: '#9E9E9E',
  3: '#CD7F32',
};

interface CategoryRankBarsProps {
  data: CategoryTotal[];
  periodLabel: string;
}

export function CategoryRankBars({ data, periodLabel }: CategoryRankBarsProps) {
  const { colors } = useTheme();
  const { formatCurrency } = useCurrency();

  const rows = data.slice(0, 8);

  // One animated value per visible row
  const barAnims = useRef<Animated.Value[]>([]);
  if (barAnims.current.length !== rows.length) {
    barAnims.current = rows.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    barAnims.current.forEach((a) => a.setValue(0));
    const animations = barAnims.current.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: i * 60,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      })
    );
    Animated.parallel(animations).start();
  }, [data]);

  if (data.length === 0) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>Spending by category</Text>
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
          Ranked bars · {periodLabel}
        </Text>
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No expenses this period</Text>
        </View>
      </View>
    );
  }

  const maxAmount = data[0].amount;
  const expenseTotal = data.reduce((s, c) => s + c.amount, 0);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Spending by category</Text>
      <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
        Easier to scan on a small screen than a pie alone · {periodLabel}
      </Text>

      {rows.map((row, index) => {
        const rank = index + 1;
        const info = getCategoryInfo(row.category);
        const barPct = maxAmount > 0 ? Math.max(4, (row.amount / maxAmount) * 100) : 0;
        const sharePct = expenseTotal > 0 ? Math.round((row.amount / expenseTotal) * 100) : 0;
        const catColor =
          (colors.categories as Record<string, string>)[row.category] ?? info.color;
        const rankColor = RANK_COLORS[rank] ?? `${colors.primary}80`;
        const anim = barAnims.current[index];

        const animatedWidth = anim
          ? anim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${barPct}%`],
            })
          : `${barPct}%`;

        return (
          <View key={row.category} style={styles.row}>
            <View style={styles.rowTop}>
              {/* Rank pill */}
              <View style={[styles.rankPill, { backgroundColor: `${rankColor}33` }]}>
                <Text style={[styles.rankText, { color: rankColor }]}>{rank}</Text>
              </View>

              {/* Category icon badge */}
              <View style={[styles.iconBadge, { backgroundColor: `${catColor}22` }]}>
                <Ionicons
                  name={info.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={catColor}
                />
              </View>

              {/* Label + meta */}
              <View style={styles.labelBlock}>
                <Text style={[styles.catName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {info.label}
                </Text>
                <Text style={[styles.meta, { color: colors.textTertiary }]}>
                  {row.count} txn{row.count !== 1 ? 's' : ''} · {sharePct}% of spend
                </Text>
              </View>

              {/* Amount */}
              <Text style={[styles.amount, { color: colors.textPrimary }]}>
                {formatCurrency(row.amount)}
              </Text>
            </View>

            {/* Animated bar */}
            <View style={[styles.track, { backgroundColor: colors.divider }]}>
              <Animated.View
                style={[
                  styles.fill,
                  { width: animatedWidth, backgroundColor: catColor },
                ]}
              />
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
    lineHeight: 17,
    marginBottom: SPACING.lg,
  },
  row: {
    marginBottom: SPACING.md,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 6,
  },
  rankPill: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  labelBlock: {
    flex: 1,
    minWidth: 0,
  },
  catName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  meta: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  amount: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    flexShrink: 0,
  },
  track: {
    height: 6,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  empty: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
});
