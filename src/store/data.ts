import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jsonStorage } from './storage';
import type { NtfyEvent, Priority, Server, StoredMessage, Subscription } from '@/ntfy/types';

// 서버, 구독, 받은 메시지를 들고 있는 저장소.
// 화면에서는 const subs = useData((s) => s.subscriptions); 처럼 필요한 것만 꺼내 쓴다.

const MAX_PER_TOPIC = 500;

type DataState = {
  servers: Server[];
  subscriptions: Subscription[];
  messages: Record<string, StoredMessage[]>; // 구독 id → 메시지 (최신이 앞)

  upsertServer: (server: Server) => void;
  removeServer: (url: string) => void;

  addSubscription: (server: string, topic: string, instant: boolean) => Subscription;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;

  addEvents: (subId: string, events: NtfyEvent[]) => void;
  markAllRead: (subId: string) => void;
  deleteMessage: (subId: string, messageId: string) => void;
  clearMessages: (subId: string) => void;
  prune: (retentionDays: number) => void;
};

export const normalizeUrl = (url: string) => {
  let u = url.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//.test(u)) u = 'https://' + u;
  return u;
};

const toStored = (subId: string, e: NtfyEvent): StoredMessage => ({
  id: e.id,
  seq: e.sequence_id ?? e.id,
  subId,
  time: e.time,
  title: e.title,
  message: e.message ?? '',
  priority: (e.priority ?? 3) as Priority,
  tags: e.tags ?? [],
  click: e.click,
  actions: e.actions,
  attachment: e.attachment,
  markdown: e.content_type === 'text/markdown',
  read: false,
});

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      servers: [],
      subscriptions: [],
      messages: {},

      upsertServer: (server) =>
        set((s) => ({
          servers: [...s.servers.filter((x) => x.url !== server.url), server],
        })),

      removeServer: (url) => set((s) => ({ servers: s.servers.filter((x) => x.url !== url) })),

      addSubscription: (server, topic, instant) => {
        const existing = get().subscriptions.find((x) => x.server === server && x.topic === topic);
        if (existing) return existing;
        const sub: Subscription = {
          id: Math.random().toString(36).slice(2, 10),
          server,
          topic,
          muted: false,
          instant,
          createdAt: Date.now(),
        };
        set((s) => ({ subscriptions: [...s.subscriptions, sub] }));
        return sub;
      },

      updateSubscription: (id, patch) =>
        set((s) => ({
          subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      removeSubscription: (id) =>
        set((s) => {
          const messages = { ...s.messages };
          delete messages[id];
          return { subscriptions: s.subscriptions.filter((x) => x.id !== id), messages };
        }),

      // 서버에서 받은 이벤트를 저장한다.
      // - message: 같은 id는 한 번만, 같은 sequence_id면 이전 것을 새 내용으로 바꾼다 (알림 수정 기능)
      // - message_delete: 그 알림을 지운다 / message_clear: 읽음으로 바꾼다
      addEvents: (subId, events) =>
        set((s) => {
          let list = s.messages[subId] ?? [];
          let lastId: string | undefined;
          for (const e of events) {
            const seq = e.sequence_id ?? e.id;
            if (e.event === 'message') {
              if (list.some((m) => m.id === e.id)) continue;
              list = [toStored(subId, e), ...list.filter((m) => (m.seq ?? m.id) !== seq)];
              lastId = e.id;
            } else if (e.event === 'message_delete') {
              list = list.filter((m) => (m.seq ?? m.id) !== seq);
              lastId = e.id;
            } else if (e.event === 'message_clear') {
              list = list.map((m) => ((m.seq ?? m.id) === seq ? { ...m, read: true } : m));
              lastId = e.id;
            }
          }
          list = [...list].sort((a, b) => b.time - a.time).slice(0, MAX_PER_TOPIC);
          return {
            messages: { ...s.messages, [subId]: list },
            subscriptions: lastId ? s.subscriptions.map((x) => (x.id === subId ? { ...x, lastId } : x)) : s.subscriptions,
          };
        }),

      markAllRead: (subId) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [subId]: (s.messages[subId] ?? []).map((m) => (m.read ? m : { ...m, read: true })),
          },
        })),

      deleteMessage: (subId, messageId) =>
        set((s) => ({
          messages: { ...s.messages, [subId]: (s.messages[subId] ?? []).filter((m) => m.id !== messageId) },
        })),

      clearMessages: (subId) => set((s) => ({ messages: { ...s.messages, [subId]: [] } })),

      prune: (retentionDays) =>
        set((s) => {
          const cutoff = Date.now() / 1000 - retentionDays * 86400;
          const messages: DataState['messages'] = {};
          for (const [id, list] of Object.entries(s.messages)) {
            messages[id] = list.filter((m) => m.time >= cutoff);
          }
          return { messages };
        }),
    }),
    {
      name: 'data',
      storage: jsonStorage,
      // 함수는 저장하지 않고 데이터만 저장한다
      partialize: (s) => ({ servers: s.servers, subscriptions: s.subscriptions, messages: s.messages }),
      version: 1,
      // v1: 토픽별 '알림 끄기'를 없앴다. 꺼져 있던 토픽이 그대로 묻히지 않도록 다시 켠다.
      migrate: (persisted, version) => {
        const state = persisted as { subscriptions?: Subscription[] };
        if (version < 1 && state.subscriptions) {
          state.subscriptions = state.subscriptions.map((s) => ({ ...s, muted: false }));
        }
        return state as never;
      },
    }
  )
);

// 자주 쓰는 계산들
export const subName = (sub: Subscription) => sub.name?.trim() || sub.topic;
export const unreadCount = (list: StoredMessage[] | undefined) => (list ?? []).reduce((n, m) => n + (m.read ? 0 : 1), 0);
