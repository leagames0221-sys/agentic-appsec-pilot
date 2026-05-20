# systemPatterns.md — agentic-appsec-pilot

> Architectural pattern + reusable component の literal SSoT。

## Component reuse from sibling tools

### From mcp-guard (★★★ literal copy 可)

| component | source file | size | purpose |
|---|---|---|---|
| SARIF 2.1.0 emitter | `src/io/emitters/sarif.ts` | 173 行 | SARIF output |
| atomic file write | `src/io/emitters/atomic.ts` | 57 行 | tempfile + rename atomic pattern |
| sysexits exit codes | `src/errors/types.ts` | 23 行 | CLI exit code uniform |
| ANSI / C0 sanitize | `src/logger/sanitize.ts` | 40 行 | terminal-safe log emit |
| Node version gate | `src/cli/node-version-check.ts` | 72 行 | Node 20+ check |

### From sbom-pilot (★★★ literal copy 可)

| component | source file | size | purpose |
|---|---|---|---|
| SARIF 2.1.0 emitter v2 | `src/emitters/sarif-2.1.0.ts` | 200+ 行 | SARIF v2.1.0 (sibling variant) |
| atomic write variant | `src/util/atomic-write.ts` | 82 行 | atomic file write variant |
| credential scrub | `src/util/credential-scrub.ts` | 105 行 | Bearer / AWS / GitHub / JWT masking |
| ANSI / C0 sanitize v2 | `src/util/ansi-strip.ts` | 63 行 | C0 control bytes safe pattern |
| paid-API 6-layer defense | `src/providers/llm/paid-defense.ts` | 80+ 行 | constructor gate + pre-flight + key non-leak + CI ban + default mock + no-CC |
| cosign verify-blob | `src/subprocess/cosign.ts` | 197 行 | cosign + spawnSync error contract |
| OSV severity ranking | `src/ir/severity.ts` | 71 行 | severity comparator |

### Reuse strategy

直接 `import { sarif } from '@sibling-tool/mcp-guard'` ではなく **literal copy + adapt** (3 PJ 独立性維持、 npm sub-package 化は Phase β 以降 検討)。

## Core patterns

### paid-API 6-layer defense (sibling tool inherit)

1. Constructor gate — 2-factor env check
2. Pre-flight reserve — 3 ceiling (token / req count / cost) + poisoned state
3. Key non-leak — error msg masking (prefix 6 char only)
4. CI auto-call ban — unstubbed `fetch` throws in test
5. Default provider = Ollama (local) or mock — auto-fallback
6. Credit-card-required service ZERO — free public DB only (OSV.dev / GHSA.org / NVD)

### Agent harness pattern (ADR-0007)

```typescript
interface AgentHarness {
  invoke(prompt: string, opts: AgentOpts): Promise<AgentOutput>;
}
// default: Ollama (gemma3:4b)
// optional: claude-code CLI spawn (--use-claude-code flag)
// banned: Anthropic API direct call (paid-defense layer 6 で block)
```

### Confidence-calibrated finding schema (W3 wedge)

```typescript
interface Finding {
  id: string;
  rule_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: '★★★' | '★★' | '★' | '?';
  probability: number; // 0.0 - 1.0
  evidence_trail: Array<{
    type: 'source' | 'pattern' | 'llm_judgment';
    citation: string; // URL or file:line
  }>;
  source_url_line: string;
  remediation_suggestion?: string;
  sarif_location: SarifLocation;
}
```

SARIF 2.1.0 propertyBag に literal embed (spec 拡張ではなく既存 extension 機構 使用)。

## Test pattern

- vitest per-stage isolation
- fixture repo (TS / JS / Python) で golden test
- mock LLM provider default (offline reproducibility)
- coverage gate: line ≥ 90% / branch ≥ 80% / func ≥ 95% (sibling tool baseline)
