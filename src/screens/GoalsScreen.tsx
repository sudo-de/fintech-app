import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { GoalCard } from '../components/goals/GoalCard';
import { BudgetTrackerCard } from '../components/goals/BudgetTracker';
import { NoSpendChallengeCard } from '../components/goals/NoSpendChallenge';
import { EmptyState } from '../components/common/EmptyState';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../constants/colors';
import { getNetSavings } from '../utils/calculations';
import { getCurrentMonth } from '../utils/formatters';
import { CATEGORIES, getExpenseCategories } from '../constants/categories';
import { CategoryId } from '../types';

type ModalType = 'goal' | 'budget' | 'challenge' | null;

export function GoalsScreen() {
  const { state, addSavingsGoal, deleteSavingsGoal, addBudget, deleteBudget, setNoSpendChallenge } = useApp();
  const { transactions, savingsGoals, budgets, noSpendChallenge } = state;

  const [modalType, setModalType] = useState<ModalType>(null);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [budgetCategory, setBudgetCategory] = useState<CategoryId>('food');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [challengeDays, setChallengeDays] = useState('7');

  const month = getCurrentMonth();
  const currentSavings = Math.max(0, getNetSavings(transactions, month));

  const resetModal = () => {
    setGoalName('');
    setGoalAmount('');
    setBudgetLimit('');
    setChallengeDays('7');
    setModalType(null);
  };

  const handleAddGoal = () => {
    const amt = parseFloat(goalAmount);
    if (!goalName.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Input', 'Please enter a goal name and a valid target amount.');
      return;
    }
    addSavingsGoal({ name: goalName.trim(), targetAmount: amt, month });
    resetModal();
  };

  const handleAddBudget = () => {
    const limit = parseFloat(budgetLimit);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget limit.');
      return;
    }
    const existing = budgets.find((b) => b.category === budgetCategory && b.month === month);
    if (existing) {
      Alert.alert('Budget Exists', 'You already have a budget for this category this month.');
      return;
    }
    addBudget({ category: budgetCategory, limit, month });
    resetModal();
  };

  const handleStartChallenge = () => {
    const days = parseInt(challengeDays);
    if (isNaN(days) || days < 1 || days > 30) {
      Alert.alert('Invalid Duration', 'Please enter a challenge duration between 1 and 30 days.');
      return;
    }
    setNoSpendChallenge({
      startDate: new Date().toISOString(),
      durationDays: days,
      isActive: true,
    });
    resetModal();
  };

  const handleStopChallenge = () => {
    Alert.alert('Stop Challenge', 'Are you sure you want to end this no-spend challenge?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: () => setNoSpendChallenge(null) },
    ]);
  };

  const expenseCategories = getExpenseCategories();
  const monthBudgets = budgets.filter((b) => b.month === month);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Goals & Challenges</Text>
        </View>

        {/* No-Spend Challenge Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>No-Spend Challenge</Text>
            {!noSpendChallenge ? (
              <TouchableOpacity style={styles.addChip} onPress={() => setModalType('challenge')}>
                <Ionicons name="add" size={14} color={COLORS.primary} />
                <Text style={styles.addChipText}>Start</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.addChip, { borderColor: COLORS.expense }]} onPress={handleStopChallenge}>
                <Text style={[styles.addChipText, { color: COLORS.expense }]}>Stop</Text>
              </TouchableOpacity>
            )}
          </View>
          {noSpendChallenge ? (
            <NoSpendChallengeCard challenge={noSpendChallenge} transactions={transactions} />
          ) : (
            <TouchableOpacity
              style={styles.emptyChallenge}
              onPress={() => setModalType('challenge')}
              activeOpacity={0.7}
            >
              <Ionicons name="trophy-outline" size={32} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No active challenge</Text>
              <Text style={styles.emptySubtitle}>Challenge yourself to spend nothing for a set number of days</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Savings Goals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Savings Goals</Text>
            <TouchableOpacity style={styles.addChip} onPress={() => setModalType('goal')}>
              <Ionicons name="add" size={14} color={COLORS.primary} />
              <Text style={styles.addChipText}>Add Goal</Text>
            </TouchableOpacity>
          </View>
          {savingsGoals.length === 0 ? (
            <TouchableOpacity style={styles.emptyChallenge} onPress={() => setModalType('goal')} activeOpacity={0.7}>
              <Ionicons name="flag-outline" size={32} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No savings goals</Text>
              <Text style={styles.emptySubtitle}>Set a monthly savings target to track your progress</Text>
            </TouchableOpacity>
          ) : (
            savingsGoals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                currentSavings={currentSavings}
                onDelete={deleteSavingsGoal}
              />
            ))
          )}
        </View>

        {/* Budget Trackers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Monthly Budgets</Text>
            <TouchableOpacity style={styles.addChip} onPress={() => setModalType('budget')}>
              <Ionicons name="add" size={14} color={COLORS.primary} />
              <Text style={styles.addChipText}>Add Budget</Text>
            </TouchableOpacity>
          </View>
          {monthBudgets.length === 0 ? (
            <TouchableOpacity style={styles.emptyChallenge} onPress={() => setModalType('budget')} activeOpacity={0.7}>
              <Ionicons name="pie-chart-outline" size={32} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No budgets set</Text>
              <Text style={styles.emptySubtitle}>Set category budgets to keep your spending in check</Text>
            </TouchableOpacity>
          ) : (
            monthBudgets.map((b) => (
              <BudgetTrackerCard
                key={b.id}
                budget={b}
                transactions={transactions}
                onDelete={deleteBudget}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Goal Modal */}
      <Modal visible={modalType === 'goal'} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Savings Goal</Text>
            <Text style={styles.modalLabel}>Goal Name</Text>
            <TextInput
              style={styles.modalInput}
              value={goalName}
              onChangeText={setGoalName}
              placeholder="e.g. Emergency Fund"
              placeholderTextColor={COLORS.textTertiary}
              autoFocus
            />
            <Text style={styles.modalLabel}>Target Amount ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={goalAmount}
              onChangeText={setGoalAmount}
              placeholder="1000"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddGoal}>
                <Text style={styles.confirmBtnText}>Add Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Budget Modal */}
      <Modal visible={modalType === 'budget'} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Category Budget</Text>
            <Text style={styles.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {expenseCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, budgetCategory === cat.id && { backgroundColor: `${cat.color}30`, borderColor: cat.color }]}
                  onPress={() => setBudgetCategory(cat.id)}
                >
                  <Text style={[styles.catChipText, budgetCategory === cat.id && { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Monthly Limit ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={budgetLimit}
              onChangeText={setBudgetLimit}
              placeholder="500"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddBudget}>
                <Text style={styles.confirmBtnText}>Set Budget</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Challenge Modal */}
      <Modal visible={modalType === 'challenge'} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>No-Spend Challenge</Text>
            <Text style={styles.modalSubtitle}>
              Commit to spending nothing (other than essentials) for a set number of days
            </Text>
            <Text style={styles.modalLabel}>Duration (days)</Text>
            <View style={styles.dayOptions}>
              {['3', '7', '14', '30'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayChip, challengeDays === d && styles.dayChipActive]}
                  onPress={() => setChallengeDays(d)}
                >
                  <Text style={[styles.dayChipText, challengeDays === d && styles.dayChipTextActive]}>
                    {d} days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              value={challengeDays}
              onChangeText={setChallengeDays}
              placeholder="Custom days (1-30)"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="number-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleStartChallenge}>
                <Text style={styles.confirmBtnText}>Start Challenge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SPACING.xxxl },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
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
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  addChipText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyChallenge: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  modalSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 18,
  },
  modalLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: '#fff',
  },
  catScroll: {
    marginBottom: SPACING.md,
  },
  catChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  catChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  dayOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  dayChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipActive: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  dayChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dayChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
