/**
 * Mock LLM provider — default when no explicit opt-in.
 *
 * Adapted from sibling tool sbom-pilot (MIT, internal universal pattern).
 *
 * Returns deterministic text without any network call. The CLI uses this
 * by default so threat-model / scan / patch subcommands remain functional
 * out of the box even when Ollama isn't running and no claude-code CLI
 * is installed.
 *
 * Per AC-006-3: mock is the auto-fallback when AGENTIC_APPSEC_LLM_PROVIDER
 * is unset and `--use-claude-code` flag absent.
 *
 * Spec mapping: AC-006-3, AC-010-5, ADR-0007.
 */
import type { LlmProvider, LlmRequest, LlmResponse } from './types.js';

export class MockProvider implements LlmProvider {
  readonly name = 'mock' as const;

  // eslint-disable-next-line @typescript-eslint/require-await
  async invoke(request: LlmRequest): Promise<LlmResponse> {
    const summary = request.prompt.slice(0, 80).replace(/\s+/g, ' ').trim();
    const jsonHint = request.jsonMode ? ' [jsonMode=true → real provider would return JSON]' : '';
    return {
      text:
        `[mock provider] No live LLM queried.${jsonHint} ` +
        `Prompt summary: ${summary}${request.prompt.length > 80 ? '…' : ''}`,
      tokensConsumed: 0,
      costUsd: 0,
      provider: 'mock',
    };
  }
}
