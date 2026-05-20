/**
 * Threat-model generator tests — AC-001 (REQ-001).
 */
import { describe, it, expect } from 'vitest';
import { generateThreatModel } from '../../../src/stages/threat-model/generator.js';
import { MockProvider } from '../../../src/providers/llm/index.js';
import type { LlmProvider, LlmRequest, LlmResponse } from '../../../src/providers/llm/index.js';

/** Stub provider that returns a fixed STRIDE-GPT-shaped JSON. */
class StubGenAiProvider implements LlmProvider {
  readonly name = 'mock' as const;
  // eslint-disable-next-line @typescript-eslint/require-await
  async invoke(_request: LlmRequest): Promise<LlmResponse> {
    return {
      text: JSON.stringify({
        threat_model: [
          {
            'Threat Type': 'Tampering',
            Scenario: 'Attacker injects malicious instructions via uploaded PDF processed by RAG.',
            'Potential Impact': 'Users receive misleading financial guidance.',
            OWASP_LLM: 'LLM01',
          },
          {
            'Threat Type': 'Information Disclosure',
            Scenario: 'LLM reveals PII from training data when prompted with similar examples.',
            'Potential Impact': 'Privacy breach affecting customer records.',
            OWASP_LLM: 'LLM02',
          },
        ],
        improvement_suggestions: [
          'Describe how user inputs are validated before reaching the LLM.',
        ],
      }),
      tokensConsumed: 1500,
      costUsd: 0,
      provider: 'mock',
    };
  }
}

describe('generateThreatModel', () => {
  it('AC-001-1: output validates against ThreatModel schema', async () => {
    const tm = await generateThreatModel({
      target: 'github.com/test/sample@abc',
      appType: 'Generative AI application',
      authentication: 'OAuth',
      internetFacing: 'yes',
      sensitiveData: 'PII',
      appInput: 'A small GenAI chat app using RAG over public docs.',
      provider: new StubGenAiProvider(),
    });
    expect(tm.schemaVersion).toBe('1.0.0');
    expect(tm.target).toBe('github.com/test/sample@abc');
    expect(tm.id).toMatch(/^tm-/);
    expect(tm.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('AC-001-3: STRIDE categories map to canonical enum', async () => {
    const tm = await generateThreatModel({
      target: 'test',
      appType: 'Generative AI application',
      authentication: 'none',
      internetFacing: 'no',
      sensitiveData: 'none',
      appInput: 'test',
      provider: new StubGenAiProvider(),
    });
    expect(tm.threats.length).toBe(2);
    expect(tm.threats[0]?.category).toBe('Tampering');
    expect(tm.threats[1]?.category).toBe('InformationDisclosure');
  });

  it('AC-001-4: OWASP LLM codes preserved on GenAI app', async () => {
    const tm = await generateThreatModel({
      target: 'test',
      appType: 'Generative AI application',
      authentication: 'none',
      internetFacing: 'no',
      sensitiveData: 'none',
      appInput: 'test',
      provider: new StubGenAiProvider(),
    });
    expect(tm.threats[0]?.owaspLlm).toBe('LLM01');
    expect(tm.threats[1]?.owaspLlm).toBe('LLM02');
  });

  it('Mock provider returns non-JSON → empty threat list + improvement note', async () => {
    const tm = await generateThreatModel({
      target: 'test',
      appType: 'Traditional application',
      authentication: 'none',
      internetFacing: 'no',
      sensitiveData: 'none',
      appInput: 'test',
      provider: new MockProvider(),
    });
    expect(tm.threats).toEqual([]);
    expect(tm.improvementSuggestions[0]).toContain('did not return parseable JSON');
  });
});
