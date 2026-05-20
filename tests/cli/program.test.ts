/**
 * CLI program build smoke test — verifies commander wiring + 3
 * subcommands + version flag without actually executing scan/patch.
 */
import { describe, it, expect } from 'vitest';
import { buildProgram } from '../../src/cli/index.js';

describe('buildProgram', () => {
  it('registers 3 subcommands: threat-model / scan / patch', () => {
    const program = buildProgram('0.1.0');
    const names = program.commands.map((c) => c.name());
    expect(names).toContain('threat-model');
    expect(names).toContain('scan');
    expect(names).toContain('patch');
  });

  it('has version 0.1.0 + name agentic-appsec', () => {
    const program = buildProgram('0.1.0');
    expect(program.name()).toBe('agentic-appsec');
    expect(program.version()).toBe('0.1.0');
  });

  it('threat-model subcommand accepts <repo> positional arg', () => {
    const program = buildProgram('0.1.0');
    const cmd = program.commands.find((c) => c.name() === 'threat-model');
    expect(cmd).toBeDefined();
    const repoArg = cmd?.registeredArguments[0];
    expect(repoArg?.required).toBe(true);
  });

  it('patch subcommand requires --repo flag', () => {
    const program = buildProgram('0.1.0');
    const cmd = program.commands.find((c) => c.name() === 'patch');
    const repoOpt = cmd?.options.find((o) => o.long === '--repo');
    expect(repoOpt?.required).toBe(true);
  });
});
