// 토픽 피드 (시안: Topic.html)
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, RefreshControl, SectionList, ToastAndroid, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { subName, useData } from '@/store/data';
import { refreshSubscription } from '@/ntfy/live';
import { BackHeader, Screen } from '@/components/Screen';
import { Icon, MoreIcon } from '@/components/Icon';
import { Button, Field, IconButton, Sheet, SheetRow, T } from '@/components/ui';
import { MessageCard } from '@/components/MessageCard';
import { dayLabel, hostOf } from '@/utils/format';
import type { StoredMessage } from '@/ntfy/types';

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const sub = useData((s) => s.subscriptions.find((x) => x.id === id));
  const list = useData((s) => s.messages[id ?? '']);
  const { updateSubscription, markAllRead, removeSubscription } = useData.getState();

  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // 화면을 보고 있는 동안 들어온 메시지는 읽음 처리
  useFocusEffect(
    useCallback(() => {
      if (id) markAllRead(id);
    }, [id, list?.length])
  );

  // 날짜별로 묶기
  const sections = useMemo(() => {
    const out: { title: string; data: StoredMessage[] }[] = [];
    for (const m of list ?? []) {
      const title = dayLabel(m.time);
      const last = out[out.length - 1];
      if (last && last.title === title) last.data.push(m);
      else out.push({ title, data: [m] });
    }
    return out;
  }, [list]);

  if (!sub) {
    return (
      <Screen>
        <BackHeader title="토픽을 찾을 수 없어요" />
      </Screen>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSubscription(sub);
    } catch (e) {
      Alert.alert('새로고침 실패', e instanceof Error ? e.message : String(e));
    }
    setRefreshing(false);
  };

  // 종 버튼: 앱이 꺼져 있어도 받을지(즉시 전달) 켜고 끈다
  const toggleInstant = () => {
    const next = !sub.instant;
    updateSubscription(sub.id, { instant: next });
    if (Platform.OS === 'android') {
      ToastAndroid.show(next ? '앱이 꺼져 있어도 받아요' : '앱을 열 때 가져와요', ToastAndroid.SHORT);
    }
  };

  const confirmUnsubscribe = () => {
    setMenu(false);
    Alert.alert('구독 취소', `${subName(sub)} 구독을 취소하고 받은 메시지를 모두 지울까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '구독 취소',
        style: 'destructive',
        onPress: () => {
          router.back();
          removeSubscription(sub.id);
        },
      },
    ]);
  };

  const startRename = () => {
    setMenu(false);
    setNameDraft(sub.name ?? '');
    // iOS는 앞 시트가 닫히는 중에 새 시트를 열면 안 뜨므로 잠깐 기다린다
    setTimeout(() => setRenaming(true), 300);
  };

  // 빈 칸으로 저장하면 원래 토픽 이름으로 돌아간다
  const saveName = () => {
    updateSubscription(sub.id, { name: nameDraft.trim() || undefined });
    setRenaming(false);
  };

  return (
    <Screen>
      <BackHeader
        title={subName(sub)}
        subtitle={sub.name ? `${hostOf(sub.server)}/${sub.topic}` : hostOf(sub.server)}
        right={
          <>
            <IconButton label={sub.instant ? '즉시 전달 끄기' : '즉시 전달 켜기'} onPress={toggleInstant}>
              <Icon name={sub.instant ? 'bell' : 'bellOff'} color={sub.instant ? c.ink : c.muted} />
            </IconButton>
            <IconButton label="더보기" onPress={() => setMenu(true)}>
              <MoreIcon color={c.ink} />
            </IconButton>
          </>
        }
      />

      <SectionList
        sections={sections}
        keyExtractor={(m) => m.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16, paddingTop: 4, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} />}
        renderSectionHeader={({ section }) => (
          <View style={{ alignSelf: 'center', backgroundColor: c.surface2, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <T size={12} color={c.muted}>
              {section.title}
            </T>
          </View>
        )}
        renderItem={({ item }) => <MessageCard m={item} mono={sub.mono} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, gap: 8 }}>
            <T size={16} weight="bold">
              아직 메시지가 없어요
            </T>
          </View>
        }
      />

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <View style={{ backgroundColor: c.card, borderRadius: 20, overflow: 'hidden' }}>
          <SheetRow label="이름 바꾸기" detail={sub.name ? `토픽: ${sub.topic}` : undefined} icon="pencil" onPress={startRename} />
          <SheetRow
            label="고정폭 글꼴로 보기"
            detail={sub.mono ? '켜짐' : '꺼짐'}
            icon="sliders"
            onPress={() => updateSubscription(sub.id, { mono: !sub.mono })}
            selected={!!sub.mono}
          />
          <SheetRow label="구독 취소" icon="close" danger onPress={confirmUnsubscribe} />
        </View>
      </Sheet>

      <Sheet visible={renaming} onClose={() => setRenaming(false)} title="이름 바꾸기">
        <Field
          label="표시 이름"
          value={nameDraft}
          onChangeText={setNameDraft}
          placeholder={sub.topic}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={saveName}
        />
        <Button label="저장" onPress={saveName} />
      </Sheet>
    </Screen>
  );
}
