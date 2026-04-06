import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import {
  scheduleDailyReminder,
  scheduleWeeklyReport,
  sendBudgetAlert,
  requestNotificationPermission,
} from '../services/notifications';

/**
 * Call once from a component inside NavigationContainer.
 * Keeps scheduled notifications in sync with user settings
 * and fires budget alerts from dashboard data.
 */
export function useNotifications() {
  const { notifications } = useAuth();
  const lastBudgetAlertRef = useRef<number | null>(null);

  // Request permission once on mount
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
  }, []);

  // Sync daily reminder
  useEffect(() => {
    scheduleDailyReminder(notifications.dailyReminder).catch(() => {});
  }, [notifications.dailyReminder]);

  // Sync weekly report
  useEffect(() => {
    scheduleWeeklyReport(notifications.weeklyReport).catch(() => {});
  }, [notifications.weeklyReport]);

  /**
   * Call when dashboard data loads with the current spend rate (0–100).
   * Fires a one-time budget alert if spend rate > 85%.
   */
  function checkBudgetAlert(spendRate: number) {
    if (!notifications.budgetAlerts) return;
    if (spendRate < 85) {
      lastBudgetAlertRef.current = null;
      return;
    }
    const bucket = Math.floor(spendRate / 5) * 5;
    if (lastBudgetAlertRef.current === bucket) return;
    lastBudgetAlertRef.current = bucket;
    sendBudgetAlert(spendRate).catch(() => {});
  }

  return { checkBudgetAlert };
}

/**
 * Call once from a component that IS inside NavigationContainer
 * to handle notification taps → screen navigation.
 */
export function useNotificationNavigation(
  navigate: (screen: string, params?: object) => void
) {
  useEffect(() => {
    let sub: Notifications.Subscription | null = null;
    try {
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const id = response.notification.request.identifier;
        if (id === 'fintrack-budget-alert' || id === 'fintrack-daily-reminder') {
          navigate('MainTabs', { screen: 'Home' });
        } else if (id === 'fintrack-weekly-report') {
          navigate('MainTabs', { screen: 'Insights' });
        }
      });
    } catch {
      // expo-notifications not available in this environment
    }
    return () => { sub?.remove(); };
  }, []);
}
