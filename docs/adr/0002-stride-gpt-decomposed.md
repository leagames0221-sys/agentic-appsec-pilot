# ADR-0002: STRIDE-GPT decomposed prior art approach

## Status

Accepted (2026-05-20)

## Context

STRIDE-GPT (https://github.com/mrwadams/stride-gpt) は MIT / 1k★ / Anthropic Claude 4.5 native の Python tool。 主要 file 構造:

- `main.py` (88KB) — Streamlit entry
- `threat_model.py` (45KB) — STRIDE + OWASP LLM Top 10 + OWASP ASI mapping prompts
- `attack_tree.py` (32KB) — attack tree generation
- `dread.py` (28KB) — DREAD scoring prompts
- `mitigations.py` (20KB) — mitigation suggestions
- `test_cases.py` (25KB) — test case generation

threat_model.py L6 に `import streamlit as st` literal 存在、 UI 専用 PJ。 但し主要 function (`json_to_markdown` / `create_llm_stride_prompt_section` 等) は **pure logic** (Streamlit object 不使用)。 LLM client = `Anthropic()` / `OpenAI()` / `Groq()` / `Mistral()` / `google.genai` の 5 provider native。

## Decision

**直接 Python 依存 (subprocess / Python embed) しない**。 D-PRIOR-ART-FIRST の 「decomposed prior art」 approach で **STRIDE prompts + OWASP LLM/ASI mapping table + DREAD scoring schema を TypeScript に literal 移植**。

## Rationale

1. TS / Node 20 LTS PJ に Python + Streamlit dep 引込みは architectural mismatch
2. local-first / $0-month wedge の narrative も汚染 (Python runtime + Streamlit 配布が 必要になる)
3. threat_model.py 主要 function は pure logic = 安全に literal 移植可能
4. LLM client 部分は internal 既存 paid-API 6-layer defense (sibling tool sbom-pilot literal reuse) で 上書き可能
5. STRIDE-GPT MIT license 順守は attribution NOTICE で literal 達成 (LICENSE-third-party.md で 明記、 README §Acknowledgements で literal cite)

## Work decomposition (5 sub-task、 6-10 work-day 見積、 honest)

| sub-task | est. work-day | deliverable |
|---|---|---|
| 1. prompt extraction | 2 | threat_model.py + attack_tree.py + dread.py + mitigations.py から STRIDE prompt + OWASP LLM/ASI mapping + DREAD scoring prompt を literal 抽出、 `src/stages/threat-model/prompts/{stride,owasp-llm,owasp-asi,dread,mitigation}.ts` 配置 |
| 2. schema port | 1 | threat-model output JSON schema (Threat Type + Scenario + Potential Impact + OWASP_LLM + OWASP_ASI) を TS interface + Zod validator 化 |
| 3. Claude integration | 1 | optional `claude-code` CLI spawn 経由 prompt 投入 (ADR-0007 順守)、 paid-API 6-layer defense (sibling tool reuse) 適用 |
| 4. Ollama integration | 2 | gemma3:4b default、 prompt template adapt、 JSON output 強制 (response_format: json or parsing fallback) |
| 5. fixture validation | 1-2 | 5 fixture repo (TS / JS / Python 各種) で 出力 schema PASS + manual eyeball |

## Consequences

### Positive

- TS-only stack 維持 (local-first wedge narrative 強化)
- Python + Streamlit dep 排除 (consumer laptop 上 1 binary install で 完走)
- STRIDE-GPT 上流 maintenance 依存なし (decomposed = 自走可能)

### Negative

- 将来 STRIDE-GPT 上流 upgrade 時の 同期 manual (decomposed のため自動同期なし) = 受入
- STRIDE-GPT の `attack_tree.py` PlantUML 生成 logic は 移植 cost 大、 Phase β 以降に literal 検討

## Compliance with prior-art doctrine

- internal doctrine (prior-art-first): ✓ STRIDE-GPT を identified、 80% fit ではないため literal 改造ではなく decomposed (情報ひな形抽出) 採用
- internal doctrine (waste-zero): ✓ ゼロ生成ではない (STRIDE prompt template は STRIDE-GPT から literal 借用)
- internal doctrine (prior-art-security-gate): ✓ STRIDE-GPT MIT license verified、 1k★、 active maintenance (2026-05 時点)

## License compliance

STRIDE-GPT MIT license literal 順守:
- `LICENSE-third-party.md` で MIT license 全文 literal 同梱
- 各移植 prompt file の header に `// Adapted from STRIDE-GPT (https://github.com/mrwadams/stride-gpt) MIT License Copyright (c) Matthew Adams` literal 明記
- README §Acknowledgements で literal cite

## References

- STRIDE-GPT repo: https://github.com/mrwadams/stride-gpt
- STRIDE-GPT threat_model.py source (verified 2026-05-20): contains Streamlit import + pure logic functions
- MIT license: https://opensource.org/licenses/MIT
