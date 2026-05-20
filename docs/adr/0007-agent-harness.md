# ADR-0007: Agent harness implementation (Ollama default + optional `claude-code` CLI spawn)

## Status

Accepted (2026-05-20)

## Context

「AI-agent harness で agentic loop + supervisor + approval gate を 実装」 という Stage 0 lock 方針、 但し TS code から どう invoke するか literal 未定。 ありうる方式 3 候補。

## Considered options

### (a) `claude-code` CLI を child_process で spawn

```typescript
import { spawn } from 'node:child_process';
const proc = spawn('claude', ['-p', prompt, '--output-format', 'json']);
```

- 利点: user の Claude Code 契約内で動作、 PJ 自体は paid dep ゼロ
- 利点: high-quality reasoning available (Claude Sonnet / Opus tier)
- 欠点: user 環境に `claude` CLI 必須

### (b) Anthropic API direct call

```typescript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

- 欠点: paid + クレジットカード必須、 $0-month 公約 literal 違反
- 欠点: API key 流出 risk
- → **literal REJECTED**

### (c) Ollama default + optional (a)

- 利点: Ollama 必須 path で 全機能動作 ($0-month wedge literal 順守)
- 利点: 上位品質欲しい user は `--use-claude-code` flag で (a) path
- 利点: internal doctrine layer (local-first wrangler) literal 順守
- 採用

## Decision

**(c) Ollama default + optional `claude-code` CLI spawn**。 Anthropic API direct call は literal 実装しない (paid-API 6-layer defense の最終 layer で literal block)。

## Implementation sketch

```typescript
// src/providers/llm/agent-harness.ts
export interface AgentHarness {
  invoke(prompt: string, opts: AgentOpts): Promise<AgentOutput>;
}

export interface AgentOpts {
  jsonMode?: boolean;
  timeout?: number;
}

// default: Ollama (gemma3:4b)
export class OllamaAgentHarness implements AgentHarness {
  async invoke(prompt: string, opts: AgentOpts): Promise<AgentOutput> {
    // HTTP POST to http://localhost:11434/api/generate
    // model: 'gemma3:4b', stream: false, format: 'json' if opts.jsonMode
  }
}

// optional: claude-code CLI spawn
export class ClaudeCodeCLIAgentHarness implements AgentHarness {
  async invoke(prompt: string, opts: AgentOpts): Promise<AgentOutput> {
    // spawn('claude', ['-p', prompt, '--output-format', 'json'])
    // parse stdout, propagate exit code
  }
}

// factory: env-based selection with safe fallback
export function createAgentHarness(env: NodeJS.ProcessEnv, flags: CliFlags): AgentHarness {
  if (flags.useClaudeCode && hasClaudeCodeCli()) return new ClaudeCodeCLIAgentHarness();
  return new OllamaAgentHarness();
}

// paid-API direct call は literal 実装しない (constructor 自体存在しない)
```

## Consequences

### Positive

- $0-month 公約 literal 順守 (Ollama path で 全機能動作)
- internal doctrine layer (local-first wrangler) literal 順守
- user の既存 Claude Code 契約 reuse (新規 API key 不要)
- paid-API 6-layer defense intact (sibling tool sbom-pilot pattern literal inherit)

### Negative

- (a) path 採用時、 user 環境に `claude` CLI 必須 = README で literal 明記
- (c) path 採用時、 user 環境に Ollama 必須 = README で literal 明記 + install 手順 step-by-step

## Compliance verification

- internal doctrine (local-first wrangler): ✓ Ollama default
- paid-API 6-layer defense layer 6 (no credit-card required): ✓ Anthropic API direct call literal banned
- $0-month wedge: ✓ Ollama path で 全 機能動作

## References

- Ollama: https://ollama.com/
- Claude Code CLI: https://docs.claude.com/en/docs/claude-code
- Anthropic SDK (banned from this PJ): https://github.com/anthropics/anthropic-sdk-typescript
