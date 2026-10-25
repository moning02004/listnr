// 오픈소스 라이선스 목록. 목록은 scripts/licenses.mjs가 만든 src/generated/licenses.json을 쓴다.
import { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { BackHeader, Screen } from '@/components/Screen';
import { Icon } from '@/components/Icon';
import { Card, Divider, SHADOW, T } from '@/components/ui';
import licenses from '@/generated/licenses.json';

type License = { name: string; version: string; license: string; url: string };
const ALL = licenses as License[];

export default function LicensesScreen() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ALL.filter((l) => l.name.toLowerCase().includes(q) || l.license.toLowerCase().includes(q)) : ALL;
  }, [query]);

  return (
    <Screen>
      <BackHeader title="오픈소스 라이선스" />
      <FlatList
        data={rows}
        keyExtractor={(l) => `${l.name}@${l.version}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            <T size={13} color={c.muted} style={{ lineHeight: 19, paddingHorizontal: 4 }}>
              이 앱은 아래 오픈소스 소프트웨어 {ALL.length}개를 사용해요. 이름을 누르면 프로젝트 페이지와 라이선스 전문을 볼 수 있어요.
              한글 글꼴(Noto Sans KR, 나눔고딕코딩)은 SIL Open Font License 1.1을 따라요.
            </T>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                height: 46,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: c.card,
                boxShadow: isDark ? undefined : SHADOW,
              }}
            >
              <Icon name="search" size={18} color={c.muted} />
              <TextInput
                accessibilityLabel="라이브러리 검색"
                value={query}
                onChangeText={setQuery}
                placeholder="이름이나 라이선스로 찾기"
                placeholderTextColor={c.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, fontFamily: 'NotoSansKR_400Regular', fontSize: 15, color: c.ink, paddingVertical: 0 }}
              />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Card
            style={{
              borderRadius: 0,
              borderTopLeftRadius: index === 0 ? 20 : 0,
              borderTopRightRadius: index === 0 ? 20 : 0,
              borderBottomLeftRadius: index === rows.length - 1 ? 20 : 0,
              borderBottomRightRadius: index === rows.length - 1 ? 20 : 0,
              boxShadow: undefined,
            }}
          >
            {index > 0 && <Divider inset={16} />}
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(item.url)}
              style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 12, gap: 2, opacity: pressed ? 0.6 : 1 })}
            >
              <T size={14} weight="medium" numberOfLines={1}>
                {item.name}
              </T>
              <T size={12} color={c.muted}>
                {item.version} · {item.license}
              </T>
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={<T color={c.muted}>찾는 라이브러리가 없어요.</T>}
      />
    </Screen>
  );
}
