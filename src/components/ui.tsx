// 여러 화면에서 같이 쓰는 작은 부품들.
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, radius, useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';
import type { Priority } from '@/ntfy/types';

export const SHADOW = '0 1px 2px rgba(21,23,28,0.06)';
export const SHADOW_FLOAT = '0 4px 16px rgba(21,23,28,0.10)';

// ---------- 글자 ----------

type TProps = {
  children: ReactNode;
  size?: number;
  weight?: 'regular' | 'medium' | 'bold';
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
  onTextLayout?: TextProps['onTextLayout'];
};

export function T({ children, size = 15, weight = 'regular', color, style, numberOfLines, selectable, onTextLayout }: TProps) {
  const { c } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      onTextLayout={onTextLayout}
      style={[{ fontFamily: font[weight], fontSize: size, color: color ?? c.ink, includeFontPadding: false }, style]}
    >
      {children}
    </Text>
  );
}

// 작은 회색 섹션 제목 ("구독 중", "서버")
export function SectionLabel({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <T size={13} weight="medium" color={c.muted} style={{ marginHorizontal: 4, marginBottom: 8 }}>
      {children}
    </T>
  );
}

// ---------- 카드와 구분선 ----------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c, isDark } = useTheme();
  return (
    <View style={[{ backgroundColor: c.card, borderRadius: radius.card, boxShadow: isDark ? undefined : SHADOW }, style]}>{children}</View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line, marginLeft: inset }} />;
}

// ---------- 버튼 ----------

type ButtonProps = {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'soft' | 'plain';
  disabled?: boolean;
  loading?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
  floating?: boolean;
};

export function Button({ label, onPress, icon, variant = 'primary', disabled, loading, height = 56, style, floating }: ButtonProps) {
  const { c, accent, onAccent, accentSoft, isDark } = useTheme();
  const bg = { primary: accent, secondary: c.card, soft: accentSoft, plain: c.surface }[variant];
  const fg = { primary: onAccent, secondary: c.ink, soft: accent, plain: c.ink }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height,
          borderRadius: height >= 52 ? radius.button : radius.small,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          boxShadow: isDark ? undefined : floating ? SHADOW_FLOAT : variant === 'secondary' ? SHADOW : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} color={fg} strokeWidth={2} />}
          <T size={height >= 52 ? 16 : 14} weight="medium" color={fg}>
            {label}
          </T>
        </>
      )}
    </Pressable>
  );
}

// 동그란 아이콘 버튼 (뒤로, 닫기, 더보기 …)
export function IconButton({
  children,
  onPress,
  label,
  filled,
}: {
  children: ReactNode;
  onPress?: () => void;
  label: string;
  filled?: boolean;
}) {
  const { c, isDark } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? c.card : pressed ? c.surface : 'transparent',
        boxShadow: filled && !isDark ? SHADOW : undefined,
        opacity: pressed && filled ? 0.8 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

// ---------- 배지와 태그 ----------

export function PriorityBadge({ priority, large }: { priority: Priority; large?: boolean }) {
  const { c } = useTheme();
  if (priority < 4) return null;
  const urgent = priority === 5;
  const fg = urgent ? c.urgentFg : c.highFg;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: urgent ? c.urgentBg : c.highBg,
        paddingHorizontal: large ? 10 : 8,
        paddingVertical: large ? 4 : 3,
        borderRadius: large ? 10 : 8,
        alignSelf: 'flex-start',
      }}
    >
      {large && urgent && <Icon name="alert" size={14} color={fg} strokeWidth={2.2} />}
      <T size={large ? 13 : 12} weight="bold" color={fg}>
        {urgent ? '긴급' : '높음'}
        {large ? ` · ${priority}` : ''}
      </T>
    </View>
  );
}

export function Tag({ label, onRemove, large }: { label: string; onRemove?: () => void; large?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onRemove}
      disabled={!onRemove}
      accessibilityLabel={onRemove ? `${label} 태그 지우기` : undefined}
      style={{
        backgroundColor: large ? c.surface2 : c.surface,
        paddingHorizontal: large ? 10 : 8,
        paddingVertical: large ? 4 : 3,
        borderRadius: large ? 10 : 8,
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
      }}
    >
      <T size={large ? 13 : 12} color={c.body}>
        #{label}
      </T>
      {onRemove && <Icon name="close" size={12} color={c.muted} strokeWidth={2.2} />}
    </Pressable>
  );
}

// 읽지 않은 수 동그라미
export function CountBadge({ count }: { count: number }) {
  const { accent, onAccent } = useTheme();
  if (count <= 0) return null;
  return (
    <View
      style={{
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        borderRadius: 10,
        backgroundColor: accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <T size={12} weight="bold" color={onAccent}>
        {count > 99 ? '99+' : count}
      </T>
    </View>
  );
}

export function StatusDot({ ok }: { ok: boolean }) {
  const { c, accent } = useTheme();
  return <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ok ? accent : c.faint }} />;
}

// ---------- 세그먼트 (여러 개 중 하나 고르기) ----------

export function Segmented<V extends string | number>({
  options,
  value,
  onChange,
  height = 40,
  colorFor,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  height?: number;
  colorFor?: (v: V) => string | undefined;
}) {
  const { c, isDark } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4, backgroundColor: c.surface2, borderRadius: height >= 44 ? 16 : 14, padding: 4 }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              height,
              borderRadius: height >= 44 ? 12 : 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? c.card : 'transparent',
              boxShadow: selected && !isDark ? '0 1px 3px rgba(21,23,28,0.12)' : undefined,
            }}
          >
            <T size={13} weight={selected ? 'bold' : 'regular'} color={selected ? c.ink : (colorFor?.(o.value) ?? c.body)}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- 스위치 ----------

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { c, accent } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={{
        width: 52,
        height: 32,
        borderRadius: 16,
        padding: 3,
        backgroundColor: value ? accent : c.surface2,
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(21,23,28,0.2)' }} />
    </Pressable>
  );
}

// ---------- 입력칸 ----------

export function Field({ label, hint, style, mono, ...input }: TextInputProps & { label?: ReactNode; hint?: string; mono?: boolean }) {
  const { c, isDark } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label != null && (
        <T size={13} weight="medium" color={c.muted}>
          {label}
        </T>
      )}
      <TextInput
        placeholderTextColor={c.placeholder}
        {...input}
        style={[
          {
            minHeight: 52,
            borderRadius: radius.input,
            backgroundColor: c.card,
            paddingHorizontal: 16,
            fontFamily: mono ? 'monospace' : font.regular,
            fontSize: mono ? 14 : 15,
            color: c.ink,
            boxShadow: isDark ? undefined : SHADOW,
          },
          style,
        ]}
      />
      {hint && (
        <T size={12} color={c.muted}>
          {hint}
        </T>
      )}
    </View>
  );
}

// ---------- 아래에서 올라오는 시트 ----------

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable accessibilityLabel="닫기" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
        <View
          style={{
            backgroundColor: c.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: insets.bottom + 20,
            gap: 14,
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.surface2 }} />
          {title && (
            <T size={18} weight="bold">
              {title}
            </T>
          )}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// 시트 안의 한 줄짜리 선택지
export function SheetRow({
  label,
  icon,
  onPress,
  danger,
  selected,
  detail,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  danger?: boolean;
  selected?: boolean;
  detail?: string;
}) {
  const { c, accent } = useTheme();
  const color = danger ? c.danger : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        backgroundColor: pressed ? c.surface : 'transparent',
      })}
    >
      {icon && <Icon name={icon} color={color} />}
      <View style={{ flex: 1 }}>
        <T size={15} color={color}>
          {label}
        </T>
        {detail && (
          <T size={12} color={c.muted}>
            {detail}
          </T>
        )}
      </View>
      {selected && <Icon name="check" color={accent} strokeWidth={2.2} />}
    </Pressable>
  );
}
