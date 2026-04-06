import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState as RNAppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, setApiUnauthorizedHandler, userApi } from '../services/api';

const AUTH_STORAGE_KEY = '@fintrack_auth';

export interface UserProfile {
  name: string;
  email: string;
}

export interface NotificationSettings {
  dailyReminder: boolean;
  budgetAlerts: boolean;
  weeklyReport: boolean;
}

interface StoredAuth {
  user: UserProfile;
  // JWT from the backend. Use expo-secure-store in production.
  token: string;
  mpin: string | null;
  biometricEnabled: boolean;
  notifications: NotificationSettings;
  avatarUri: string | null;
}

interface AuthContextValue {
  /** False until persisted session is read from storage (avoids a flash of Login when already signed in). */
  authReady: boolean;
  isRegistered: boolean;
  isLocked: boolean;
  user: UserProfile | null;
  token: string | null;
  mpinEnabled: boolean;
  biometricEnabled: boolean;
  notifications: NotificationSettings;
  avatarUri: string | null;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  unlock: (pin: string) => boolean;
  biometricUnlock: () => void;
  validateMPIN: (pin: string) => boolean;
  setMPIN: (pin: string) => Promise<void>;
  disableMPIN: () => Promise<void>;
  setBiometric: (enabled: boolean) => Promise<void>;
  /** Syncs name/email to backend, then persists locally. Offline-safe. */
  updateProfile: (profile: UserProfile) => Promise<void>;
  updateNotifications: (s: NotificationSettings) => Promise<void>;
  /** Stores photo URI locally only (no backend photo endpoint). */
  updateAvatar: (uri: string | null) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  dailyReminder: false,
  budgetAlerts: true,
  weeklyReport: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mpin, setMpinState] = useState<string | null>(null);
  const [biometricEnabled, setBiometricState] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const mpinEnabled = mpin !== null;

  // Hydrate from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
          const stored: StoredAuth = JSON.parse(raw);
          setUser(stored.user);
          setToken(stored.token ?? null);
          setMpinState(stored.mpin);
          setBiometricState(stored.biometricEnabled ?? false);
          setNotifications(stored.notifications ?? DEFAULT_NOTIFICATIONS);
          setAvatarUri(stored.avatarUri ?? null);
          setIsRegistered(true);
          if (stored.mpin || stored.biometricEnabled) {
            setIsLocked(true);
          }
        }
      } catch (e) {
        console.warn('Failed to load auth state:', e);
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  // Lock when app goes to background
  const securityEnabledRef = useRef(false);
  securityEnabledRef.current = mpinEnabled || biometricEnabled;

  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' && securityEnabledRef.current) {
        setIsLocked(true);
      }
    });
    return () => subscription.remove();
  }, []);

  const persistAuth = useCallback(
    async (updates: Partial<StoredAuth>) => {
      try {
        const current: StoredAuth = {
          user: user!,
          token: token ?? '',
          mpin,
          biometricEnabled,
          notifications,
          avatarUri,
          ...updates,
        };
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(current));
      } catch (e) {
        console.warn('Failed to persist auth state:', e);
      }
    },
    [user, token, mpin, biometricEnabled, notifications, avatarUri]
  );

  const register = useCallback(async (name: string, email: string, password: string) => {
    // Calls the Go backend, then stores the JWT + profile locally.
    const res = await authApi.register(name, email, password);
    const profile: UserProfile = { name: res.user.name, email: res.user.email };
    const stored: StoredAuth = {
      user: profile,
      token: res.token,
      mpin: null,
      biometricEnabled: false,
      notifications: DEFAULT_NOTIFICATIONS,
      avatarUri: null,
    };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
    setUser(profile);
    setToken(res.token);
    setMpinState(null);
    setBiometricState(false);
    setNotifications(DEFAULT_NOTIFICATIONS);
    setAvatarUri(null);
    setIsRegistered(true);
    setIsLocked(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Calls the Go backend, then stores the JWT + profile locally.
    const res = await authApi.login(email, password);
    const profile: UserProfile = { name: res.user.name, email: res.user.email };

    // Preserve any existing MPIN/biometric settings when logging in again
    const existing = await AsyncStorage.getItem(AUTH_STORAGE_KEY).then((r) =>
      r ? (JSON.parse(r) as StoredAuth) : null
    );
    const stored: StoredAuth = {
      user: profile,
      token: res.token,
      mpin: existing?.mpin ?? null,
      biometricEnabled: existing?.biometricEnabled ?? false,
      notifications: existing?.notifications ?? DEFAULT_NOTIFICATIONS,
      avatarUri: existing?.avatarUri ?? null,
    };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
    setUser(profile);
    setToken(res.token);
    setMpinState(stored.mpin);
    setBiometricState(stored.biometricEnabled);
    setNotifications(stored.notifications);
    setAvatarUri(stored.avatarUri);
    setIsRegistered(true);
    // Only lock if security is configured
    setIsLocked((stored.mpin !== null || stored.biometricEnabled));
  }, []);

  const unlock = useCallback(
    (pin: string): boolean => {
      if (pin === mpin) {
        setIsLocked(false);
        return true;
      }
      return false;
    },
    [mpin]
  );

  const biometricUnlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const validateMPIN = useCallback(
    (pin: string): boolean => pin === mpin,
    [mpin]
  );

  const setMPIN = useCallback(
    async (pin: string) => {
      setMpinState(pin);
      await persistAuth({ mpin: pin });
    },
    [persistAuth]
  );

  const disableMPIN = useCallback(async () => {
    setMpinState(null);
    setBiometricState(false);
    setIsLocked(false);
    await persistAuth({ mpin: null, biometricEnabled: false });
  }, [persistAuth]);

  const setBiometric = useCallback(
    async (enabled: boolean) => {
      setBiometricState(enabled);
      await persistAuth({ biometricEnabled: enabled });
    },
    [persistAuth]
  );

  const updateProfile = useCallback(
    async (profile: UserProfile) => {
      // 1. Optimistic local update — works offline
      setUser(profile);
      await persistAuth({ user: profile });
      // 2. Sync to backend — silently keep local on failure (offline-first)
      if (token) {
        try {
          const updated = await userApi.updateProfile(token, profile.name, profile.email);
          const synced: UserProfile = { name: updated.name, email: updated.email };
          setUser(synced);
          await persistAuth({ user: synced });
        } catch (e: any) {
          // Backend unreachable or error — local copy already saved, no rollback
          console.warn('Profile backend sync failed (kept local):', e?.message);
        }
      }
    },
    [token, persistAuth]
  );

  const updateAvatar = useCallback(
    async (uri: string | null) => {
      setAvatarUri(uri);
      await persistAuth({ avatarUri: uri });
    },
    [persistAuth]
  );

  const updateNotifications = useCallback(
    async (s: NotificationSettings) => {
      setNotifications(s);
      await persistAuth({ notifications: s });
    },
    [persistAuth]
  );

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear auth state:', e);
    }
    setIsRegistered(false);
    setIsLocked(false);
    setUser(null);
    setToken(null);
    setMpinState(null);
    setBiometricState(false);
    setNotifications(DEFAULT_NOTIFICATIONS);
    setAvatarUri(null);
  }, []);

  // Clear session when API returns 401 with a bearer token (wrong server / stale user row)
  useEffect(() => {
    setApiUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setApiUnauthorizedHandler(null);
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{
        authReady,
        isRegistered,
        isLocked,
        user,
        token,
        mpinEnabled,
        biometricEnabled,
        notifications,
        avatarUri,
        register,
        login,
        unlock,
        biometricUnlock,
        validateMPIN,
        setMPIN,
        disableMPIN,
        setBiometric,
        updateProfile,
        updateNotifications,
        updateAvatar,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
