/**
 * `agentic-appsec patch <sarif-path> [--finding-id <id>]` subcommand.
 *
 * Reads a previously-emitted SARIF file, locates the finding by id,
 * generates a patch suggestion + validates, and prints the patched
 * finding as JSON. Spec mapping: REQ-004 (AC-004-1..4).
 */
import { promises as fs } from 'node:fs';
import { createProvider } from '../providers/llm/index.js';
import { suggestPatch } from '../stages/patch-suggest/index.js';
import { ExitCode, AgenticAppsecError } from '../errors/index.js';
import type { Finding } from '../ir/types.js';
import { findingSchema } from '../ir/schema.js';

export interface PatchCmdOpts {
  sarifPath: string;
  findingId?: string;
  repo: string;
  output?: string;
  provider?: string;
  useClaudeCode?: boolean;
  skipRescan?: boolean;
}

interface SarifResultEntry {
  ruleId?: string;
  message?: { text?: string };
  level?: string;
  locations?: Array<{ physicalLocation?: { artifactLocation?: { uri?: string }; region?: { startLine?: number } } }>;
  partialFingerprints?: Record<string, string>;
  properties?: Record<string, unknown>;
}

interface SarifLogShape {
  runs?: Array<{ results?: SarifResultEntry[] }>;
}

function sarifResultToFinding(r: SarifResultEntry): Finding | undefined {
  const props = r.properties ?? {};
  const id = r.partialFingerprints?.['agenticAppsecFindingId'];
  const ruleId = r.ruleId;
  const loc = r.locations?.[0]?.physicalLocation;
  const uri = loc?.artifactLocation?.uri;
  const startLine = loc?.region?.startLine;
  if (id === undefined || ruleId === undefined || uri === undefined || startLine === undefined) {
    return undefined;
  }
  const candidate = {
    schemaVersion: '1.0.0',
    id,
    ruleId,
    severity: levelToSeverity(r.level),
    confidence: props['confidence'] ?? '?',
    probability: props['probability'] ?? 0.2,
    evidenceTrail: props['evidenceTrail'] ?? [],
    sourceUrlLine: props['sourceUrlLine'] ?? `${uri}:${startLine}`,
    message: r.message?.text ?? '',
    sarifLocation: {
      artifactLocation: { uri },
      region: { startLine },
    },
  };
  const result = findingSchema.safeParse(candidate);
  if (!result.success) return undefined;
  return result.data as Finding;
}

function levelToSeverity(level: string | undefined): Finding['severity'] {
  switch (level) {
    case 'error': return 'high';
    case 'warning': return 'medium';
    case 'note': return 'low';
    case 'none': return 'info';
    default: return 'medium';
  }
}

export async function runPatch(
  opts: PatchCmdOpts,
  stdout: NodeJS.WritableStream = process.stdout,
): Promise<void> {
  let sarifRaw: string;
  try {
    sarifRaw = await fs.readFile(opts.sarifPath, 'utf8');
  } catch (err) {
    throw new AgenticAppsecError(
      ExitCode.IoError,
      `Cannot read SARIF file ${opts.sarifPath}: ${(err as Error).message}`,
    );
  }
  let log: SarifLogShape;
  try {
    log = JSON.parse(sarifRaw) as SarifLogShape;
  } catch (err) {
    throw new AgenticAppsecError(
      ExitCode.DataFormatError,
      `SARIF file is not valid JSON: ${(err as Error).message}`,
    );
  }
  const results = log.runs?.[0]?.results ?? [];
  const findings = results
    .map(sarifResultToFinding)
    .filter((f): f is Finding => f !== undefined);
  if (findings.length === 0) {
    throw new AgenticAppsecError(
      ExitCode.InvalidInput,
      `No valid findings recovered from SARIF ${opts.sarifPath}`,
    );
  }
  const target = opts.findingId !== undefined
    ? findings.find((f) => f.id === opts.findingId)
    : findings[0];
  if (target === undefined) {
    throw new AgenticAppsecError(
      ExitCode.InvalidInput,
      `Finding id "${opts.findingId ?? '(first)'}" not found in SARIF`,
    );
  }

  const provider = createProvider(opts.provider, {
    useClaudeCodeCli: opts.useClaudeCode === true,
  });
  const patched = await suggestPatch(target, {
    provider,
    repoPath: opts.repo,
    ...(opts.skipRescan !== undefined ? { skipRescan: opts.skipRescan } : {}),
  });

  stdout.write(`${JSON.stringify(patched, null, 2)}\n`);
}
