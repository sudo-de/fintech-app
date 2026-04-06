import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useConvertedTransactions } from '../hooks/useConvertedTransactions';
import { GoalCard } from '../components/goals/GoalCard';
import { SavingsPulseCard } from '../components/goals/SavingsPulseCard';
import { SavingsStreakCard } from '../components/goals/SavingsStreakCard';
import { BudgetTrackerCard } from '../components/goals/BudgetTracker';
import { NoSpendChallengeCard } from '../components/goals/NoSpendChallenge';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { SyncErrorBanner } from '../components/common/SyncErrorBanner';
import { useSyncTransactions } from '../hooks/useSyncTransactions';
import { useSyncGoalsData } from '../hooks/useSyncGoalsData';
import { goalsApi, budgetsApi, challengeApi } from '../services/api';
import { mapBackendChallenge, mapBackendToBudget, mapBackendToSavingsGoal } from '../utils/goalBudgetMap';
import { FONTS, SPACING, RADIUS } from '../constants/colors';
import { getNetSavings, getSavingsStreak } from '../utils/calculations';
import { formatMonth, getCurrentMonth } from '../utils/formatters';
import { getExpenseCategories, getCategoryInfo } from '../constants/categories';
import { CategoryId } from '../types';
import { showAppAlert } from '../utils/appAlert';

type ModalType = 'goal' | 'budget' | 'challenge' | null;

export function GoalsScreen() {
  const { colors, isDark } = useTheme();
  const { currency } = useCurrency();
  const { token } = useAuth();
  const {
    state,
    setTransactions,
    addSavingsGoal,
    setSavingsGoals,
    deleteSavingsGoal,
    addBudget,
    setBudgets,
    deleteBudget,
    setNoSpendChallenge,
  } = useApp();
  const { transactions: rawTransactions, savingsGoals, budgets, noSpendChallenge } = state;
  // Use currency-converted amounts for all financial calculations
  const transactions = useConvertedTransactions(rawTransactions);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [budgetCategory, setBudgetCategory] = useState<CategoryId>('food');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [challengeDays, setChallengeDays] = useState('7');
  const [endChallengeVisible, setEndChallengeVisible] = useState(false);
  const [endingChallenge, setEndingChallenge] = useState(false);

  const month = getCurrentMonth();
  const netSavedThisMonth = Math.max(0, getNetSavings(transactions, month));
  const goalsThisMonth = savingsGoals.filter((g) => g.month === month);
  const monthBudgets = budgets.filter((b) => b.month === month);
  const expenseCategories = getExpenseCategories();
  const streak = getSavingsStreak(transactions);

  // ── Backend sync ────────────────────────────────────────────────────────────
  const { isSyncing, isRefreshing, syncError, sync, clearError } = useSyncTransactions({
    token,
    setTransactions,
  });

  const {
    isSyncingGoals,
    isRefreshingGoals,
    goalsSyncError,
    syncGoalsData,
    clearGoalsSyncError,
  } = useSyncGoalsData({
    token,
    setSavingsGoals,
    setBudgets,
    setNoSpendChallenge,
  });

  const handleDeleteGoal = useCallback(
    async (id: string) => {
      if (token) {
        try {
          await goalsApi.delete(token, id);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Could not remove this goal.';
          showAppAlert(isDark, 'Goal not deleted', msg, [{ text: 'OK' }]);
          return;
        }
      }
      deleteSavingsGoal(id);
    },
    [token, deleteSavingsGoal, isDark]
  );

  const handleDeleteBudget = useCallback(
    async (id: string) => {
      if (token) {
        try {
          await budgetsApi.delete(token, id);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Could not remove this budget.';
          showAppAlert(isDark, 'Budget not deleted', msg, [{ text: 'OK' }]);
          return;
        }
      }
      deleteBudget(id);
    },
    [token, deleteBudget, isDark]
  );

  const resetModal = () => {
    setGoalName('');
    setGoalAmount('');
    setBudgetLimit('');
    setChallengeDays('7');
    setModalType(null);
  };

  const handleAddGoal = async () => {
    const amt = parseFloat(goalAmount);
    if (!goalName.trim() || isNaN(amt) || amt <= 0) {
      showAppAlert(
        isDark,
        'Almost there',
        'Add a name for your goal and an amount greater than zero.',
        [{ text: 'Got it' }]
      );
      return;
    }
    if (token) {
      try {
        const raw = await goalsApi.create(token, {
          name: goalName.trim(),
          targetAmount: amt,
          month,
          currency: currency.code,
        });
        addSavingsGoal(mapBackendToSavingsGoal(raw));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Try again.';
        showAppAlert(isDark, 'Goal not saved', msg, [{ text: 'OK' }]);
        return;
      }
    } else {
      addSavingsGoal({ name: goalName.trim(), targetAmount: amt, month, currency: currency.code });
    }
    resetModal();
  };

  const handleAddBudget = async () => {
    const limit = parseFloat(budgetLimit);
    if (isNaN(limit) || limit <= 0) {
      showAppAlert(
        isDark,
        'Invalid limit',
        'Enter a monthly spending limit greater than zero.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (budgets.find((b) => b.category === budgetCategory && b.month === month)) {
      showAppAlert(
        isDark,
        'Budget exists',
        'You already have a budget for this category this month. Remove it first to set a new one.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (token) {
      try {
        const raw = await budgetsApi.create(token, {
          category: budgetCategory,
          limit,
          month,
          currency: currency.code,
        });
        addBudget(mapBackendToBudget(raw));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Try again.';
        showAppAlert(isDark, 'Budget not saved', msg, [{ text: 'OK' }]);
        return;
      }
    } else {
      addBudget({ category: budgetCategory, limit, month, currency: currency.code });
    }
    resetModal();
  };

  const handleStartChallenge = async () => {
    const days = parseInt(challengeDays, 10);
    if (isNaN(days) || days < 1 || days > 30) {
      showAppAlert(
        isDark,
        'Pick a duration',
        'Challenge length must be between 1 and 30 days.',
        [{ text: 'OK' }]
      );
      return;
    }
    const startDate = new Date().toISOString();
    if (token) {
      try {
        const raw = await challengeApi.set(token, {
          startDate,
          durationDays: days,
          isActive: true,
        });
        setNoSpendChallenge(mapBackendChallenge(raw));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Try again.';
        showAppAlert(isDark, 'Challenge not started', msg, [{ text: 'OK' }]);
        return;
      }
    } else {
      setNoSpendChallenge({ startDate, durationDays: days, isActive: true });
    }
    resetModal();
  };

  const openEndChallengeConfirm = useCallback(() => {
    setEndChallengeVisible(true);
  }, []);

  const closeEndChallengeConfirm = useCallback(() => {
    if (!endingChallenge) setEndChallengeVisible(false);
  }, [endingChallenge]);

  const confirmEndChallenge = useCallback(async () => {
    if (endingChallenge) return;
    setEndingChallenge(true);
    try {
      if (token) {
        await challengeApi.delete(token);
      }
      setNoSpendChallenge(null);
      setEndChallengeVisible(false);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Check your connection and try again.';
      showAppAlert(isDark, 'Could not end challenge', msg, [{ text: 'OK' }]);
    } finally {
      setEndingChallenge(false);
    }
  }, [endingChallenge, token, setNoSpendChallenge, isDark]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>

      {((isSyncing && rawTransactions.length === 0) || isSyncingGoals) && <LoadingOverlay />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || isRefreshingGoals}
            onRefresh={() => {
              sync({ refresh: true });
              syncGoalsData({ refresh: true });
            }}
            tintColor={colors.primary}
          />
        }
      >

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Goals hub</Text>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{formatMonth(month)}</Text>
          </View>
          <View style={styles.headerBadges}>
            <LinearGradient
              colors={[`${colors.primary}22`, `${colors.primary}08`]}
              style={styles.headerBadge}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="flag" size={13} color={colors.primary} />
              <Text style={[styles.headerBadgeText, { color: colors.primary }]}>
                {savingsGoals.length} goal{savingsGoals.length !== 1 ? 's' : ''}
              </Text>
            </LinearGradient>
            {streak.count > 0 && (
              <LinearGradient
                colors={['#F9731622', '#F9731608']}
                style={styles.headerBadge}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Ionicons name="flame" size={13} color="#F97316" />
                <Text style={[styles.headerBadgeText, { color: '#F97316' }]}>
                  {streak.count}mo streak
                </Text>
              </LinearGradient>
            )}
          </View>
        </View>

        {syncError ? (
          <SyncErrorBanner
            message={syncError}
            onRetry={() => sync()}
            onDismiss={clearError}
          />
        ) : null}
        {goalsSyncError ? (
          <SyncErrorBanner
            message={goalsSyncError}
            onRetry={() => syncGoalsData()}
            onDismiss={clearGoalsSyncError}
          />
        ) : null}

        {/* Savings pulse */}
        <View style={styles.px}>
          <SavingsPulseCard
            goalsThisMonth={goalsThisMonth}
            netSavedThisMonth={netSavedThisMonth}
            transactions={transactions}
            budgets={budgets}
            monthKey={month}
            onAddGoal={() => setModalType('goal')}
          />
        </View>

        {/* Saving streak — habit system */}
        <View style={styles.px}>
          <SavingsStreakCard streak={streak} />
        </View>

        {/* ── No-spend challenge ───────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: `${colors.secondary}18` }]}>
                <Ionicons name="trophy-outline" size={16} color={colors.secondary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>No-spend challenge</Text>
            </View>
            {!noSpendChallenge ? (
              <TouchableOpacity
                style={[styles.addChip, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}
                onPress={() => setModalType('challenge')}
              >
                <Ionicons name="add" size={13} color={colors.primary} />
                <Text style={[styles.addChipText, { color: colors.primary }]}>Start</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.addChip,
                  {
                    borderColor: colors.expense,
                    backgroundColor: isDark ? `${colors.expense}16` : `${colors.expense}12`,
                  },
                ]}
                onPress={openEndChallengeConfirm}
                accessibilityLabel="End no-spend challenge"
                accessibilityHint="Opens confirmation to stop the current challenge"
              >
                <Ionicons name="stop-circle-outline" size={14} color={colors.expense} />
                <Text style={[styles.addChipText, { color: colors.expense }]}>End</Text>
              </TouchableOpacity>
            )}
          </View>
          {noSpendChallenge ? (
            <NoSpendChallengeCard challenge={noSpendChallenge} transactions={transactions} />
          ) : (
            <TouchableOpacity
              style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setModalType('challenge')}
              activeOpacity={0.75}
            >
              <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.secondary}14` }]}>
                <Ionicons name="trophy-outline" size={28} color={colors.secondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No active challenge</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                Try a short streak with zero expenses — we count clean days automatically.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Savings goals ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: `${colors.income}18` }]}>
                <Ionicons name="flag-outline" size={16} color={colors.income} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Savings goals</Text>
            </View>
            <TouchableOpacity
              style={[styles.addChip, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}
              onPress={() => setModalType('goal')}
            >
              <Ionicons name="add" size={13} color={colors.primary} />
              <Text style={[styles.addChipText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>
          {savingsGoals.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setModalType('goal')}
              activeOpacity={0.75}
            >
              <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.income}14` }]}>
                <Ionicons name="flag-outline" size={28} color={colors.income} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No savings goals</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                Name a target for {formatMonth(month)} and track progress against real cash flow.
              </Text>
            </TouchableOpacity>
          ) : (
            savingsGoals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                savedForMonth={getNetSavings(transactions, g.month)}
                onDelete={handleDeleteGoal}
              />
            ))
          )}
        </View>

        {/* ── Category budgets ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="pie-chart-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Budgets</Text>
            </View>
            <TouchableOpacity
              style={[styles.addChip, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}
              onPress={() => setModalType('budget')}
            >
              <Ionicons name="add" size={13} color={colors.primary} />
              <Text style={[styles.addChipText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>
          {monthBudgets.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setModalType('budget')}
              activeOpacity={0.75}
            >
              <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.primary}14` }]}>
                <Ionicons name="pie-chart-outline" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No budgets</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                Set a monthly ceiling for any expense category.
              </Text>
            </TouchableOpacity>
          ) : (
            monthBudgets.map((b) => (
              <BudgetTrackerCard key={b.id} budget={b} transactions={transactions} onDelete={handleDeleteBudget} />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Goal modal ───────────────────────────────────────────────────── */}
      <Modal visible={modalType === 'goal'} transparent animationType="slide" onRequestClose={resetModal}>
        <Pressable style={styles.overlay} onPress={resetModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <View style={styles.sheetHeader}>
                <View style={[styles.sheetIconWrap, { backgroundColor: `${colors.income}18` }]}>
                  <Ionicons name="flag" size={20} color={colors.income} />
                </View>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Savings goal</Text>
                  <Text style={[styles.sheetMeta, { color: colors.textTertiary }]}>Applies to {formatMonth(month)}</Text>
                </View>
              </View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Goal name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={goalName}
                onChangeText={setGoalName}
                placeholder="e.g. Emergency fund"
                placeholderTextColor={colors.textTertiary}
                autoFocus
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Target ({currency.symbol})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={goalAmount}
                onChangeText={setGoalAmount}
                placeholder="1000"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.surface }]} onPress={resetModal}>
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleAddGoal}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.confirmBtnText}>Save goal</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── Budget modal ─────────────────────────────────────────────────── */}
      <Modal visible={modalType === 'budget'} transparent animationType="slide" onRequestClose={resetModal}>
        <Pressable style={styles.overlay} onPress={resetModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <View style={styles.sheetHeader}>
                <View style={[styles.sheetIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="pie-chart" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Category budget</Text>
                  <Text style={[styles.sheetMeta, { color: colors.textTertiary }]}>{formatMonth(month)}</Text>
                </View>
              </View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {expenseCategories.map((cat) => {
                  const active = budgetCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: active ? `${cat.color}18` : colors.surface,
                          borderColor: active ? cat.color : colors.border,
                          borderWidth: active ? 1.5 : 1,
                        },
                      ]}
                      onPress={() => setBudgetCategory(cat.id)}
                    >
                      <Ionicons name={cat.icon as any} size={14} color={active ? cat.color : colors.textTertiary} />
                      <Text style={[styles.catChipText, { color: active ? cat.color : colors.textSecondary }]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {/* Selected category preview */}
              {(() => {
                const cat = getCategoryInfo(budgetCategory);
                return (
                  <View style={[styles.catPreview, { backgroundColor: `${cat.color}10`, borderColor: `${cat.color}30` }]}>
                    <View style={[styles.catPreviewIcon, { backgroundColor: `${cat.color}20` }]}>
                      <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                    </View>
                    <Text style={[styles.catPreviewName, { color: cat.color }]}>{cat.label}</Text>
                  </View>
                );
              })()}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Monthly limit ({currency.symbol})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={budgetLimit}
                onChangeText={setBudgetLimit}
                placeholder="500"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.surface }]} onPress={resetModal}>
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleAddBudget}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.confirmBtnText}>Set budget</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── Challenge modal ──────────────────────────────────────────────── */}
      <Modal visible={modalType === 'challenge'} transparent animationType="slide" onRequestClose={resetModal}>
        <Pressable style={styles.overlay} onPress={resetModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <View style={styles.sheetHeader}>
                <View style={[styles.sheetIconWrap, { backgroundColor: `${colors.secondary}18` }]}>
                  <Ionicons name="trophy" size={20} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>No-spend challenge</Text>
                  <Text style={[styles.sheetMeta, { color: colors.textTertiary }]}>
                    Streak consecutive days with zero expenses
                  </Text>
                </View>
              </View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Duration</Text>
              <View style={styles.dayOptions}>
                {['3', '7', '14', '30'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dayBtn,
                      {
                        backgroundColor: challengeDays === d ? `${colors.secondary}18` : colors.surface,
                        borderColor: challengeDays === d ? colors.secondary : colors.border,
                      },
                    ]}
                    onPress={() => setChallengeDays(d)}
                  >
                    <Text style={[styles.dayBtnNum, { color: challengeDays === d ? colors.secondary : colors.textPrimary }]}>{d}</Text>
                    <Text style={[styles.dayBtnLabel, { color: challengeDays === d ? colors.secondary : colors.textTertiary }]}>days</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Or enter custom (1–30)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={challengeDays}
                onChangeText={setChallengeDays}
                placeholder="7"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.surface }]} onPress={resetModal}>
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.secondary }]} onPress={handleStartChallenge}>
                  <Ionicons name="flame" size={18} color="#fff" />
                  <Text style={styles.confirmBtnText}>Start challenge</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── End challenge: in-app dialog (respects light/dark; native Alert does not) ── */}
      <Modal
        visible={endChallengeVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEndChallengeConfirm}
      >
        <Pressable
          style={[styles.endChallengeOverlay, { backgroundColor: colors.overlay }]}
          onPress={closeEndChallengeConfirm}
        >
          <Pressable
            style={[styles.endChallengeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
          >
            <View style={[styles.endChallengeIconWrap, { backgroundColor: `${colors.expense}18` }]}>
              <Ionicons name="flag-outline" size={26} color={colors.expense} />
            </View>
            <Text style={[styles.endChallengeTitle, { color: colors.textPrimary }]}>
              End this challenge?
            </Text>
            <Text style={[styles.endChallengeBody, { color: colors.textSecondary }]}>
              Your current streak stops here. Past days are unchanged, and you can start a new challenge anytime.
            </Text>
            {noSpendChallenge ? (
              <View style={[styles.endChallengeMeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.endChallengeMetaLabel, { color: colors.textTertiary }]}>Active challenge</Text>
                <Text style={[styles.endChallengeMetaValue, { color: colors.textPrimary }]}>
                  {noSpendChallenge.durationDays} days · since{' '}
                  {new Date(noSpendChallenge.startDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            ) : null}
            <View style={styles.endChallengeActions}>
              <TouchableOpacity
                style={[styles.endChallengeSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={closeEndChallengeConfirm}
                disabled={endingChallenge}
                accessibilityRole="button"
                accessibilityLabel="Keep challenge"
              >
                <Text style={[styles.endChallengeSecondaryText, { color: colors.textPrimary }]}>Keep going</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.endChallengePrimary, { backgroundColor: colors.expense }]}
                onPress={confirmEndChallenge}
                disabled={endingChallenge}
                accessibilityRole="button"
                accessibilityLabel="End challenge"
              >
                {endingChallenge ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons name="stop-circle" size={18} color={colors.textInverse} />
                    <Text style={[styles.endChallengePrimaryText, { color: colors.textInverse }]}>End challenge</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: SPACING.xxxl },
  px: { paddingHorizontal: SPACING.xl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800' },
  subtitle: { fontSize: FONTS.sizes.xs, fontWeight: '500', marginTop: 2 },
  headerBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  headerBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },

  section: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800' },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  addChipText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },

  emptyCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  emptyTitle: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  emptySubtitle: { fontSize: FONTS.sizes.sm, textAlign: 'center', lineHeight: 20, fontWeight: '500' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  kav: { width: '100%' },
  sheet: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  sheetIconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800' },
  sheetMeta: { fontSize: FONTS.sizes.xs, fontWeight: '500', marginTop: 2 },
  fieldLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    fontSize: FONTS.sizes.md,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  catRow: { gap: SPACING.sm, paddingVertical: 4, marginBottom: SPACING.md },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  catChipText: { fontSize: FONTS.sizes.sm, fontWeight: '600' },
  catPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  catPreviewIcon: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  catPreviewName: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  dayOptions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  dayBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    gap: 2,
  },
  dayBtnNum: { fontSize: FONTS.sizes.xl, fontWeight: '800' },
  dayBtnLabel: { fontSize: 10, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, alignItems: 'center' },
  cancelBtnText: { fontSize: FONTS.sizes.md, fontWeight: '600' },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  confirmBtnText: { fontSize: FONTS.sizes.md, fontWeight: '800', color: '#fff' },

  // End challenge dialog
  endChallengeOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  endChallengeCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  endChallengeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  endChallengeTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  endChallengeBody: {
    fontSize: FONTS.sizes.sm,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '500',
  },
  endChallengeMeta: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: 4,
  },
  endChallengeMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  endChallengeMetaValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  endChallengeActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  endChallengeSecondary: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endChallengeSecondaryText: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  endChallengePrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  endChallengePrimaryText: { fontSize: FONTS.sizes.md, fontWeight: '800' },
});
