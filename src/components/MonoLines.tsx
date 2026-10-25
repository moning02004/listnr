// "고정폭 글꼴로 보기"를 켠 토픽의 본문.
// 공백을 2칸 이상 이어 써서 줄을 맞춘 줄(표)만 고정폭으로 그리고, 나머지 문장은 원래 글꼴로 둔다.
// 고정폭 글꼴은 공백·°·· 같은 문자가 넓어서 평범한 문장까지 바꾸면 줄이 늘어져 보이기 때문이다.
import { Text } from 'react-native';
import { font, monoFont } from '@/theme';

// 줄 맨 앞이 공백이거나, 글자 사이에 공백이 2칸 이상 있으면 줄을 맞춘 줄로 본다
const isAligned = (line: string) => /^ +\S|\S {2,}\S/.test(line);

// 고정폭 글꼴의 °는 2칸이라 숫자 뒤에 붙으면 빈 곳이 크게 생긴다.
// 그래서 °만 일반 글꼴(폭 0.37글자)로 그리고 자간을 더해 고정폭 1칸(0.5글자)에 딱 맞춘다.
const DEGREE_EXTRA = 0.5 - 0.37;

function alignedLine(line: string, size: number) {
  return line.split('°').flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <Text key={i} style={{ fontFamily: font.regular, letterSpacing: size * DEGREE_EXTRA }}>
            °
          </Text>,
          part,
        ]
  );
}

// size: 본문 글자 크기 (° 폭을 맞추는 데 쓴다)
export function monoLines(text: string, size: number) {
  return text.split('\n').map((line, i) => {
    const aligned = isAligned(line);
    return (
      <Text key={i} style={aligned ? { fontFamily: monoFont } : undefined}>
        {i > 0 ? '\n' : ''}
        {aligned ? alignedLine(line, size) : line}
      </Text>
    );
  });
}
