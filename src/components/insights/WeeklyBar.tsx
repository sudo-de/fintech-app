import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { FlatCard } from '../common/GradientCard';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { formatCurrency } from '../../utils/formatters';
import { WeeklyData } from '../../utils/calculations';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface WeeklyBarProps {
  data: WeeklyData;
}

export function WeeklyBar({ data }: WeeklyBarProps) {
  const { thisWeek, lastWeek, change } = data;
  const isDown = change <= 0;
  const changeAbs = Math.abs(Math.round(change));

  return (
    <FlatCard style={styles.card}>
      <Text style={styles.title}>Weekly Comparison</Text>

      <View style={styles.compRow}>
        <View style={styles.compItem}>
          <Text style={styles.compLabel}>This Week</Text>
          <Text style={[styles.compValue, { color: COLORS.expense }]}>{formatCurrency(thisWeek)}</Text>
        </View>

        <View style={[styles.changeBadge, { backgroundColor: isDown ? `${COLORS.income}20` : `${COLORS.expense}20` }]}>
          <Ionicons
            name={isDown ? 'trending-down' : 'trending-up'}
            size={14}
            color={isDown ? COLORS.income : COLORS.expense}
          />
          <Text style={[styles.changeText, { color: isDown ? COLORS.income : COLORS.expense }]}>
            {changeAbs}%
          </Text>
        </View>

        <View style={[styles.compItem, styles.compRight]}>
          <Text style={styles.compLabel}>Last Week</Text>
          <Text style={styles.compValue}>{formatCurrency(lastWeek)}</Text>
        </View>
      </View>

      {(thisWeek > 0 || lastWeek > 0) && (
        <BarChart
          data={{
            labels: ['Last Week', 'This Week'],
            datasets: [{ data: [lastWeek, thisWeek] }],
          }}
          width={SCREEN_WIDTH - SPACING.xl * 2 - 40}
          height={140}
          chartConfig={{
            backgroundGradientFrom: '#1C2040',
            backgroundGradientTo: '#1C2040',
            decimalPlaces: 0,
            color: (opacity = 1, index) =>
              index === 1
                ? `rgba(255, 82, 82, ${opacity})`
                : `rgba(108, 99, 255, ${opacity})`,
            labelColor: () => COLORS.textSecondary,
            barPercentage: 0.5,
            propsForBackgroundLines: {
              stroke: COLORS.border,
              strokeDasharray: '4',
            },
          }}
          style={styles.chart}
          withInnerLines
          showValuesOnTopOfBars={false}
          fromZero
          yAxisLabel="$"
          yAxisSuffix=""
        />
      )}

      {isDown && thisWeek < lastWeek && (
        <View style={styles.tip}>
          <Ionicons name="bulb-outline" size={14} color={COLORS.income} />
          <Text style={styles.tipText}>
            You're spending {changeAbs}% less than last week. Keep it up!
          </Text>
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
    marginBottom: SPACING.lg,
    paddingLeft: SPACING.sm,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  compItem: {},
  compRight: { alignItems: 'flex-end' },
  compLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  compValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  changeText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  chart: {
    borderRadius: 12,
    marginLeft: -SPACING.sm,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    backgroundColor: `${COLORS.income}15`,
    padding: SPACING.md,
    borderRadius: 10,
  },
  tipText: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.income,
    lineHeight: 16,
  },
});
