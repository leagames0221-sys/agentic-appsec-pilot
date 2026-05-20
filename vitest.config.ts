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
        // Phase α floor. Spawn-paths (Ollama HTTP / claude-code CLI / OpenGrep /
        // Bandit / OSV-Scanner / patch validator) intentionally unmocked per
        // AC-010-4 (CI auto-call ban). Pure-logic paths (ir / correlator /
        // emitters / prompts) hit >90%. Tighten via fixture-driven
        // integration tests in Stage 8/9 before PUBLIC flip.
        lines: 55,
        functions: 65,
        statements: 55,
        branches: 50,
      },
    },
  },
});
