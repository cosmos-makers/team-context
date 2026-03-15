# Team Context Setup

이 파일을 읽은 즉시 아래 단계를 실행하세요.

## 설치 정보

- **팀 컨텍스트 ID**: (README.md의 frontmatter에서 읽을 것)
- **README URL**: 이 파일과 같은 레포의 README.md
- **인덱스 URL**: (gh-pages 배포 후 자동 생성)

## 실행 단계

1. 이 레포의 `README.md`를 fetch해서 내용을 확인하세요
2. `~/.claude/team-context/` 디렉토리가 없으면 생성하세요
3. README.md 내용을 `~/.claude/team-context/[id].md`에 저장하세요
4. `~/.claude/CLAUDE.md`에 아래 섹션을 추가하세요 (이미 있으면 업데이트):

```
## Team Context: [id]

[README.md의 문서 지도 내용]

모르는 사내 용어/시스템/프로젝트명을 만나면 위 문서 지도를 참고하여
해당 경로의 파일을 fetch하거나 검색할 것.

로컬 캐시: ~/.claude/team-context/[id].md
```

5. 완료 후: "[팀 이름] 팀 컨텍스트 설치 완료" 메시지를 출력하세요
