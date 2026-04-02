import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { COLORS, FONTS } from '../constants/colors';

export type TabParamList = {
  Home: undefined;
  Transactions: undefined;
  Goals: undefined;
  Insights: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Transactions: { active: 'list', inactive: 'list-outline' },
  Goals: { active: 'flag', inactive: 'flag-outline' },
  Insights: { active: 'bar-chart', inactive: 'bar-chart-outline' },
};

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          return (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons name={iconName as any} size={size} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 82,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  activeIconContainer: {
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 10,
    padding: 4,
  },
});
