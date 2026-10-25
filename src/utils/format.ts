// 시간을 한국어로 보기 좋게 바꾸는 함수들. time은 초 단위 유닉스 시간.

const DAY = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const pad = (n: number) => String(n).padStart(2, '0');

// 오늘 기준 며칠 전인지 (오늘 0, 어제 1)
function daysAgo(time: number) {
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(time * 1000))) / 86400000);
}

// 목록용: 11:32 / 어제 / 월요일 / 10/20
export function shortTime(time: number) {
  const d = new Date(time * 1000);
  const ago = daysAgo(time);
  if (ago <= 0) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (ago === 1) return '어제';
  if (ago < 7) return DAY[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 카드 오른쪽 위 시각: 11:32
export function clock(time: number) {
  const d = new Date(time * 1000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 날짜 구분선: 오늘 / 어제 / 10월 20일 (작년이면 연도도)
export function dayLabel(time: number) {
  const ago = daysAgo(time);
  if (ago <= 0) return '오늘';
  if (ago === 1) return '어제';
  const d = new Date(time * 1000);
  const year = d.getFullYear() !== new Date().getFullYear() ? `${d.getFullYear()}년 ` : '';
  return `${year}${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 상세 화면: 오늘 오전 11:32
export function longTime(time: number) {
  const d = new Date(time * 1000);
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${dayLabel(time)} ${ampm} ${h12}:${pad(d.getMinutes())}`;
}

export function fileSize(bytes?: number) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const hostOf = (url: string) => url.replace(/^https?:\/\//, '');
