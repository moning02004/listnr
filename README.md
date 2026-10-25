# 리스너 (Listnr)

[ntfy](https://ntfy.sh) 호환 서버에서 알림을 **받기만** 하는 안드로이드 앱이에요. 받기에 필요한 기능만 남기고 화면을 단순하고 깔끔하게 만들었어요.

> [!NOTE]
> ntfy 서버와 호환되는 비공식 클라이언트이며, ntfy 프로젝트 및 ntfy LLC와 관계없어요.

> [!IMPORTANT]
> **이 프로젝트는 전부 AI로 만들었어요.**
> 코드, 문서, 아이콘을 모두 AI 코딩 도구(Anthropic의 [Claude Code](https://claude.com/claude-code))가 작성했어요.
> 사람이 코드를 한 줄씩 검토하지는 않았으니, 참고하거나 가져다 쓸 때 이 점을 감안해 주세요.

*An Android client that only receives notifications from [ntfy](https://ntfy.sh)-compatible servers. Unofficial, not affiliated with ntfy LLC. **Written entirely by AI (Claude Code)**; the human author only set requirements and tested on a real device.*

## 기능

- 토픽 구독 / 구독 목록 / 검색
- 알림 상세 (우선순위, 태그, 첨부 파일, 액션 버튼, 클릭 링크)
- 셀프호스팅 서버 + 인증 (아이디·비밀번호, 토큰). 설정에서 서버마다 등록해 두고, 구독할 때 고르기만 해요
- 앱이 꺼져 있어도 알림 받기 (APK로 설치했을 때만)
- 토픽별 "즉시 전달" 켜기·끄기 (토픽 화면의 종 버튼)
- 방해 금지 시간, 보관 기간, 라이트/다크 모드, 포인트 색
- 받기 전용 (메시지 보내기 기능은 없어요)

## 만든 도구

- [Expo](https://expo.dev) SDK 58 · React Native · TypeScript · Expo Router
- 백그라운드 수신: Kotlin으로 만든 Expo 로컬 모듈 (`modules/ntfy-listener`)

---

## 실행해 보기 (Expo Go)

준비물: Node.js 22 이상, 휴대폰의 **Expo Go** 앱, PC와 휴대폰이 같은 Wi-Fi

```
npm install
npm start
```

터미널에 나온 QR 코드를 Expo Go로 찍으면 열려요.

> Expo Go에서는 **앱을 켜 놓은 동안만** 알림을 받아요. 백그라운드 수신 모듈은 APK에만 들어가요.

## 설치하기

[Releases](https://github.com/moning02004/listnr/releases)에서 최신 `listnr-X.Y.Z.apk`를 받아 설치하면 돼요.

## APK 만들기

### 방법 1. GitHub Actions (릴리스)

`1.2.0`처럼 버전 태그를 올리면 Actions가 APK를 빌드해서 Releases에 올려요. 앱의 **설정 › 앱 정보 › 버전**에는 이 버전이 그대로 보여요.

```
git tag 1.0.0
git push origin 1.0.0
```

서명 키를 쓰려면 저장소의 Actions 시크릿을 설정해요. 자세한 내용은 `.github/workflows/release.yml` 맨 위에 있어요.
시크릿이 없으면 디버그 키로 서명돼요.

### 방법 2. EAS 클라우드 빌드 (Android Studio 필요 없음)

```
npx eas-cli@latest login
npm run build:apk
```

처음에는 프로젝트와 키스토어를 만들지 물어봐요. 끝나면 다운로드 링크가 나와요.

### 방법 3. 내 PC에서 빌드 (Android SDK, JDK 17 필요)

```
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

APK는 `android/app/build/outputs/apk/release/`에 생겨요. 이 방법은 기본 디버그 키로 서명되니 개인용으로만 쓰세요.

### 설치 후 꼭 할 것

1. 처음 실행하면 나오는 **알림 권한**을 허용해요.
2. **설정 › 백그라운드 수신 › 배터리 최적화 제외**를 허용해요. 안 하면 휴대폰이 절전하면서 연결을 끊을 수 있어요.
3. 백그라운드로 받을 토픽은 **즉시 전달**을 켜 두세요 (구독할 때 기본으로 켜져 있어요).

상태바에 "알림 받는 중" 알림이 계속 떠 있는 건 정상이에요. 안드로이드가 백그라운드 연결을 허락하는 조건이에요.
보기 싫으면 그 알림을 길게 눌러 "백그라운드 연결" 채널을 꺼도 돼요 (연결은 유지돼요).

## 알림 보내서 테스트하기

토픽을 구독한 뒤, 아무 터미널에서:

```
curl -d "안녕하세요" ntfy.sh/내토픽이름
curl -H "Priority: 5" -H "Tags: disk,nas" -d "디스크 사용량 92%" ntfy.sh/내토픽이름
curl -H "Title: Backup done" -H "Click: https://example.com" -d "야간 백업 완료" ntfy.sh/내토픽이름
```

내 서버라면 `ntfy.sh` 대신 서버 주소(예: `ntfy.example.com`)를 쓰고, 인증이 있으면 `-u 아이디:비밀번호`를 붙여요.

---

## 폴더 구조

| 위치 | 내용 |
|---|---|
| `src/app/` | 화면. 파일 하나가 화면 하나예요 (Expo Router) |
| `src/app/index.tsx` | 홈 · 구독 목록 |
| `src/app/topic/[id].tsx` | 토픽 피드 |
| `src/app/message/[subId]/[id].tsx` | 알림 상세 |
| `src/app/subscribe.tsx` | 토픽 구독 |
| `src/app/settings.tsx` | 설정 · 서버 관리 |
| `src/components/` | 버튼, 카드, 서버 편집 시트 같은 공용 부품과 아이콘 |
| `src/theme/tokens.ts` | 색·모서리·글꼴 |
| `src/ntfy/client.ts` | ntfy 서버와 통신 (받기, 인증 확인) |
| `src/ntfy/live.ts` | 앱이 켜져 있을 때 실시간 연결 (WebSocket) |
| `src/store/` | 저장소: 서버·구독·메시지(`data.ts`), 설정(`settings.ts`), 비밀번호(`secrets.ts`) |
| `src/native/listener.ts` | 백그라운드 알림 모듈과 연결하는 부분 |
| `modules/ntfy-listener/` | 백그라운드 알림 (Kotlin). APK에만 들어가요 |
| `languages/` | 언어별 앱 이름 (한국어 "리스너", 영어 "Listnr") |
| `assets/icon-source/` | 아이콘 원본 SVG |
| `scripts/licenses.mjs` | 오픈소스 라이선스 목록(`src/generated/licenses.json`) 만들기. 의존성을 바꾸면 `npm run licenses` |
| `.github/workflows/` | CI(타입 검사·린트) · 릴리스(APK 빌드) |

### 어떻게 동작하나요

- **앱이 켜져 있을 때**: 서버마다 WebSocket 하나로 그 서버의 토픽을 모두 받아요. 앱을 열 때마다 놓친 메시지를 먼저 가져와요.
- **앱이 꺼져 있을 때 (APK)**: `modules/ntfy-listener`의 포그라운드 서비스가 서버와 WebSocket 연결을 열어 두고, 새 메시지를 안드로이드 알림으로 띄워요. 우선순위마다 알림 채널이 따로 있어서 휴대폰 설정에서 소리를 따로 정할 수 있어요.
  - JSON 스트림(`/json`) 대신 WebSocket을 쓰는 이유: nginx 같은 프록시가 HTTP/1.1 스트림 응답을 붙잡아 두는 경우가 있어서예요.
- 비밀번호와 토큰은 휴대폰의 암호화 저장소(SecureStore)에 저장돼요. 단, 백그라운드 서비스가 휴대폰 재시작 뒤에도 접속할 수 있도록 서비스 설정에도 함께 저장돼요 (앱 전용 저장 공간이라 다른 앱은 못 읽어요).

## 알려진 한계

- 안드로이드만 지원해요. iOS는 백그라운드 수신이 없고 확인해 보지 않았어요.
- 액션 버튼 중 `broadcast`(안드로이드 인텐트)는 지원하지 않아요. `view`와 `http`는 돼요.
- 구글 푸시(FCM)를 쓰지 않고 서버와 직접 연결을 유지하는 방식이라 배터리를 조금 더 써요.

## 라이선스

[MIT](LICENSE) © Yu Jeonghoon
