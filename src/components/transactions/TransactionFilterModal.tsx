import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES } from '../../constants/categories';
import { FONTS, SPACING, RADIUS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { CategoryId } from '../../types';
import {
  DatePreset,
  TransactionListFilters,
  TransactionTypeFilter,
  DEFAULT_TX_FILTERS,
  isValidYmd,
} from '../../utils/transactionFilters';

interface TransactionFilterModalProps {
  visible: boolean;
  onClose: () => void;
  value: TransactionListFilters;
  onApply: (next: TransactionListFilters) => void;
}

const TYPE_CHIPS: { id: TransactionTypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
];

const DATE_CHIPS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'this_year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
];

function Chip({
  label,
  active,
  onPress,
  colors,
  compact,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  compact?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        compact && styles.chipCompact,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text
        style={[
          styles.chipText,
          compact && styles.chipTextCompact,
          { color: active ? colors.textInverse : colors.textSecondary },
          active && styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function TransactionFilterModal({ visible, onClose, value, onApply }: TransactionFilterModalProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<TransactionListFilters>(value);

  useEffect(() => {
    if (visible) setDraft({ ...value });
  }, [visible, value]);

  const setType = (type: TransactionTypeFilter) => setDraft((d) => ({ ...d, type }));
  const setCategory = (categoryId: CategoryId | 'all') => setDraft((d) => ({ ...d, categoryId }));
  const setDatePreset = (datePreset: DatePreset) =>
    setDraft((d) => ({
      ...d,
      datePreset,
      ...(datePreset !== 'custom' ? { customStart: '', customEnd: '' } : {}),
    }));

  const handleApply = () => {
    if (draft.datePreset === 'custom') {
      const a = draft.customStart.trim();
      const b = draft.customEnd.trim();
      if (!a || !b || !isValidYmd(a) || !isValidYmd(b)) {
        return;
      }
    }
    onApply(draft);
    onClose();
  };

  const handleReset = () => setDraft({ ...DEFAULT_TX_FILTERS });

  const customInvalid =
    draft.datePreset === 'custom' &&
    (!isValidYmd(draft.customStart.trim()) || !isValidYmd(draft.customEnd.trim()));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
      <SafeAreaView style={[styles.sheet, { backgroundColor: colors.surface }]} edges={['bottom']}>
        <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Filters</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close filters">
            <Ionicons name="close" size={26} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Type</Text>
          <View style={styles.chipRow}>
            {TYPE_CHIPS.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                active={draft.type === c.id}
                onPress={() => setType(c.id)}
                colors={colors}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowScroll}>
            <Chip
              label="All"
              active={draft.categoryId === 'all'}
              onPress={() => setCategory('all')}
              colors={colors}
              compact
            />
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                active={draft.categoryId === c.id}
                onPress={() => setCategory(c.id)}
                colors={colors}
                compact
              />
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Date</Text>
          <View style={styles.chipWrap}>
            {DATE_CHIPS.map((c) => (
              <Chip
                key={c.id}
                label={c.label}
                active={draft.datePreset === c.id}
                onPress={() => setDatePreset(c.id)}
                colors={colors}
                compact
              />
            ))}
          </View>

          {draft.datePreset === 'custom' ? (
            <View style={styles.customBlock}>
              <Text style={[styles.customHint, { color: colors.textSecondary }]}>
                Custom range (YYYY-MM-DD)
              </Text>
              <View style={styles.customRow}>
                <TextInput
                  style={[
                    styles.customInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: customInvalid ? colors.expense : colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={draft.customStart}
                  onChangeText={(t) => setDraft((d) => ({ ...d, customStart: t }))}
                  placeholder="Start"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[styles.customDash, { color: colors.textTertiary }]}>—</Text>
                <TextInput
                  style={[
                    styles.customInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: customInvalid ? colors.expense : colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={draft.customEnd}
                  onChangeText={(t) => setDraft((d) => ({ ...d, customEnd: t }))}
                  placeholder="End"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border }]}
            onPress={handleReset}
          >
            <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.applyBtn,
              { backgroundColor: colors.primary, opacity: customInvalid ? 0.45 : 1 },
            ]}
            onPress={handleApply}
            disabled={customInvalid}
          >
            <Text style={[styles.applyBtnText, { color: colors.textInverse }]}>Apply</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
  },
  scroll: { maxHeight: 420 },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chipRowScroll: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipCompact: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  chipTextCompact: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  chipTextActive: {
    fontWeight: '800',
  },
  customBlock: {
    marginTop: SPACING.md,
  },
  customHint: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  customDash: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
  },
});
