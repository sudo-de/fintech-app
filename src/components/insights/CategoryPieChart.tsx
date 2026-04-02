import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { FlatCard } from '../common/GradientCard';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { CategoryTotal } from '../../utils/calculations';
import { getCategoryInfo } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatters';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface CategoryPieChartProps {
  data: CategoryTotal[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <FlatCard style={styles.card}>
        <Text style={styles.title}>Spending by Category</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No expense data available</Text>
        </View>
      </FlatCard>
    );
  }

  const topCategories = data.slice(0, 6);
  const chartData = topCategories.map((item) => {
    const catInfo = getCategoryInfo(item.category);
    return {
      name: catInfo.label,
      population: Math.round(item.amount * 100) / 100,
      color: catInfo.color,
      legendFontColor: COLORS.textSecondary,
      legendFontSize: 12,
    };
  });

  return (
    <FlatCard style={styles.card}>
      <Text style={styles.title}>Spending by Category</Text>
      <PieChart
        data={chartData}
        width={SCREEN_WIDTH - SPACING.xl * 2 - 40}
        height={180}
        chartConfig={{
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="10"
        absolute={false}
      />
      <View style={styles.legend}>
        {topCategories.map((item) => {
          const catInfo = getCategoryInfo(item.category);
          return (
            <View key={item.category} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: catInfo.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{catInfo.label}</Text>
              <Text style={styles.legendAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          );
        })}
      </View>
    </FlatCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    paddingLeft: SPACING.sm,
  },
  empty: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textTertiary,
  },
  legend: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.sm,
    gap: SPACING.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  legendAmount: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
