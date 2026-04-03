---
name: gaps
description: >
  Analyze knowledge coverage and identify gaps in the team knowledge base.
  Trigger: "지식 갭 분석", "knowledge gaps", "what are we missing",
  "tc gaps", "coverage analysis"
---

Analyze the Team Context knowledge base for gaps and staleness.

## Steps

1. Call `tc_stats` to get current statistics.

2. Analyze coverage across dimensions:

   **By taxonomy category:**
   - Which of the 7 categories have few or no documents?
   - Flag categories with 0 documents as critical gaps.

   **By domain:**
   - Which configured domains are underrepresented?
   - Are there domains with only stale content?

   **By type:**
   - Are decisions documented? (decision type)
   - Are there heuristics/lessons? (tacit knowledge capture)
   - Are people profiles up to date?

   **By staleness:**
   - Documents older than 90 days with `status: active`
   - Documents past their `expires` date

   **By confidence:**
   - High ratio of `confidence: low` documents suggests unverified knowledge

3. Present findings:

```
## Knowledge Coverage Report

### Critical Gaps
- {category}: 0 documents — no {type} knowledge captured

### Underrepresented
- {domain}: only {N} documents (vs. average {M})

### Stale Knowledge
- {N} documents older than 90 days
- {M} documents past expiry

### Recommendations
1. {Actionable suggestion}
2. {Actionable suggestion}
```

4. Offer to help:
   - "Want me to start ingesting knowledge for {gap area}?"
   - "Should I mark stale documents for review?"
