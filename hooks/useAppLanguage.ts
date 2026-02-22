import { useCallback, useEffect, useState } from 'react';

import { i18n, initI18n } from '@/lib/i18n';
import { setStoredLanguage, type AppLanguage } from '@/lib/i18n/storage';

export function useAppLanguage() {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      await initI18n();
      if (!mounted) return;
      const current = i18n.language === 'pl' ? 'pl' : 'en';
      setLanguageState(current);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    await i18n.changeLanguage(nextLanguage);
    await setStoredLanguage(nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  return { language, setLanguage, isLoading };
}
