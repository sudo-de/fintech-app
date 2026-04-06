import AsyncStorage from '@react-native-async-storage/async-storage';

/** Rough UTF-16 byte estimate for all AsyncStorage entries (app keys only). */
export async function estimateAsyncStorageUsageBytes(): Promise<number> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length === 0) return 0;
  const entries = await AsyncStorage.multiGet(keys);
  let total = 0;
  for (const [, value] of entries) {
    if (value != null) total += value.length * 2;
  }
  return total;
}

export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${Math.max(0, bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
