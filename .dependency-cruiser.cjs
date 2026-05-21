/**
 * dependency-cruiser config — enforces one-way layer dependency.
 *
 * Adapted from companion repo sbom-pilot (https://github.com/leagames0221-sys/sbom-pilot, MIT).
 *
 * Layers (top to bottom, imports flow downward only):
 *   src/cli/             (top)
 *   src/stages/*         (orchestrators per stage)
 *   src/io/emitters/     (serializers)
 *   src/providers/llm/   (leaf service)
 *   src/ir/              (leaf data + zod)
 *   src/errors/          (leaf primitives)
 *
 * Forbidden edges:
 *   1. ir       -> anything (ir is leaf)
 *   2. emitters -> stages   (emitters serialize, do not orchestrate)
 *   3. anything -> cli      (cli is top)
 *   4. providers -> stages  (providers are leaf service)
 *   5. errors   -> anything (errors is leaf primitive)
 *
 * Run locally: `pnpm run lint:deps`
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-ir-to-anything',
      severity: 'error',
      comment:
        'IR is leaf data. It must not import from any other internal layer.',
      from: { path: '^src/ir/' },
      to: {
        path: '^src/',
        pathNot: '^src/ir/',
      },
    },
    {
      name: 'no-errors-to-anything',
      severity: 'error',
      comment:
        'Errors module is a leaf primitive. It must not import from other internal layers.',
      from: { path: '^src/errors/' },
      to: {
        path: '^src/',
        pathNot: '^src/errors/',
      },
    },
    {
      name: 'no-emitters-to-stages',
      severity: 'error',
      comment:
        'Emitters serialize finished IR. They must not call into orchestrator stages.',
      from: { path: '^src/io/emitters/' },
      to: { path: '^src/stages/' },
    },
    {
      name: 'no-providers-to-stages',
      severity: 'error',
      comment:
        'LLM providers are leaf services. They must not import from orchestrator stages.',
      from: { path: '^src/providers/' },
      to: { path: '^src/stages/' },
    },
    {
      name: 'no-anything-to-cli',
      severity: 'error',
      comment:
        'CLI sits at the top of the import graph. Nothing else may import from it.',
      from: {
        path: '^src/',
        pathNot: '^src/cli/',
      },
      to: { path: '^src/cli/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports defeat the one-way layer contract.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        'Orphan modules (no incoming + not entry point) suggest dead code under src/.',
      from: {
        orphan: true,
        pathNot: [
          '^bin/',
          '^scripts/',
          '^tests/',
          '^docs/',
          'vitest\\.config\\.ts$',
          '\\.dependency-cruiser\\.cjs$',
          '\\.d\\.ts$',
          '/types\\.ts$',
          '^src/cli/index\\.ts$',
        ],
      },
      to: {},
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
