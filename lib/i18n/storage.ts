import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const LANGUAGE_STORAGE_KEY = 'app-language';
export type AppLanguage = 'en' | 'pl';

export async function getStoredLanguage(): Promise<AppLanguage | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return null;
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return value === 'en' || value === 'pl' ? value : null;
  }

  try {
    const value = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
    return value === 'en' || value === 'pl' ? value : null;
  } catch {
    return null;
  }
}

export async function setStoredLanguage(language: AppLanguage): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage write errors and keep runtime language change.
  }
}
