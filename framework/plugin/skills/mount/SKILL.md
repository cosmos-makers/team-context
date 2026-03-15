---
name: mount
description: >
  팀 컨텍스트를 로컬에 설치(마운트)하는 스킬.
  트리거: 사용자가 SETUP.md URL을 공유하며 "설치해줘", "마운트해줘",
  "팀 컨텍스트 설정해줘", 또는 team-context 관련 URL을 붙여넣을 때.
disable-model-invocation: true
---

팀 컨텍스트를 로컬에 설치하고 에이전트 설정에 포인터를 주입한다.

## 실행 절차

1. SETUP.md를 fetch한 URL에서 `/SETUP.md` 제거 → `marketplace_url`
2. 사용자에게 팀 레포 URL 확인 → `team_url`
   - 사용자가 제공하지 않으면 물어볼 것
3. `{team_url}/README.md` fetch
4. frontmatter에서 추출:
   - `id` (필수) — 캐시 식별자
   - `name` (필수) — 표시명
   - `marketplace` (선택) — 있으면 marketplace_url 대체
5. `{marketplace_url}/framework/guardrails.md` fetch
6. 로컬 저장:

```
~/.claude/team-context/{id}/
├── README.md        ← 팀 문서 지도
└── guardrails.md    ← 수집 가드레일
```

7. 에이전트 설정 파일(`~/.claude/CLAUDE.md`)에 포인터 주입:

```
<!-- tc:{id} -->
## Team Context: {name}

team_url: {team_url}
marketplace_url: {marketplace_url}
로컬 경로: ~/.claude/team-context/{id}/

팀 컨텍스트 관련 작업 시 /team-context:* 스킬을 활용하세요.
문서를 추가할 때는 ~/.claude/team-context/{id}/guardrails.md를 확인하세요.
<!-- /tc:{id} -->
```

8. 완료 메시지:

```
✅ {name} 팀 컨텍스트 마운트 완료!

사용법:
  • 평소처럼 질문 — 문서 지도 기반 자동 참조
  • "glossary/xxx.md 알려줘" — 특정 문서 요청
  • "이거 팀 컨텍스트에 추가해줘" — 지식 축적

관리:
  • /team-context:update — 최신으로 갱신
  • /team-context:unmount — 제거

팀 레포: {team_url}
로컬 캐시: ~/.claude/team-context/{id}/
```
