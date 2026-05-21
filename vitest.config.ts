import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/types.ts', 'src/cli/index.ts'],
      thresholds: {
        // PUBLIC-flip thresholds (ADR-0006 Condition 1). Cleared by
        // tests/cli/runners.integration.test.ts which drives the 3 CLI
        // runners end-to-end with mocked Writable streams + tmpdir
        // fixtures + provider='mock'. Spawn-paths (Ollama HTTP /
        // claude-code CLI / OpenGrep / Bandit / OSV-Scanner / patch
        // validator re-scan against real binaries) remain intentionally
        // unmocked per AC-010-4 (CI auto-call ban); those branches show
        // as uncovered and that is correct.
        lines: 75,
        functions: 80,
        statements: 75,
        branches: 70,
      },
    },
  },
});
