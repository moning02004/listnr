// APK로 설치했을 때만 있는 백그라운드 알림 모듈(modules/ntfy-listener)과 연결하는 부분.
// Expo Go에서는 이 모듈이 없어서 모든 함수가 조용히 아무 일도 하지 않는다.

import { requireOptionalNativeModule } from 'expo';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { subName, useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { getSecret } from '@/store/secrets';

type NativeListener = {
  configure(configJson: string): void;
  stop(): void;
  isRunning(): boolean;
  isIgnoringBatteryOptimizations(): boolean;
  openBatterySettings(): void;
};

const native = Platform.OS === 'android' ? requireOptionalNativeModule<NativeListener>('NtfyListener') : null;

export const backgroundAvailable = native !== null;

export function isIgnoringBattery(): boolean {
  return native?.isIgnoringBatteryOptimizations() ?? false;
}

export function openBatterySettings() {
  native?.openBatterySettings();
}

// 백그라운드 서비스에 넘길 설정을 만든다
async function buildConfig() {
  const { servers, subscriptions } = useData.getState();
  const { quiet, urgentBypass, background } = useSettings.getState();
  if (!background) return { servers: [], quiet, urgentBypass };

  const instantSubs = subscriptions.filter((s) => s.instant);
  const out = [];
  for (const server of servers) {
    const subs = instantSubs.filter((s) => s.server === server.url);
    if (subs.length === 0) continue;
    out.push({
      url: server.url,
      auth: server.auth,
      username: server.username ?? '',
      secret: server.auth === 'none' ? '' : ((await getSecret(server.url)) ?? ''),
      topics: subs.map((s) => ({ id: s.id, topic: s.topic, name: subName(s), muted: s.muted })),
    });
  }
  return { servers: out, quiet, urgentBypass };
}

async function sync() {
  if (!native) return;
  const config = await buildConfig();
  if (config.servers.length === 0) {
    native.stop();
    return;
  }
  // 안드로이드 13 이상은 알림 권한을 받아야 알림이 뜬다.
  // (Expo Go에서 경고가 뜨지 않도록 APK일 때만 불러온다)
  const Notifications = await import('expo-notifications');
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) await Notifications.requestPermissionsAsync();
  native.configure(JSON.stringify(config));
}

// 루트 레이아웃에서 한 번 부르면, 구독·설정이 바뀔 때마다 서비스 설정을 새로 보낸다
export function useBackgroundSync() {
  useEffect(() => {
    if (!native) return;
    // lastId 같은 잦은 변화에는 다시 보내지 않도록 필요한 값만 비교한다
    const keyOf = () => {
      const { servers, subscriptions } = useData.getState();
      const { quiet, urgentBypass, background } = useSettings.getState();
      return JSON.stringify([
        servers,
        subscriptions.map((s) => [s.id, s.server, s.topic, s.name, s.muted, s.instant]),
        quiet,
        urgentBypass,
        background,
      ]);
    };
    // 처음 보낸 설정의 키를 기억해 둔다. 비워 두면 첫 메시지가 들어올 때 같은 설정을 한 번 더 보내게 된다
    let last = keyOf();
    sync();
    const run = () => {
      const key = keyOf();
      if (key !== last) {
        last = key;
        sync();
      }
    };
    const a = useData.subscribe(run);
    const b = useSettings.subscribe(run);
    return () => {
      a();
      b();
    };
  }, []);
}

// 비밀번호를 바꾼 뒤처럼 강제로 다시 보내야 할 때
export const resyncBackground = sync;
