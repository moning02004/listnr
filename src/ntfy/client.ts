// ntfy 서버와 HTTP로 이야기하는 함수들.
// 문서: https://docs.ntfy.sh/subscribe/api/

import type { NtfyEvent, Server } from './types';
import { getSecret } from '@/store/secrets';

// ---------- 인증 ----------

function base64(text: string): string {
  // 한글 아이디도 깨지지 않게 UTF-8 바이트로 바꾼 뒤 base64로 만든다
  const bytes = new TextEncoder().encode(text);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | (b << 8) | c;
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? chars[n & 63] : '=';
  }
  return out;
}

export function makeAuthHeader(server: Pick<Server, 'auth' | 'username'>, secret: string | null): Record<string, string> {
  if (server.auth === 'basic' && server.username && secret) {
    return { Authorization: 'Basic ' + base64(`${server.username}:${secret}`) };
  }
  if (server.auth === 'token' && secret) return { Authorization: 'Bearer ' + secret };
  return {};
}

// 브라우저 WebSocket은 헤더를 못 붙여서 ntfy의 ?auth= 쿼리를 쓴다 (헤더 값을 URL-safe base64로)
export function authQueryParam(headers: Record<string, string>): string | null {
  if (!headers.Authorization) return null;
  return base64(headers.Authorization).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function authHeaders(server: Server): Promise<Record<string, string>> {
  if (server.auth === 'none') return {};
  return makeAuthHeader(server, await getSecret(server.url));
}

// ---------- 오류 ----------

export class NtfyError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

async function check(res: Response) {
  if (res.ok) return res;
  if (res.status === 401 || res.status === 403)
    throw new NtfyError('인증에 실패했어요. 아이디·비밀번호나 토큰을 확인해 주세요.', res.status);
  if (res.status === 429) throw new NtfyError('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.', res.status);
  let detail = '';
  try {
    detail = (await res.json()).error ?? '';
  } catch {}
  throw new NtfyError(`서버 오류 (${res.status}) ${detail}`.trim(), res.status);
}

// ---------- 서버 확인 ----------

export async function checkHealth(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/v1/health`);
    if (!res.ok) return false;
    const body = await res.json();
    return body.healthy === true;
  } catch {
    return false;
  }
}

// 이 토픽을 읽을 권한이 있는지 확인. 실패하면 NtfyError를 던진다.
export async function checkAccess(server: Server, topic: string, headers?: Record<string, string>) {
  const res = await fetch(`${server.url}/${topic}/auth`, { headers: headers ?? (await authHeaders(server)) });
  await check(res);
}

// ---------- 받기 (한 번에 가져오기) ----------

// since: 메시지 id, 유닉스 시간(초), 또는 'all'
export async function poll(server: Server, topic: string, since: string = 'all'): Promise<NtfyEvent[]> {
  const res = await fetch(`${server.url}/${topic}/json?poll=1&since=${encodeURIComponent(since)}`, {
    headers: await authHeaders(server),
  });
  await check(res);
  const text = await res.text();
  // 한 줄에 JSON 하나씩 온다
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as NtfyEvent)
    .filter((e) => e.event === 'message' || e.event === 'message_delete' || e.event === 'message_clear');
}

// 알림의 http 액션 버튼을 눌렀을 때
export async function runHttpAction(a: { url: string; method?: string; headers?: Record<string, string>; body?: string }) {
  const res = await fetch(a.url, { method: a.method ?? 'POST', headers: a.headers, body: a.body });
  if (!res.ok) throw new NtfyError(`요청이 실패했어요 (${res.status})`, res.status);
}

// 무작위 토픽 이름 (공용 서버에서 남이 추측하기 어렵게)
export function randomTopic(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const TOPIC_RE = /^[-_A-Za-z0-9]{1,64}$/;
