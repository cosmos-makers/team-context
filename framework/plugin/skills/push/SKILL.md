---
name: push
description: >
  팀 컨텍스트에 새 문서를 추가하거나 기존 문서를 수정하고 원격 레포에 반영하는 스킬.
  트리거: "이거 팀 컨텍스트에 추가해줘", "팀 컨텍스트에 저장해줘",
  "이거 팀 지식으로 남겨줘", "push to team context",
  회의 결과/컨벤션/용어를 팀 레포에 기록하고 싶을 때.
disable-model-invocation: true
---

팀 컨텍스트에 내용을 추가하고 원격 레포에 반영한다.

## 실행 절차

1. 가드레일 확인 → [references/guardrails.md](references/guardrails.md) 읽기
2. 수집 가능 여부 판단 — 위반 시 중단, 사용자에게 위반 항목 알림
3. 적절한 디렉토리에 `.md` 파일 생성/수정
   - 문서 지도 테이블 참조하여 위치 결정
   - 새 카테고리면 사용자에게 위치 확인
4. frontmatter 포함:

```yaml
---
id: 문서-식별자
summary: 한 줄 설명
source: 출처 (회의, PR, 문서 등)
status: draft
expires: null
---
```

5. 사용자에게 변경 내용 보여주고 확인 요청
6. 확인 후 커밋 + push (또는 PR 생성)
7. README.md 문서 지도 테이블 업데이트 필요 시 갱신
8. 출력: `✅ {path} 추가 완료. 커밋: {hash}`

**사용자의 명시적 확인 없이는 절대 push하지 않는다.**
사람이 아닌 시스템/프로세스 개선 방향으로 기록한다.
