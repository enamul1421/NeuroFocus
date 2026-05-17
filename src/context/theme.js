import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

export const ThemeContext = createContext({ isDark: false });

export function ThemeProvider({ children, override }) {
  const system = useColorScheme();
  const isDark = override === 'dark' || (override !== 'light' && system === 'dark');
  return (
    <ThemeContext.Provider value={{ isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useIsDark() {
  return useContext(ThemeContext).isDark;
}
