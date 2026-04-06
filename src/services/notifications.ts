import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// How notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DAILY_REMINDER_ID  = 'fintrack-daily-reminder';
const WEEKLY_REPORT_ID   = 'fintrack-weekly-report';
const BUDGET_ALERT_ID    = 'fintrack-budget-alert';

// ── Permissions ──────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Daily reminder ────────────────────────────────────────────────────────────

export async function scheduleDailyReminder(enabled: boolean): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  if (!enabled) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Log your expenses',
      body: 'Take 30 seconds to record today\'s spending — small habits add up.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,   // 8 PM every day
      minute: 0,
    },
  });
}

// ── Weekly report ─────────────────────────────────────────────────────────────

export async function scheduleWeeklyReport(enabled: boolean): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_REPORT_ID).catch(() => {});
  if (!enabled) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_REPORT_ID,
    content: {
      title: 'Weekly spending summary',
      body: 'Your weekly report is ready — open FinTech App to review your patterns.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,  // Sunday
      hour: 9,
      minute: 0,
    },
  });
}

// ── Budget alert (fired immediately when threshold crossed) ───────────────────

export async function sendBudgetAlert(spendRate: number): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Dismiss any previous budget alert first
  await Notifications.cancelScheduledNotificationAsync(BUDGET_ALERT_ID).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: BUDGET_ALERT_ID,
    content: {
      title: 'Budget alert',
      body: `You have used ${Math.round(spendRate)}% of your monthly income. Consider slowing down spending.`,
      sound: true,
    },
    trigger: null, // fires immediately
  });
}

// ── Cancel all ───────────────────────────────────────────────────────────────

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
