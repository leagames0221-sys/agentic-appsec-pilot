/**
 * IR runtime validators (zod)
 *
 * Provides JSON-schema-equivalent runtime validation for ThreatModel /
 * Finding / EvidenceTrail. Used by CLI input parsing, fixture tests,
 * and SARIF emit guards.
 *
 * Note: zod is declared in package.json but not installed until Stage 3
 * (per CLAUDE.md package-install rule). Code authored Stage 2; runnable
 * after first `pnpm install` in Stage 3.
 */

import { z } from 'zod';

// ============================================================
// Primitive enums
// ============================================================

export const strideCategorySchema = z.enum([
  'Spoofing',
  'Tampering',
  'Repudiation',
  'InformationDisclosure',
  'DenialOfService',
  'ElevationOfPrivilege',
]);

export const owaspLlmCodeSchema = z.enum([
  'LLM01', 'LLM02', 'LLM03', 'LLM04', 'LLM05',
  'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10',
]);

export const severitySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);

export const confidenceSchema = z.enum(['★★★', '★★', '★', '?']);

export const evidenceTypeSchema = z.enum(['source', 'pattern', 'llm_judgment', 'advisory']);

// ============================================================
// EvidenceTrail
// ============================================================

export const evidenceTrailSchema = z.object({
  type: evidenceTypeSchema,
  citation: z.string().min(1),
  capturedAt: z.string().datetime({ offset: false }),
  weight: z.number().min(0).max(1).optional(),
  rationale: z.string().optional(),
});

// ============================================================
// SarifLocation
// ============================================================

export const sarifLocationSchema = z.object({
  artifactLocation: z.object({ uri: z.string().min(1) }),
  region: z.object({
    startLine: z.number().int().positive(),
    startColumn: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    endColumn: z.number().int().positive().optional(),
  }),
});

// ============================================================
// RemediationSuggestion
// ============================================================

export const remediationSuggestionSchema = z.object({
  diff: z.string().min(1),
  rescanValidated: z.boolean().optional(),
  syntaxValid: z.boolean().optional(),
  generatedBy: z.string().min(1),
});

// ============================================================
// Finding
// ============================================================

export const findingSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  id: z.string().min(1),
  ruleId: z.string().min(1),
  severity: severitySchema,
  confidence: confidenceSchema,
  probability: z.number().min(0).max(1),
  evidenceTrail: z.array(evidenceTrailSchema).min(1),
  sourceUrlLine: z.string().min(1),
  message: z.string().min(1),
  remediationSuggestion: remediationSuggestionSchema.optional(),
  sarifLocation: sarifLocationSchema,
});

// ============================================================
// ThreatEntry
// ============================================================

export const threatEntrySchema = z.object({
  id: z.string().min(1),
  category: strideCategorySchema,
  scenario: z.string().min(1),
  potentialImpact: z.string().min(1),
  owaspLlm: owaspLlmCodeSchema.optional(),
  owaspAsi: z.string().optional(),
});

// ============================================================
// ThreatModel
// ============================================================

export const threatModelSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  id: z.string().min(1),
  target: z.string().min(1),
  generatedAt: z.string().datetime({ offset: false }),
  threats: z.array(threatEntrySchema),
  improvementSuggestions: z.array(z.string()),
});

// ============================================================
// Type re-exports (compile-time only; runtime use the schemas above)
// ============================================================

export type ThreatModelInput = z.infer<typeof threatModelSchema>;
export type FindingInput = z.infer<typeof findingSchema>;
export type EvidenceTrailInput = z.infer<typeof evidenceTrailSchema>;

// ============================================================
// Validator helpers (Stage 3 で CLI 経由 invoke)
// ============================================================

export function validateThreatModel(input: unknown): ThreatModelInput {
  return threatModelSchema.parse(input);
}

export function validateFinding(input: unknown): FindingInput {
  return findingSchema.parse(input);
}

export function validateEvidenceTrail(input: unknown): EvidenceTrailInput {
  return evidenceTrailSchema.parse(input);
}

/** Safe variant — returns Result instead of throwing */
export function safeValidateFinding(input: unknown): { ok: true; data: FindingInput } | { ok: false; error: z.ZodError } {
  const result = findingSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error };
}
