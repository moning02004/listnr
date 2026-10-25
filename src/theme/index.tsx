import { useColorScheme } from 'react-native';
import { ACCENTS, dark, light, type Palette } from './tokens';
import { useSettings } from '@/store/settings';

export type Theme = {
  c: Palette;
  isDark: boolean;
  accent: string; // 포인트 색
  onAccent: string; // 포인트 색 위에 올라가는 글자 색
  accentSoft: string; // 포인트 색을 옅게 깐 배경
};

// 화면 어디서든 const { c, accent } = useTheme(); 으로 색을 가져다 쓴다.
export function useTheme(): Theme {
  const system = useColorScheme();
  const themeSetting = useSettings((s) => s.theme);
  const accentKey = useSettings((s) => s.accent);

  const isDark = themeSetting === 'dark' || (themeSetting === 'system' && system === 'dark');
  const a = ACCENTS[accentKey] ?? ACCENTS.teal;
  const accent = isDark ? a.dark : a.light;

  return {
    c: isDark ? dark : light,
    isDark,
    accent,
    onAccent: isDark ? a.onDark : a.onLight,
    accentSoft: accent + (isDark ? '26' : '1A'), // 16진수 투명도(약 15% / 10%)
  };
}

export * from './tokens';
