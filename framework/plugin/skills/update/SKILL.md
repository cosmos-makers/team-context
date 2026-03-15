---
name: update
description: >
  마운트된 팀 컨텍스트의 로컬 캐시를 원격 최신 상태로 갱신하는 스킬.
  트리거: "팀 컨텍스트 업데이트해줘", "팀 컨텍스트 갱신",
  "update team context", "최신으로 동기화해줘".
disable-model-invocation: true
---

원격에서 최신 내용을 가져와 로컬 캐시를 덮어쓴다.

## 실행 절차

1. `~/.claude/CLAUDE.md`에서 `<!-- tc:{id} -->` 블록 찾기
   - `team_url`, `marketplace_url` 추출
   - 없으면: "마운트된 팀 컨텍스트가 없습니다." 출력 후 종료
   - 여러 개면: 목록 보여주고 선택 요청 (또는 `$ARGUMENTS`로 id 지정)
2. `{team_url}/README.md` fetch → `~/.claude/team-context/{id}/README.md` 갱신
3. `{marketplace_url}/framework/guardrails.md` fetch → `~/.claude/team-context/{id}/guardrails.md` 갱신
4. 포인터 블록 갱신 (name 등 변경 반영)
5. 출력: `✅ {name} 팀 컨텍스트가 최신으로 업데이트되었습니다.`
