# 학습 노트 — 작업 중 모르고 물어봐서 배운 것들

> 면접에서 본인이 직접 설명할 수 있는 수준으로 본인 이해 확립.
> 같은 질문 두 번 안 묻기.

## 📑 목차

1. [점핏 내부 API 수집 패턴 (sitemap → position API)](#1-점핏-내부-api-수집-패턴)

---

## 1. 점핏 내부 API 수집 패턴

**한 줄 요약**: 공식 오픈API가 없는 점핏은 sitemap으로 공고 id를 열거하고 웹앱이 쓰는 내부 JSON API(`/api/position/{id}`)로 상세를 가져온다. robots 허용 범위만, 예의 크롤링, 테스트는 살균 fixture로 TDD.

**자세한 설명**:
- **왜 크롤링 대신 API인가**: 채용 사이트는 대개 HTML 파싱보다 내부 JSON API가 안정적이다(구조 변경에 덜 취약, 안티봇 마찰 적음). 점핏은 `sitemap.xml` → `sitemap_position_view_1.xml`에 `/position/{id}` URL 목록이 있고, 그 id로 `/api/position/{id}`를 부르면 `{message,status,code,result}` JSON(성공 `code:"C001"`, 없는 id는 `C003`+400)이 온다.
- **robots는 "무엇을 막는지"만 본다**: 점핏 robots는 이력서·계정·인증 영역(`/resumes`,`/account`,`/auth/` 등)만 Disallow하고 `/api`·`/sitemap`은 허용. GPTBot만 전면 차단. → 내가 쓰는 경로가 허용 목록에 드는지 확인이 먼저.
- **예의 크롤링(합법성 완화)**: ① 순차 호출 + 호출 간 지연(rate limit) ② 신원 User-Agent 명시(선의 입증) ③ 로그인/유료 영역 금지 ④ 수집 데이터 비재배포. 이게 "무단 대량복제·시장대체"로 판단되는 판례 리스크를 낮추는 실무.
- **TDD를 위한 "살균 fixture"**: 실제 API 응답을 커밋하면 공개 레포에 실데이터 재배포가 된다. 그래서 실제 응답으로 **구조(키·타입·중첩)만** 파악한 뒤, 값은 플레이스홀더로 바꾼 fixture를 만들어 테스트한다. 테스트는 현실 구조에 맞고, 재배포는 피한다.
- **어댑터 + 의존성 주입**: `createJumpitSource({ fetch, delayMs, baseUrl })` 로 `fetch`·지연을 주입 가능하게 하면, 네트워크 없이 mock fetch로 오케스트레이션(사이트맵→개별호출→정규화→실패격리)을 단위 테스트할 수 있다.

**코드 위치**: [lib/sources/jumpit.ts](../lib/sources/jumpit.ts), 테스트 [lib/sources/jumpit.test.ts](../lib/sources/jumpit.test.ts), 계획 근거 [plan.md](../plan.md) §1·§5.

**관련 노트**: (아직 없음)

---

## 🔄 누적 갱신

| 일자 | 추가 항목 |
|---|---|
| 2026-07-06 | 초안 (프로젝트 셋업) |
| 2026-07-06 | 점핏 내부 API 수집 패턴 (sitemap→API, 예의 크롤링, 살균 fixture TDD) |
