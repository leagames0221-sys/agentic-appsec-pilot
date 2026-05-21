/**
 * Paid-API 6-layer defense utilities.
 *
 * Adapted from companion repo sbom-pilot (https://github.com/leagames0221-sys/sbom-pilot, MIT).
 *
 * agentic-appsec-pilot's hard constraint is "no surprise network calls
 * and no surprise credit-card charges". Per ADR-0007 the project does
 * NOT wire any paid LLM provider — Anthropic / OpenAI SDK direct calls
 * are literal banned. This module is preserved as scaffolding so future
 * scenarios (e.g. a contributor explicitly opting in for a closed
 * evaluation against a sandbox account) cannot bypass the layers.
 *
 * Layers exposed here:
 *   1. constructorGate          — 2-factor env opt-in
 *   2. preflightReserve         — 3 ceiling (tokens / requests / cost) + poisoned state
 *   3. maskApiKey               — prefix-6 + asterisks
 *   4. assertNotCiAutoCall      — CI=true blocks unless explicit allow flag
 *
 * Layer 5 (default = mock or Ollama) is enforced by the factory in
 * `index.ts`. Layer 6 (no-credit-card service) is enforced by project
 * policy (Tier 2 CLAUDE.md §PJ 固有 forbidden).
 *
 * Spec mapping: AC-010-1 through AC-010-7, ADR-0007.
 */

export interface PaidProviderConfig {
  /** e.g. 'anthropic' / 'openai'. Used in error messages and the second-factor env-var check. */
  providerName: string;
  /** e.g. 'ANTHROPIC_API_KEY'. */
  apiKeyEnvVar: string;
  /** Maximum tokens per process before the reserve is poisoned. */
  tokenLimit: number;
  /** Maximum API requests per process. */
  requestLimit: number;
  /** Maximum USD cost per process. */
  costLimitUsd: number;
}

export interface ReserveState {
  tokensUsed: number;
  requestsUsed: number;
  costUsedUsd: number;
  poisoned: boolean;
}

export function newReserveState(): ReserveState {
  return {
    tokensUsed: 0,
    requestsUsed: 0,
    costUsedUsd: 0,
    poisoned: false,
  };
}

export class PaidDefenseError extends Error {
  readonly layer: 'constructor' | 'reserve' | 'ci-ban' | 'mask';
  constructor(layer: PaidDefenseError['layer'], message: string) {
    super(message);
    this.name = 'PaidDefenseError';
    this.layer = layer;
  }
}

/**
 * Layer 1 — Constructor gate.
 *
 * Allowed only when BOTH:
 *   - `<config.apiKeyEnvVar>` is set to a non-empty string
 *   - `AGENTIC_APPSEC_LLM_PROVIDER` is set to exactly `config.providerName`
 *
 * Returns the API key on success; throws PaidDefenseError otherwise.
 */
export function constructorGate(
  config: PaidProviderConfig,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const key = env[config.apiKeyEnvVar];
  if (key === undefined || key.length === 0) {
    throw new PaidDefenseError(
      'constructor',
      `Paid provider ${config.providerName} is blocked: ${config.apiKeyEnvVar} is not set. ` +
        `Set the key AND AGENTIC_APPSEC_LLM_PROVIDER=${config.providerName} to opt in. ` +
        `Note: this project does not wire paid providers per ADR-0007; the gate is preserved as scaffolding only.`,
    );
  }
  const optIn = env['AGENTIC_APPSEC_LLM_PROVIDER'];
  if (optIn !== config.providerName) {
    throw new PaidDefenseError(
      'constructor',
      `Paid provider ${config.providerName} is blocked: AGENTIC_APPSEC_LLM_PROVIDER must be exactly "${config.providerName}" (got: ${optIn ?? 'undefined'}).`,
    );
  }
  return key;
}

export interface PreflightCharge {
  tokens: number;
  costUsd: number;
}

export function preflightReserve(
  state: ReserveState,
  charge: PreflightCharge,
  config: PaidProviderConfig,
): ReserveState {
  if (state.poisoned) {
    throw new PaidDefenseError(
      'reserve',
      `Paid provider ${config.providerName} reserve is poisoned; all subsequent calls blocked. Restart the process to recover.`,
    );
  }
  const nextTokens = state.tokensUsed + charge.tokens;
  const nextRequests = state.requestsUsed + 1;
  const nextCost = state.costUsedUsd + charge.costUsd;

  if (nextTokens > config.tokenLimit) {
    throw new PaidDefenseError(
      'reserve',
      `Paid provider ${config.providerName} token ceiling (${config.tokenLimit}) exceeded by this call (${nextTokens} requested). Reserve poisoned.`,
    );
  }
  if (nextRequests > config.requestLimit) {
    throw new PaidDefenseError(
      'reserve',
      `Paid provider ${config.providerName} request-count ceiling (${config.requestLimit}) exceeded. Reserve poisoned.`,
    );
  }
  if (nextCost > config.costLimitUsd) {
    throw new PaidDefenseError(
      'reserve',
      `Paid provider ${config.providerName} cost ceiling (USD ${config.costLimitUsd}) exceeded by this call (USD ${nextCost.toFixed(4)}). Reserve poisoned.`,
    );
  }
  return {
    tokensUsed: nextTokens,
    requestsUsed: nextRequests,
    costUsedUsd: nextCost,
    poisoned: false,
  };
}

/** Layer 3 — Key non-leak. */
export function maskApiKey(key: string): string {
  if (key.length <= 6) return '***';
  const prefix = key.slice(0, 6);
  return `${prefix}${'*'.repeat(key.length - 6)}`;
}

/** Layer 4 — CI auto-call ban. */
export function assertNotCiAutoCall(env: NodeJS.ProcessEnv = process.env): void {
  const ci = env['CI'];
  if (ci !== 'true' && ci !== '1') return;
  const allow = env['AGENTIC_APPSEC_TEST_ALLOW_PAID'];
  if (allow === '1') return;
  throw new PaidDefenseError(
    'ci-ban',
    'Paid provider blocked: CI environment detected (CI=true). Set AGENTIC_APPSEC_TEST_ALLOW_PAID=1 only in a sandboxed CI step.',
  );
}
