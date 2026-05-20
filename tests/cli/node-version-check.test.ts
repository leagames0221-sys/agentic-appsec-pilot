/**
 * Node version check tests — AC-008-1.
 */
import { describe, it, expect } from 'vitest';
import {
  checkNodeVersion,
  parseMajor,
  MIN_NODE_MAJOR,
} from '../../src/cli/node-version-check.js';
import { ExitCode } from '../../src/errors/index.js';

describe('parseMajor', () => {
  it('parses Node version string with v prefix', () => {
    expect(parseMajor('v20.10.0')).toBe(20);
    expect(parseMajor('v22.4.1')).toBe(22);
  });
  it('parses without v prefix', () => {
    expect(parseMajor('20.0.0')).toBe(20);
  });
  it('returns NaN on malformed input', () => {
    expect(parseMajor('not-a-version')).toBeNaN();
  });
});

describe('checkNodeVersion', () => {
  it('AC-008-1: ok=true on Node 20+', () => {
    const r = checkNodeVersion('v20.10.0');
    expect(r.ok).toBe(true);
    expect(r.exitCode).toBe(ExitCode.Success);
  });

  it('AC-008-1: rejects Node 18 with ConfigError exit code', () => {
    const r = checkNodeVersion('v18.20.0');
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(ExitCode.ConfigError);
    expect(r.message).toContain('Node.js 20');
  });

  it('AC-008-1: rejects unparseable version', () => {
    const r = checkNodeVersion('garbage');
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(ExitCode.ConfigError);
  });

  it('MIN_NODE_MAJOR is 20', () => {
    expect(MIN_NODE_MAJOR).toBe(20);
  });
});
