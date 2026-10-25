// ntfy 서버가 보내 주는 메시지 모양 (https://docs.ntfy.sh/subscribe/api/#json-message-format)

export type NtfyAction =
  | { action: 'view'; label: string; url: string; clear?: boolean }
  | {
      action: 'http';
      label: string;
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      clear?: boolean;
    }
  | { action: 'broadcast'; label: string; clear?: boolean };

export type NtfyAttachment = {
  name: string;
  url: string;
  type?: string;
  size?: number;
  expires?: number;
};

export type NtfyEvent = {
  id: string;
  sequence_id?: string; // 같은 알림을 수정·삭제할 때 쓰는 id (없으면 id와 같다)
  time: number; // 초 단위 유닉스 시간
  event: 'open' | 'keepalive' | 'message' | 'poll_request' | 'message_delete' | 'message_clear' | string;
  topic: string;
  title?: string;
  message?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  click?: string;
  icon?: string;
  actions?: NtfyAction[];
  attachment?: NtfyAttachment;
  content_type?: string; // 'text/markdown'이면 마크다운 본문
};

export type Priority = 1 | 2 | 3 | 4 | 5;

export const PRIORITY_LABEL: Record<Priority, string> = {
  1: '최소',
  2: '낮음',
  3: '보통',
  4: '높음',
  5: '긴급',
};

export type AuthType = 'none' | 'basic' | 'token';

export type Server = {
  url: string; // 끝에 / 없는 주소. 예: https://ntfy.example.com
  auth: AuthType;
  username?: string; // 비밀번호와 토큰은 SecureStore에 따로 저장
};

export type Subscription = {
  id: string;
  server: string; // Server.url
  topic: string;
  name?: string; // 앱에서만 쓰는 표시 이름. 없으면 topic을 보여 준다
  muted: boolean; // 예전 '알림 끄기' 값. 지금은 화면에서 바꿀 수 없어서 항상 false
  mono?: boolean; // 본문을 고정폭 글꼴로 보여 줄지 (줄을 맞춰 보내는 토픽용)
  instant: boolean; // 앱이 꺼져 있어도 백그라운드에서 받기 (APK 전용)
  createdAt: number;
  lastId?: string; // 마지막으로 받은 메시지 id. 다음 연결 때 since= 로 쓴다
};

export type StoredMessage = {
  id: string;
  seq: string; // sequence_id (수정되면 같은 seq의 이전 메시지를 바꿔 끼운다)
  subId: string;
  time: number;
  title?: string;
  message: string;
  priority: Priority;
  tags: string[];
  click?: string;
  actions?: NtfyAction[];
  attachment?: NtfyAttachment;
  markdown?: boolean; // 본문을 마크다운으로 그릴지
  read: boolean;
};

export const DEFAULT_SERVER = 'https://ntfy.sh';
