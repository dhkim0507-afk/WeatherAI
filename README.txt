Weather AI v5 Ultimate
======================

빠른 실행
---------
1) 압축을 풉니다.
2) 인터넷 연결 상태에서 index.html을 더블클릭합니다.
3) 위치, 알림, PWA 설치, GPT 기능까지 안정적으로 쓰려면 Node.js 실행을 권장합니다.

Node.js 실행
------------
1) 이 폴더에서 터미널 실행
2) npm install
3) .env.example 파일을 .env로 복사
4) OPENAI_API_KEY 값을 입력
5) npm start
6) 브라우저에서 http://localhost:3000

주요 기능
---------
- Open-Meteo 기반 현재/시간별/7일 날씨
- RainViewer 레이더 애니메이션
- GDACS 전 세계 태풍 정보
- Chart.js 온도/강수 차트
- Globe.gl 3D 지구
- 시간대/날씨별 동적 배경
- Lottie 애니메이션
- 브라우저 Web Audio 기반 비 소리
- OpenAI 서버 프록시 기반 GPT 브리핑
- PWA 설치
- 비 오기 전 브라우저 알림
- Firebase Google 로그인 및 즐겨찾기 동기화
- Firebase 미설정 시 LocalStorage 저장

Firebase 설정
-------------
1) Firebase 프로젝트를 생성합니다.
2) 웹 앱을 등록합니다.
3) Authentication에서 Google 로그인을 활성화합니다.
4) Firestore Database를 생성합니다.
5) firebase-config.example.js를 firebase-config.js로 복사합니다.
6) Firebase 설정값을 입력합니다.
7) 테스트용 Firestore 규칙 예시:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}

중요
----
- OpenAI API 키를 app.js나 HTML에 넣지 마세요. 반드시 server.js와 .env를 사용하세요.
- 태풍 API는 GDACS의 CORS 또는 일시적 서비스 상태에 따라 브라우저에서 제한될 수 있습니다.
- RainViewer 무료 개인 사용 API는 제공 범위와 확대 수준에 제한이 있을 수 있습니다.
- Lottie/CDN/지도/3D 지구는 인터넷 연결이 필요합니다.
