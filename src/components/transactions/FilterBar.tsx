import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/colors';
import { TransactionType } from '../../types';

export type FilterType = 'all' | TransactionType;

interface FilterBarProps {
  selected: FilterType;
  onSelect: (filter: FilterType) => void;
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
];

export function FilterBar({ selected, onSelect }: FilterBarProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {FILTERS.map((f) => {
          const isActive = selected === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onSelect(f.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: SPACING.sm,
  },
  container: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});
