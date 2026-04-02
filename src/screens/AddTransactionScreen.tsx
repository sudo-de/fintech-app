import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../constants/colors';
import { getCategoriesForType, getCategoryInfo } from '../constants/categories';
import { TransactionType, CategoryId } from '../types';
import { generateId, getCurrentMonth } from '../utils/formatters';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AddTransaction'>;
type RouteType = RouteProp<RootStackParamList, 'AddTransaction'>;

export function AddTransactionScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const { addTransaction, updateTransaction, deleteTransaction } = useApp();
  const existing = route.params?.transaction;
  const isEdit = !!existing;

  const [type, setType] = useState<TransactionType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [category, setCategory] = useState<CategoryId>(existing?.category ?? 'food');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString());

  const categories = getCategoriesForType(type);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const cats = getCategoriesForType(newType);
    if (!cats.find((c) => c.id === category)) {
      setCategory(cats[0].id);
    }
  };

  const handleSave = () => {
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    if (isEdit && existing) {
      updateTransaction({ ...existing, type, amount: parsed, category, note, date });
    } else {
      addTransaction({ type, amount: parsed, category, note, date });
    }
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTransaction(existing.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-down" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Transaction' : 'New Transaction'}</Text>
          {isEdit ? (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color={COLORS.expense} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Type Toggle */}
          <View style={styles.typeToggle}>
            {(['expense', 'income'] as TransactionType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  type === t && {
                    backgroundColor: t === 'expense' ? COLORS.expense : COLORS.income,
                  },
                ]}
                onPress={() => handleTypeChange(t)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t === 'expense' ? 'trending-down' : 'trending-up'}
                  size={18}
                  color={type === t ? '#fff' : COLORS.textSecondary}
                />
                <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                  {t === 'expense' ? 'Expense' : 'Income'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
              autoFocus={!isEdit}
            />
          </View>

          {/* Category Selection */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catItem,
                  category === cat.id && { borderColor: cat.color, borderWidth: 2 },
                ]}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.catIcon, { backgroundColor: `${cat.color}25` }]}>
                  <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <Text style={[styles.catLabel, category === cat.id && { color: cat.color }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note */}
          <Text style={styles.label}>Note</Text>
          <TextInput
            style={styles.textInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a description..."
            placeholderTextColor={COLORS.textTertiary}
            returnKeyType="done"
          />

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          <View style={styles.dateRow}>
            {[-2, -1, 0].map((offset) => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              const iso = d.toISOString();
              const label = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const isSelected = new Date(date).toDateString() === d.toDateString();
              return (
                <TouchableOpacity
                  key={offset}
                  style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  onPress={() => setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).toISOString())}
                >
                  <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: type === 'expense' ? COLORS.expense : COLORS.income },
            ]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Transaction'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  kav: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.expense}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: { width: 40 },
  scroll: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 4,
    marginBottom: SPACING.xxl,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  typeBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxxl,
  },
  currencySymbol: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '300',
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  amountInput: {
    fontSize: FONTS.sizes.hero,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 100,
    maxWidth: 260,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  dateChip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateChipActive: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  dateChipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  dateChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    ...SHADOW.large,
  },
  saveBtnText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: '#fff',
  },
});
