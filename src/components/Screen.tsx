import { type ReactNode } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from './Icon';
import { IconButton, T } from './ui';

// 모든 화면의 바탕. 상태바 높이만큼 위를 비워 둔다.
export function Screen({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>{children}</View>;
}

// 돌아갈 화면이 없으면(알림으로 바로 열린 경우 등) 홈으로 간다
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// 뒤로 가기 + 제목이 있는 위쪽 줄
export function BackHeader({
  title,
  subtitle,
  label,
  right,
}: {
  title?: string;
  subtitle?: string;
  label?: string; // 제목 대신 작은 회색 글씨 (상세 화면)
  right?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
      <IconButton label="뒤로" onPress={goBack}>
        <Icon name="back" size={22} color={c.ink} strokeWidth={2} />
      </IconButton>
      <View style={{ flex: 1, minWidth: 0 }}>
        {label && (
          <T size={15} color={c.muted} numberOfLines={1}>
            {label}
          </T>
        )}
        {title && (
          <T size={subtitle ? 18 : 24} weight="bold" numberOfLines={1} style={{ letterSpacing: subtitle ? 0 : -0.4 }}>
            {title}
          </T>
        )}
        {subtitle && (
          <T size={12} color={c.muted} numberOfLines={1}>
            {subtitle}
          </T>
        )}
      </View>
      {right}
    </View>
  );
}

// 제목 + 닫기(X) 버튼이 있는 위쪽 줄 (보내기, 구독 화면)
export function CloseHeader({ title }: { title: string }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 20,
        paddingRight: 12,
        paddingTop: 8,
        paddingBottom: 4,
      }}
    >
      <T size={24} weight="bold" style={{ letterSpacing: -0.4 }}>
        {title}
      </T>
      <IconButton label="닫기" onPress={goBack}>
        <Icon name="close" size={22} color={c.ink} strokeWidth={2} />
      </IconButton>
    </View>
  );
}

// 화면 아래에 떠 있는 버튼 영역
export function BottomBar({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: insets.bottom + 10,
        backgroundColor: c.bg,
        flexDirection: 'row',
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}
