// 디자인 시안의 색·모서리·그림자를 한곳에 모아 둔 파일.
// 색을 바꾸고 싶으면 여기만 고치면 된다.

export type Palette = {
  bg: string; // 화면 바탕
  card: string; // 흰 카드
  surface: string; // 아이콘 배경, 칩 배경
  surface2: string; // 세그먼트 바탕, 날짜 구분선
  line: string; // 구분선
  ink: string; // 제목 글자
  body: string; // 본문 글자
  muted: string; // 보조 글자
  faint: string; // 화살표 같은 아주 옅은 아이콘
  placeholder: string;
  danger: string;
  urgentFg: string;
  urgentBg: string;
  highFg: string;
  highBg: string;
  shadow: string;
};

export const light: Palette = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  surface: '#EEF0F3',
  surface2: '#E9EBEF',
  line: '#EEF0F3',
  ink: '#15171C',
  body: '#3F4652',
  muted: '#5E6470',
  faint: '#9AA0AA',
  placeholder: '#7A808B',
  danger: '#B91C1C',
  urgentFg: '#B91C1C',
  urgentBg: '#FDECEC',
  highFg: '#92400E',
  highBg: '#FDF1E2',
  shadow: '#15171C',
};

export const dark: Palette = {
  bg: '#0F1114',
  card: '#1A1D22',
  surface: '#262A31',
  surface2: '#22262C',
  line: '#262A31',
  ink: '#F2F3F5',
  body: '#C5CAD3',
  muted: '#9AA0AA',
  faint: '#6B717C',
  placeholder: '#7D838E',
  danger: '#F87171',
  urgentFg: '#FCA5A5',
  urgentBg: '#3A1B1D',
  highFg: '#F5B97A',
  highBg: '#3A2A18',
  shadow: '#000000',
};

// 포인트 색. 설정 화면에서 고를 수 있다. 다크 모드에서는 대비를 위해 밝은 쪽을 쓴다.
export const ACCENTS = {
  teal: { name: '청록', light: '#2F7D6D', dark: '#5BB8A5', onLight: '#FFFFFF', onDark: '#0F1114' },
  blue: { name: '파랑', light: '#3B5BDB', dark: '#8EA2F2', onLight: '#FFFFFF', onDark: '#0F1114' },
  rust: { name: '테라코타', light: '#B4532A', dark: '#E8946C', onLight: '#FFFFFF', onDark: '#0F1114' },
  ink: { name: '먹색', light: '#15171C', dark: '#F2F3F5', onLight: '#FFFFFF', onDark: '#0F1114' },
} as const;

export type AccentKey = keyof typeof ACCENTS;

export const radius = {
  chip: 8,
  small: 12,
  input: 16,
  button: 18,
  card: 20,
  list: 22,
};

export const font = {
  regular: 'NotoSansKR_400Regular',
  medium: 'NotoSansKR_500Medium',
  bold: 'NotoSansKR_700Bold',
};

// 고정폭 글꼴. 영문·숫자는 1칸, 한글과 °·㎍ 같은 기호는 정확히 2칸이라 줄을 맞춰 보낸 메시지가 어긋나지 않는다
export const monoFont = 'NanumGothicCoding_400Regular';
