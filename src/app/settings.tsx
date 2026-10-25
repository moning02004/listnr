// 설정 · 서버 관리 (시안: Settings.html)
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Linking, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme, ACCENTS, type AccentKey } from '@/theme';
import { useData } from '@/store/data';
import { useSettings, type ThemeSetting } from '@/store/settings';
import { useStatus, STATUS_LABEL, type ConnState } from '@/store/status';
import { checkHealth } from '@/ntfy/client';
import { backgroundAvailable, isIgnoringBattery, openBatterySettings } from '@/native/listener';
import { DEFAULT_SERVER, type Server } from '@/ntfy/types';
import { BackHeader, Screen } from '@/components/Screen';
import { Icon } from '@/components/Icon';
import { ServerEditor, authLabel } from '@/components/ServerEditor';
import { Button, Card, Divider, SectionLabel, Segmented, Sheet, SheetRow, StatusDot, T, Toggle } from '@/components/ui';
import { hostOf } from '@/utils/format';

const pad = (h: number) => String(h).padStart(2, '0') + ':00';

const REPO_URL = 'https://github.com/moning02004/listnr';
// 릴리스 태그(1.2.0)와 같은 모양으로 보여 준다. 버전은 빌드할 때 app.json에서 들어온다 (CI가 태그로 채운다)
const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

export default function SettingsScreen() {
  const { c, accent, isDark } = useTheme();
  const servers = useData((s) => s.servers);
  const subscriptions = useData((s) => s.subscriptions);
  const liveStatus = useStatus((s) => s.servers);
  const settings = useSettings();
  const insets = useSafeAreaInsets();

  const [checked, setChecked] = useState<Record<string, ConnState>>({});
  const [editing, setEditing] = useState<Server | 'new' | null>(null);
  const [sheet, setSheet] = useState<'quiet' | 'retention' | null>(null);
  const [battery, setBattery] = useState(isIgnoringBattery());

  // 실시간 연결이 없는 서버(구독이 없는 서버)는 따로 상태를 확인한다
  useEffect(() => {
    servers.forEach(async (s) => {
      if (liveStatus[s.url]) return;
      const ok = await checkHealth(s.url);
      setChecked((prev) => ({ ...prev, [s.url]: ok ? 'connected' : 'error' }));
    });
  }, [servers]);

  // 배터리 설정 화면에서 돌아오면 다시 확인
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setBattery(isIgnoringBattery()));
    return () => sub.remove();
  }, []);

  const statusOf = (url: string): ConnState => liveStatus[url] ?? checked[url] ?? 'connecting';

  return (
    <Screen>
      <BackHeader title="설정" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 40, gap: 20 }}>
        {/* 서버 */}
        <View>
          <SectionLabel>서버</SectionLabel>
          <Card style={{ paddingVertical: 4 }}>
            {servers.map((s, i) => {
              const count = subscriptions.filter((x) => x.server === s.url).length;
              const st = statusOf(s.url);
              const isDefault = settings.defaultServer === s.url;
              return (
                <View key={s.url}>
                  {i > 0 && <Divider inset={68} />}
                  <Pressable
                    onPress={() => setEditing(s)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: c.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={s.url === DEFAULT_SERVER ? 'globe' : 'server'} color={c.ink} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T size={15} weight="medium" numberOfLines={1}>
                        {hostOf(s.url)}
                      </T>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <StatusDot ok={st === 'connected'} />
                        <T size={12} color={c.muted}>
                          {[STATUS_LABEL[st], isDefault ? '기본 서버' : null, `토픽 ${count}개`].filter(Boolean).join(' · ')}
                        </T>
                      </View>
                      <T size={12} color={c.muted} numberOfLines={1}>
                        {authLabel(s)}
                      </T>
                    </View>
                    <Icon name="chevronRight" size={18} color={c.faint} strokeWidth={2} />
                  </Pressable>
                </View>
              );
            })}
            {servers.length > 0 && <Divider inset={68} />}
            <Pressable
              onPress={() => setEditing('new')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ width: 40, alignItems: 'center' }}>
                <Icon name="plus" color={accent} strokeWidth={2} />
              </View>
              <T size={15} weight="medium" color={accent}>
                서버 추가
              </T>
            </Pressable>
          </Card>
        </View>

        {/* 알림 */}
        <View>
          <SectionLabel>알림</SectionLabel>
          <Card style={{ paddingHorizontal: 16 }}>
            <Row
              onPress={() => setSheet('quiet')}
              title="방해 금지 시간"
              value={settings.quiet.enabled ? `${pad(settings.quiet.start)} – ${pad(settings.quiet.end)}` : '꺼짐'}
            />
            <Divider />
            <Row title="긴급 알림은 항상 받기" sub="방해 금지 중에도 우선순위 5는 울려요">
              <Toggle value={settings.urgentBypass} onChange={(v) => settings.set({ urgentBypass: v })} label="긴급 알림은 항상 받기" />
            </Row>
            <Divider />
            <Row onPress={() => setSheet('retention')} title="알림 보관 기간" value={`${settings.retentionDays}일`} />
          </Card>
        </View>

        {/* 백그라운드 */}
        <View>
          <SectionLabel>백그라운드 수신</SectionLabel>
          <Card style={{ paddingHorizontal: 16 }}>
            {backgroundAvailable ? (
              <>
                <Row title="앱이 꺼져 있어도 받기" sub="'즉시 전달'을 켠 토픽만 받아요">
                  <Toggle value={settings.background} onChange={(v) => settings.set({ background: v })} label="앱이 꺼져 있어도 받기" />
                </Row>
                {settings.background && (
                  <>
                    <Divider />
                    <Row
                      title="배터리 최적화 제외"
                      sub={battery ? '알림이 끊기지 않아요 · 눌러서 바꿀 수 있어요' : '꺼 두면 휴대폰이 연결을 끊을 수 있어요'}
                      value={battery ? '완료' : undefined}
                      onPress={openBatterySettings}
                    >
                      {battery ? (
                        <Icon name="chevronRight" size={18} color={c.faint} strokeWidth={2} />
                      ) : (
                        <Button label="설정하기" variant="soft" height={36} style={{ paddingHorizontal: 14 }} onPress={openBatterySettings} />
                      )}
                    </Row>
                  </>
                )}
              </>
            ) : (
              <Row title="APK에서만 쓸 수 있어요" sub="Expo Go에서는 앱이 켜져 있을 때만 받아요. README의 'APK 만들기'를 참고하세요." />
            )}
          </Card>
        </View>

        {/* 화면 */}
        <View style={{ gap: 12 }}>
          <View>
            <SectionLabel>화면</SectionLabel>
            <Segmented<ThemeSetting>
              value={settings.theme}
              onChange={(v) => settings.set({ theme: v })}
              options={[
                { value: 'system', label: '시스템' },
                { value: 'light', label: '라이트' },
                { value: 'dark', label: '다크' },
              ]}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 4, alignItems: 'center' }}>
            <T size={14} color={c.muted} style={{ flex: 1 }}>
              포인트 색
            </T>
            {(Object.keys(ACCENTS) as AccentKey[]).map((k) => {
              const selected = settings.accent === k;
              const color = ACCENTS[k][isDark ? 'dark' : 'light'];
              return (
                <Pressable
                  key={k}
                  accessibilityRole="button"
                  accessibilityLabel={ACCENTS[k].name}
                  accessibilityState={{ selected }}
                  onPress={() => settings.set({ accent: k })}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor: selected ? color : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color }} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 앱 정보 */}
        <View>
          <SectionLabel>앱 정보</SectionLabel>
          <Card style={{ paddingHorizontal: 16 }}>
            <Row title="버전" value={APP_VERSION} />
            <Divider />
            <Row title="소스 코드" sub="GitHub" onPress={() => Linking.openURL(REPO_URL)}>
              <Icon name="chevronRight" size={18} color={c.faint} strokeWidth={2} />
            </Row>
            <Divider />
            <Row title="라이선스" value="MIT" onPress={() => Linking.openURL(`${REPO_URL}/blob/main/LICENSE`)}>
              <Icon name="chevronRight" size={18} color={c.faint} strokeWidth={2} />
            </Row>
            <Divider />
            <Row title="오픈소스 라이선스" onPress={() => router.push('/licenses')}>
              <Icon name="chevronRight" size={18} color={c.faint} strokeWidth={2} />
            </Row>
          </Card>
          <T size={12} color={c.muted} style={{ textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
            {'ntfy 호환 비공식 클라이언트 · ntfy LLC와 관계없어요\nAI(Claude Code)로 만들었어요'}
          </T>
        </View>
      </ScrollView>

      {editing && <ServerEditor server={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <Sheet visible={sheet === 'quiet'} onClose={() => setSheet(null)} title="방해 금지 시간">
        <Card style={{ paddingHorizontal: 16 }}>
          <Row title="사용">
            <Toggle
              value={settings.quiet.enabled}
              onChange={(v) => settings.set({ quiet: { ...settings.quiet, enabled: v } })}
              label="방해 금지 사용"
            />
          </Row>
          <Divider />
          <Row title="시작">
            <Stepper value={settings.quiet.start} onChange={(v) => settings.set({ quiet: { ...settings.quiet, start: v } })} />
          </Row>
          <Divider />
          <Row title="끝">
            <Stepper value={settings.quiet.end} onChange={(v) => settings.set({ quiet: { ...settings.quiet, end: v } })} />
          </Row>
        </Card>
        <T size={12} color={c.muted}>
          이 시간에는 소리와 진동 없이 알림만 쌓여요. 백그라운드 수신(APK)에서 적용돼요.
        </T>
      </Sheet>

      <Sheet visible={sheet === 'retention'} onClose={() => setSheet(null)} title="알림 보관 기간">
        <View style={{ backgroundColor: c.card, borderRadius: 20, overflow: 'hidden' }}>
          {[7, 30, 90, 365].map((d) => (
            <SheetRow
              key={d}
              label={d === 365 ? '1년' : `${d}일`}
              selected={settings.retentionDays === d}
              onPress={() => {
                settings.set({ retentionDays: d });
                useData.getState().prune(d);
                setSheet(null);
              }}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

// 설정 한 줄: 제목 · 설명 · 오른쪽 값이나 스위치
function Row({
  title,
  sub,
  value,
  onPress,
  children,
}: {
  title: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        paddingVertical: 10,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <T size={15}>{title}</T>
        {sub && (
          <T size={12} color={c.muted}>
            {sub}
          </T>
        )}
      </View>
      {value && (
        <T size={14} color={c.muted}>
          {value}
        </T>
      )}
      {children}
    </Pressable>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { c } = useTheme();
  const btn = (label: string, delta: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? '한 시간 뒤로' : '한 시간 앞으로'}
      onPress={() => onChange((value + delta + 24) % 24)}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}
    >
      <T size={18} weight="medium">
        {label}
      </T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {btn('−', -1)}
      <T size={15} weight="medium" style={{ width: 52, textAlign: 'center' }}>
        {pad(value)}
      </T>
      {btn('+', 1)}
    </View>
  );
}
