import * as SecureStore from 'expo-secure-store';

// 서버 비밀번호·토큰은 일반 저장소가 아니라 암호화된 SecureStore에 둔다.
// SecureStore 키에는 영문·숫자·._- 만 쓸 수 있어서 주소를 바꿔 준다.
const keyFor = (serverUrl: string) => 'auth_' + serverUrl.replace(/[^a-zA-Z0-9._-]/g, '_');

// 매번 비동기로 읽지 않도록 한 번 읽은 값은 메모리에 들고 있는다.
const cache = new Map<string, string | null>();

export async function getSecret(serverUrl: string): Promise<string | null> {
  if (cache.has(serverUrl)) return cache.get(serverUrl) ?? null;
  const value = await SecureStore.getItemAsync(keyFor(serverUrl));
  cache.set(serverUrl, value);
  return value;
}

export async function setSecret(serverUrl: string, value: string | null) {
  cache.set(serverUrl, value);
  if (value) await SecureStore.setItemAsync(keyFor(serverUrl), value);
  else await SecureStore.deleteItemAsync(keyFor(serverUrl));
}
