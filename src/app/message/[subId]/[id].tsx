// 알림 상세 (시안: Detail.html)
import { Alert, Linking, Pressable, ScrollView, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { monoLines } from '@/components/MonoLines';
import { subName, useData } from '@/store/data';
import { Markdown } from '@/components/Markdown';
import { BackHeader, Screen } from '@/components/Screen';
import { Icon, type IconName } from '@/components/Icon';
import { Button, Card, Divider, PriorityBadge, SHADOW_FLOAT, Tag, T } from '@/components/ui';
import { AttachmentRow, runAction } from '@/components/MessageCard';
import { hostOf, longTime } from '@/utils/format';

export default function MessageDetail() {
  const { subId, id } = useLocalSearchParams<{ subId: string; id: string }>();
  const { c, accent, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const sub = useData((s) => s.subscriptions.find((x) => x.id === subId));
  const m = useData((s) => s.messages[subId ?? '']?.find((x) => x.id === id));

  if (!sub || !m) {
    return (
      <Screen>
        <BackHeader title="메시지를 찾을 수 없어요" />
      </Screen>
    );
  }

  const fullText = [m.title, m.message].filter(Boolean).join('\n\n');

  const meta: { label: string; value: string; link?: boolean; mono?: boolean }[] = [
    { label: '토픽', value: sub.topic },
    { label: '서버', value: hostOf(sub.server) },
    ...(m.click ? [{ label: '클릭 시 열기', value: hostOf(m.click), link: true }] : []),
    { label: '메시지 ID', value: m.id, mono: true },
  ];

  const remove = () =>
    Alert.alert('메시지 삭제', '이 메시지를 휴대폰에서 지울까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          router.back();
          useData.getState().deleteMessage(sub.id, m.id);
        },
      },
    ]);

  return (
    <Screen>
      <BackHeader label={subName(sub)} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 140, gap: 16 }}>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <PriorityBadge priority={m.priority} large />
            <T size={13} color={c.muted}>
              {longTime(m.time)}
            </T>
          </View>
          {m.title ? (
            <T size={26} weight="bold" style={{ lineHeight: 34, letterSpacing: -0.5 }} selectable>
              {m.title}
            </T>
          ) : null}
          {m.markdown ? (
            <Markdown text={m.message} size={16} lineHeight={26} color={m.title ? c.body : c.ink} selectable />
          ) : (
            <T
              size={m.title ? 16 : 20}
              color={m.title ? c.body : c.ink}
              style={{ lineHeight: m.title ? 26 : 30 }}
              selectable
            >
              {sub.mono ? monoLines(m.message, m.title ? 16 : 20) : m.message}
            </T>
          )}
          {m.tags.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {m.tags.map((t) => (
                <Tag key={t} label={t} large />
              ))}
            </View>
          )}
        </View>

        {m.attachment && <AttachmentRow a={m.attachment} />}

        <Card style={{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 18 }}>
          {meta.map((row, i) => (
            <View key={row.label}>
              {i > 0 && <Divider />}
              <Pressable
                disabled={!row.link}
                onPress={() => m.click && Linking.openURL(m.click)}
                style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 }}
              >
                <T size={14} color={c.muted}>
                  {row.label}
                </T>
                <T
                  size={14}
                  weight="medium"
                  numberOfLines={1}
                  color={row.link ? accent : c.ink}
                  style={{ flexShrink: 1, fontFamily: row.mono ? 'monospace' : undefined }}
                >
                  {row.value}
                </T>
              </Pressable>
            </View>
          ))}
        </Card>

        {(m.click || (m.actions && m.actions.length > 0)) && (
          <View style={{ gap: 8 }}>
            {m.click && <Button label="링크 열기" onPress={() => Linking.openURL(m.click!)} height={52} />}
            {m.actions?.map((a, i) => (
              <Button
                key={i}
                label={a.label}
                onPress={() => runAction(a)}
                height={52}
                variant={!m.click && i === 0 ? 'primary' : 'secondary'}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* 아래 떠 있는 복사·공유·삭제 */}
      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: insets.bottom + 16,
          flexDirection: 'row',
          backgroundColor: c.card,
          borderRadius: 20,
          padding: 6,
          boxShadow: isDark ? undefined : SHADOW_FLOAT,
        }}
      >
        <BarButton icon="copy" label="복사" onPress={() => Clipboard.setStringAsync(fullText)} />
        <BarButton icon="share" label="공유" onPress={() => Share.share({ message: fullText })} />
        <BarButton icon="trash" label="삭제" danger onPress={remove} />
      </View>
    </Screen>
  );
}

function BarButton({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const { c } = useTheme();
  const color = danger ? c.danger : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: pressed ? c.surface : 'transparent',
      })}
    >
      <Icon name={icon} color={color} />
      <T size={12} color={danger ? c.danger : c.body}>
        {label}
      </T>
    </Pressable>
  );
}
