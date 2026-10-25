import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import { NotoSansKR_400Regular } from '@expo-google-fonts/noto-sans-kr/400Regular';
import { NotoSansKR_500Medium } from '@expo-google-fonts/noto-sans-kr/500Medium';
import { NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr/700Bold';
import { NanumGothicCoding_400Regular } from '@expo-google-fonts/nanum-gothic-coding/400Regular';
import { useTheme } from '@/theme';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { useLiveSync } from '@/ntfy/live';
import { useBackgroundSync } from '@/native/listener';

// 알림을 눌러 토픽 화면으로 바로 들어와도 아래에 홈 화면을 깔아 둔다 (뒤로 가기가 홈으로 가도록)
export const unstable_settings = {
  anchor: 'index',
};

// 저장해 둔 데이터를 휴대폰 저장소에서 다 읽어 왔는지
function useHydrated() {
  const [done, setDone] = useState(() => useData.persist.hasHydrated() && useSettings.persist.hasHydrated());
  useEffect(() => {
    const check = () => setDone(useData.persist.hasHydrated() && useSettings.persist.hasHydrated());
    const a = useData.persist.onFinishHydration(check);
    const b = useSettings.persist.onFinishHydration(check);
    check();
    return () => {
      a();
      b();
    };
  }, []);
  return done;
}

// 데이터가 준비된 뒤에만 서버 연결을 시작한다 (빈 목록으로 백그라운드 서비스를 꺼 버리지 않도록)
function Connections() {
  useLiveSync();
  useBackgroundSync();
  return null;
}

export default function RootLayout() {
  const { c, isDark } = useTheme();
  const hydrated = useHydrated();
  const [fontsLoaded] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_700Bold,
    NanumGothicCoding_400Regular,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg);
  }, [c.bg]);

  if (!hydrated || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Connections />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="topic/[id]" />
        <Stack.Screen name="message/[subId]/[id]" />
        <Stack.Screen name="subscribe" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}
