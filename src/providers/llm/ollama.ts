/**
 * Ollama LLM provider — local-only HTTP client.
 *
 * Adapted from companion repo sbom-pilot (https://github.com/leagames0221-sys/sbom-pilot, MIT).
 *
 * Ollama serves models like `gemma3:4b` over a localhost HTTP API
 * (default port 11434, no auth). Runs entirely on the user's machine,
 * consumes no paid API quota, executable itself is free + open source
 * — no credit card or signup required (AC-010-6).
 *
 * Per AC-006-1 / AC-010-5: when AGENTIC_APPSEC_LLM_PROVIDER=ollama the
 * factory routes here; otherwise the default mock provider is used.
 *
 * Spec mapping: AC-006-1, AC-007-2, AC-010-5, AC-010-6, ADR-0007.
 */
import type { LlmProvider, LlmRequest, LlmResponse } from './types.js';

interface OllamaApiResponse {
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaProviderOptions {
  /** Default 'gemma3:4b' — small enough to run on a consumer laptop. */
  model?: string;
  /** Default 'http://localhost:11434'. Override for tests. */
  baseUrl?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama' as const;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OllamaProviderOptions = {}) {
    this.model = options.model ?? 'gemma3:4b';
    this.baseUrl = options.baseUrl ?? 'http://localhost:11434';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async invoke(request: LlmRequest): Promise<LlmResponse> {
    // Compose prompt with optional system message (Ollama /api/generate
    // does not have a separate system field in classic mode — prepend).
    const composed = request.system ? `${request.system}\n\n${request.prompt}` : request.prompt;

    const body: Record<string, unknown> = {
      model: this.model,
      prompt: composed,
      stream: false,
    };
    if (request.jsonMode === true) {
      body['format'] = 'json';
    }
    if (request.maxTokens !== undefined) {
      body['options'] = { num_predict: request.maxTokens };
    }
    const res = await this.fetchImpl(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(
        `Ollama HTTP ${res.status} ${res.statusText} — is the Ollama daemon running on ${this.baseUrl}? ` +
          `(Hint: install from https://ollama.com/download/windows, then \`ollama serve\` + \`ollama pull ${this.model}\`)`,
      );
    }
    const json = (await res.json()) as OllamaApiResponse;
    const text = json.response ?? '';
    const tokens = (json.prompt_eval_count ?? 0) + (json.eval_count ?? 0);
    return {
      text,
      tokensConsumed: tokens,
      costUsd: 0,
      provider: 'ollama',
    };
  }
}
