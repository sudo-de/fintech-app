import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { FlatCard } from '../common/GradientCard';
import { COLORS, FONTS, SPACING } from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING.xl * 2 - 40;

interface SpendingChartProps {
  data: number[];
  labels: string[];
  title?: string;
}

export function SpendingChart({ data, labels, title = 'Weekly Spending' }: SpendingChartProps) {
  const hasData = data.some((v) => v > 0);

  return (
    <FlatCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {hasData ? (
        <LineChart
          data={{
            labels,
            datasets: [{ data: data.map((v) => Math.max(v, 0)) }],
          }}
          width={CHART_WIDTH}
          height={160}
          chartConfig={{
            backgroundGradientFrom: '#1C2040',
            backgroundGradientTo: '#1C2040',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
            labelColor: () => COLORS.textSecondary,
            style: { borderRadius: 12 },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: COLORS.primary,
            },
            propsForBackgroundLines: {
              stroke: COLORS.border,
              strokeDasharray: '4',
            },
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withShadow={false}
          fromZero
        />
      ) : (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No spending data this week</Text>
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
    marginBottom: SPACING.md,
    paddingLeft: SPACING.sm,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -SPACING.sm,
  },
  emptyChart: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textTertiary,
  },
});
