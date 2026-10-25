// 앱이 켜져 있는 동안 서버와 WebSocket 연결을 유지해서 새 메시지를 바로 받는다.
// 앱이 꺼져 있을 때 받는 일은 APK에 들어가는 백그라운드 서비스(modules/ntfy-listener)가 맡는다.
//
// 흐름: 앱이 화면에 나오면
//   1) 구독마다 놓친 메시지를 poll로 한 번에 가져오고
//   2) 서버마다 WebSocket 하나로 그 서버의 토픽을 모두 구독한다 (/토픽1,토픽2/ws)
// 앱이 뒤로 가면 연결을 닫는다.

import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { authHeaders, authQueryParam, poll } from './client';
import type { NtfyEvent, Server, Subscription } from './types';
import { useData } from '@/store/data';
import { useStatus } from '@/store/status';
import { useSettings } from '@/store/settings';

type Conn = {
  key: string; // 서버 주소 + 토픽 목록. 바뀌면 다시 연결한다
  ws: WebSocket | null;
  retry: number;
  timer?: ReturnType<typeof setTimeout>;
  closed: boolean;
};

const conns = new Map<string, Conn>(); // 서버 주소 → 연결

function wsUrl(server: string, topics: string[], since: number) {
  const base = server.replace(/^http/, 'ws'); // https → wss, http → ws
  return `${base}/${topics.join(',')}/ws?since=${since}`;
}

function handleEvent(serverUrl: string, e: NtfyEvent) {
  if (e.event !== 'message' && e.event !== 'message_delete' && e.event !== 'message_clear') return;
  const { subscriptions, addEvents } = useData.getState();
  const sub = subscriptions.find((s) => s.server === serverUrl && s.topic === e.topic);
  if (sub) addEvents(sub.id, [e]);
}

// 구독 하나의 놓친 메시지 가져오기 (당겨서 새로고침에도 쓴다)
export async function refreshSubscription(sub: Subscription) {
  const server = useData.getState().servers.find((s) => s.url === sub.server);
  if (!server) return;
  const events = await poll(server, sub.topic, sub.lastId ?? 'all');
  useData.getState().addEvents(sub.id, events);
}

async function open(server: Server, topics: string[], key: string) {
  const setStatus = useStatus.getState().setStatus;
  const conn: Conn = conns.get(server.url) ?? { key, ws: null, retry: 0, closed: false };
  conn.key = key;
  conn.closed = false;
  conns.set(server.url, conn);
  setStatus(server.url, 'connecting');

  const startedAt = Math.floor(Date.now() / 1000) - 5;

  // 1) 놓친 메시지 채우기
  const subs = useData.getState().subscriptions.filter((s) => s.server === server.url);
  try {
    await Promise.all(subs.map(refreshSubscription));
  } catch {
    // poll이 실패해도 WebSocket은 시도해 본다
  }
  if (conn.closed) return;

  // 2) 실시간 연결. since를 poll 직전 시각으로 두면 사이에 온 메시지도 빠지지 않는다 (중복은 저장할 때 걸러진다)
  const headers = await authHeaders(server);
  let ws: WebSocket;
  if (Platform.OS === 'web') {
    // 웹 미리보기용: 브라우저는 WebSocket에 헤더를 못 붙인다
    const auth = authQueryParam(headers);
    ws = new WebSocket(wsUrl(server.url, topics, startedAt) + (auth ? `&auth=${auth}` : ''));
  } else {
    // React Native의 WebSocket은 세 번째 인자로 헤더를 받을 수 있다
    ws = new (WebSocket as any)(wsUrl(server.url, topics, startedAt), undefined, { headers }) as WebSocket;
  }
  conn.ws = ws;

  ws.onopen = () => {
    conn.retry = 0;
    setStatus(server.url, 'connected');
  };
  ws.onmessage = (msg) => {
    try {
      handleEvent(server.url, JSON.parse(String(msg.data)));
    } catch {}
  };
  ws.onerror = () => setStatus(server.url, 'error');
  ws.onclose = () => {
    if (conn.ws !== ws || conn.closed) return;
    setStatus(server.url, 'error');
    // 1초, 2초, 4초 … 최대 30초 간격으로 다시 연결
    const wait = Math.min(30000, 1000 * 2 ** conn.retry++);
    conn.timer = setTimeout(() => {
      if (!conn.closed) open(server, topics, key);
    }, wait);
  };
}

function close(url: string) {
  const conn = conns.get(url);
  if (!conn) return;
  conn.closed = true;
  if (conn.timer) clearTimeout(conn.timer);
  conn.ws?.close();
  conn.ws = null;
  conns.delete(url);
  useStatus.getState().setStatus(url, 'idle');
}

// 지금 구독 목록에 맞게 연결을 열고 닫는다
function reconcile() {
  const { servers, subscriptions } = useData.getState();
  const wanted = new Map<string, { server: Server; topics: string[] }>();
  for (const sub of subscriptions) {
    const server = servers.find((s) => s.url === sub.server);
    if (!server) continue;
    const entry = wanted.get(server.url) ?? { server, topics: [] };
    entry.topics.push(sub.topic);
    wanted.set(server.url, entry);
  }

  for (const url of [...conns.keys()]) {
    if (!wanted.has(url)) close(url);
  }
  for (const [url, { server, topics }] of wanted) {
    const sorted = [...new Set(topics)].sort();
    const key = `${url}|${server.auth}|${server.username ?? ''}|${sorted.join(',')}`;
    const conn = conns.get(url);
    if (conn && conn.key === key) continue;
    if (conn) close(url);
    open(server, sorted, key);
  }
}

function closeAll() {
  for (const url of [...conns.keys()]) close(url);
}

// 루트 레이아웃에서 한 번 부르면 된다
export function useLiveSync() {
  useEffect(() => {
    let active = AppState.currentState === 'active';
    if (active) reconcile();

    // 오래된 메시지 정리
    useData.getState().prune(useSettings.getState().retentionDays);

    const appSub = AppState.addEventListener('change', (state) => {
      const nowActive = state === 'active';
      if (nowActive && !active) reconcile();
      if (!nowActive && active) closeAll();
      active = nowActive;
    });

    // 서버나 구독이 바뀌면 다시 맞춘다
    const unsub = useData.subscribe((s, prev) => {
      if (active && (s.subscriptions !== prev.subscriptions || s.servers !== prev.servers)) {
        // lastId만 바뀐 경우에도 불리지만, 키가 같으면 아무것도 하지 않는다
        reconcile();
      }
    });

    return () => {
      appSub.remove();
      unsub();
      closeAll();
    };
  }, []);
}

// 인증 정보를 바꿨을 때처럼 키가 같아도 강제로 다시 연결하고 싶을 때
export function reconnectServer(url: string) {
  close(url);
  reconcile();
}
