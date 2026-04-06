import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useCurrency, getCurrencyInfo, formatCurrencyWithInfo } from '../context/CurrencyContext';
import { useConvertedTransactions } from '../hooks/useConvertedTransactions';
import { useSyncTransactions } from '../hooks/useSyncTransactions';
import {
  getTotalIncome, getTotalExpenses, getBalance, getCategoryTotals, getDailyExpenses,
} from '../utils/calculations';
import { getCategoryInfo } from '../constants/categories';
import { formatShortDate, getGreeting, getInitials, getCurrentMonth } from '../utils/formatters';
import { FONTS, RADIUS, SPACING } from '../constants/colors';
import { FadeSlide } from '../components/common/FadeSlide';
import { useCountUp } from '../hooks/useCountUp';
import { useNotifications } from '../hooks/useNotifications';
import { SavingsProgress } from '../components/dashboard/SavingsProgress';
import { SpendingChart } from '../components/dashboard/SpendingChart';
import { CategorySummary } from '../components/dashboard/CategorySummary';
import { RootStackParamList } from '../navigation/RootNavigator';
import { TabParamList } from '../navigation/tabTypes';
import { CategoryId } from '../types';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


function getMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}


// ── Main screen ───────────────────────────────────────────────────────────────
export function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, token, avatarUri } = useAuth();
  const { formatCurrency, formatAmount, currency, convert } = useCurrency();
  const navigation = useNavigation<HomeNavProp>();

  // ── Local state & sync ───────────────────────────────────────────────────────
  const { state, setTransactions } = useApp();
  const rawTransactions = state.transactions;
  // All amounts converted to the current display currency
  const transactions = useConvertedTransactions(rawTransactions);

  const { isSyncing, isRefreshing, syncError, sync, clearError } = useSyncTransactions({
    token,
    setTransactions,
  });

  const [animated, setAnimated] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const { checkBudgetAlert } = useNotifications();
  const [notifVisible, setNotifVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const notifAnim = useRef(new Animated.Value(0)).current;

  // useSyncTransactions already calls sync() on focus internally.
  // Here we just reset animation/alert state and re-play entrance animations.
  useFocusEffect(
    useCallback(() => {
      setAnimated(false);
      setAlertDismissed(false);
      // Small delay keeps cards invisible for one frame so FadeSlide starts from 0
      const tid = setTimeout(() => setAnimated(true), 80);
      return () => clearTimeout(tid);
    }, [])
  );

  useEffect(() => {
    if (!notifVisible) return;
    notifAnim.setValue(0);
    Animated.spring(notifAnim, { toValue: 1, friction: 9, tension: 68, useNativeDriver: false }).start();
  }, [notifVisible]);

  const closeNotif = useCallback(() => {
    Animated.timing(notifAnim, {
      toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start(({ finished }) => { if (finished) setNotifVisible(false); });
  }, [notifAnim]);

  // ── Locally computed dashboard metrics (all in display currency) ─────────────
  const month = useMemo(() => getCurrentMonth(), []);

  const income = useMemo(
    () => getTotalIncome(transactions, month),
    [transactions, month]
  );
  const expenses = useMemo(
    () => getTotalExpenses(transactions, month),
    [transactions, month]
  );
  const netSavings = income - expenses;
  const savingsRate = income > 0 ? Math.max(0, (netSavings / income) * 100) : 0;
  const balance = useMemo(
    () => getBalance(transactions, state.initialBalance),
    [transactions, state.initialBalance]
  );
  const totalTransactions = rawTransactions.length;

  const topCategories = useMemo(
    () =>
      getCategoryTotals(transactions, 'expense', month)
        .slice(0, 5)
        .map(({ category, amount, percentage }) => ({ category: category as string, amount, percentage })),
    [transactions, month]
  );

  const weeklySpending = useMemo(() => {
    const amounts = getDailyExpenses(transactions, 7);
    return amounts.map((amount, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { date: d.toISOString().split('T')[0], amount };
    });
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    const seen = new Set<string>();
    return [...rawTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((t) => { if (seen.has(t.id)) return false; seen.add(t.id); return true; })
      .slice(0, 5);
  }, [rawTransactions]);

  // Fire budget-alert hook whenever income/expenses change
  useEffect(() => {
    if (income > 0) checkBudgetAlert((expenses / income) * 100);
  }, [income, expenses, checkBudgetAlert]);

  // ── Notifications & smart alert ──────────────────────────────────────────────
  const notifications = useMemo(() => {
    const list: { id: string; icon: keyof typeof Ionicons.glyphMap; accent: string; title: string; body: string; tag: string }[] = [];
    if (income > 0 && expenses / income > 0.85) {
      list.push({ id: 'high-spend', icon: 'warning-outline', accent: '#FF7043', title: 'High spend pace', body: `${Math.round((expenses / income) * 100)}% of income used this month.`, tag: 'Alert' });
    }
    if (income > 0 && savingsRate >= 20) {
      list.push({ id: 'good-savings', icon: 'sparkles-outline', accent: '#4CAF50', title: 'Great savings rate', body: `You are saving ${Math.round(savingsRate)}% this month.`, tag: 'Insight' });
    }
    if (totalTransactions === 0) {
      list.push({ id: 'no-txn', icon: 'receipt-outline', accent: '#7C6CF9', title: 'No transactions yet', body: 'Add your first income or expense to start tracking.', tag: 'Tip' });
    }
    if (income === 0 && totalTransactions > 0) {
      list.push({ id: 'no-income', icon: 'cash-outline', accent: '#26C6DA', title: 'No income recorded', body: 'Log your income to see your savings rate and balance.', tag: 'Tip' });
    }
    return list;
  }, [income, expenses, savingsRate, totalTransactions]);

  const smartAlert = useMemo(() => {
    if (alertDismissed) return null;
    if (income > 0 && expenses / income > 0.85) {
      return {
        icon: 'warning-outline' as const,
        accent: '#FF7043',
        title: 'High spend pace',
        body: `${Math.round((expenses / income) * 100)}% of income used this month. A lighter week ahead could help.`,
      };
    }
    if (income > 0 && savingsRate >= 20) {
      return {
        icon: 'sparkles-outline' as const,
        accent: '#4CAF50',
        title: 'Great savings rate',
        body: `You are saving ${Math.round(savingsRate)}% this month - ahead of the curve.`,
      };
    }
    return null;
  }, [alertDismissed, income, expenses, savingsRate]);

  const firstName = user?.name.split(' ')[0] ?? '';
  const initials = getInitials(user?.name?.trim() ? user.name : 'U');

  const nameBlockOpacity = scrollY.interpolate({
    inputRange: [0, 24, 48],
    outputRange: [1, 0.45, 0],
    extrapolate: 'clamp',
  });
  const nameBlockShift = scrollY.interpolate({
    inputRange: [0, 48],
    outputRange: [0, -6],
    extrapolate: 'clamp',
  });
  const nameBlockMaxH = scrollY.interpolate({
    inputRange: [0, 32, 56],
    outputRange: [64, 28, 0],
    extrapolate: 'clamp',
  });

  const openAccount = useCallback(() => {
    navigation.navigate('Account');
  }, [navigation]);

  // ── Loading (first-ever sync — no local data yet) ────────────────────────────
  if (isSyncing && rawTransactions.length === 0) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error (sync failed and nothing cached) ───────────────────────────────────
  if (syncError && rawTransactions.length === 0) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={52} color={colors.textTertiary} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Could not load data</Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>{syncError}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => sync()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => sync({ refresh: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Top chrome (no header bar): profile + animated greeting/name + notifications ── */}
        <FadeSlide delay={0} trigger={animated}>
          <View style={styles.topChrome}>
            <TouchableOpacity
              onPress={openAccount}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <View style={[styles.headerAvatar, { backgroundColor: `${colors.primary}28` }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.headerAvatarImage} />
                ) : (
                  <Text style={[styles.headerAvatarText, { color: colors.primary }]}>{initials}</Text>
                )}
              </View>
            </TouchableOpacity>
            <Animated.View
              style={[
                styles.headerTitles,
                {
                  opacity: nameBlockOpacity,
                  maxHeight: nameBlockMaxH,
                  transform: [{ translateY: nameBlockShift }],
                },
              ]}
            >
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()},</Text>
              <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                {firstName}
              </Text>
            </Animated.View>
            <TouchableOpacity
              style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setNotifVisible(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
              {notifications.length > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          </View>
        </FadeSlide>

        {/* ── Balance Card ────────────────────────────────────────────────── */}
        <FadeSlide delay={80} trigger={animated}>
          <BalanceCard
            balance={balance}
            month={getMonthLabel()}
            colors={colors}
            formatCurrency={formatCurrency}
            animated={animated}
          />
        </FadeSlide>

        {/* ── Smart Alert (data-driven from local metrics) ─────────────────── */}
        {smartAlert && (
          <FadeSlide delay={100} trigger={animated}>
            <View style={[styles.alertCard, { backgroundColor: `${smartAlert.accent}12`, borderColor: `${smartAlert.accent}35` }]}>
              <View style={[styles.alertIconWrap, { backgroundColor: `${smartAlert.accent}22` }]}>
                <Ionicons name={smartAlert.icon} size={18} color={smartAlert.accent} />
              </View>
              <View style={styles.alertBody}>
                <Text style={[styles.alertTitle, { color: smartAlert.accent }]}>{smartAlert.title}</Text>
                <Text style={[styles.alertText, { color: colors.textSecondary }]}>{smartAlert.body}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAlertDismissed(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </FadeSlide>
        )}

        {/* ── Income / Expenses ───────────────────────────────────────────── */}
        <FadeSlide delay={160} trigger={animated}>
          <IncomeExpenseRow
            income={income}
            expenses={expenses}
            colors={colors}
            formatAmount={formatAmount}
            animated={animated}
          />
        </FadeSlide>

        {/* ── Savings Overview ────────────────────────────────────────────── */}
        <FadeSlide delay={240} trigger={animated}>
          <SavingsProgress
            income={income}
            spent={expenses}
            saved={netSavings}
            savingsRate={savingsRate}
          />
        </FadeSlide>

        {/* ── Stats Row ───────────────────────────────────────────────────── */}
        <FadeSlide delay={320} trigger={animated}>
          <View style={styles.statsRow}>
            {[
              {
                icon: 'receipt-outline',
                label: 'Transactions',
                value: String(totalTransactions),
                gradient: colors.gradients.primary as [string, string],
              },
              {
                icon: 'pie-chart-outline',
                label: 'Categories',
                value: String(topCategories.length),
                gradient: ['#FFB300', '#FF6F00'] as [string, string],
              },
              {
                icon: 'trending-up-outline',
                label: 'Spend Rate',
                value: income > 0 ? `${Math.round((expenses / income) * 100)}%` : '—',
                gradient: (expenses / (income || 1) > 0.8
                  ? ['#FF5252', '#C62828']
                  : ['#4CAF50', '#2E7D32']) as [string, string],
              },
            ].map((s) => (
              <View
                key={s.label}
                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <LinearGradient colors={s.gradient} style={styles.statIconGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name={s.icon as any} size={16} color="#fff" />
                </LinearGradient>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </FadeSlide>

        {/* ── 7-Day Chart ─────────────────────────────────────────────────── */}
        <FadeSlide delay={400} trigger={animated}>
          <SpendingChart
            data={weeklySpending.map((w) => w.amount)}
            labels={weeklySpending.map((w) => DAY_SHORT[new Date(w.date + 'T12:00:00').getDay()])}
          />
        </FadeSlide>

        {/* ── Top Categories ───────────────────────────────────────────────── */}
        <FadeSlide delay={480} trigger={animated}>
          <CategorySummary items={topCategories} />
        </FadeSlide>

        {/* ── Recent Transactions ──────────────────────────────────────────── */}
        <FadeSlide delay={560} trigger={animated}>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: SPACING.xxxl }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', { screen: 'Transactions' })}
                activeOpacity={0.7}
              >
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all →</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No transactions yet. Use the Add tab to add one.
                </Text>
              </View>
            ) : (
              recentTransactions.map((txn, i) => {
                const isIncome = txn.type === 'income';
                const typeColor = isIncome ? colors.income : colors.expense;
                const cat = getCategoryInfo(txn.category as CategoryId);
                const catTint =
                  (colors.categories as Record<string, string>)[txn.category] ?? cat.color;
                const txnCurrencyCode = txn.currency ?? currency.code;
                const txnCurrencyInfo = getCurrencyInfo(txnCurrencyCode);
                const isForeignCurrency = txnCurrencyCode !== currency.code;
                return (
                  <View key={txn.id}>
                    <View style={styles.txnRow}>
                      <View style={[styles.txnIcon, { backgroundColor: `${catTint}22` }]}>
                        <Ionicons name={cat.icon as any} size={18} color={catTint} />
                      </View>
                      <View style={styles.txnInfo}>
                        <View style={styles.txnOneLine}>
                          <View style={styles.txnTypeCatRow}>
                            <View
                              style={[
                                styles.txnTypePill,
                                {
                                  backgroundColor: isIncome
                                    ? `${colors.income}22`
                                    : `${colors.expense}22`,
                                },
                              ]}
                            >
                              <Ionicons
                                name={isIncome ? 'trending-up' : 'trending-down'}
                                size={11}
                                color={typeColor}
                              />
                              <Text style={[styles.txnTypePillText, { color: typeColor }]}>
                                {isIncome ? 'Income' : 'Expense'}
                              </Text>
                            </View>
                            <Text
                              style={[styles.txnCategory, { color: colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {cat.label}
                            </Text>
                          </View>
                          <View style={styles.txnAmountBlock}>
                            <Text style={[styles.txnAmountLine, { color: typeColor }]} numberOfLines={1}>
                              {isIncome ? '+' : '−'}
                              {formatCurrencyWithInfo(txn.amount, txnCurrencyInfo)}
                            </Text>
                            {isForeignCurrency && (
                              <Text style={[styles.txnAmountConverted, { color: colors.textTertiary }]} numberOfLines={1}>
                                ≈ {formatCurrencyWithInfo(
                                  txn.convertedAmount !== undefined && txn.baseCurrency
                                    ? txn.baseCurrency === currency.code
                                      ? txn.convertedAmount
                                      : convert(txn.convertedAmount, txn.baseCurrency)
                                    : convert(txn.amount, txnCurrencyCode),
                                  currency
                                )}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Text style={[styles.txnDate, { color: colors.textTertiary }]}>
                          {formatShortDate(txn.date)}
                        </Text>
                      </View>
                    </View>
                    {i < recentTransactions.length - 1 && (
                      <View style={[styles.txnDivider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                );
              })
            )}
          </View>
        </FadeSlide>
      </Animated.ScrollView>

      {/* ── Notifications modal ──────────────────────────────────────── */}
      <Modal visible={notifVisible} transparent animationType="none" onRequestClose={closeNotif}>
        <View style={styles.notifRoot} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeNotif}>
            <Animated.View style={[styles.notifBackdrop, { opacity: notifAnim.interpolate({ inputRange: [0,1], outputRange: [0, 0.45] }) }]} />
          </Pressable>
          <View style={[styles.notifCenter, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
            <Animated.View style={[
              styles.notifPanel,
              { backgroundColor: colors.card, borderColor: colors.border,
                opacity: notifAnim,
                transform: [
                  { translateY: notifAnim.interpolate({ inputRange: [0,1], outputRange: [16, 0] }) },
                  { scale: notifAnim.interpolate({ inputRange: [0,1], outputRange: [0.95, 1] }) },
                ],
              },
            ]}>
              <View style={[styles.notifHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>Notifications</Text>
                <TouchableOpacity onPress={closeNotif} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {notifications.length === 0 ? (
                <View style={styles.notifEmpty}>
                  <Ionicons name="checkmark-circle-outline" size={36} color={colors.textTertiary} />
                  <Text style={[styles.notifEmptyText, { color: colors.textTertiary }]}>All clear — nothing to flag.</Text>
                </View>
              ) : (
                notifications.map((n, i) => (
                  <View key={n.id} style={[styles.notifItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <View style={[styles.notifItemIcon, { backgroundColor: `${n.accent}1A` }]}>
                      <Ionicons name={n.icon} size={18} color={n.accent} />
                    </View>
                    <View style={styles.notifItemBody}>
                      <View style={styles.notifItemTopRow}>
                        <Text style={[styles.notifItemTitle, { color: colors.textPrimary }]}>{n.title}</Text>
                        <Text style={[styles.notifItemTag, { color: n.accent }]}>{n.tag}</Text>
                      </View>
                      <Text style={[styles.notifItemText, { color: colors.textSecondary }]}>{n.body}</Text>
                    </View>
                  </View>
                ))
              )}
            </Animated.View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ── Balance Card sub-component ────────────────────────────────────────────────
function BalanceCard({
  balance,
  month,
  colors,
  formatCurrency,
  animated,
}: {
  balance: number;
  month: string;
  colors: any;
  formatCurrency: (v: number) => string;
  animated: boolean;
}) {
  const display = useCountUp(balance, 1000, 100);
  const parts = formatCurrency(display).match(/^([^\d]*)(\d[\d,.]*)(.*)$/) ?? [];
  const symbol = parts[1] ?? '';
  const amount = parts[2] ?? formatCurrency(display);
  const suffix = parts[3] ?? '';

  return (
    <LinearGradient
      colors={colors.gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.balanceCard}
    >
      <View style={styles.balanceTop}>
        <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
        <View style={styles.monthBadge}>
          <Text style={styles.monthText}>{month}</Text>
        </View>
      </View>
      <View style={styles.balanceAmountRow}>
        <Text style={styles.balanceCurrency}>{symbol}</Text>
        <Text style={styles.balanceAmount}>{amount}</Text>
        {suffix ? <Text style={styles.balanceCurrency}>{suffix}</Text> : null}
      </View>
    </LinearGradient>
  );
}

// ── Income / Expense Row sub-component ───────────────────────────────────────
function IncomeExpenseRow({
  income,
  expenses,
  colors,
  formatAmount,
  animated,
}: {
  income: number;
  expenses: number;
  colors: any;
  formatAmount: (v: number) => string;
  animated: boolean;
}) {
  const incomeDisplay = useCountUp(income, 800, 200);
  const expenseDisplay = useCountUp(expenses, 800, 300);

  return (
    <View style={styles.ieRow}>
      {/* Income card — colors.card base ensures legibility in both light and dark */}
      <View style={[styles.ieCard, { borderColor: '#4CAF5040', backgroundColor: colors.card, overflow: 'hidden' }]}>
        <LinearGradient
          colors={['#4CAF5022', '#4CAF5008']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.ieIconWrap, { backgroundColor: '#4CAF5025' }]}>
          <Ionicons name="arrow-up-circle" size={20} color="#4CAF50" />
        </View>
        <View>
          <Text style={[styles.ieLabel, { color: colors.textSecondary }]}>Income</Text>
          <Text style={[styles.ieValue, { color: '#4CAF50' }]}>{formatAmount(incomeDisplay)}</Text>
        </View>
      </View>

      {/* Expense card */}
      <View style={[styles.ieCard, { borderColor: '#FF525240', backgroundColor: colors.card, overflow: 'hidden' }]}>
        <LinearGradient
          colors={['#FF525222', '#FF525208']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.ieIconWrap, { backgroundColor: '#FF525225' }]}>
          <Ionicons name="arrow-down-circle" size={20} color="#FF5252" />
        </View>
        <View>
          <Text style={[styles.ieLabel, { color: colors.textSecondary }]}>Expenses</Text>
          <Text style={[styles.ieValue, { color: '#FF5252' }]}>{formatAmount(expenseDisplay)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: SPACING.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: FONTS.sizes.sm, marginTop: 4 },

  topChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
  },
  headerAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  greeting: { fontSize: FONTS.sizes.sm, fontWeight: '400', marginBottom: 2 },
  userName: { fontSize: FONTS.sizes.xxl, fontWeight: '800', letterSpacing: -0.5 },
  // Notification bell
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Notification modal
  notifRoot: { flex: 1 },
  notifBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  notifCenter: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING.xl,
  },
  notifPanel: {
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notifTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700' },
  notifEmpty: { alignItems: 'center', gap: 8, paddingVertical: SPACING.xxl },
  notifEmptyText: { fontSize: FONTS.sizes.sm, fontWeight: '500' },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  notifItemIcon: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifItemBody: { flex: 1, minWidth: 0 },
  notifItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  notifItemTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', flex: 1 },
  notifItemTag: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginLeft: 6 },
  notifItemText: { fontSize: FONTS.sizes.xs, lineHeight: 16 },

  // Smart alert card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.md,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  alertBody: {
    flex: 1,
    minWidth: 0,
  },
  alertTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertText: {
    fontSize: FONTS.sizes.xs,
    lineHeight: 16,
  },

  // Balance card
  balanceCard: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xxl,
  },
  balanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  monthBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  monthText: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  balanceCurrency: {
    fontSize: 36,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 6,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -2,
    lineHeight: 56,
  },

  // Income / Expense row
  ieRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  ieCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  ieIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  ieLabel: { fontSize: FONTS.sizes.xs, marginBottom: 3 },
  ieValue: { fontSize: FONTS.sizes.lg, fontWeight: '800', letterSpacing: -0.5 },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    gap: 4,
  },
  statIconGrad: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: { fontSize: FONTS.sizes.md, fontWeight: '800' },
  statLabel: { fontSize: 10, textAlign: 'center', letterSpacing: 0.2 },

  // Section card
  sectionCard: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  cardSub: { fontSize: FONTS.sizes.xs, marginTop: 2 },
  badge: { paddingHorizontal: SPACING.md, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '500' },
  seeAll: { fontSize: FONTS.sizes.sm, fontWeight: '600' },

  // Recent txn row: Income/Expense, category, amount (full detail on Transactions / edit)
  txnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  txnIcon: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  txnInfo: { flex: 1, minWidth: 0 },
  txnOneLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  txnTypeCatRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    minWidth: 0,
  },
  txnTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  txnTypePillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  txnCategory: { flex: 1, fontSize: FONTS.sizes.sm, fontWeight: '600', minWidth: 60 },
  txnAmountBlock: { alignItems: 'flex-end', flexShrink: 0 },
  txnAmountLine: { fontSize: FONTS.sizes.md, fontWeight: '800', letterSpacing: -0.3 },
  txnAmountConverted: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  txnDate: { fontSize: FONTS.sizes.xs, fontWeight: '500', marginTop: 4 },
  txnDivider: { height: 1, marginLeft: 56 },

  // Empty / Error
  emptyBox: { alignItems: 'center', gap: 8, paddingVertical: SPACING.xl },
  emptyText: { fontSize: FONTS.sizes.sm, textAlign: 'center' },
  errorTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', marginTop: 8 },
  errorSub: { fontSize: FONTS.sizes.sm, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: RADIUS.lg, marginTop: 4 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
});
