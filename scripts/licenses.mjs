// 앱에 들어가는 오픈소스 라이브러리 목록을 만든다 → src/generated/licenses.json
// package-lock.json에서 개발용(dev)이 아닌 패키지만 골라 이름·버전·라이선스·주소를 적는다.
// 의존성을 바꾼 뒤에는 `npm run licenses`로 다시 만든다. (CI가 최신인지 확인한다)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));

// npm에 없는 안드로이드 네이티브 라이브러리 (백그라운드 모듈이 직접 쓰는 것)
const NATIVE = [
  { name: 'OkHttp', version: '4.9.2', license: 'Apache-2.0', url: 'https://github.com/square/okhttp' },
  { name: 'AndroidX Core KTX', version: '1.17.0', license: 'Apache-2.0', url: 'https://developer.android.com/jetpack/androidx/releases/core' },
];

function repoUrl(pkgDir) {
  const file = join(root, pkgDir, 'package.json');
  if (!existsSync(file)) return undefined;
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  let url = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  if (!url) return pkg.homepage;
  url = url.replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:\/\//, 'https://');
  if (/^github:/.test(url)) url = 'https://github.com/' + url.slice(7);
  if (/^[\w.-]+\/[\w.-]+$/.test(url)) url = 'https://github.com/' + url; // "owner/repo" 줄임 표기
  return url.startsWith('http') ? url : pkg.homepage;
}

const seen = new Map();
for (const [path, info] of Object.entries(lock.packages)) {
  if (!path || info.dev || info.devOptional || info.link) continue;
  // 운영체제별 빌드 도구(lightningcss-darwin-arm64 등)는 앱에 안 들어가고, PC마다 설치되는 게 달라서 뺀다
  if (info.os || info.cpu) continue;
  const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
  const key = `${name}@${info.version}`;
  if (seen.has(key)) continue;
  const url = repoUrl(path) ?? `https://www.npmjs.com/package/${name}`;
  seen.set(key, { name, version: info.version, license: info.license ?? 'UNKNOWN', url });
}

const list = [...seen.values(), ...NATIVE].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
const out = join(root, 'src/generated/licenses.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(list, null, 1) + '\n');
console.log(`licenses: ${list.length} packages → ${out.replace(root + '/', '')}`);
