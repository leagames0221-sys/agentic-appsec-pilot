/**
 * Shared interface and types for the LLM provider layer
 * (mock / Ollama / claude-code-cli).
 *
 * Per ADR-0007 §Decision: Ollama default + optional claude-code CLI
 * spawn. Paid LLM API direct calls (Anthropic / OpenAI SDK) are
 * literal banned; the factory does not accept 'anthropic' / 'openai'
 * as provider names. The paid-defense module is kept as scaffolding
 * utility (constructor gate / reserve / mask / CI ban) usable by tests
 * and future scenarios but is not wired into any callable provider.
 *
 * Spec mapping: AC-006-1, AC-007-1, AC-010-1 through AC-010-7,
 * ADR-0007.
 */

export type ProviderName = 'mock' | 'ollama' | 'claude-code-cli';

export interface LlmRequest {
  /** Optional system message — passed as chat-style system role when supported. */
  system?: string;
  /** User-facing prompt. */
  prompt: string;
  /** Soft hint to provider on max tokens. */
  maxTokens?: number;
  /** When true, ask the provider to return strict JSON. */
  jsonMode?: boolean;
}

export interface LlmResponse {
  text: string;
  tokensConsumed: number;
  /** Estimated USD cost. Free providers (mock / ollama / claude-code-cli using user's own auth) report 0. */
  costUsd: number;
  provider: ProviderName;
}

export interface LlmProvider {
  readonly name: ProviderName;
  invoke(request: LlmRequest): Promise<LlmResponse>;
}
