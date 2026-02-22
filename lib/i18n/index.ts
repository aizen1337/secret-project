import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from '@/lib/i18n/resources/en';
import { pl } from '@/lib/i18n/resources/pl';
import { getStoredLanguage, type AppLanguage } from '@/lib/i18n/storage';

let initialized = false;

function detectDeviceLanguage(): AppLanguage {
  const locale = getLocales()?.[0];
  const code = locale?.languageCode?.toLowerCase();
  return code === 'pl' ? 'pl' : 'en';
}

export async function initI18n() {
  if (!initialized) {
    await i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, pl: { translation: pl } },
      fallbackLng: 'en',
      lng: 'en',
      compatibilityJSON: 'v4',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
    initialized = true;
  }

  const stored = await getStoredLanguage();
  const nextLanguage = stored ?? detectDeviceLanguage();
  if (i18n.language !== nextLanguage) {
    await i18n.changeLanguage(nextLanguage);
  }

  return i18n;
}

export { i18n };
