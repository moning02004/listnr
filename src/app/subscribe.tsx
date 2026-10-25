// 토픽 구독 (시안: Subscribe.html)
// 서버와 인증 정보는 설정에서 등록해 두고, 여기서는 등록된 서버 중에서 고르기만 한다.
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { getSecret } from '@/store/secrets';
import { checkAccess, makeAuthHeader, NtfyError, randomTopic, TOPIC_RE } from '@/ntfy/client';
import { DEFAULT_SERVER, type Server } from '@/ntfy/types';
import { BottomBar, CloseHeader, Screen } from '@/components/Screen';
import { Icon } from '@/components/Icon';
import { ServerEditor, authLabel } from '@/components/ServerEditor';
import { Button, Field, SHADOW, T, Toggle } from '@/components/ui';
import { hostOf } from '@/utils/format';

const PUBLIC: Server = { url: DEFAULT_SERVER, auth: 'none' };

// 내 서버를 먼저, 공용 서버(ntfy.sh)는 맨 뒤에 둔다. 공용 서버는 등록하지 않았어도 항상 고를 수 있다.
function serverChoices(servers: Server[]): Server[] {
  const own = servers.filter((s) => s.url !== DEFAULT_SERVER);
  return [...own, servers.find((s) => s.url === DEFAULT_SERVER) ?? PUBLIC];
}

// 기본 선택: 설정의 기본 서버가 내 서버면 그것, 아니면 첫 번째 내 서버, 내 서버가 없으면 공용 서버
function initialServer(servers: Server[], defaultServer: string): string {
  const own = servers.filter((s) => s.url !== DEFAULT_SERVER);
  return own.find((s) => s.url === defaultServer)?.url ?? own[0]?.url ?? DEFAULT_SERVER;
}

export default function SubscribeScreen() {
  const { c, accent, isDark } = useTheme();
  const servers = useData((s) => s.servers);
  const defaultServer = useSettings((s) => s.defaultServer);

  const [topic, setTopic] = useState('');
  const [selected, setSelected] = useState(() => initialServer(servers, defaultServer));
  const [instant, setInstant] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const choices = serverChoices(servers);

  const submit = async () => {
    const name = topic.trim();
    if (!TOPIC_RE.test(name)) {
      return Alert.alert('토픽 이름을 확인해 주세요', '영문, 숫자, -, _ 만 쓸 수 있고 64자까지 가능해요.');
    }
    const server = choices.find((s) => s.url === selected) ?? PUBLIC;
    const secret = server.auth === 'none' ? null : await getSecret(server.url);

    setBusy(true);
    try {
      // 실제로 읽을 수 있는지 서버에 물어본다
      await checkAccess(server, name, makeAuthHeader(server, secret));
    } catch (e) {
      setBusy(false);
      const msg = e instanceof NtfyError ? e.message : '서버에 연결할 수 없어요. 주소와 인터넷 연결을 확인해 주세요.';
      return Alert.alert('구독하지 못했어요', msg);
    }

    const store = useData.getState();
    // 공용 서버는 처음 구독할 때 목록에 등록한다
    if (!servers.some((s) => s.url === server.url)) store.upsertServer(server);
    const sub = store.addSubscription(server.url, name, instant);
    setBusy(false);
    router.replace(`/topic/${sub.id}`);
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <CloseHeader title="토픽 구독" />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* 토픽 이름 */}
          <View style={{ gap: 6 }}>
            <T size={13} weight="medium" color={c.muted}>
              토픽 이름
            </T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="예: home-server"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="토픽 이름"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="무작위 이름 만들기"
                onPress={() => setTopic(randomTopic())}
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: c.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                  boxShadow: isDark ? undefined : SHADOW,
                })}
              >
                <Icon name="shuffle" color={c.ink} />
              </Pressable>
            </View>
            <T size={12} color={c.muted}>
              공용 서버에서는 추측하기 어려운 이름을 쓰는 게 안전해요.
            </T>
          </View>

          {/* 서버 (인증은 서버에 저장된 것을 쓴다) */}
          <View style={{ gap: 8 }}>
            <T size={13} weight="medium" color={c.muted}>
              서버
            </T>
            {choices.map((s) => {
              const on = s.url === selected;
              const isPublic = s.url === DEFAULT_SERVER;
              return (
                <Pressable
                  key={s.url}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setSelected(s.url)}
                  style={{
                    minHeight: 60,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 16,
                    backgroundColor: c.card,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 2,
                    borderColor: on ? accent : 'transparent',
                    boxShadow: isDark ? undefined : SHADOW,
                  }}
                >
                  <Radio on={on} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T size={15} weight={on ? 'medium' : 'regular'} numberOfLines={1}>
                      {hostOf(s.url)}
                    </T>
                    <T size={12} color={c.muted} numberOfLines={1}>
                      {isPublic && s.auth === 'none' ? '공용 · 인증 없음' : authLabel(s)}
                    </T>
                  </View>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={() => setAdding(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 4,
                paddingVertical: 6,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon name="plus" size={18} color={accent} strokeWidth={2} />
              <T size={14} weight="medium" color={accent}>
                서버 추가
              </T>
            </Pressable>
            <T size={12} color={c.muted}>
              서버 주소와 인증은 설정 › 서버에서 바꿀 수 있어요.
            </T>
          </View>

          {/* 즉시 전달 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T size={15} weight="medium">
                즉시 전달
              </T>
              <T size={12} color={c.muted}>
                배터리를 조금 더 쓰지만 알림이 바로 와요
              </T>
            </View>
            <Toggle value={instant} onChange={setInstant} label="즉시 전달" />
          </View>
        </ScrollView>

        <BottomBar>
          <Button label="구독하기" floating height={50} style={{ flex: 1 }} onPress={submit} loading={busy} />
        </BottomBar>
      </KeyboardAvoidingView>

      {adding && <ServerEditor server={null} onClose={() => setAdding(false)} onSaved={setSelected} />}
    </Screen>
  );

  function Radio({ on }: { on: boolean }) {
    return (
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: on ? accent : c.faint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accent }} />}
      </View>
    );
  }
}
