import { darkColors, lightColors, radii, spacing, type ThemePreference } from '@my-vdvoem/shared';
import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

export type AppColors = typeof lightColors | typeof darkColors;
type ThemeContextValue = { colors: AppColors; isDark: boolean; preference: ThemePreference; setPreference: (value: ThemePreference) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const isDark = preference === 'dark' || (preference === 'system' && system === 'dark');
  const value = useMemo(() => ({ colors: isDark ? darkColors : lightColors, isDark, preference, setPreference }), [isDark, preference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

export const layout = { spacing, radii };
