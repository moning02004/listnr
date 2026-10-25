// 마크다운 본문 (ntfy에서 "Markdown: yes"로 보낸 메시지만 이걸로 그린다)
import { type ReactNode, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Renderer, useMarkdown, type MarkedStyles } from 'react-native-marked';
import { font, useTheme } from '@/theme';

type Props = {
  text: string;
  size?: number;
  lineHeight?: number;
  color?: string;
  selectable?: boolean;
};

export function Markdown({ text, size = 14, lineHeight = 22, color, selectable = false }: Props) {
  const { c, accent, isDark } = useTheme();
  const textColor = color ?? c.body;

  // 앱 글꼴(Noto Sans KR)은 굵기마다 글꼴 이름이 달라서 fontWeight 대신 fontFamily로 정한다
  const styles = useMemo<MarkedStyles>(() => {
    const heading = (scale: number) => ({
      fontFamily: font.bold,
      fontWeight: 'normal' as const,
      fontSize: Math.round(size * scale),
      lineHeight: Math.round(lineHeight * scale),
      color: c.ink,
      marginVertical: 0,
      paddingVertical: 2,
    });
    return {
      text: { fontFamily: font.regular, fontSize: size, lineHeight, color: textColor },
      paragraph: { paddingVertical: 2, marginVertical: 0 },
      strong: { fontFamily: font.bold, fontWeight: 'normal' },
      em: { fontStyle: 'italic' },
      link: { color: accent, textDecorationLine: 'underline' },
      h1: heading(1.5),
      h2: heading(1.3),
      h3: heading(1.15),
      h4: heading(1.05),
      h5: heading(1),
      h6: heading(1),
      codespan: { fontFamily: 'monospace', fontSize: size - 1, backgroundColor: c.surface, color: c.ink },
      code: { backgroundColor: c.surface, borderRadius: 10, padding: 10, marginVertical: 4 },
      codeText: { fontFamily: 'monospace', fontSize: size - 1, lineHeight: lineHeight - 2, color: c.ink },
      blockquote: { borderLeftColor: c.line, borderLeftWidth: 3, paddingLeft: 10, marginVertical: 4, opacity: 0.85 },
      hr: { backgroundColor: c.line, height: 1, marginVertical: 8 },
      li: { fontFamily: font.regular, fontSize: size, lineHeight, color: textColor },
    };
  }, [c, accent, textColor, size, lineHeight]);

  // 렌더할 때마다 새 객체를 넘기면 라이브러리가 매번 다시 파싱하므로 묶어 둔다
  const theme = useMemo(
    () => ({ colors: { text: textColor, link: accent, code: c.surface, border: c.line } }),
    [textColor, accent, c]
  );
  const renderer = useMemo(
    () => new AppRenderer({ selectable, border: c.line, headerBg: c.surface, rowHeight: lineHeight }),
    [selectable, c, lineHeight]
  );

  const elements = useMarkdown(text, { colorScheme: isDark ? 'dark' : 'light', theme, styles, renderer });

  return <View>{elements}</View>;
}

type TableLook = { selectable: boolean; border: string; headerBg: string; rowHeight: number };

// 라이브러리 기본 표는 칸마다 화면 너비의 43%를 줘서 너무 넓다.
// 표만 직접 그려서 칸 너비가 내용에 맞게 정해지도록 한다.
class AppRenderer extends Renderer {
  private look: TableLook;

  constructor(look: TableLook) {
    super({ selectable: look.selectable });
    this.look = look;
  }

  table(header: ReactNode[][], rows: ReactNode[][][]): ReactNode {
    return <MarkdownTable key={this.getKey()} header={header} rows={rows} look={this.look} />;
  }
}

// 열 단위로 쌓아서 각 열이 가장 긴 칸에 맞춰 줄어들게 한다.
// 줄 높이를 고정해야 열끼리 행이 어긋나지 않는다. 화면보다 넓으면 옆으로 스크롤된다.
function MarkdownTable({ header, rows, look }: { header: ReactNode[][]; rows: ReactNode[][][]; look: TableLook }) {
  const line = StyleSheet.hairlineWidth;
  const cell = { height: look.rowHeight + 8, paddingHorizontal: 8, justifyContent: 'center' as const };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
      <View style={{ flexDirection: 'row', borderWidth: line, borderColor: look.border, borderRadius: 10, overflow: 'hidden' }}>
        {header.map((head, col) => (
          <View key={col} style={{ borderLeftWidth: col ? line : 0, borderColor: look.border }}>
            <View style={[cell, { backgroundColor: look.headerBg }]}>{head}</View>
            {rows.map((row, r) => (
              <View key={r} style={[cell, { borderTopWidth: line, borderColor: look.border }]}>
                {row[col]}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
