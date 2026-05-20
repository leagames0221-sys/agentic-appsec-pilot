/**
 * OSV-Scanner CLI wrap — SCA (Software Composition Analysis).
 *
 * Spawns `osv-scanner --format json <path>` and parses output into
 * Finding[]. Spec mapping: AC-002-1, AC-002-3, AC-002-5.
 *
 * License: OSV-Scanner is Apache-2.0 (Google). External binary invocation.
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Finding, Severity } from '../../ir/types.js';
import { DEFAULT_CONFIDENCE, DEFAULT_PROBABILITY } from './types.js';

interface OsvVulnerability {
  id?: string;
  summary?: string;
  aliases?: string[];
  database_specific?: {
    severity?: string;
  };
}

interface OsvPackageInfo {
  package?: { name?: string; version?: string; ecosystem?: string };
  vulnerabilities?: OsvVulnerability[];
}

interface OsvResult {
  source?: { path?: string; type?: string };
  packages?: OsvPackageInfo[];
}

interface OsvRawOutput {
  results?: OsvResult[];
}

export interface OsvScannerWrapOptions {
  cliPath?: string;
  timeoutMs?: number;
}

export async function runOsvScanner(
  repoPath: string,
  options: OsvScannerWrapOptions = {},
): Promise<{ findings: Finding[]; status: 'ok' | 'not-installed' | 'error'; error?: string }> {
  const cliPath = options.cliPath ?? 'osv-scanner';
  const timeoutMs = options.timeoutMs ?? 180_000;

  try {
    const rawJson = await spawnAndCapture(cliPath, ['--format', 'json', repoPath], timeoutMs);
    const parsed = JSON.parse(rawJson) as OsvRawOutput;
    const findings = (parsed.results ?? []).flatMap(parseOsvResult);
    return { findings, status: 'ok' };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return { findings: [], status: 'not-installed', error: 'osv-scanner CLI not in PATH; install from https://github.com/google/osv-scanner/releases' };
    }
    return { findings: [], status: 'error', error: err.message };
  }
}

export function parseOsvResult(raw: OsvResult): Finding[] {
  const sourcePath = raw.source?.path;
  if (sourcePath === undefined) return [];
  const findings: Finding[] = [];
  for (const pkg of raw.packages ?? []) {
    const pkgName = pkg.package?.name ?? '<unknown>';
    const pkgVersion = pkg.package?.version ?? '<unknown>';
    const ecosystem = pkg.package?.ecosystem ?? 'unknown';
    for (const vuln of pkg.vulnerabilities ?? []) {
      if (vuln.id === undefined) continue;
      const severity = osvSeverity(vuln.database_specific?.severity);
      const confidence = DEFAULT_CONFIDENCE.osv;
      findings.push({
        schemaVersion: '1.0.0',
        id: `F-${randomUUID()}`,
        ruleId: vuln.id,
        severity,
        confidence,
        probability: DEFAULT_PROBABILITY[confidence],
        evidenceTrail: [
          {
            type: 'advisory',
            citation: `https://osv.dev/vulnerability/${vuln.id}`,
            capturedAt: nowIso(),
            weight: 1.0,
            rationale: `OSV ${vuln.id} affects ${ecosystem}:${pkgName}@${pkgVersion} — ${vuln.summary ?? 'no summary'}`.slice(0, 500),
          },
          {
            type: 'source',
            citation: `${sourcePath}:1`,
            capturedAt: nowIso(),
            weight: 0.5,
            rationale: `Package ${pkgName}@${pkgVersion} declared in ${sourcePath}`,
          },
        ],
        sourceUrlLine: `${sourcePath}:1`,
        message: `${ecosystem} dependency ${pkgName}@${pkgVersion} affected by ${vuln.id}: ${vuln.summary ?? 'no summary'}`,
        sarifLocation: {
          artifactLocation: { uri: sourcePath },
          region: { startLine: 1 },
        },
      });
    }
  }
  return findings;
}

function osvSeverity(s: string | undefined): Severity {
  switch ((s ?? '').toUpperCase()) {
    case 'CRITICAL': return 'critical';
    case 'HIGH': return 'high';
    case 'MODERATE':
    case 'MEDIUM': return 'medium';
    case 'LOW': return 'low';
    default: return 'medium';
  }
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function spawnAndCapture(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error(`${cmd} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (c: Buffer) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c: Buffer) => { stderr += c.toString('utf8'); });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // osv-scanner exit code 1 = vulns found, treat as success
      if (code === 0 || code === 1) resolve(stdout);
      else reject(new Error(`${cmd} exit ${code ?? 'null'}: ${stderr.slice(0, 300)}`));
    });
  });
}
