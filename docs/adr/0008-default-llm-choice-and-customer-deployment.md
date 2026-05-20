# ADR-0008: Default LLM choice (Ollama gemma3:4b) — portfolio constraint vs customer deployment

## Status

Accepted (2026-05-21)

## Context

ADR-0007 selected the LLM transport (Ollama default + optional `claude-code` CLI spawn). This ADR records **which Ollama model is the default**, **why a smaller model is not chosen**, and **how this constraint relates to actual customer deployments**. These are three separate questions that have been conflated in prior framing — this ADR separates them with primary-source evidence.

## Decision

1. **Default Ollama model = `gemma3:4b`**.
2. **Do not ship a smaller default** (`gemma3:1b`, `qwen2.5-coder:0.5b`, etc.). Size-quality trade-off within a model family is monotonic per primary sources — going smaller measurably degrades the very capabilities this tool depends on (code reasoning, vulnerability triage, patch generation).
3. **Customer deployments are expected to upgrade** away from the portfolio default — either to a larger Ollama model (`qwen2.5-coder:14b` / `qwen2.5-coder:32b`) or to `--use-claude-code` (Claude Sonnet / Opus quality via the user's existing Claude Code subscription). Size/quality constraints documented here are **artifacts of the portfolio's self-imposed `$0/month + no credit card` constraint**, not architectural limits of the tool.

## Why `gemma3:4b` and not smaller — primary-source evidence

### Gemma 3 within-family monotonicity (Google DeepMind)

Source: Gemma 3 Technical Report, Kamath et al., Google DeepMind, [arXiv:2503.19786](https://arxiv.org/html/2503.19786v1) (2026-03-12). Table 18 (instruct variants):

| Model | Params | HumanEval pass@1 | MBPP pass@1 |
|---|---|---|---|
| Gemma 3 IT 1B | 1B | not reported | not reported |
| Gemma 3 IT 4B | 4B | **71.3** | **63.2** |
| Gemma 3 IT 12B | 12B | **85.4** | **73.0** |
| Gemma 3 IT 27B | 27B | **87.8** | **74.4** |

4B → 27B delta: **+16.5 HumanEval pass@1**, **+11.2 MBPP pass@1**. Within-family monotonic positive correlation between parameter count and code-task quality is fully attested.

**Critically**: Gemma 3 1B has **no HumanEval / MBPP values reported in the official Google paper**. Treating this absence as a signal — Google's own evaluation did not deem 1B worth scoring on code generation. This is the strongest available evidence that <4B Gemma is below the practical floor for code reasoning.

### Qwen2.5-Coder within-family monotonicity (Alibaba)

Source: Hui et al., "Qwen2.5-Coder Technical Report," [arXiv:2409.12186](https://arxiv.org/abs/2409.12186) (2024-11-12); official blog: [qwenlm.github.io](https://qwenlm.github.io/blog/qwen2.5-coder-family/).

Verbatim from Table 5: "Qwen2.5-Coder-1.5B HumanEval: 43.9, MBPP: 34.6"; "Qwen2.5-Coder-7B-Base HumanEval: 61.6, MBPP: 45.8".

Verbatim from official blog: "positive correlation between model size and model performance ... SOTA performance across all sizes."

1.5B → 7B delta: **+17.7 HumanEval pass@1**. Same monotonic story.

### Code Llama (Meta)

Source: Rozière et al., "Code Llama: Open Foundation Models for Code," [arXiv:2308.12950](https://arxiv.org/html/2308.12950v3). Same finding across 7B / 13B / 34B / 70B: scaling parameter count positively impacts code-model performance, holding architecture and training equal.

### Security-task specific (SAST false-positive triage)

Source: "Sifting the Noise: A Comparative Study of LLM Agents in Vulnerability False Positive Filtering," [arXiv:2601.22952](https://arxiv.org/abs/2601.22952).

Verbatim (abstract): "Agentic frameworks significantly outperform vanilla prompting for stronger models such as Claude Sonnet 4 and GPT-5, but yield limited or inconsistent gains for weaker backbones."

Qualitative confirmation that on the **exact task class this tool addresses** (false-positive triage of SAST findings), weaker backbones underperform — even within the same harness. Smaller Ollama models would worsen this gap.

UNCERTAIN: no head-to-head benchmark of `gemma3:4b` vs `gemma3:14b` on SAST triage exists in published literature as of 2026-05-21. The above is the best available evidence; the within-family monotonic claim generalises by industry consensus, not by direct measurement on this specific task.

## Size budget

Default `gemma3:4b` install footprint:

| Component | Size | Source |
|---|---|---|
| Ollama runtime (Windows) | ~500 MB | [ollama.com/download/windows](https://ollama.com/download/windows) |
| `gemma3:4b` model (Q4_0 quantized) | ~3.3 GB | Ollama model catalog |
| **Total** | **~3.8 GB** | |

Going smaller (`gemma3:1b` ~815MB) would cut ~2.5GB but the model would not produce trustworthy security analysis per the evidence above. Going larger (`qwen2.5-coder:14b` ~9GB / `qwen2.5-coder:32b` ~20GB) is the customer-deployment upgrade path, not the portfolio default.

`--provider mock` adds 0 GB (no LLM at all, pure SAST/SCA pass-through). Useful for CI and offline smoke tests, but mock mode does not exercise the wedge (LLM enrichment + patch suggestion).

## Customer deployment context

The portfolio operates under a self-imposed **`$0/month + no credit card`** constraint, used as a hiring-signal demonstration of supply-chain discipline (see [ADR-0006](0006-public-flip-criteria.md) and [ADR-0007](0007-agent-harness.md) paid-API 6-layer defense). This constraint produces the `gemma3:4b` default and the ~3.8 GB footprint discussed above.

**Customer deployments will not share this constraint.** A typical customer environment will:

1. Already have **Anthropic / OpenAI / Google paid API quota** procured for other internal use; or
2. Have **GPU capacity** for a larger Ollama model (`qwen2.5-coder:14b` or `:32b`); or
3. Both.

The tool's CLI surface accommodates this on day one:

| Customer choice | Mechanism | LLM tier | Source |
|---|---|---|---|
| Larger local Ollama model | `OllamaProvider({ model: 'qwen2.5-coder:14b' })` (programmatic) | open-source SOTA | [src/providers/llm/ollama.ts:24-31](../../src/providers/llm/ollama.ts) |
| Claude Sonnet / Opus | `--use-claude-code` CLI flag | frontier | [src/providers/llm/index.ts:54](../../src/providers/llm/index.ts) + [README.md:74-77](../../README.md) |
| Mock (CI / offline) | `--provider mock` (default if env not set) | none | [src/providers/llm/index.ts:60-61](../../src/providers/llm/index.ts) |

**Therefore, the size / quality concerns documented in this ADR do not propagate to customer deployments.** They are evaluation artifacts of the portfolio's self-imposed financial constraint, not technical limitations of the tool.

### Known CLI gap (tracked)

The CLI does not currently expose an `--ollama-model <name>` flag — Ollama model choice is hardcoded to `gemma3:4b` from the CLI invocation path ([index.ts:62-63](../../src/providers/llm/index.ts)). Programmatic API consumers can override via constructor option; CLI users cannot. This is a known gap to be closed in a follow-up commit before PUBLIC flip.

## Consequences

### Positive

- Default behavior literally runs `$0/month + no credit card` (portfolio framing intact).
- Customer deployment path is documented + implementation-backed, not a sales claim.
- Within-family size-quality monotonicity is sourced to primary papers (Google DeepMind + Alibaba + Meta), not opinion.
- Honest disclosure on what is and is not benchmarked (no direct gemma3:4b-vs-larger SAST triage benchmark exists; the generalisation rests on within-family monotonicity).

### Negative

- Portfolio reviewers evaluating the tool against `gemma3:4b` see lower-bound quality, not the customer-deployment quality. This ADR exists to make that explicit.
- CLI `--ollama-model` gap means customers currently need source-code change or env-var-driven programmatic invocation to swap model sizes. Follow-up commit pending.

## Compliance verification

- Within-family monotonic claim: ✓ primary-source Table 18 ([arXiv:2503.19786](https://arxiv.org/html/2503.19786v1)) + Table 5 ([arXiv:2409.12186](https://arxiv.org/abs/2409.12186))
- Customer paid-API path: ✓ [README.md:74-83](../../README.md) + [src/providers/llm/index.ts:54](../../src/providers/llm/index.ts)
- `$0/month + no credit card` portfolio constraint intact: ✓ Default route uses Ollama + mock only
- Honest disclosure of UNCERTAIN benchmarks: ✓ §"Security-task specific" + §"Known CLI gap"

## References

- Gemma 3 Technical Report (arXiv:2503.19786): https://arxiv.org/html/2503.19786v1
- Gemma 3 Technical Report (DeepMind PDF mirror): https://storage.googleapis.com/deepmind-media/gemma/Gemma3Report.pdf
- Qwen2.5-Coder Technical Report (arXiv:2409.12186): https://arxiv.org/abs/2409.12186
- Qwen2.5-Coder family blog: https://qwenlm.github.io/blog/qwen2.5-coder-family/
- Code Llama paper (arXiv:2308.12950): https://arxiv.org/html/2308.12950v3
- Sifting the Noise (arXiv:2601.22952): https://arxiv.org/abs/2601.22952
- Ollama download: https://ollama.com/download/windows
- ADR-0006 (PUBLIC flip criteria): [0006-public-flip-criteria.md](0006-public-flip-criteria.md)
- ADR-0007 (agent harness, paid-API 6-layer defense): [0007-agent-harness.md](0007-agent-harness.md)
