import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jsonStorage } from './storage';
import type { AccentKey } from '@/theme/tokens';

export type ThemeSetting = 'system' | 'light' | 'dark';

export type QuietHours = {
  enabled: boolean;
  start: number; // 0~23시
  end: number;
};

type SettingsState = {
  theme: ThemeSetting;
  accent: AccentKey;
  quiet: QuietHours;
  urgentBypass: boolean; // 방해 금지 중에도 긴급(5)은 울리기
  retentionDays: number;
  defaultServer: string;
  background: boolean; // 앱이 꺼져 있어도 받기 (APK 전용)
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      accent: 'teal',
      quiet: { enabled: false, start: 23, end: 7 },
      urgentBypass: true,
      retentionDays: 30,
      defaultServer: 'https://ntfy.sh',
      background: true,
      set: (patch) => set(patch),
    }),
    { name: 'settings', storage: jsonStorage }
  )
);
