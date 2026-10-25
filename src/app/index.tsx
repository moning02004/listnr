// 홈 · 구독 목록 (시안: Main.html)
import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { subName, useData, unreadCount } from '@/store/data';
import { Icon, iconForTopic } from '@/components/Icon';
import { BottomBar, Screen } from '@/components/Screen';
import { Button, Card, CountBadge, Divider, IconButton, SectionLabel, SHADOW, T } from '@/components/ui';
import { shortTime } from '@/utils/format';
import type { StoredMessage, Subscription } from '@/ntfy/types';
import { DEFAULT_SERVER } from '@/ntfy/types';

type Row = { sub: Subscription; last?: StoredMessage; unread: number };

export default function Home() {
  const { c, isDark } = useTheme();
  const subscriptions = useData((s) => s.subscriptions);
  const messages = useData((s) => s.messages);
  const [query, setQuery] = useState('');

  // 최근 메시지가 온 순서로 정렬
  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subscriptions
      .map((sub) => {
        const list = messages[sub.id] ?? [];
        return { sub, last: list[0], unread: unreadCount(list), list };
      })
      .filter(({ sub, list }) => {
        if (!q) return true;
        if (sub.topic.toLowerCase().includes(q) || (sub.name ?? '').toLowerCase().includes(q)) return true;
        return list.some((m) => (m.title ?? '').toLowerCase().includes(q) || m.message.toLowerCase().includes(q));
      })
      .sort((a, b) => (b.last?.time ?? b.sub.createdAt / 1000) - (a.last?.time ?? a.sub.createdAt / 1000));
  }, [subscriptions, messages, query]);

  const totalUnread = rows.reduce((n, r) => n + r.unread, 0);

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.sub.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 20, paddingTop: 20, marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ gap: 4 }}>
                <T size={32} weight="bold" style={{ letterSpacing: -0.6 }}>
                  알림
                </T>
                <T size={14} color={c.muted}>
                  구독 {subscriptions.length}개 · 읽지 않음 {totalUnread}개
                </T>
              </View>
              <IconButton label="설정" filled onPress={() => router.push('/settings')}>
                <Icon name="settings" color={c.ink} />
              </IconButton>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                height: 48,
                paddingHorizontal: 16,
                borderRadius: 16,
                backgroundColor: c.card,
                boxShadow: isDark ? undefined : SHADOW,
              }}
            >
              <Icon name="search" size={18} color={c.muted} />
              <TextInput
                accessibilityLabel="검색"
                value={query}
                onChangeText={setQuery}
                placeholder="토픽이나 메시지 검색"
                placeholderTextColor={c.placeholder}
                style={{ flex: 1, fontFamily: 'NotoSansKR_400Regular', fontSize: 15, color: c.ink, paddingVertical: 0 }}
              />
            </View>
            {subscriptions.length > 0 && (
              <View style={{ marginTop: 4, marginBottom: -4 }}>
                <SectionLabel>구독 중</SectionLabel>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <View>
            <TopicRow row={item} first={index === 0} lastRow={index === rows.length - 1} />
          </View>
        )}
        ListEmptyComponent={subscriptions.length === 0 ? <EmptyState /> : <T color={c.muted}>검색 결과가 없어요.</T>}
      />

      <BottomBar>
        <Button label="구독 추가" icon="plus" floating height={50} style={{ flex: 1 }} onPress={() => router.push('/subscribe')} />
      </BottomBar>
    </Screen>
  );
}

// 리스트 전체가 하나의 흰 카드처럼 보이도록 첫 줄과 마지막 줄만 모서리를 둥글게 한다
function TopicRow({ row, first, lastRow }: { row: Row; first: boolean; lastRow: boolean }) {
  const { c, isDark } = useTheme();
  const { sub, last, unread } = row;
  const selfHosted = sub.server !== DEFAULT_SERVER;
  const preview = last ? last.title || last.message : '아직 받은 메시지가 없어요';

  return (
    <View
      style={{
        backgroundColor: c.card,
        borderTopLeftRadius: first ? 22 : 0,
        borderTopRightRadius: first ? 22 : 0,
        borderBottomLeftRadius: lastRow ? 22 : 0,
        borderBottomRightRadius: lastRow ? 22 : 0,
        paddingTop: first ? 6 : 0,
        paddingBottom: lastRow ? 6 : 0,
        boxShadow: isDark || !lastRow ? undefined : SHADOW,
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/topic/${sub.id}`)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingHorizontal: 16,
          paddingVertical: 12,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={iconForTopic(sub.topic)} color={c.ink} />
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T size={16} weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {subName(sub)}
            </T>
            {selfHosted && (
              <View style={{ backgroundColor: c.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <T size={11} color={c.muted}>
                  내 서버
                </T>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {last && last.priority === 5 && !last.read && (
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.urgentFg }} />
            )}
            <T size={14} color={c.muted} numberOfLines={1} style={{ flex: 1 }}>
              {preview}
            </T>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <T size={12} color={c.muted}>
            {last ? shortTime(last.time) : ''}
          </T>
          <CountBadge count={unread} />
        </View>
      </Pressable>
      {!lastRow && <Divider inset={74} />}
    </View>
  );
}

function EmptyState() {
  const { c, accentSoft, accent } = useTheme();
  return (
    <Card style={{ padding: 24, alignItems: 'center', gap: 10 }}>
      <View
        style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: accentSoft, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="bell" size={26} color={accent} />
      </View>
      <T size={17} weight="bold">
        아직 구독한 토픽이 없어요
      </T>
      <T size={14} color={c.muted} style={{ textAlign: 'center', lineHeight: 21 }}>
        {'아래 "구독 추가"를 눌러 ntfy.sh나\n내 서버의 토픽을 구독해 보세요.'}
      </T>
    </Card>
  );
}
