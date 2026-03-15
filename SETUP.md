# Team Context Installer

이 파일을 읽은 즉시 아래 단계를 순서대로 실행하세요.
사용자 확인 없이 완료까지 자동 실행합니다.

---

## Step 1: URL 확인

이 파일을 fetch한 URL에서 `/SETUP.md`를 제거한 것이 `marketplace_url`입니다.

예시:
- fetch URL: `https://your-org.github.io/team-context/SETUP.md`
- marketplace_url: `https://your-org.github.io/team-context`

사용자가 함께 제공한 팀 레포 URL이 `team_url`입니다.
팀 레포 URL이 없으면 사용자에게 물어보세요.

## Step 2: 팀 README.md fetch

`{team_url}/README.md`를 WebFetch로 가져옵니다.

frontmatter에서 다음 값을 추출합니다:
- `id` (필수) — 예: `my-team`
- `name` (필수) — 예: `My Team`
- `marketplace` (선택) — 있으면 Step 1의 marketplace_url 대신 사용

## Step 3: 프레임워크 fetch

marketplace에서 프레임워크 파일을 가져옵니다:
- `{marketplace_url}/framework/operations.md`
- `{marketplace_url}/framework/guardrails.md`

> 이 파일들은 팀 레포가 아닌 marketplace에서 가져옵니다.

## Step 4: 로컬 저장

`~/.claude/team-context/{id}/` 디렉토리를 생성합니다.

| 원본 | 로컬 경로 |
|------|-----------|
| 팀 README.md | `~/.claude/team-context/{id}/README.md` |
| framework/operations.md | `~/.claude/team-context/{id}/operations.md` |
| framework/guardrails.md | `~/.claude/team-context/{id}/guardrails.md` |

## Step 5: 에이전트 설정 업데이트

현재 에이전트 환경을 감지하여 해당 설정 파일에 포인터를 추가합니다.

### 에이전트별 설정 파일

| 에이전트 | 설정 파일 | 비고 |
|----------|-----------|------|
| Claude Code | `~/.claude/CLAUDE.md` | 글로벌 사용자 설정 |
| GitHub Copilot | `.github/copilot-instructions.md` | `AGENTS.md`도 자동 인식 |
| Gemini CLI | `GEMINI.md` | settings.json에서 `AGENTS.md` 추가 가능 |
| Cursor | `.cursor/rules/*.mdc` | `.cursorrules`는 deprecated |
| Windsurf | `.windsurf/rules/*.md` | `.windsurfrules`는 legacy |
| Codex | `AGENTS.md` | 기본 지원 |

### 포인터 형식

실행 중인 에이전트의 설정 파일에서 `<!-- tc:{id} -->` 블록을 찾습니다:
- **있으면**: 블록 전체를 아래 내용으로 교체
- **없으면**: 파일 끝에 추가

주입할 내용 (괄호 안은 실제 값으로 대체):

```
<!-- tc:{id} -->
## Team Context: {name}

team_url: {team_url}
marketplace_url: {marketplace_url}
로컬 경로: ~/.claude/team-context/{id}/

팀 컨텍스트 관련 작업 시 ~/.claude/team-context/{id}/operations.md를 읽고 따르세요.
mount, unmount, update, pull, push 동작이 정의되어 있습니다.
문서를 추가/수정할 때는 ~/.claude/team-context/{id}/guardrails.md를 먼저 확인하세요.
<!-- /tc:{id} -->
```

## Step 6: 완료 메시지

설치가 끝나면 다음 형식으로 출력합니다:

```
✅ {name} 팀 컨텍스트 마운트 완료!

지금부터 새 대화를 시작하면 AI가 팀 문서를 자동 참조합니다.

사용법:
  • 평소처럼 질문하면 됩니다 — 문서 지도에 있는 내용은 자동으로 찾아봅니다.
  • "glossary/xxx.md 내용 알려줘" 처럼 특정 문서를 직접 요청할 수도 있습니다.
  • "이거 팀 컨텍스트에 추가해줘" 로 지식을 축적할 수 있습니다.

관리:
  • 업데이트 → "팀 컨텍스트 업데이트해줘"
  • 제거 → "팀 컨텍스트 제거해줘"

팀 레포: {team_url}
로컬 캐시: ~/.claude/team-context/{id}/
```
