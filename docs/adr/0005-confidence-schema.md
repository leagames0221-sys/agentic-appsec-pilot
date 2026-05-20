# ADR-0005: Confidence-calibrated finding schema via SARIF 2.1.0 propertyBag

## Status

Accepted (2026-05-21)

## Context

The W3 wedge ("Confidence-calibrated SARIF + patch") is one of five axes
that make this PJ literal unique against existing AppSec OSS (see ADR-0001).
The wedge requires a way to attach three new fields to every Finding:

- **`confidence`** marker — `★★★ / ★★ / ★ / ?` literal
- **`probability`** — 0.0-1.0 numeric
- **`evidenceTrail`** — ordered array of citations with type / weight

The Finding shape is exchanged via SARIF 2.1.0 (industry-standard,
GitHub Code Scanning UI ingestion). Three ways to embed the new fields
were considered.

## Considered options

### (a) Modify SARIF 2.1.0 spec to add new top-level fields

- ✗ Spec change requires OASIS process and adoption by readers (GitHub
  Code Scanning, VS Code SARIF viewer). Years of latency.
- ✗ Breaks interop with existing SARIF consumers.
- **Rejected.**

### (b) Use `result.properties` propertyBag (OASIS spec §3.8 + §3.8.1)

- ✓ SARIF 2.1.0 spec literal allows: "every object defined in this
  specification MAY contain a property named properties whose value is a
  property bag" (§3.8.1).
- ✓ propertyBag value can be "any JSON type" (§3.8).
- ✓ External viewers treat opaque metadata as pass-through; finding
  still renders normally.
- ✓ No spec change required.
- **Accepted.**

### (c) Emit a separate non-SARIF JSON file alongside the SARIF output

- ✗ Loses the "uniform schema" wedge value — consumers must cross-reference
  two files.
- ✗ No standard tooling consumes the second file.
- **Rejected.**

## Decision

**Embed confidence + probability + evidenceTrail + sourceUrlLine +
remediationSuggestion in `result.properties` per SARIF 2.1.0 §3.8 /
§3.8.1 propertyBag mechanism.**

Narrative: this is **spec-compliant extension**, not a spec change. The
W3 wedge value is in the **uniform contract** we publish (the property
key names + their value shapes) and the consistency with which we emit
them.

## Implementation

`src/io/emitters/sarif.ts:buildPropertyBag()`:

```typescript
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
```

## Calibration anchor (AC-005-4)

The confidence marker must be calibrated against probability range:

| confidence | probability range |
|---|---|
| `★★★` | 0.85 - 1.0 |
| `★★`  | 0.65 - 0.85 |
| `★`   | 0.35 - 0.65 |
| `?`   | 0.0 - 0.35 |

Enforced post-LLM-enrichment in `src/stages/vuln-identify/llm-enrich.ts`
via `recalibrateProbability()`.

## Consequences

### Positive

- Spec-compliant: external SARIF viewers (GitHub Code Scanning, VS Code
  SARIF extension) parse the SARIF document without error.
- Calibration enforced at one point (`recalibrateProbability`).
- D8-CitationRequired natively wired via `evidenceTrail[].citation` =
  URL or `file:line`.
- D9-CalibratedHonesty natively wired via `confidence` marker.

### Negative

- propertyBag content is opaque to existing tooling — value only
  manifests when a consumer reads our schema. Mitigation: publish the
  shape literal in this ADR + `src/ir/types.ts`.

## References

- OASIS SARIF 2.1.0 spec §3.8 (Property bags) + §3.8.1 (General):
  https://docs.oasis-open.org/sarif/sarif/v2.1.0/csprd01/sarif-v2.1.0-csprd01.html
- `src/ir/types.ts` — `Finding` interface (TS shape)
- `src/ir/schema.ts:findingSchema` — zod runtime validator
- `src/io/emitters/sarif.ts:buildPropertyBag` — emit point
