import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SHADOW } from '../../constants/colors';

interface GradientCardProps {
  children: React.ReactNode;
  colors: [string, string];
  style?: ViewStyle;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export function GradientCard({
  children,
  colors,
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
}: GradientCardProps) {
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function FlatCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.flatCard, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOW.medium,
  },
  flatCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    backgroundColor: '#1C2040',
    ...SHADOW.small,
  },
});
