# Team Context 동작 정의

이 파일은 AI 에이전트가 팀 컨텍스트를 다루는 동작을 정의합니다.
에이전트는 팀 컨텍스트 관련 작업 시 이 파일의 지시를 따르세요.

---

## mount

팀 컨텍스트를 로컬에 설치합니다.

```
트리거: 사용자가 SETUP.md URL을 공유하며 "설치해줘"
실행: SETUP.md의 단계를 순서대로 따름
결과: 로컬 캐시 저장 + 에이전트 설정 파일에 포인터 주입
```

## unmount

팀 컨텍스트를 로컬에서 제거합니다.

```
트리거: "팀 컨텍스트 제거해줘", "unmount"
실행:
  1. 에이전트 설정 파일에서 <!-- tc:{id} --> 블록 삭제
  2. ~/.claude/team-context/{id}/ 디렉토리 삭제
결과: "✅ {name} 팀 컨텍스트가 제거되었습니다."
```

## update

원격에서 최신 내용을 가져와 로컬 캐시를 갱신합니다.

```
트리거: "팀 컨텍스트 업데이트해줘", "update"
실행:
  1. {team_url}/README.md를 fetch → 로컬 캐시 갱신
  2. {marketplace_url}/framework/operations.md를 fetch → 로컬 캐시 갱신
  3. {marketplace_url}/framework/guardrails.md를 fetch → 로컬 캐시 갱신
  4. 에이전트 설정 파일의 포인터 블록 갱신
결과: "✅ {name} 팀 컨텍스트가 최신으로 업데이트되었습니다."
```

## pull

작업 전 최신 상태를 확인합니다.

```
트리거: 팀 컨텍스트 문서를 읽기 전 (자동)
실행:
  1. 로컬 캐시의 문서 지도를 읽음
  2. 필요한 개별 문서를 {team_url}/{path}로 fetch
주의: 매번 전체를 fetch하지 않음. 문서 지도 기반으로 필요한 것만 on-demand fetch
```

## push

팀 컨텍스트에 내용을 추가하고 원격 레포에 반영합니다.

```
트리거: "이거 팀 컨텍스트에 추가해줘", "push"
실행:
  1. guardrails.md 읽고 수집 가능 여부 확인
  2. 위반 항목 있으면 중단하고 사용자에게 알림
  3. 적절한 디렉토리에 .md 파일 생성/수정
  4. frontmatter 포함 (id, summary, source, status)
  5. 사용자에게 변경 내용 보여주고 확인 요청
  6. 확인 후 커밋 + push (또는 PR 생성)
결과: "✅ {path} 추가 완료. 커밋: {hash}"
주의: 사용자의 명시적 확인 없이는 절대 push하지 않을 것
```

---

## 조회 규칙

- 로컬 캐시의 문서 지도(README.md)를 먼저 확인
- 문서 지도에서 관련 경로를 찾아 `{team_url}/{path}`로 fetch
- 모르는 용어를 만나면 `glossary/` 에서 먼저 검색
- fetch 실패 시 사용자에게 알리고 대안 제시

## 쓰기 규칙

- 쓰기 전 반드시 guardrails.md 확인
- 사람이 아니라 시스템/프로세스를 개선하는 방향으로 기록
- 개인 평가, 비난, 핀잔 표현 절대 금지
- frontmatter 필수: id, summary, source, status
- `status: draft` → 참조 시 확정되지 않은 내용임을 명시
