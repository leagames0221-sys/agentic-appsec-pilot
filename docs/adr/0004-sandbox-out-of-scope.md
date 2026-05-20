# ADR-0004: Exploit sandbox is out of scope for Phase α

## Status

Accepted (2026-05-21)

## Context

OpenAI Daybreak's publicly disclosed capability set includes "validating
vulnerabilities in isolated environments" — i.e. an exploit sandbox where
candidate exploits are constructed and run against a copy of the target
application. A naive Phase α plan would include this as Stage ③ between
"Vuln Identify" (Stage ②) and "Patch Suggest" (Stage ④).

Stage 0 lock (handoff supersede, 2026-05-20) recorded a 4-round
ping-pong on sandbox design:

- **R1**: Docker Desktop + 10 safe-pattern → REFUTE (CVE-2025-9074
  CVSS 9.3 container escape, Northflank "container is not a sandbox"
  consensus)
- **R2**: nuclei only as sqlmap+commix substitute → REFUTE (detection
  layer vs exploitation layer, disjoint)
- **R3**: Anthropic srt + Podman + WSL2 = "3-layer defense" → REFUTE
  (srt is Beta Research Preview + WSL2 closed-as-not-planned bug)
- **R4**: WSL2 + Podman rootless = "2-layer defense" → REFUTE (WSL2 +
  Podman share a single Linux kernel; CVE-2026-31431 Copy Fail kernel
  vuln drops both layers simultaneously)

Root cause across all 4 rounds: **scope creep**. Each round attempted to
strengthen sandbox isolation by adding layers; each new layer was either
not real isolation or shared a primitive with another layer.

## Decision

**Exploit sandbox (Stage ③) is literal out of scope for Phase α.** A
separate repo `agentic-appsec-exploit-lab` will host this work as a
distinct Phase β deliverable.

## Rationale

1. **Structural ping-pong resolution**: scope reduction (remove Stage ③
   from Phase α) eliminates the source of the 4-round ping-pong. The
   problem cannot recur because the layer-counting narrative is no
   longer needed.
2. **Quality > coverage**: shipping Phase α with 3 grounded stages
   (threat-model + vuln-identify + patch-suggest) is a better portfolio
   narrative than 4 stages with one structurally weak.
3. **D-WASTE-ZERO compliance**: when in doubt, delete. Stage ③
   inclusion required the sandbox narrative; sandbox narrative had
   4-round failure history. Delete Stage ③.
4. **D-SINGLE-ROUTE compliance**: single best route = Phase β separate
   repo for sandbox, honest "1-layer kernel-shared" narrative.
5. **5-axis wedge preserved**: source-code level + defensive + local-first
   + TS/JS/Python + confidence-calibrated SARIF stays intact without
   Stage ③. The wedge does not require exploit validation.

## Consequences

### Positive

- Phase α scope is achievable + ship-able at portfolio quality bar.
- No "X-layer defense" narrative that a security-savvy reviewer can
  REFUTE in 5 seconds.
- Phase β repo gets focused design attention rather than being a
  rushed appendage.

### Negative

- Coverage of Daybreak's publicly disclosed capability is 3-of-4 stages
  rather than 4-of-4. Acceptable trade.
- Users wanting exploit validation must wait for Phase β. README
  notes the deferred scope honestly.

## Future direction (Phase β)

- Repo: `agentic-appsec-exploit-lab` (separate from this PJ)
- Sandbox primitive: Podman rootless on WSL2 (cross-PJ default per
  internal pin policy 2026-05-20). Narrative will honestly state
  "1-layer kernel-shared isolation, not bulletproof, suitable for
  exploit candidates not external attackers."
- Scope: take a Finding from this PJ's SARIF output + construct a
  candidate exploit + run against a copy of the target + report
  reachability outcome.
- Timing: post-Phase-α PUBLIC flip + user explicit OK.

## References

- Stage 0 lock supersede memory (internal SSoT reference, 2026-05-20)
- CVE-2025-9074 NVD: https://nvd.nist.gov/vuln/detail/CVE-2025-9074
- WSL2 single-kernel architecture:
  https://learn.microsoft.com/en-us/windows/wsl/wsl2-kernel
- Northflank "container is not a sandbox":
  https://northflank.com/blog/the-container-is-not-the-sandbox
