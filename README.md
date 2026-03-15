# Team Context

AI 에이전트가 팀의 공유 지식을 자동으로 참조·축적할 수 있게 해주는 프레임워크입니다.

## 구조

```
이 레포 (marketplace)
├── SETUP.md                  ← 설치 프롬프트
├── framework/
│   ├── operations.md         ← 동작 정의 (mount, unmount, update, pull, push)
│   └── guardrails.md         ← 수집 가드레일
└── template/                 ← 팀 레포 생성 시 참고할 템플릿
    ├── README.md
    ├── .gitignore
    └── .github/workflows/
        └── build-index.yml

팀 레포 (파생, 콘텐츠만)
├── README.md                 ← 문서 지도 + marketplace frontmatter
├── glossary/
├── conventions/
├── projects/
└── ...
```

## 역할 분리

| | 이 레포 (marketplace) | 팀 레포 |
|---|---|---|
| 관리자 | 플랫폼팀 | 각 팀 리드 |
| 내용 | 동작 정의, 가드레일, 템플릿 | 팀 지식, 용어, 컨벤션 |
| 스킬/관리 도구 | O | X |
| 업데이트 시 | 모든 팀에 자동 전파 | 해당 팀만 영향 |

## 사용법

### 1. 팀 레포 만들기

새 레포를 만들고 `template/` 의 내용을 복사한 뒤 팀에 맞게 수정합니다.

`README.md` frontmatter에 다음을 설정합니다:

```yaml
---
id: my-team
name: My Team
marketplace: https://your-org.github.io/team-context
---
```

### 2. 마운트하기

AI 에이전트에서 다음과 같이 입력합니다:

```
이 URL을 보고 팀 컨텍스트를 설치해줘: https://[team-pages-url]/SETUP.md
```

> SETUP.md는 marketplace에만 있습니다.
> 팀 레포에는 SETUP.md, operations, guardrails가 포함되지 않습니다.

### 3. 팀 지식 축적하기

마운트된 상태에서 에이전트에게 요청합니다:

```
이거 팀 컨텍스트에 추가해줘
```

에이전트가 가드레일을 확인하고 적절한 위치에 문서를 생성합니다.
