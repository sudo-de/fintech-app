/**
 * useSyncTransactions
 *
 * Centralises the "sync from backend on screen focus" pattern that was
 * previously duplicated across TransactionsScreen, InsightsScreen and
 * GoalsScreen.  Each screen gets the same behaviour:
 *   - Full-screen spinner on the very first load.
 *   - Silent background refresh on every subsequent focus.
 *   - Pull-to-refresh via sync({ refresh: true }).
 *   - Error message + clearError() for the error banner.
 */
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { transactionApi } from '../services/api';
import { mapBackendToTransaction } from '../utils/transactionMap';
import { Transaction } from '../types';

interface Options {
  token: string | null;
  setTransactions: (transactions: Transaction[]) => void;
}

interface Result {
  isSyncing: boolean;
  isRefreshing: boolean;
  syncError: string | null;
  /** Call with `{ refresh: true }` for pull-to-refresh. */
  sync: (opts?: { refresh?: boolean }) => Promise<void>;
  clearError: () => void;
}

export function useSyncTransactions({ token, setTransactions }: Options): Result {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const initialSyncDone = useRef(false);

  const sync = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!token) return;

      if (opts?.refresh) {
        setIsRefreshing(true);
      } else if (!initialSyncDone.current) {
        setIsSyncing(true);
      }
      setSyncError(null);

      try {
        const raw = await transactionApi.list(token);
        setTransactions(raw.map(mapBackendToTransaction));
        initialSyncDone.current = true;
      } catch (err: any) {
        setSyncError(err?.message ?? 'Failed to sync. Pull down to retry.');
      } finally {
        setIsSyncing(false);
        setIsRefreshing(false);
      }
    },
    [token, setTransactions],
  );

  // Auto-sync every time the screen gains focus.
  useFocusEffect(
    useCallback(() => {
      sync();
    }, [sync]),
  );

  return {
    isSyncing,
    isRefreshing,
    syncError,
    sync,
    clearError: () => setSyncError(null),
  };
}
