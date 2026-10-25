import { useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import type { NtfyAction, NtfyAttachment, StoredMessage } from '@/ntfy/types';
import { runHttpAction } from '@/ntfy/client';
import { clock, fileSize } from '@/utils/format';
import { Icon } from './Icon';
import { Markdown } from './Markdown';
import { monoLines } from './MonoLines';
import { Button, Card, PriorityBadge, Tag, T } from './ui';

// 이 줄 수보다 긴 본문에만 접기 버튼을 보여 준다
const COLLAPSE_LINES = 6;
const LINE_HEIGHT = 22;
const COLLAPSE_HEIGHT = COLLAPSE_LINES * LINE_HEIGHT;

// 토픽 피드의 메시지 카드 (시안: Topic.html)
export function MessageCard({ m, mono }: { m: StoredMessage; mono?: boolean }) {
  const { c } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [long, setLong] = useState(false);
  const open = () => router.push(`/message/${m.subId}/${m.id}`);
  const hasHeaderBadge = m.priority >= 4;
  // 제목이 없는 평범한 메시지는 본문을 제목 자리에 크게 보여 준다 (마크다운은 본문 자리에 그린다)
  const messageInTitle = !m.title && !hasHeaderBadge && !m.markdown;
  // 우선순위 배지나 시각을 놓을 맨 윗줄
  const showTopRow = hasHeaderBadge || (!m.title && !messageInTitle);

  return (
    <Pressable onPress={open} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <Card style={{ padding: 16, gap: 8 }}>
        {showTopRow ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {hasHeaderBadge && <PriorityBadge priority={m.priority} />}
            <View style={{ flex: 1 }} />
            <T size={12} color={c.muted}>
              {clock(m.time)}
            </T>
          </View>
        ) : null}

        {m.title || messageInTitle ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <T
              size={16}
              weight={m.title ? 'bold' : 'regular'}
              style={{ flex: 1 }}
              color={m.title ? c.ink : c.body}
            >
              {m.title || (mono ? monoLines(m.message, 16) : m.message)}
            </T>
            {!showTopRow && (
              <T size={12} color={c.muted} style={{ marginTop: 2 }}>
                {clock(m.time)}
              </T>
            )}
          </View>
        ) : null}

        {!messageInTitle && m.message ? (
          <View style={{ gap: 4 }}>
            {m.markdown ? (
              // 마크다운은 줄 수를 셀 수 없어서 높이로 판단하고, 접으면 높이를 잘라 낸다
              <View style={collapsed ? { maxHeight: COLLAPSE_HEIGHT, overflow: 'hidden' } : undefined}>
                <View
                  onLayout={(e) => {
                    if (!collapsed && e.nativeEvent.layout.height > COLLAPSE_HEIGHT + LINE_HEIGHT) setLong(true);
                  }}
                >
                  <Markdown text={m.message} />
                </View>
              </View>
            ) : (
              <T
                size={14}
                color={c.body}
                style={{ lineHeight: LINE_HEIGHT }}
                numberOfLines={collapsed ? COLLAPSE_LINES : undefined}
                // 펼친 상태에서 잰 줄 수로 긴 메시지인지 판단한다
                onTextLayout={(e) => {
                  if (!collapsed && e.nativeEvent.lines.length > COLLAPSE_LINES) setLong(true);
                }}
              >
                {mono ? monoLines(m.message, 14) : m.message}
              </T>
            )}
            {long && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setCollapsed((v) => !v)}
                hitSlop={8}
                style={{ alignSelf: 'flex-start' }}
              >
                <T size={13} weight="medium" color={c.muted}>
                  {collapsed ? '펼치기' : '접기'}
                </T>
              </Pressable>
            )}
          </View>
        ) : null}

        {m.tags.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {m.tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </View>
        )}

        {m.attachment && <AttachmentRow a={m.attachment} compact />}

        {m.actions && m.actions.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
            {m.actions.slice(0, 3).map((a, i) => (
              <Button
                key={i}
                label={a.label}
                height={44}
                variant={i === 0 ? 'soft' : 'plain'}
                style={{ flex: 1 }}
                onPress={() => runAction(a)}
              />
            ))}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

export function AttachmentRow({ a, compact }: { a: NtfyAttachment; compact?: boolean }) {
  const { c } = useTheme();
  const isImage = a.type?.startsWith('image/');
  // 렌더할 때마다 시각이 바뀌지 않게 처음 그릴 때 한 번만 잰다
  const [now] = useState(() => Date.now());
  const expired = a.expires != null && a.expires * 1000 < now;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${a.name} 열기`}
      onPress={() => (expired ? Alert.alert('첨부 파일이 만료됐어요') : Linking.openURL(a.url))}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: compact ? c.bg : c.card,
        borderRadius: compact ? 14 : 18,
        padding: compact ? 10 : 12,
        paddingHorizontal: compact ? 12 : 14,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: compact ? 36 : 40,
          height: compact ? 36 : 40,
          borderRadius: compact ? 10 : 12,
          backgroundColor: compact ? c.card : c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={isImage ? 'image' : 'file'} size={compact ? 18 : 20} color={c.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={compact ? 14 : 15} weight="medium" numberOfLines={1}>
          {a.name}
        </T>
        <T size={12} color={c.muted}>
          {[fileSize(a.size), isImage ? '이미지' : null, expired ? '만료됨' : null].filter(Boolean).join(' · ')}
        </T>
      </View>
      <Icon name="download" size={18} color={compact ? c.muted : c.ink} />
    </Pressable>
  );
}

// ntfy 액션 버튼 실행 (https://docs.ntfy.sh/publish/#action-buttons)
export async function runAction(a: NtfyAction) {
  try {
    if (a.action === 'view') await Linking.openURL(a.url);
    else if (a.action === 'http') {
      await runHttpAction(a);
      Alert.alert('완료', `"${a.label}" 요청을 보냈어요.`);
    } else Alert.alert('지원하지 않는 버튼', '안드로이드 브로드캐스트 버튼은 이 앱에서 지원하지 않아요.');
  } catch (e) {
    Alert.alert('실패', e instanceof Error ? e.message : String(e));
  }
}
