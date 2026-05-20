/**
 * LLM enrich tests — AC-003-1..5.
 */
import { describe, it, expect } from 'vitest';
import { enrichFinding } from '../../../src/stages/vuln-identify/llm-enrich.js';
import { MockProvider } from '../../../src/providers/llm/index.js';
import type { Finding } from '../../../src/ir/types.js';
import type { LlmProvider, LlmRequest, LlmResponse } from '../../../src/providers/llm/index.js';

const baseFinding: Finding = {
  schemaVersion: '1.0.0',
  id: 'F-test-001',
  ruleId: 'rule-1',
  severity: 'medium',
  confidence: '★★',
  probability: 0.7,
  evidenceTrail: [
    { type: 'pattern', citation: 'src/x.js:10', capturedAt: '2026-05-20T12:00:00Z' },
  ],
  sourceUrlLine: 'src/x.js:10',
  message: 'Original message',
  sarifLocation: { artifactLocation: { uri: 'src/x.js' }, region: { startLine: 10 } },
};

class StubEnrichProvider implements LlmProvider {
  readonly name = 'mock' as const;
  // eslint-disable-next-line @typescript-eslint/require-await
  async invoke(_req: LlmRequest): Promise<LlmResponse> {
    return {
      text: JSON.stringify({
        is_false_positive: false,
        confidence_adjusted: '★★★',
        severity_adjusted: 'high',
        exploit_context: 'Attacker can craft input to reach the vulnerable sink.',
        rationale: 'Multiple corroborating evidence chains confirm real exposure.',
      }),
      tokensConsumed: 300,
      costUsd: 0,
      provider: 'mock',
    };
  }
}

describe('enrichFinding', () => {
  it('AC-003-1: appends llm_judgment evidence trail entry', async () => {
    const enriched = await enrichFinding(baseFinding, { provider: new StubEnrichProvider() });
    expect(enriched.evidenceTrail.length).toBe(2);
    expect(enriched.evidenceTrail[1]?.type).toBe('llm_judgment');
  });

  it('AC-003-2: applies adjusted confidence + re-anchored probability', async () => {
    const enriched = await enrichFinding(baseFinding, { provider: new StubEnrichProvider() });
    expect(enriched.confidence).toBe('★★★');
    expect(enriched.probability).toBe(0.9); // ★★★ anchor
  });

  it('AC-003-3: applies adjusted severity', async () => {
    const enriched = await enrichFinding(baseFinding, { provider: new StubEnrichProvider() });
    expect(enriched.severity).toBe('high');
  });

  it('AC-003-4: exploit context embedded in evidenceTrail rationale', async () => {
    const enriched = await enrichFinding(baseFinding, { provider: new StubEnrichProvider() });
    const llmEntry = enriched.evidenceTrail.find((e) => e.type === 'llm_judgment');
    expect(llmEntry?.rationale).toContain('Exploit context');
  });

  it('AC-003-5: mock provider (non-JSON) returns finding unchanged', async () => {
    const enriched = await enrichFinding(baseFinding, { provider: new MockProvider() });
    expect(enriched.confidence).toBe(baseFinding.confidence);
    expect(enriched.severity).toBe(baseFinding.severity);
    expect(enriched.probability).toBe(baseFinding.probability);
    expect(enriched.evidenceTrail.length).toBe(baseFinding.evidenceTrail.length);
  });
});
