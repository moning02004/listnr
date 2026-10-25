// 서버 추가·수정 시트. 설정 화면과 토픽 구독 화면에서 같이 쓴다.
// 인증 정보는 서버마다 하나씩 저장하고, 그 서버의 토픽을 구독할 때 자동으로 쓴다.
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTheme } from '@/theme';
import { normalizeUrl, useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { getSecret, setSecret } from '@/store/secrets';
import { checkHealth } from '@/ntfy/client';
import { reconnectServer } from '@/ntfy/live';
import { resyncBackground } from '@/native/listener';
import { DEFAULT_SERVER, type AuthType, type Server } from '@/ntfy/types';
import { Button, Field, Segmented, Sheet, T } from '@/components/ui';
import { hostOf } from '@/utils/format';

// 서버 목록에 보여 줄 인증 설명 (예: "phone · 아이디·비밀번호")
export function authLabel(server: Pick<Server, 'auth' | 'username'>): string {
  if (server.auth === 'basic') return server.username ? `${server.username} · 아이디·비밀번호` : '아이디·비밀번호';
  if (server.auth === 'token') return '토큰';
  return '인증 없음';
}

export function ServerEditor({
  server,
  onClose,
  onSaved,
}: {
  server: Server | null; // null이면 새 서버 추가
  onClose: () => void;
  onSaved?: (url: string) => void;
}) {
  const { c } = useTheme();
  const subscriptions = useData((s) => s.subscriptions);
  const defaultServer = useSettings((s) => s.defaultServer);
  const [url, setUrl] = useState(server?.url ?? '');
  const [auth, setAuth] = useState<AuthType>(server?.auth ?? 'none');
  const [username, setUsername] = useState(server?.username ?? '');
  const [secret, setSecretText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (server && server.auth !== 'none') getSecret(server.url).then((v) => setSecretText(v ?? ''));
  }, [server]);

  const inUse = server ? subscriptions.filter((s) => s.server === server.url).length : 0;

  const save = async () => {
    const target = normalizeUrl(url);
    if (!target) return Alert.alert('서버 주소를 적어 주세요');
    if (auth === 'basic' && (!username.trim() || !secret)) return Alert.alert('아이디와 비밀번호를 적어 주세요');
    if (auth === 'token' && !secret) return Alert.alert('토큰을 적어 주세요');
    setBusy(true);
    const ok = await checkHealth(target);
    setBusy(false);
    if (!ok) return Alert.alert('서버에 연결할 수 없어요', '주소를 확인해 주세요. 끝에 /v1/health 가 열리는 ntfy 서버여야 해요.');
    const next: Server = { url: target, auth, username: auth === 'basic' ? username.trim() : undefined };
    await setSecret(target, auth === 'none' ? null : secret);
    useData.getState().upsertServer(next);
    reconnectServer(target);
    resyncBackground();
    onSaved?.(target);
    onClose();
  };

  const remove = () => {
    if (!server) return;
    if (inUse > 0) return Alert.alert('삭제할 수 없어요', `이 서버를 쓰는 토픽이 ${inUse}개 있어요. 먼저 구독을 취소해 주세요.`);
    useData.getState().removeServer(server.url);
    setSecret(server.url, null);
    if (defaultServer === server.url) useSettings.getState().set({ defaultServer: DEFAULT_SERVER });
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={server ? hostOf(server.url) : '서버 추가'}>
      {!server && (
        <Field
          label="서버 주소"
          value={url}
          onChangeText={setUrl}
          placeholder="https://ntfy.example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          mono
        />
      )}
      <View style={{ gap: 8 }}>
        <T size={13} weight="medium" color={c.muted}>
          인증
        </T>
        <Segmented
          value={auth}
          onChange={setAuth}
          options={[
            { value: 'none', label: '없음' },
            { value: 'basic', label: '아이디·비밀번호' },
            { value: 'token', label: '토큰' },
          ]}
        />
      </View>
      {auth === 'basic' && (
        <Field
          value={username}
          onChangeText={setUsername}
          placeholder="아이디"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="아이디"
        />
      )}
      {auth !== 'none' && (
        <Field
          value={secret}
          onChangeText={setSecretText}
          placeholder={auth === 'basic' ? '비밀번호' : '토큰 (tk_…)'}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={auth === 'basic' ? '비밀번호' : '토큰'}
        />
      )}
      <Button label="저장" onPress={save} loading={busy} />
      {server && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            label={defaultServer === server.url ? '기본 서버예요' : '기본 서버로'}
            variant="secondary"
            height={44}
            style={{ flex: 1 }}
            disabled={defaultServer === server.url}
            onPress={() => useSettings.getState().set({ defaultServer: server.url })}
          />
          <Button label="삭제" variant="plain" height={44} style={{ flex: 1 }} onPress={remove} />
        </View>
      )}
    </Sheet>
  );
}
