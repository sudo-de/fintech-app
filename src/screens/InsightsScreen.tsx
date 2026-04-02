import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { CategoryPieChart } from '../components/insights/CategoryPieChart';
import { WeeklyBar } from '../components/insights/WeeklyBar';
import { MonthlyTrend } from '../components/insights/MonthlyTrend';
import { FlatCard } from '../components/common/GradientCard';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/colors';
import {
  getCategoryTotals,
  getWeeklyComparison,
  getMonthlyTrend,
  getSavingsRate,
  getTopSpendingCategory,
  getTotalExpenses,
  getTotalIncome,
} from '../utils/calculations';
import { getCurrentMonth, formatCurrency } from '../utils/formatters';
import { getCategoryInfo } from '../constants/categories';

interface InsightTip {
  icon: string;
  color: string;
  title: string;
  body: string;
}

export function InsightsScreen() {
  const { state } = useApp();
  const { transactions } = state;

  const month = getCurrentMonth();

  const categoryTotals = useMemo(() => getCategoryTotals(transactions, 'expense', month), [transactions, month]);
  const weeklyData = useMemo(() => getWeeklyComparison(transactions), [transactions]);
  const monthlyTrend = useMemo(() => getMonthlyTrend(transactions, 6), [transactions]);
  const savingsRate = useMemo(() => getSavingsRate(transactions, month), [transactions, month]);
  const topCategory = useMemo(() => getTopSpendingCategory(transactions, month), [transactions, month]);
  const totalExpenses = useMemo(() => getTotalExpenses(transactions, month), [transactions, month]);
  const totalIncome = useMemo(() => getTotalIncome(transactions, month), [transactions, month]);

  const topCategoryInfo = topCategory ? getCategoryInfo(topCategory) : null;
  const topCategoryTotal = categoryTotals.find((c) => c.category === topCategory);

  // Generate smart tips
  const tips = useMemo<InsightTip[]>(() => {
    const result: InsightTip[] = [];

    if (savingsRate >= 20) {
      result.push({
        icon: 'trophy',
        color: COLORS.income,
        title: 'Great savings rate!',
        body: `You're saving ${Math.round(savingsRate)}% of your income this month. Financial experts recommend 20%+.`,
      });
    } else if (savingsRate > 0) {
      result.push({
        icon: 'trending-up',
        color: COLORS.warning,
        title: 'Room to save more',
        body: `Your savings rate is ${Math.round(savingsRate)}%. Try to increase it to 20% by reducing discretionary spending.`,
      });
    } else if (totalIncome > 0) {
      result.push({
        icon: 'warning',
        color: COLORS.expense,
        title: 'Spending exceeds income',
        body: 'Your expenses are higher than income this month. Review your biggest spending categories.',
      });
    }

    if (weeklyData.change < -10) {
      result.push({
        icon: 'arrow-down-circle',
        color: COLORS.income,
        title: 'Weekly spending down',
        body: `You spent ${Math.abs(Math.round(weeklyData.change))}% less this week than last week. Great discipline!`,
      });
    } else if (weeklyData.change > 30) {
      result.push({
        icon: 'alert-circle',
        color: COLORS.expense,
        title: 'Weekly spending spike',
        body: `Spending is up ${Math.round(weeklyData.change)}% vs last week. Check what's driving this increase.`,
      });
    }

    if (topCategoryInfo && topCategoryTotal && totalExpenses > 0) {
      const pct = Math.round((topCategoryTotal.amount / totalExpenses) * 100);
      if (pct > 40) {
        result.push({
          icon: 'pie-chart',
          color: COLORS.warning,
          title: `${topCategoryInfo.label} dominates spending`,
          body: `${pct}% of your expenses go to ${topCategoryInfo.label}. Consider setting a budget for this category.`,
        });
      }
    }

    if (result.length === 0) {
      result.push({
        icon: 'bulb',
        color: COLORS.secondary,
        title: 'Add more transactions',
        body: 'Track your daily expenses to get personalized insights and tips about your spending habits.',
      });
    }

    return result;
  }, [savingsRate, weeklyData, topCategoryInfo, topCategoryTotal, totalExpenses, totalIncome]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Your financial patterns at a glance</Text>
        </View>

        {/* Key Metrics Row */}
        <View style={styles.metricsRow}>
          <FlatCard style={styles.metricCard}>
            <Text style={styles.metricValue}>{Math.round(savingsRate)}%</Text>
            <Text style={styles.metricLabel}>Savings Rate</Text>
            <View style={[styles.metricBar, { backgroundColor: COLORS.border }]}>
              <View style={[styles.metricBarFill, {
                width: `${Math.min(savingsRate, 100)}%`,
                backgroundColor: savingsRate >= 20 ? COLORS.income : savingsRate > 0 ? COLORS.warning : COLORS.expense,
              }]} />
            </View>
          </FlatCard>

          <FlatCard style={styles.metricCard}>
            <Text style={styles.metricValue}>{categoryTotals.length}</Text>
            <Text style={styles.metricLabel}>Categories</Text>
            <View style={styles.catDotsRow}>
              {categoryTotals.slice(0, 5).map((c) => {
                const info = getCategoryInfo(c.category);
                return <View key={c.category} style={[styles.catDot, { backgroundColor: info.color }]} />;
              })}
            </View>
          </FlatCard>

          <FlatCard style={styles.metricCard}>
            <Text style={styles.metricValue}>{transactions.length}</Text>
            <Text style={styles.metricLabel}>Transactions</Text>
            <Text style={styles.metricSub}>all time</Text>
          </FlatCard>
        </View>

        {/* Top Category Highlight */}
        {topCategoryInfo && topCategoryTotal && (
          <FlatCard style={styles.topCatCard}>
            <View style={styles.topCatLeft}>
              <Text style={styles.topCatLabel}>Top Expense Category</Text>
              <Text style={styles.topCatName}>{topCategoryInfo.label}</Text>
              <Text style={styles.topCatAmount}>{formatCurrency(topCategoryTotal.amount)}</Text>
              <Text style={styles.topCatCount}>{topCategoryTotal.count} transaction{topCategoryTotal.count !== 1 ? 's' : ''}</Text>
            </View>
            <View style={[styles.topCatIcon, { backgroundColor: `${topCategoryInfo.color}20` }]}>
              <Ionicons name={topCategoryInfo.icon as any} size={36} color={topCategoryInfo.color} />
            </View>
          </FlatCard>
        )}

        {/* Charts */}
        <CategoryPieChart data={categoryTotals} />
        <WeeklyBar data={weeklyData} />
        <MonthlyTrend data={monthlyTrend} />

        {/* Smart Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Smart Tips</Text>
          {tips.map((tip, index) => (
            <FlatCard key={index} style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: `${tip.color}20` }]}>
                <Ionicons name={tip.icon as any} size={20} color={tip.color} />
              </View>
              <View style={styles.tipText}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipBody}>{tip.body}</Text>
              </View>
            </FlatCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SPACING.xxxl },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  },
  metricValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  metricSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textTertiary,
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
  },
  topCatLeft: { flex: 1 },
  topCatLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  topCatName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  topCatAmount: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.expense,
    marginTop: 2,
  },
  topCatCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  topCatIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsSection: {
    paddingHorizontal: SPACING.xl,
  },
  tipsTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
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
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  tipBody: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
