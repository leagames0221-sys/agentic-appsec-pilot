/**
 * Provider barrel + factory.
 *
 * Per ADR-0007: 3 supported providers — mock (default fallback) / ollama
 * (default when available) / claude-code-cli (optional opt-in). Paid
 * providers (Anthropic / OpenAI SDK direct calls) are NOT routable from
 * this factory — any unrecognised name falls back to mock so a typo
 * never silently activates a paid path.
 *
 * The paid-defense scaffolding is re-exported for tests / future use,
 * but no provider in this PJ wires it.
 *
 * Spec mapping: AC-006-1, AC-006-2, AC-006-3, AC-010-1 through AC-010-7,
 * ADR-0007.
 */
import { MockProvider } from './mock.js';
import { OllamaProvider } from './ollama.js';
import { ClaudeCodeCliProvider } from './claude-code-cli.js';
import type { LlmProvider, ProviderName } from './types.js';

export type { LlmProvider, LlmRequest, LlmResponse, ProviderName } from './types.js';
export type { PaidProviderConfig, ReserveState, PreflightCharge } from './paid-defense.js';
export {
  assertNotCiAutoCall,
  constructorGate,
  maskApiKey,
  newReserveState,
  PaidDefenseError,
  preflightReserve,
} from './paid-defense.js';
export { MockProvider } from './mock.js';
export { OllamaProvider } from './ollama.js';
export { ClaudeCodeCliProvider } from './claude-code-cli.js';

export interface CreateProviderOptions {
  env?: NodeJS.ProcessEnv;
  /** When true, prefer claude-code-cli (set by CLI `--use-claude-code` flag). */
  useClaudeCodeCli?: boolean;
}

/**
 * Construct the LLM provider. Resolution order:
 *   1. useClaudeCodeCli flag (from CLI `--use-claude-code`)
 *   2. AGENTIC_APPSEC_LLM_PROVIDER env var (ollama / mock / claude-code-cli)
 *   3. fallback: mock
 *
 * Any unrecognised or paid name ('anthropic' / 'openai') → mock fallback.
 */
export function createProvider(
  name: string | undefined,
  options: CreateProviderOptions = {},
): LlmProvider {
  const env = options.env ?? process.env;
  if (options.useClaudeCodeCli === true) {
    return new ClaudeCodeCliProvider();
  }
  const resolved = (name ?? env['AGENTIC_APPSEC_LLM_PROVIDER'] ?? 'mock').toLowerCase();

  switch (resolved as ProviderName | string) {
    case 'mock':
      return new MockProvider();
    case 'ollama':
      return new OllamaProvider();
    case 'claude-code-cli':
      return new ClaudeCodeCliProvider();
    default:
      // Typo / unknown / paid name → mock fallback. No silent paid activation.
      return new MockProvider();
  }
}
