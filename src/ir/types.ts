/**
 * IR (Intermediate Representation) — pure type definitions
 *
 * 3 core types:
 *   1. ThreatModel — STRIDE + OWASP LLM/ASI mapping (Stage 1 output)
 *   2. Finding    — vuln finding with W3 wedge (confidence + probability + evidence_trail)
 *   3. EvidenceTrail — citation chain backing each finding's confidence
 *
 * Runtime validators: see schema.ts (zod). Conversion to SARIF 2.1.0:
 * see ../io/emitters/sarif.ts (Stage 5).
 */

// ============================================================
// ThreatModel (Stage 1 output)
// ============================================================

export type StrideCategory =
  | 'Spoofing'
  | 'Tampering'
  | 'Repudiation'
  | 'InformationDisclosure'
  | 'DenialOfService'
  | 'ElevationOfPrivilege';

/** OWASP Top 10 for LLM Applications 2025 — LLM01-LLM10 */
export type OwaspLlmCode =
  | 'LLM01' | 'LLM02' | 'LLM03' | 'LLM04' | 'LLM05'
  | 'LLM06' | 'LLM07' | 'LLM08' | 'LLM09' | 'LLM10';

/** OWASP Agentic Systems Initiative (ASI) — placeholder, refined Stage 3 */
export type OwaspAsiCode = string;

export interface ThreatModel {
  /** Schema version (semver-compatible) */
  schemaVersion: '1.0.0';
  /** Unique identifier for this threat model artifact */
  id: string;
  /** Target repo / system identifier (e.g. "github.com/owner/repo@sha") */
  target: string;
  /** ISO 8601 UTC */
  generatedAt: string;
  /** Threats discovered, ordered by severity descending */
  threats: ThreatEntry[];
  /** Free-form improvement suggestions */
  improvementSuggestions: string[];
}

export interface ThreatEntry {
  /** Unique within ThreatModel.threats */
  id: string;
  category: StrideCategory;
  /** Brief scenario description */
  scenario: string;
  /** Potential impact (data / availability / confidentiality / integrity) */
  potentialImpact: string;
  /** OWASP LLM mapping if applicable (GenAI applications) */
  owaspLlm?: OwaspLlmCode;
  /** OWASP ASI mapping if applicable (agentic applications) */
  owaspAsi?: OwaspAsiCode;
}

// ============================================================
// Finding (Stage 2 output, W3 wedge)
// ============================================================

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Confidence marker — calibrated-honesty principle:
 *   '★★★' = high confidence (multiple independent evidence)
 *   '★★'  = medium confidence (single strong evidence)
 *   '★'   = low confidence (heuristic match, LLM-only judgment)
 *   '?'   = uncertain (require human triage)
 */
export type Confidence = '★★★' | '★★' | '★' | '?';

export interface Finding {
  schemaVersion: '1.0.0';
  /** Unique identifier (uuid v7 or similar time-ordered) */
  id: string;
  /** SAST/SCA rule identifier (e.g. "B101", "javascript.lang.security.audit.xss") */
  ruleId: string;
  severity: Severity;
  /** W3 wedge: literal confidence marker */
  confidence: Confidence;
  /** W3 wedge: 0.0 (impossible) - 1.0 (certain) */
  probability: number;
  /** W3 wedge: ordered evidence trail, weighted */
  evidenceTrail: EvidenceTrail[];
  /** Citation-required principle: literal source citation (file:line or URL) */
  sourceUrlLine: string;
  /** Human-readable explanation */
  message: string;
  /** Generated patch candidate (Stage 4 output, optional in Stage 2) */
  remediationSuggestion?: RemediationSuggestion;
  /** SARIF 2.1.0 physicalLocation */
  sarifLocation: SarifLocation;
}

// ============================================================
// EvidenceTrail (W3 wedge core)
// ============================================================

export type EvidenceType =
  /** Static source code excerpt at file:line */
  | 'source'
  /** SAST/SCA tool pattern match (rule_id + matched_text) */
  | 'pattern'
  /** LLM-based judgment (model + prompt_id + confidence_score) */
  | 'llm_judgment'
  /** External CVE / advisory reference */
  | 'advisory';

export interface EvidenceTrail {
  type: EvidenceType;
  /** Literal citation (URL, file:line, CVE-NNNN-NNNN, etc.) */
  citation: string;
  /** ISO 8601 UTC */
  capturedAt: string;
  /** Optional weight (0.0-1.0) — contribution to final confidence */
  weight?: number;
  /** Optional explanation of why this evidence is relevant */
  rationale?: string;
}

// ============================================================
// Supporting types
// ============================================================

export interface RemediationSuggestion {
  /** Suggested patch as unified diff string */
  diff: string;
  /** Re-scan validation outcome (Stage 4) */
  rescanValidated?: boolean;
  /** Syntax check outcome (Stage 4) */
  syntaxValid?: boolean;
  /** LLM model + prompt_id used to generate */
  generatedBy: string;
}

export interface SarifLocation {
  /** Relative path from repo root */
  artifactLocation: { uri: string };
  /** 1-based line + column ranges */
  region: {
    startLine: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
  };
}
