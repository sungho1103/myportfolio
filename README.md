# myportfolio

정적 GitHub Pages 포트폴리오에 `Firebase Authentication + Cloud Firestore`를 연결해, 로그인 가능한 관리자 페이지와 영구 저장 프로젝트 CRUD를 붙인 버전입니다.

## 포함 기능

- 공개 포트폴리오 페이지: `index.html`
- 관리자 로그인: `admin.html`
- 프로젝트 추가 / 수정 / 삭제 / 공개 여부 제어
- 로그인 후 기본 프로젝트 일괄 시드
- Firebase 이메일/비밀번호 로그인
- 로그인 후 비밀번호 변경
- Firestore 영구 저장
- 공개 페이지는 `published = true` 프로젝트만 노출
- `adminUsers/{uid}` 문서가 있는 사용자만 관리자 권한 허용

## 파일 구조

- `index.html`: 공개 포트폴리오
- `admin.html`: 관리자 페이지
- `portfolio.js`: 공개 프로젝트 렌더링
- `admin.js`: 로그인 및 CRUD 화면 로직
- `firebase.js`: Firebase 초기화 및 데이터 접근 레이어
- `firebase-config.example.js`: 로컬 설정 예시
- `firestore.rules`: Firestore 보안 규칙

## Firebase 설정

### 1. Firebase 프로젝트 생성 및 Web App 등록

Firebase 콘솔에서 프로젝트를 만들고 Web App을 등록합니다. 등록 후 `firebaseConfig` 객체를 받게 됩니다.

공식 문서: [Add Firebase to your JavaScript project](https://firebase.google.com/docs/web/setup)

### 2. Authentication 활성화

Firebase Console의 `Authentication`에서 `Email/Password` 로그인 방식을 활성화합니다.

공식 문서: [Authenticate with Firebase using Password-Based Accounts using Javascript](https://firebase.google.com/docs/auth/web/password-auth)

### 3. Firestore 생성

Cloud Firestore를 생성합니다.

공식 문서: [Get started with Cloud Firestore](https://firebase.google.com/docs/firestore/quickstart)

### 4. 설정 파일 생성

`firebase-config.example.js`를 복사해서 `firebase-config.js`를 만듭니다.

```js
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

이 파일은 `.gitignore`에 포함되어 있습니다.

### 5. Firestore 규칙 적용

[firestore.rules](/Users/sunghokwon/Documents/New project/myportfolio/firestore.rules)를 Firestore Rules에 적용합니다.

핵심 규칙:
- 공개 프로젝트는 누구나 읽기 가능
- 관리자만 쓰기 가능
- 관리자는 `adminUsers/{uid}` 문서 존재 여부로 판별

### 6. 관리자 사용자 만들기

1. Authentication에서 이메일/비밀번호 사용자를 하나 생성합니다.
2. Firestore에 `adminUsers` 컬렉션을 만들고, 문서 ID를 해당 사용자의 `uid`로 생성합니다.
3. 문서 예시:

```json
{
  "email": "admin@example.com",
  "role": "admin"
}
```

### 7. 초기 데이터 넣기

`projects` 컬렉션에 프로젝트 문서를 넣거나, 관리자 페이지에서 로그인 후 직접 생성합니다.

문서 필드 예시:

```json
{
  "title": "Portfolio CMS",
  "year": "2026",
  "description": "Firebase 기반 포트폴리오 관리자 시스템",
  "image_url": "https://...",
  "image_alt": "Portfolio CMS preview",
  "tags": ["Firebase", "Firestore", "Auth"],
  "github_url": "https://github.com/...",
  "live_url": "https://...",
  "published": true,
  "display_order": 100
}
```

## 공개 페이지 동작

- Firebase가 설정되어 있으면 Firestore의 `projects` 컬렉션에서 `published = true` 문서만 읽습니다.
- Firebase 설정이 없거나 연결이 실패하면 데모 프로젝트를 표시합니다.

## 관리자 페이지 동작

- 로그인은 Firebase `signInWithEmailAndPassword()`를 사용합니다.
- 로그인 상태 변화는 `onAuthStateChanged()`로 감지합니다.
- 로그인 후 `adminUsers/{uid}` 문서가 존재해야 관리자 CRUD를 허용합니다.
