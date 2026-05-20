/**
 * Provider factory tests — AC-006-1 / AC-006-3 / AC-010-1 (paid fallback).
 */
import { describe, it, expect } from 'vitest';
import {
  createProvider,
  MockProvider,
  OllamaProvider,
  ClaudeCodeCliProvider,
  constructorGate,
  PaidDefenseError,
  maskApiKey,
  newReserveState,
  preflightReserve,
} from '../../../src/providers/llm/index.js';

describe('createProvider — default fallback', () => {
  it('AC-006-3: unset env returns MockProvider', () => {
    const p = createProvider(undefined, { env: {} });
    expect(p).toBeInstanceOf(MockProvider);
    expect(p.name).toBe('mock');
  });

  it('AC-006-3: typo provider name falls back to mock (no silent paid activation)', () => {
    const p = createProvider('antropic', { env: {} });
    expect(p).toBeInstanceOf(MockProvider);
  });

  it('AC-006-1: "ollama" env returns OllamaProvider', () => {
    const p = createProvider('ollama', { env: {} });
    expect(p).toBeInstanceOf(OllamaProvider);
  });

  it('AC-006-1: --use-claude-code flag returns ClaudeCodeCliProvider', () => {
    const p = createProvider(undefined, { env: {}, useClaudeCodeCli: true });
    expect(p).toBeInstanceOf(ClaudeCodeCliProvider);
  });

  it('AC-010-1: paid name "anthropic" falls back to mock (paths not wired)', () => {
    const p = createProvider('anthropic', { env: {} });
    expect(p).toBeInstanceOf(MockProvider);
  });

  it('AC-010-1: paid name "openai" falls back to mock', () => {
    const p = createProvider('openai', { env: {} });
    expect(p).toBeInstanceOf(MockProvider);
  });
});

describe('paid-defense scaffolding', () => {
  const cfg = {
    providerName: 'anthropic',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    tokenLimit: 1000,
    requestLimit: 10,
    costLimitUsd: 1.0,
  };

  it('AC-010-1: constructor gate blocks when api key absent', () => {
    expect(() => constructorGate(cfg, {})).toThrow(PaidDefenseError);
  });

  it('AC-010-1: constructor gate blocks when opt-in env unset', () => {
    expect(() => constructorGate(cfg, { ANTHROPIC_API_KEY: 'FAKE_TEST_VALUE_001' })).toThrow(
      PaidDefenseError,
    );
  });

  it('AC-010-1: constructor gate passes when BOTH env vars set', () => {
    const key = constructorGate(cfg, {
      ANTHROPIC_API_KEY: 'FAKE_TEST_VALUE_002_NEVER_REAL',
      AGENTIC_APPSEC_LLM_PROVIDER: 'anthropic',
    });
    expect(key).toBe('FAKE_TEST_VALUE_002_NEVER_REAL');
  });

  it('AC-010-2: pre-flight reserve poisons on token ceiling exceed', () => {
    const state = newReserveState();
    expect(() =>
      preflightReserve(state, { tokens: 2000, costUsd: 0 }, cfg),
    ).toThrow(PaidDefenseError);
  });

  it('AC-010-3: key non-leak — long key masked with prefix-6 + asterisks', () => {
    const fake = 'PREFIX-12345678901234567890';
    const masked = maskApiKey(fake);
    expect(masked.startsWith('PREFIX')).toBe(true);
    expect(masked).not.toContain('12345');
    expect(masked.length).toBe(fake.length);
  });

  it('AC-010-3: short key (<=6) renders as ***', () => {
    expect(maskApiKey('abc')).toBe('***');
    expect(maskApiKey('abcdef')).toBe('***');
  });
});

describe('MockProvider.invoke', () => {
  it('AC-006-3: returns deterministic text with no network call', async () => {
    const p = new MockProvider();
    const res = await p.invoke({ prompt: 'hello world' });
    expect(res.provider).toBe('mock');
    expect(res.costUsd).toBe(0);
    expect(res.tokensConsumed).toBe(0);
    expect(res.text).toContain('mock provider');
    expect(res.text).toContain('hello world');
  });
});
