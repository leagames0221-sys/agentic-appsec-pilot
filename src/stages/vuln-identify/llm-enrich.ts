/**
 * LLM enrichment for findings.
 *
 * Spec mapping: REQ-003 (AC-003-1..5).
 *
 * 3 enrichment functions per finding:
 *   (a) false-positive triage — adjust confidence + add llm_judgment evidence
 *   (b) severity re-rank      — promote/demote with rationale
 *   (c) exploit context       — explain how the finding could be exploited
 *
 * When LLM provider unavailable (mock fallback), returns findings unchanged
 * (AC-003-5: no error, fall back to pure SAST output).
 */
import type { Finding, Confidence, EvidenceTrail, Severity } from '../../ir/types.js';
import type { LlmProvider } from '../../providers/llm/index.js';

interface EnrichLlmJudgment {
  is_false_positive?: boolean;
  confidence_adjusted?: Confidence;
  severity_adjusted?: Severity;
  exploit_context?: string;
  rationale?: string;
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function buildEnrichPrompt(finding: Finding): { system: string; user: string } {
  const system =
    'You are a senior application-security engineer. Analyse the provided ' +
    'static-analysis finding and respond with strict JSON only. No prose.';

  const user = `Finding to analyse:
- rule_id: ${finding.ruleId}
- severity: ${finding.severity}
- confidence (current): ${finding.confidence}
- probability (current): ${finding.probability}
- location: ${finding.sourceUrlLine}
- message: ${finding.message}
- evidence_trail count: ${finding.evidenceTrail.length}

Tasks:
1. Decide if this is likely a false positive.
2. Suggest an adjusted confidence marker from {★★★, ★★, ★, ?}.
3. Suggest an adjusted severity from {critical, high, medium, low, info}.
4. Provide a one-paragraph exploit context (how an attacker would leverage this if real).
5. Provide a one-sentence rationale.

Respond as JSON with keys:
{
  "is_false_positive": boolean,
  "confidence_adjusted": "★★★"|"★★"|"★"|"?",
  "severity_adjusted": "critical"|"high"|"medium"|"low"|"info",
  "exploit_context": "...",
  "rationale": "..."
}`;
  return { system, user };
}

const VALID_CONFIDENCES: ReadonlySet<string> = new Set(['★★★', '★★', '★', '?']);
const VALID_SEVERITIES: ReadonlySet<string> = new Set(['critical', 'high', 'medium', 'low', 'info']);

function parseEnrichResponse(text: string): EnrichLlmJudgment | undefined {
  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  try {
    const obj = JSON.parse(cleaned) as Record<string, unknown>;
    const judgment: EnrichLlmJudgment = {};
    if (typeof obj['is_false_positive'] === 'boolean') {
      judgment.is_false_positive = obj['is_false_positive'];
    }
    if (typeof obj['confidence_adjusted'] === 'string' && VALID_CONFIDENCES.has(obj['confidence_adjusted'])) {
      judgment.confidence_adjusted = obj['confidence_adjusted'] as Confidence;
    }
    if (typeof obj['severity_adjusted'] === 'string' && VALID_SEVERITIES.has(obj['severity_adjusted'])) {
      judgment.severity_adjusted = obj['severity_adjusted'] as Severity;
    }
    if (typeof obj['exploit_context'] === 'string') {
      judgment.exploit_context = obj['exploit_context'];
    }
    if (typeof obj['rationale'] === 'string') {
      judgment.rationale = obj['rationale'];
    }
    return judgment;
  } catch {
    return undefined;
  }
}

export interface EnrichOpts {
  provider: LlmProvider;
  /** Default 'gemma3:4b' or whatever the provider exposes. */
  modelHint?: string;
}

/**
 * Enriches a single finding via LLM. On any error (provider unavailable,
 * non-parseable response, etc.) returns the original finding unchanged
 * (AC-003-5: pure-SAST fallback).
 */
export async function enrichFinding(
  finding: Finding,
  opts: EnrichOpts,
): Promise<Finding> {
  const { system, user } = buildEnrichPrompt(finding);
  let response;
  try {
    response = await opts.provider.invoke({ system, prompt: user, jsonMode: true, maxTokens: 800 });
  } catch {
    return finding; // graceful fallback
  }
  const judgment = parseEnrichResponse(response.text);
  if (judgment === undefined) {
    // Mock provider or non-JSON response — keep finding unchanged.
    return finding;
  }

  const enrichmentEntry: EvidenceTrail = {
    type: 'llm_judgment',
    citation: `${response.provider}:${opts.modelHint ?? 'default'}@enrich-finding-v1`,
    capturedAt: nowIso(),
    weight: 0.4,
    rationale:
      [
        judgment.is_false_positive === true ? 'LLM marked as likely false positive.' : 'LLM confirmed plausible.',
        judgment.rationale,
        judgment.exploit_context !== undefined ? `Exploit context: ${judgment.exploit_context}` : undefined,
      ]
        .filter((s): s is string => typeof s === 'string')
        .join(' ')
        .slice(0, 1000),
  };

  // Apply adjustments
  const enriched: Finding = {
    ...finding,
    evidenceTrail: [...finding.evidenceTrail, enrichmentEntry],
  };
  if (judgment.confidence_adjusted !== undefined) {
    enriched.confidence = judgment.confidence_adjusted;
    // Re-anchor probability if confidence changed
    enriched.probability = recalibrateProbability(judgment.confidence_adjusted, finding.probability);
  }
  if (judgment.severity_adjusted !== undefined) {
    enriched.severity = judgment.severity_adjusted;
  }
  return enriched;
}

function recalibrateProbability(c: Confidence, fallback: number): number {
  const map: Record<Confidence, number> = { '★★★': 0.9, '★★': 0.75, '★': 0.5, '?': 0.2 };
  return map[c] ?? fallback;
}

/** Enriches a list, sequentially (avoid blasting LLM rate limit). */
export async function enrichAll(findings: Finding[], opts: EnrichOpts): Promise<Finding[]> {
  const out: Finding[] = [];
  for (const f of findings) {
    out.push(await enrichFinding(f, opts));
  }
  return out;
}
