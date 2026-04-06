import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { useTheme } from '../context/ThemeContext';
import { RADIUS } from '../constants/colors';
import { TabParamList } from './tabTypes';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home:         { active: 'home',        inactive: 'home-outline'        },
  Transactions: { active: 'list',        inactive: 'list-outline'        },
  Insights:     { active: 'bar-chart',   inactive: 'bar-chart-outline'   },
  Goals:        { active: 'flag',        inactive: 'flag-outline'        },
};

// ── Tab icon with active dot indicator ────────────────────────────────────
function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const { colors } = useTheme();
  const icons = TAB_ICONS[name];
  if (!icons) return null;
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={focused ? icons.active : icons.inactive}
        size={24}
        color={color}
      />
      {focused && (
        <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
      )}
    </View>
  );
}


export function TabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: colors.background },
        tabBarHideOnKeyboard: Platform.OS === 'android',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          elevation: 0,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
