/**
 * Stage 2 (Vuln Identify) shared types.
 *
 * Spec mapping: REQ-002 (AC-002-1..5), ADR-0003 (SCA = OSV-Scanner).
 */

import type { Finding, Severity, Confidence } from '../../ir/types.js';

export interface ScanOpts {
  /** Absolute path to repo root */
  repoPath: string;
  /** Defaults to bin name (PATH lookup) */
  opengrepPath?: string;
  banditPath?: string;
  osvScannerPath?: string;
  /** Per-tool timeout in ms (default 120_000) */
  timeoutMs?: number;
}

export interface ScanResult {
  findings: Finding[];
  /** Per-tool exit status: 'ok' / 'not-installed' / 'error' */
  toolStatus: {
    opengrep: 'ok' | 'not-installed' | 'error';
    bandit: 'ok' | 'not-installed' | 'error';
    osvScanner: 'ok' | 'not-installed' | 'error';
  };
  errors: string[];
}

/** Default confidence assignment per source type. Overridable post-correlation. */
export const DEFAULT_CONFIDENCE: Record<'opengrep' | 'bandit-high' | 'bandit-med' | 'bandit-low' | 'osv', Confidence> = {
  opengrep: '★★',
  'bandit-high': '★★★',
  'bandit-med': '★★',
  'bandit-low': '★',
  osv: '★★★',
};

/** Default probability per confidence marker (calibration anchor). */
export const DEFAULT_PROBABILITY: Record<Confidence, number> = {
  '★★★': 0.9,
  '★★': 0.75,
  '★': 0.5,
  '?': 0.2,
};

/** Maps Bandit issue_severity to our Severity. */
export function banditSeverity(s: string): Severity {
  switch (s.toUpperCase()) {
    case 'HIGH': return 'high';
    case 'MEDIUM': return 'medium';
    case 'LOW': return 'low';
    default: return 'info';
  }
}

/** Maps Semgrep/OpenGrep extra.severity to our Severity. */
export function semgrepSeverity(s: string): Severity {
  switch (s.toUpperCase()) {
    case 'ERROR': return 'high';
    case 'WARNING': return 'medium';
    case 'INFO': return 'low';
    default: return 'info';
  }
}

/** Maps Bandit issue_confidence + issue_severity to our Confidence. */
export function banditConfidence(conf: string): Confidence {
  switch (conf.toUpperCase()) {
    case 'HIGH': return '★★★';
    case 'MEDIUM': return '★★';
    case 'LOW': return '★';
    default: return '?';
  }
}
