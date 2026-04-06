import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { SyncErrorBanner } from '../components/common/SyncErrorBanner';
import { useSyncTransactions } from '../hooks/useSyncTransactions';
import { CategoryPieChart } from '../components/insights/CategoryPieChart';
import { WeeklyBar } from '../components/insights/WeeklyBar';
import { MonthlyTrend } from '../components/insights/MonthlyTrend';
import { CategoryRankBars } from '../components/insights/CategoryRankBars';
import { TransactionMixCard } from '../components/insights/TransactionMixCard';
import { FONTS, SPACING, RADIUS } from '../constants/colors';
import {
  getCategoryTotals,
  getWeeklyComparison,
  getMonthlyTrend,
  getSavingsRate,
  getTopSpendingCategory,
  getTotalExpenses,
  getTotalIncome,
  getTransactionTypeMix,
} from '../utils/calculations';
import { formatMonth, getCurrentMonth } from '../utils/formatters';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { useConvertedTransactions } from '../hooks/useConvertedTransactions';
import { getCategoryInfo } from '../constants/categories';

type TipTone = 'income' | 'expense' | 'warning' | 'secondary' | 'primary';

interface InsightTip {
  icon: keyof typeof Ionicons.glyphMap;
  tone: TipTone;
  title: string;
  body: string;
}

function shiftMonth(yearMonth: string, delta: -1 | 1): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function InsightsScreen() {
  const { state, setTransactions } = useApp();
  const { transactions } = state;
  const { formatCurrency } = useCurrency();
  const { colors } = useTheme();
  const { token } = useAuth();

  // Convert all transaction amounts to display currency before calculating
  const convertedTransactions = useConvertedTransactions(transactions);

  const [month, setMonth] = useState(getCurrentMonth());

  const monthLabel = formatMonth(month);
  const isCurrentMonth = month === getCurrentMonth();

  const { isSyncing, isRefreshing, syncError, sync, clearError } = useSyncTransactions({
    token,
    setTransactions,
  });

  const categoryTotals = useMemo(
    () => getCategoryTotals(convertedTransactions, 'expense', month),
    [convertedTransactions, month]
  );
  const weeklyData = useMemo(
    () => getWeeklyComparison(convertedTransactions, month),
    [convertedTransactions, month]
  );
  const monthlyTrend = useMemo(
    () => getMonthlyTrend(convertedTransactions, 6, month),
    [convertedTransactions, month]
  );
  const savingsRate = useMemo(() => getSavingsRate(convertedTransactions, month), [convertedTransactions, month]);
  const topCategory = useMemo(() => getTopSpendingCategory(convertedTransactions, month), [convertedTransactions, month]);
  const totalExpenses = useMemo(() => getTotalExpenses(convertedTransactions, month), [convertedTransactions, month]);
  const totalIncome = useMemo(() => getTotalIncome(convertedTransactions, month), [convertedTransactions, month]);
  const typeMix = useMemo(() => getTransactionTypeMix(convertedTransactions, month), [convertedTransactions, month]);

  const topCategoryInfo = topCategory ? getCategoryInfo(topCategory) : null;
  const topCategoryTotal = categoryTotals.find((c) => c.category === topCategory);

  const toneColor = (tone: TipTone) => {
    switch (tone) {
      case 'income':
        return colors.income;
      case 'expense':
        return colors.expense;
      case 'warning':
        return colors.warning;
      case 'secondary':
        return colors.secondary;
      default:
        return colors.primary;
    }
  };

  const tips = useMemo<InsightTip[]>(() => {
    const result: InsightTip[] = [];

    if (savingsRate >= 20) {
      result.push({
        icon: 'trophy',
        tone: 'income',
        title: 'Great savings rate',
        body: `You're saving ${Math.round(savingsRate)}% of income this month. Many planners aim for 20% or more.`,
      });
    } else if (savingsRate > 0) {
      result.push({
        icon: 'trending-up',
        tone: 'warning',
        title: 'Room to save more',
        body: `Savings rate is ${Math.round(savingsRate)}%. Trimming discretionary spend is the fastest lever.`,
      });
    } else if (totalIncome > 0) {
      result.push({
        icon: 'warning',
        tone: 'expense',
        title: 'Spending exceeds income',
        body: 'Expenses are higher than income this month. Check category bars for the biggest drivers.',
      });
    }

    if (weeklyData.change < -10) {
      result.push({
        icon: 'arrow-down-circle',
        tone: 'income',
        title: 'Weekly spending down',
        body: `About ${Math.abs(Math.round(weeklyData.change))}% less this week than last week.`,
      });
    } else if (weeklyData.change > 30) {
      result.push({
        icon: 'alert-circle',
        tone: 'expense',
        title: 'Weekly spending up',
        body: `Spending is up ${Math.round(weeklyData.change)}% vs last week — worth a quick review.`,
      });
    }

    if (topCategoryInfo && topCategoryTotal && totalExpenses > 0) {
      const pct = Math.round((topCategoryTotal.amount / totalExpenses) * 100);
      if (pct > 40) {
        result.push({
          icon: 'pie-chart',
          tone: 'warning',
          title: `${topCategoryInfo.label} leads spending`,
          body: `${pct}% of expenses are in ${topCategoryInfo.label}. A small cap there goes a long way.`,
        });
      }
    }

    if (result.length === 0) {
      result.push({
        icon: 'bulb',
        tone: 'secondary',
        title: 'Keep logging',
        body: 'More transactions mean sharper weekly and monthly patterns here.',
      });
    }

    return result;
  }, [savingsRate, weeklyData, topCategoryInfo, topCategoryTotal, totalExpenses, totalIncome]);

  const savingsBarColor =
    savingsRate >= 20 ? colors.income : savingsRate > 0 ? colors.warning : colors.expense;

  const topCatThemeColor = topCategory
    ? (colors.categories as Record<string, string>)[topCategory] ?? topCategoryInfo?.color
    : undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {isSyncing && <LoadingOverlay message="Syncing transactions…" />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => sync({ refresh: true })}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header with month navigation */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Insights</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: `${colors.primary}18` }]}
              onPress={() => setMonth((m) => shiftMonth(m, -1))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={16} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>{monthLabel}</Text>

            <TouchableOpacity
              style={[
                styles.navBtn,
                { backgroundColor: `${colors.primary}18` },
                isCurrentMonth && { opacity: 0.25 },
              ]}
              onPress={() => { if (!isCurrentMonth) setMonth((m) => shiftMonth(m, 1)); }}
              disabled={isCurrentMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {syncError && (
          <SyncErrorBanner
            message={syncError}
            onRetry={() => sync({ refresh: true })}
            onDismiss={clearError}
          />
        )}

        <View style={styles.metricsRow}>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {Math.round(savingsRate)}%
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Savings rate</Text>
            <View style={[styles.metricBar, { backgroundColor: colors.divider }]}>
              <View
                style={[
                  styles.metricBarFill,
                  {
                    width: `${Math.min(savingsRate, 100)}%`,
                    backgroundColor: savingsBarColor,
                  },
                ]}
              />
            </View>
          </View>

          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {categoryTotals.length}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Spend categories</Text>
            <View style={styles.catDotsRow}>
              {categoryTotals.slice(0, 5).map((c) => {
                const info = getCategoryInfo(c.category);
                const dot =
                  (colors.categories as Record<string, string>)[c.category] ?? info.color;
                return <View key={c.category} style={[styles.catDot, { backgroundColor: dot }]} />;
              })}
            </View>
          </View>

          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {transactions.length}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>All-time txns</Text>
            <Text style={[styles.metricSub, { color: colors.textTertiary }]}>Log for richer mix</Text>
          </View>
        </View>

        {topCategoryInfo && topCategoryTotal && (
          <View
            style={[
              styles.topCatCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.topCatLeft}>
              <Text style={[styles.topCatLabel, { color: colors.textSecondary }]}>
                Highest spending category
              </Text>
              <Text style={[styles.topCatName, { color: colors.textPrimary }]}>{topCategoryInfo.label}</Text>
              <Text style={[styles.topCatAmount, { color: colors.expense }]}>
                {formatCurrency(topCategoryTotal.amount)}
              </Text>
              <Text style={[styles.topCatCount, { color: colors.textSecondary }]}>
                {topCategoryTotal.count} transaction{topCategoryTotal.count !== 1 ? 's' : ''}
              </Text>
            </View>
            <View
              style={[
                styles.topCatIcon,
                { backgroundColor: `${topCatThemeColor ?? topCategoryInfo.color}22` },
              ]}
            >
              <Ionicons
                name={topCategoryInfo.icon as keyof typeof Ionicons.glyphMap}
                size={36}
                color={topCatThemeColor ?? topCategoryInfo.color}
              />
            </View>
          </View>
        )}

        <WeeklyBar data={weeklyData} periodLabel={monthLabel} isCurrentMonth={isCurrentMonth} />
        <MonthlyTrend data={monthlyTrend} endingLabel={monthLabel} />
        <CategoryRankBars data={categoryTotals} periodLabel={monthLabel} />
        <CategoryPieChart data={categoryTotals} periodLabel={monthLabel} />
        <TransactionMixCard mix={typeMix} periodLabel={monthLabel} />

        <View style={styles.tipsSection}>
          <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>Smart tips</Text>
          {tips.map((tip, index) => {
            const tc = toneColor(tip.tone);
            return (
              <View
                key={index}
                style={[
                  styles.tipCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[styles.tipIcon, { backgroundColor: `${tc}22` }]}>
                  <Ionicons name={tip.icon} size={20} color={tc} />
                </View>
                <View style={styles.tipText}>
                  <Text style={[styles.tipTitle, { color: colors.textPrimary }]}>{tip.title}</Text>
                  <Text style={[styles.tipBody, { color: colors.textSecondary }]}>{tip.body}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: SPACING.xxxl },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  metricCard: {
    flex: 1,
    padding: SPACING.md,
    gap: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  metricValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  metricSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  metricBar: {
    height: 4,
    borderRadius: RADIUS.full,
    marginTop: SPACING.xs,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  catDotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: SPACING.xs,
    flexWrap: 'wrap',
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topCatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  topCatLeft: { flex: 1 },
  topCatLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
  },
  topCatName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
  },
  topCatAmount: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    marginTop: 2,
  },
  topCatCount: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  topCatIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsSection: {
    paddingHorizontal: SPACING.xl,
  },
  tipsTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipText: { flex: 1 },
  tipTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipBody: {
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    fontWeight: '500',
  },
});
