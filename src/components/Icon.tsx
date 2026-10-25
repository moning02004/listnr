import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import type { ReactNode } from 'react';

// 시안에 쓴 선 아이콘들. <Icon name="search" color={c.muted} /> 처럼 쓴다.
const ICONS: Record<string, ReactNode> = {
  pencil: (
    <>
      <Path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <Path d="M13.5 6.5l4 4" />
    </>
  ),
  sliders: (
    <>
      <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <Circle cx="16" cy="7" r="2" />
      <Circle cx="8" cy="17" r="2" />
    </>
  ),
  // 톱니바퀴 (설정)
  settings: (
    <>
      <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-3.5-3.5" />
    </>
  ),
  server: (
    <>
      <Rect x="4" y="4" width="16" height="6" rx="2" />
      <Rect x="4" y="14" width="16" height="6" rx="2" />
      <Path d="M8 7h.01M8 17h.01" />
    </>
  ),
  database: (
    <>
      <Ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <Path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
    </>
  ),
  branch: (
    <>
      <Circle cx="6" cy="6" r="2" />
      <Circle cx="6" cy="18" r="2" />
      <Circle cx="18" cy="8" r="2" />
      <Path d="M6 8v8M18 10c0 4-6 3-10.5 6.5" />
    </>
  ),
  activity: <Path d="M3 12h4l3-7 4 14 3-7h4" />,
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </>
  ),
  bell: <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0" />,
  bellOff: <Path d="M6 8a6 6 0 0 1 9.5-4.9M18 11v3l2 3H8M10 20a2 2 0 0 0 4 0M3 3l18 18" />,
  back: <Path d="M15 5l-7 7 7 7" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  alert: <Path d="M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
  file: (
    <>
      <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <Path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  image: (
    <>
      <Rect x="3" y="4" width="18" height="16" rx="3" />
      <Circle cx="9" cy="10" r="2" />
      <Path d="M21 16l-5-5-9 9" />
    </>
  ),
  download: <Path d="M12 4v12M6 11l6 6 6-6M5 20h14" />,
  copy: (
    <>
      <Rect x="8" y="8" width="12" height="12" rx="2" />
      <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  share: <Path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />,
  trash: <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  chevronDown: <Path d="M6 9l6 6 6-6" />,
  chevronRight: <Path d="M9 6l6 6-6 6" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  send: <Path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" />,
  paperclip: <Path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" />,
  link: <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  clock: (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Path d="M12 8v4l3 2" />
    </>
  ),
  shuffle: <Path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />,
  globe: (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16" />
    </>
  ),
  check: <Path d="M5 12l5 5 9-10" />,
  battery: (
    <>
      <Rect x="3" y="7" width="16" height="10" rx="2" />
      <Path d="M22 11v2M7 10v4" />
    </>
  ),
};

export type IconName = keyof typeof ICONS;

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 20, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </Svg>
  );
}

// 세 점 아이콘은 채워진 원이라 따로 둔다
export function MoreIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx="12" cy="5" r="1.8" />
      <Circle cx="12" cy="12" r="1.8" />
      <Circle cx="12" cy="19" r="1.8" />
    </Svg>
  );
}

// 토픽 이름을 보고 어울리는 아이콘을 고른다
export function iconForTopic(topic: string): IconName {
  const t = topic.toLowerCase();
  if (/backup|db|database|sql|storage/.test(t)) return 'database';
  if (/git|ci|build|deploy|action/.test(t)) return 'branch';
  if (/alert|grafana|monitor|metric|uptime|prom/.test(t)) return 'activity';
  if (/remind|daily|morning|todo|habit/.test(t)) return 'sun';
  if (/server|home|nas|host|docker|infra/.test(t)) return 'server';
  return 'bell';
}
