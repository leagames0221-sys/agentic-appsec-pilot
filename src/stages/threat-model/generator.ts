/**
 * Threat-model generator — composes STRIDE-GPT prompts with the chosen
 * LLM provider, parses the response, and returns a ThreatModel.
 *
 * Spec mapping: REQ-001 (AC-001-1 to AC-001-5), ADR-0002, ADR-0007.
 */
import { randomUUID } from 'node:crypto';
import type { LlmProvider } from '../../providers/llm/index.js';
import { createThreatModelPrompt } from './prompts/stride.js';
import type { ThreatModelPromptOpts } from './prompts/types.js';
import type { ThreatModel, ThreatEntry, StrideCategory, OwaspLlmCode } from '../../ir/types.js';
import { threatModelSchema } from '../../ir/schema.js';

const owaspLlmCodes = new Set<string>([
  'LLM01', 'LLM02', 'LLM03', 'LLM04', 'LLM05',
  'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10',
]);
function isOwaspLlmCode(s: string): s is OwaspLlmCode {
  return owaspLlmCodes.has(s);
}

/** Maps STRIDE-GPT free-form "Threat Type" string to our StrideCategory enum. */
const strideCategoryMap: Record<string, StrideCategory> = {
  spoofing: 'Spoofing',
  tampering: 'Tampering',
  repudiation: 'Repudiation',
  'information disclosure': 'InformationDisclosure',
  'denial of service': 'DenialOfService',
  'elevation of privilege': 'ElevationOfPrivilege',
};

function normalizeCategory(raw: string): StrideCategory | undefined {
  return strideCategoryMap[raw.trim().toLowerCase()];
}

export interface GenerateThreatModelOpts extends ThreatModelPromptOpts {
  /** Target identifier (e.g. "github.com/owner/repo@sha"). */
  target: string;
  /** LLM provider (mock / ollama / claude-code-cli). */
  provider: LlmProvider;
}

interface StrideGptOutput {
  threat_model?: Array<{
    'Threat Type'?: string;
    Scenario?: string;
    'Potential Impact'?: string;
    OWASP_LLM?: string | null;
    OWASP_ASI?: string | null;
  }>;
  improvement_suggestions?: string[];
}

function buildThreatEntry(
  idx: number,
  category: StrideCategory,
  t: NonNullable<StrideGptOutput['threat_model']>[number],
): ThreatEntry {
  const id = `T-${String(idx + 1).padStart(3, '0')}`;
  const scenario = t.Scenario ?? '';
  const potentialImpact = t['Potential Impact'] ?? '';
  const owaspLlmRaw = t.OWASP_LLM;
  const owaspAsiRaw = t.OWASP_ASI;

  if (typeof owaspLlmRaw === 'string' && isOwaspLlmCode(owaspLlmRaw)) {
    if (typeof owaspAsiRaw === 'string' && owaspAsiRaw.length > 0) {
      return { id, category, scenario, potentialImpact, owaspLlm: owaspLlmRaw, owaspAsi: owaspAsiRaw };
    }
    return { id, category, scenario, potentialImpact, owaspLlm: owaspLlmRaw };
  }
  if (typeof owaspAsiRaw === 'string' && owaspAsiRaw.length > 0) {
    return { id, category, scenario, potentialImpact, owaspAsi: owaspAsiRaw };
  }
  return { id, category, scenario, potentialImpact };
}

export async function generateThreatModel(opts: GenerateThreatModelOpts): Promise<ThreatModel> {
  const { system, user } = createThreatModelPrompt({
    appType: opts.appType,
    authentication: opts.authentication,
    internetFacing: opts.internetFacing,
    sensitiveData: opts.sensitiveData,
    appInput: opts.appInput,
  });

  const response = await opts.provider.invoke({
    system,
    prompt: user,
    jsonMode: true,
    maxTokens: 4000,
  });

  // Tolerant parsing: strip code fences if present, then JSON.parse.
  const cleaned = response.text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  let parsed: StrideGptOutput;
  try {
    parsed = JSON.parse(cleaned) as StrideGptOutput;
  } catch {
    // Mock provider returns non-JSON text; emit empty threat model with
    // an improvement suggestion noting the provider was non-real.
    parsed = {
      threat_model: [],
      improvement_suggestions: [
        `Provider "${response.provider}" did not return parseable JSON. Switch to ollama or claude-code-cli for real output.`,
      ],
    };
  }

  const threats: ThreatEntry[] = (parsed.threat_model ?? []).flatMap((t, idx) => {
    const category = normalizeCategory(t['Threat Type'] ?? '');
    if (category === undefined) return [];
    return [buildThreatEntry(idx, category, t)];
  });

  const model: ThreatModel = {
    schemaVersion: '1.0.0',
    id: `tm-${randomUUID()}`,
    target: opts.target,
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    threats,
    improvementSuggestions: parsed.improvement_suggestions ?? [],
  };

  // Defensive: validate our own output against the schema before returning.
  // The schema accepts the structure; assert back to ThreatEntry-strict shape
  // (zod's inferred optional shape differs from `exactOptionalPropertyTypes` strict TS type).
  threatModelSchema.parse(model);
  return model;
}
