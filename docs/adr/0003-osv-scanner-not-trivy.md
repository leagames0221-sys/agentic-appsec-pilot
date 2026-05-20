# ADR-0003: SCA tool = OSV-Scanner (Trivy not adopted)

## Status

Accepted (2026-05-21)

## Context

Stage ② Vuln Identify requires a Software Composition Analysis (SCA)
tool to scan dependency manifests (`package-lock.json`, `requirements.txt`,
etc.) for known CVEs. The 2026 OSS landscape offers two mature
contenders:

1. **OSV-Scanner** — https://github.com/google/osv-scanner (Apache-2.0,
   Google-maintained, primary frontend to https://osv.dev which aggregates
   GitHub Security Advisories + NVD + OSV.dev + ecosystem feeds)
2. **Trivy** — https://github.com/aquasecurity/trivy (Apache-2.0, Aqua
   Security-maintained, broader scope including container / IaC scan)

Sibling tool `sbom-pilot` already wired OSV-Scanner in its Phase α; this
PJ inherits the choice for trilogy consistency.

## Decision

**OSV-Scanner is the only SCA tool wired in Phase α.** Trivy is not
adopted, even as an optional path.

## Rationale

1. **Scope alignment**: Phase α scans application dependency manifests,
   not containers or IaC. OSV-Scanner's scope (lockfile + SBOM) is a
   precise fit; Trivy's container + IaC capability is unused weight.
2. **Sibling reuse**: `sbom-pilot/src/ir/severity.ts` already implements
   OSV severity ranking + OSV ID parsing. Literal copy is cheaper than
   adapting a Trivy-shaped emitter.
3. **OSV.dev as source of truth**: GHSA + NVD + ecosystem feeds are
   aggregated into a single normalised JSON schema, with explicit affected
   version ranges. Trivy's database is a separate snapshot.
4. **single-best-route principle compliance**: handoff supersede note (Stage 0 lock,
   2026-05-20) identified "Trivy or OSV-Scanner" two-way choice as a
   single-best-route principle violation. Trivy is literal not in scope.
5. **Single binary, single output schema**: Trivy emits a more complex
   nested-result structure; OSV-Scanner's results[] / packages[] /
   vulnerabilities[] triple is straightforward to parse.

## Consequences

### Positive

- Trilogy reuse: `sbom-pilot` OSV severity ranking + parser pattern.
- Smaller dependency surface (no Trivy daemon / database fetch).
- Standardised vuln ID (`GHSA-*`, `CVE-*`, OSV-*) → unified citation in
  `evidenceTrail`.

### Negative

- No container scan in this PJ (acceptable — out of scope).
- If OSV-Scanner database goes stale or upstream coverage degrades, we
  have no fallback. Mitigation: Dependabot weekly + manual upstream check
  at Stage 9.

## References

- OSV-Scanner repo: https://github.com/google/osv-scanner
- OSV.dev: https://osv.dev/
- OSV-Scanner JSON output schema: https://google.github.io/osv-scanner/output/
- Trivy repo (rejected): https://github.com/aquasecurity/trivy
- Stage 0 lock supersede memory (internal SSoT reference, 2026-05-20).
