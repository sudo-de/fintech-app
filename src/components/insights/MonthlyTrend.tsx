import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { FlatCard } from '../common/GradientCard';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { MonthlyPoint } from '../../utils/calculations';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface MonthlyTrendProps {
  data: MonthlyPoint[];
}

export function MonthlyTrend({ data }: MonthlyTrendProps) {
  const hasData = data.some((p) => p.income > 0 || p.expenses > 0);

  return (
    <FlatCard style={styles.card}>
      <Text style={styles.title}>6-Month Trend</Text>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.income }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.expense }]} />
          <Text style={styles.legendText}>Expenses</Text>
        </View>
      </View>

      {hasData ? (
        <LineChart
          data={{
            labels: data.map((p) => p.month),
            datasets: [
              {
                data: data.map((p) => Math.max(p.income, 0)),
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                strokeWidth: 2,
              },
              {
                data: data.map((p) => Math.max(p.expenses, 0)),
                color: (opacity = 1) => `rgba(255, 82, 82, ${opacity})`,
                strokeWidth: 2,
              },
            ],
            legend: ['Income', 'Expenses'],
          }}
          width={SCREEN_WIDTH - SPACING.xl * 2 - 40}
          height={180}
          chartConfig={{
            backgroundGradientFrom: '#1C2040',
            backgroundGradientTo: '#1C2040',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: () => COLORS.textSecondary,
            propsForDots: {
              r: '3',
              strokeWidth: '1',
            },
            propsForBackgroundLines: {
              stroke: COLORS.border,
              strokeDasharray: '4',
            },
          }}
          bezier
          style={styles.chart}
          withInnerLines
          withOuterLines={false}
          withShadow={false}
          fromZero
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add transactions to see your trend</Text>
        </View>
      )}
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
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  legendRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingLeft: SPACING.sm,
    marginBottom: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -SPACING.sm,
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
});
