# Team Context Installer

이 파일을 읽은 즉시 아래 단계를 순서대로 실행하세요.
사용자 확인 없이 완료까지 자동 실행합니다.

---

## Step 1: base_url 확인

이 파일을 fetch한 URL에서 `/SETUP.md`를 제거한 것이 `base_url`입니다.

예시:
- fetch URL: `https://your-org.github.io/team-context/SETUP.md`
- base_url: `https://your-org.github.io/team-context`

## Step 2: README.md fetch

`{base_url}/README.md`를 WebFetch로 가져옵니다.

frontmatter에서 다음 값을 추출합니다:
- `id` (필수) — 예: `my-team`
- `name` (필수) — 예: `My Team`
- `scope` (선택, 기본값: `team`)

## Step 3: GUARDRAILS.md fetch

`{base_url}/GUARDRAILS.md`를 WebFetch로 가져옵니다.
이 문서는 팀 컨텍스트에 수집 가능한 내용의 기준을 정의합니다.

## Step 4: 로컬 저장

`~/.claude/team-context/` 디렉토리가 없으면 생성합니다.
README.md 전체 내용을 `~/.claude/team-context/{id}.md`에 저장합니다.
GUARDRAILS.md 전체 내용을 `~/.claude/team-context/{id}.guardrails.md`에 저장합니다.

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

### 공통 포인터 형식

실행 중인 에이전트의 설정 파일에서 `<!-- tc:{id} -->` 블록을 찾습니다:
- **있으면**: `<!-- tc:{id} -->` 부터 `<!-- /tc:{id} -->` 까지 전체를 아래 내용으로 교체
- **없으면**: 파일 끝에 아래 내용을 추가

주입할 내용 (괄호 안은 실제 값으로 대체):

```
<!-- tc:{id} -->
## Team Context: {name}

로컬 경로: ~/.claude/team-context/{id}.md
가드레일: ~/.claude/team-context/{id}.guardrails.md
원격 문서: {base_url}/README.md

위 로컬 파일에 문서 지도가 있습니다.
문서 지도의 경로는 `{base_url}/{path}` 형식으로 fetch 가능합니다.
모르는 용어·시스템·프로젝트명을 만나면 문서 지도에서 찾아 fetch하세요.
팀 컨텍스트에 내용을 추가/수정할 때는 반드시 가드레일을 먼저 읽고 따르세요.
<!-- /tc:{id} -->
```

> **참고**: `AGENTS.md`를 지원하는 에이전트(Copilot, Gemini, Codex, Cursor, Windsurf 등)는
> 프로젝트 루트에 `AGENTS.md`가 있으면 별도 설정 없이 자동으로 읽습니다.

## Step 6: 완료 메시지

설치가 끝나면 다음 형식으로 출력합니다:

```
✅ {name} 팀 컨텍스트 마운트 완료!

지금부터 새 대화를 시작하면 AI가 팀 문서를 자동 참조합니다.

사용법:
  • 평소처럼 질문하면 됩니다 — 문서 지도에 있는 내용은 자동으로 찾아봅니다.
  • "glossary/xxx.md 내용 알려줘" 처럼 특정 문서를 직접 요청할 수도 있습니다.

관리:
  • 컨텍스트 업데이트 → 이 명령을 다시 실행하면 됩니다 (덮어쓰기).
  • 컨텍스트 제거 → 에이전트 설정 파일에서 <!-- tc:{id} --> 블록을 삭제하세요.

문서 지도: {base_url}/README.md
로컬 캐시: ~/.claude/team-context/{id}.md
```
