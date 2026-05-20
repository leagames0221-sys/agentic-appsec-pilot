/**
 * SARIF 2.1.0 emitter with W3 wedge propertyBag extension.
 *
 * Adapted from sibling tool mcp-guard (MIT, internal universal pattern),
 * extended to embed our W3 wedge fields (confidence + probability +
 * evidence_trail) into SARIF 2.1.0 `result.properties` per OASIS spec
 * §3.8 + §3.8.1 propertyBag mechanism (spec-compliant, not a spec
 * extension).
 *
 * Spec mapping: AC-002-1, AC-005-1 through AC-005-5, ADR-0005.
 *
 * License compliance: hand-rolled, no external sarif-* npm dep
 * (supply-chain blast radius minimization).
 */
import { atomicWrite } from './atomic.js';
import type { Finding, Severity } from '../../ir/types.js';

export const SARIF_VERSION = '2.1.0';
export const SARIF_SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json';
export const TOOL_NAME = 'agentic-appsec-pilot';
export const TOOL_INFORMATION_URI = 'https://github.com/leagames0221-sys/agentic-appsec-pilot';

export type SarifLevel = 'none' | 'note' | 'warning' | 'error';

export interface SarifArtifactLocation {
  uri: string;
}

export interface SarifRegion {
  startLine: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

export interface SarifPhysicalLocation {
  artifactLocation: SarifArtifactLocation;
  region: SarifRegion;
}

export interface SarifLocation {
  physicalLocation: SarifPhysicalLocation;
}

export interface SarifMessage {
  text: string;
}

export interface SarifReportingDescriptor {
  id: string;
  name?: string;
  shortDescription?: SarifMessage;
  defaultConfiguration?: { level: SarifLevel };
}

export interface SarifResult {
  ruleId: string;
  ruleIndex?: number;
  level: SarifLevel;
  message: SarifMessage;
  locations: SarifLocation[];
  partialFingerprints?: Record<string, string>;
  /**
   * W3 wedge: confidence + probability + evidence_trail embedded in
   * propertyBag (OASIS SARIF 2.1.0 §3.8 / §3.8.1). External viewers
   * (GitHub Code Scanning, VS Code SARIF extension) treat this as
   * opaque metadata and render the finding normally (AC-005-5).
   */
  properties?: Record<string, unknown>;
}

export interface SarifToolComponent {
  name: string;
  version: string;
  informationUri?: string;
  rules: SarifReportingDescriptor[];
}

export interface SarifRun {
  tool: { driver: SarifToolComponent };
  results: SarifResult[];
}

export interface SarifLog {
  $schema: typeof SARIF_SCHEMA;
  version: typeof SARIF_VERSION;
  runs: SarifRun[];
}

export function severityToSarifLevel(severity: Severity): SarifLevel {
  switch (severity) {
    case 'info': return 'none';
    case 'low': return 'note';
    case 'medium': return 'warning';
    case 'high': return 'error';
    case 'critical': return 'error';
  }
}

/** SARIF artifactLocation.uri prefers forward-slashed paths. */
export function pathToSarifUri(p: string): string {
  return p.replace(/\\/g, '/');
}

function buildLocations(finding: Finding): SarifLocation[] {
  const region: SarifRegion = { startLine: finding.sarifLocation.region.startLine };
  if (finding.sarifLocation.region.startColumn !== undefined) region.startColumn = finding.sarifLocation.region.startColumn;
  if (finding.sarifLocation.region.endLine !== undefined) region.endLine = finding.sarifLocation.region.endLine;
  if (finding.sarifLocation.region.endColumn !== undefined) region.endColumn = finding.sarifLocation.region.endColumn;
  return [
    {
      physicalLocation: {
        artifactLocation: { uri: pathToSarifUri(finding.sarifLocation.artifactLocation.uri) },
        region,
      },
    },
  ];
}

function buildPropertyBag(finding: Finding): Record<string, unknown> {
  const bag: Record<string, unknown> = {
    confidence: finding.confidence,
    probability: finding.probability,
    evidenceTrail: finding.evidenceTrail,
    sourceUrlLine: finding.sourceUrlLine,
  };
  if (finding.remediationSuggestion !== undefined) {
    bag['remediationSuggestion'] = finding.remediationSuggestion;
  }
  return bag;
}

export interface BuildSarifOpts {
  /** Tool version string. Default: matches package.json (Stage 5 wires "0.1.0"). */
  version?: string;
}

export function buildSarifLog(findings: Finding[], opts: BuildSarifOpts = {}): SarifLog {
  const version = opts.version ?? '0.1.0';
  // Stable rule index = order of first appearance.
  const ruleById = new Map<string, SarifReportingDescriptor>();
  for (const f of findings) {
    if (!ruleById.has(f.ruleId)) {
      ruleById.set(f.ruleId, {
        id: f.ruleId,
        name: f.ruleId,
        shortDescription: { text: f.ruleId },
        defaultConfiguration: { level: severityToSarifLevel(f.severity) },
      });
    }
  }
  const rules = Array.from(ruleById.values());
  const ruleIndexById = new Map(rules.map((r, i) => [r.id, i] as const));

  const results: SarifResult[] = findings.map((finding) => {
    const result: SarifResult = {
      ruleId: finding.ruleId,
      level: severityToSarifLevel(finding.severity),
      message: { text: finding.message },
      locations: buildLocations(finding),
      partialFingerprints: { agenticAppsecFindingId: finding.id },
      properties: buildPropertyBag(finding),
    };
    const idx = ruleIndexById.get(finding.ruleId);
    if (idx !== undefined) result.ruleIndex = idx;
    return result;
  });

  return {
    $schema: SARIF_SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            version,
            informationUri: TOOL_INFORMATION_URI,
            rules,
          },
        },
        results,
      },
    ],
  };
}

export function serializeSarifLog(log: SarifLog): string {
  return `${JSON.stringify(log, null, 2)}\n`;
}

export async function emitSarifReport(
  findings: Finding[],
  outputPath: string,
  opts: BuildSarifOpts = {},
): Promise<void> {
  await atomicWrite(outputPath, serializeSarifLog(buildSarifLog(findings, opts)), {
    mkdirParent: true,
  });
}
