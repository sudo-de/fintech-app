import { Alert, Platform } from 'react-native';

type AlertBtn = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

/**
 * Uses the system alert with iOS appearance matching app light/dark mode.
 * Android alerts follow the system theme; this wrapper keeps copy consistent.
 */
export function showAppAlert(
  isDark: boolean,
  title: string,
  message?: string,
  buttons?: AlertBtn[]
): void {
  const options =
    Platform.OS === 'ios'
      ? { userInterfaceStyle: (isDark ? 'dark' : 'light') as 'dark' | 'light' }
      : undefined;
  Alert.alert(title, message, buttons, options);
}
