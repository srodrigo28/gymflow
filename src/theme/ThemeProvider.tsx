import { useFonts } from 'expo-font';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { storage, storageKeys } from '@/src/services/storage';
import { defaultThemeName, isThemeName, themes } from '@/src/theme/themes';
import type { Theme, ThemeName } from '@/src/theme/types';
import { fontAssets } from '@/src/theme/typography';

type ThemeContextValue = {
  isReady: boolean;
  setTheme: (name: ThemeName) => void;
  theme: Theme;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultThemeName);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    let isActive = true;

    storage.get(storageKeys.theme).then((savedTheme) => {
      if (!isActive) {
        return;
      }

      if (isThemeName(savedTheme)) {
        setThemeName(savedTheme);
      }

      setIsThemeLoaded(true);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    void storage.set(storageKeys.theme, name);
  }, []);

  const value = useMemo(
    () => ({
      // Se a fonte falhar, o app segue com a fonte do sistema.
      isReady: isThemeLoaded && (fontsLoaded || Boolean(fontError)),
      setTheme,
      theme: themes[themeName],
    }),
    [fontError, fontsLoaded, isThemeLoaded, setTheme, themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
