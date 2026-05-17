import { useContext } from 'react';
import { ThemeContext } from './context/theme';

export const lightColors = {
  primary:      '#5B5EA6',
  primaryLight: '#EEEEF8',
  accent:       '#D55E00',
  success:      '#009E73',
  background:   '#F9F9F9',
  surface:      '#FFFFFF',
  text:         '#1A1A2E',
  textLight:    '#757575',
  border:       '#EBEBEB',
  cardBg:       '#FFFFFF',
};

export const darkColors = {
  primary:      '#8B8FD4',
  primaryLight: '#1E1E3A',
  accent:       '#FF8A30',
  success:      '#00CC99',
  background:   '#121212',
  surface:      '#1E1E1E',
  text:         '#EEEEEE',
  textLight:    '#AAAAAA',
  border:       '#2E2E2E',
  cardBg:       '#1E1E1E',
};

// Backward-compat static export (light mode) — used by files not yet migrated
export const colors = lightColors;

export function useColors() {
  const { isDark } = useContext(ThemeContext);
  return isDark ? darkColors : lightColors;
}

export const typography = {
  headline: { fontSize: 32, fontWeight: '800' },
  body:     { fontSize: 17, lineHeight: 26 },
  label:    { fontSize: 13, fontWeight: '600' },
};
