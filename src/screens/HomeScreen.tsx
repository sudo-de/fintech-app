import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { BalanceCard } from '../components/dashboard/BalanceCard';
import { SpendingChart } from '../components/dashboard/SpendingChart';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { EmptyState } from '../components/common/EmptyState';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/colors';
import {
  getTotalIncome,
  getTotalExpenses,
  getBalance,
  getDailyExpenses,
  getSavingsRate,
  getTopSpendingCategory,
} from '../utils/calculations';
import { getCurrentMonth } from '../utils/formatters';
import { getCategoryInfo } from '../constants/categories';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayLabels(): string[] {
  const today = new Date().getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const dayIndex = (today - 6 + i + 7) % 7;
    return WEEK_LABELS[dayIndex];
  });
}

export function HomeScreen() {
  const { state } = useApp();
  const navigation = useNavigation<NavProp>();
  const { transactions, initialBalance } = state;

  const month = getCurrentMonth();
  const balance = getBalance(transactions, initialBalance);
  const income = getTotalIncome(transactions, month);
  const expenses = getTotalExpenses(transactions, month);
  const savingsRate = getSavingsRate(transactions, month);
  const topCategory = getTopSpendingCategory(transactions, month);
  const topCategoryInfo = topCategory ? getCategoryInfo(topCategory) : null;

  const dailyExpenses = getDailyExpenses(transactions, 7);
  const dayLabels = getDayLabels();

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()} 👋</Text>
            <Text style={styles.subGreeting}>Here's your financial summary</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddTransaction', {})}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <BalanceCard balance={balance} income={income} expenses={expenses} />

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={20} color={COLORS.income} />
            <Text style={styles.statValue}>{Math.round(savingsRate)}%</Text>
            <Text style={styles.statLabel}>Savings Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons
              name={topCategoryInfo?.icon as any ?? 'stats-chart'}
              size={20}
              color={topCategoryInfo?.color ?? COLORS.primary}
            />
            <Text style={styles.statValue} numberOfLines={1}>
              {topCategoryInfo?.label ?? 'None'}
            </Text>
            <Text style={styles.statLabel}>Top Expense</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="receipt" size={20} color={COLORS.secondary} />
            <Text style={styles.statValue}>{transactions.length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
        </View>

        {/* Weekly Spending Chart */}
        <SpendingChart data={dailyExpenses} labels={dayLabels} title="Daily Spending (7 Days)" />

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              subtitle="Tap + to add your first transaction"
            />
          ) : (
            recentTransactions.map((t) => (
              <TransactionItem
                key={t.id}
                transaction={t}
                onPress={() => navigation.navigate('AddTransaction', { transaction: t })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingBottom: SPACING.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  greeting: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subGreeting: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
