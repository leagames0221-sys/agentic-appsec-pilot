/**
 * CycloneDX VEX (Vulnerability Exploitability eXchange) emitter.
 *
 * Emits VEX statements per CycloneDX 1.6 spec, mapping our Finding[]
 * to vulnerabilities[] with `analysis.state` derived from confidence:
 *   - confidence='?'  → analysis.state='not_affected' (false-positive candidate)
 *   - confidence='★'  → analysis.state='in_triage'
 *   - confidence='★★' → analysis.state='exploitable'
 *   - confidence='★★★' → analysis.state='exploitable' + justification
 *
 * Spec source: https://cyclonedx.org/capabilities/vex/
 * Schema: https://cyclonedx.org/docs/1.6/json/
 *
 * Spec mapping: AC-005-1..5, ADR-0005.
 */
import { atomicWrite } from './atomic.js';
import type { Finding } from '../../ir/types.js';

export const CYCLONEDX_BOM_FORMAT = 'CycloneDX';
export const CYCLONEDX_SPEC_VERSION = '1.6';

export interface VexAnalysis {
  state: 'resolved' | 'exploitable' | 'in_triage' | 'not_affected' | 'false_positive';
  justification?: string;
  detail?: string;
}

export interface VexVulnerability {
  'bom-ref'?: string;
  id: string;
  source?: { name: string; url?: string };
  description: string;
  analysis: VexAnalysis;
  affects?: Array<{ ref: string }>;
}

export interface CycloneDxVexDocument {
  bomFormat: typeof CYCLONEDX_BOM_FORMAT;
  specVersion: typeof CYCLONEDX_SPEC_VERSION;
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
  };
  vulnerabilities: VexVulnerability[];
}

function confidenceToAnalysisState(confidence: Finding['confidence']): VexAnalysis {
  switch (confidence) {
    case '★★★':
      return {
        state: 'exploitable',
        justification: 'High-confidence finding with corroborating evidence (★★★).',
      };
    case '★★':
      return { state: 'exploitable', justification: 'Medium-confidence pattern match (★★).' };
    case '★':
      return { state: 'in_triage', justification: 'Low-confidence heuristic match (★); human review pending.' };
    case '?':
      return { state: 'not_affected', justification: 'Uncertain (?); LLM triage suggests likely false positive.' };
  }
}

function deriveVulnSource(ruleId: string): { name: string; url?: string } {
  if (/^GHSA-/.test(ruleId)) {
    return { name: 'GHSA', url: `https://github.com/advisories/${ruleId}` };
  }
  if (/^CVE-/.test(ruleId)) {
    return { name: 'NVD', url: `https://nvd.nist.gov/vuln/detail/${ruleId}` };
  }
  if (/^B\d+$/.test(ruleId)) {
    return { name: 'Bandit', url: `https://bandit.readthedocs.io/en/latest/plugins/${ruleId.toLowerCase()}.html` };
  }
  return { name: 'OpenGrep' };
}

export interface BuildVexOpts {
  toolVersion?: string;
  /** Override timestamp for deterministic test fixtures. */
  timestamp?: string;
  /** Override serial number (UUID URN) for deterministic fixtures. */
  serialNumber?: string;
}

export function buildVexDocument(findings: Finding[], opts: BuildVexOpts = {}): CycloneDxVexDocument {
  const timestamp = opts.timestamp ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const serialNumber = opts.serialNumber ?? `urn:uuid:${crypto.randomUUID()}`;

  const vulnerabilities: VexVulnerability[] = findings.map((f) => ({
    'bom-ref': f.id,
    id: f.ruleId,
    source: deriveVulnSource(f.ruleId),
    description: f.message,
    analysis: confidenceToAnalysisState(f.confidence),
    affects: [{ ref: f.sarifLocation.artifactLocation.uri }],
  }));

  return {
    bomFormat: CYCLONEDX_BOM_FORMAT,
    specVersion: CYCLONEDX_SPEC_VERSION,
    serialNumber,
    version: 1,
    metadata: {
      timestamp,
      tools: [{ vendor: 'leagames0221-sys', name: 'agentic-appsec-pilot', version: opts.toolVersion ?? '0.1.0' }],
    },
    vulnerabilities,
  };
}

export function serializeVexDocument(doc: CycloneDxVexDocument): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export async function emitVexDocument(
  findings: Finding[],
  outputPath: string,
  opts: BuildVexOpts = {},
): Promise<void> {
  await atomicWrite(outputPath, serializeVexDocument(buildVexDocument(findings, opts)), {
    mkdirParent: true,
  });
}
