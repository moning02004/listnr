import { create } from 'zustand';

// 서버별 연결 상태. 저장하지 않고 앱이 켜져 있는 동안만 쓴다.
export type ConnState = 'connecting' | 'connected' | 'error' | 'idle';

type StatusState = {
  servers: Record<string, ConnState>;
  setStatus: (url: string, state: ConnState) => void;
};

export const useStatus = create<StatusState>((set) => ({
  servers: {},
  setStatus: (url, state) => set((s) => ({ servers: { ...s.servers, [url]: state } })),
}));

export const STATUS_LABEL: Record<ConnState, string> = {
  connecting: '연결 중',
  connected: '연결됨',
  error: '연결 안 됨',
  idle: '대기',
};
