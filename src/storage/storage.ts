import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../types';

const STORAGE_KEY = '@fintrack_state_v1';

export const saveState = async (state: Partial<AppState>): Promise<void> => {
  try {
    const serialized = JSON.stringify(state);
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
};

export const loadState = async (): Promise<Partial<AppState> | null> => {
  try {
    const serialized = await AsyncStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    return JSON.parse(serialized) as Partial<AppState>;
  } catch (e) {
    console.warn('Failed to load state:', e);
    return null;
  }
};

export const clearState = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear state:', e);
  }
};
