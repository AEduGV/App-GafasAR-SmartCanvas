# SRD · Software Requirements Document

Status: PROPOSED, except for cited external facts. See `technical-spec.md` for the architecture.

## Constraints and contracts

| ID | Verifiable software requirement | PRD |
| --- | --- | --- |
| S-01 | Target the chosen SPECS platform in Lens Studio. Record the editor and package versions and compile without errors originating in the project. | P-08 |
| S-02 | Assign a stable ID to each canvas, category, note, and snapshot. Preserve IDs when items are renamed or moved. | P-02–06 |
| S-03 | Configure the MVP for one active canvas, three categories, 12 notes, five snapshots, 80 Unicode code points per note, 40 per version name, and 160 per comment. Trim input and reject unsupported control characters and empty required values. Test accented characters and emoji. | P-02,04 |
| S-04 | Validate `schemaVersion`, references, uniqueness, finite numbers, and limits before applying or persisting data. Keep the last valid state if validation fails. | P-04–06 |
| S-05 | Persist the confirmed working state and snapshots with a protocol that detects incomplete writes. Acknowledge success only after writing and verifying durable storage. | P-04 |
| S-06 | A snapshot is an independent copy of content, relative layout, and metadata. Keep it independent of mutable live-state references. Restore preserves history and adds a new snapshot before changing the current state. | P-04,06 |
| S-07 | Compare by ID and report all changed fields for each modified note. Count a position change when the local distance exceeds 0.01 m. Exclude world-space anchor transforms from the comparison. | P-05 |
| S-08 | Use compatible SIK components for interaction. Make domain logic callable without physical gestures for tests. Demonstrate a text input mechanism supported by the installed version. | P-02,03,08 |
| S-09 | Keep the canvas-to-world placement transform separate from content data. Repositioning preserves diffs, categories, and content. Prompt for placement again after restart. | P-01,07 |
| S-10 | COLLAB requires a session authority, a total order of commits, deduplication by `opId`, and rejection of stale `baseRevision` values. | P-09 |
| S-11 | Enforce an exclusive edit lock per note. The proposed lease lasts 10 seconds and renews every three seconds using the authority clock. Expiration, departure, or loss of the spatial reference cancels the edit and releases the lock. | P-09,10 |
| S-12 | Confirm COLLAB writes only when authority and shared alignment are available. On rejoin, apply the current snapshot before enabling input. Offline merging and host migration are outside MVP scope. | P-09,10 |
| S-13 | Request camera, microphone, network, and mapping access only when an active feature requires it. Keep note content out of AI provider requests and out of logs by default. | P-07–10 |
| S-14 | Distinguish `idle`, `pending`, `saved`, and `error`. Keep cancellation accessible without a time limit. Reinforce color cues with another visible indicator. | P-02,04,07 |
| S-15 | Measure local feedback latency over 30 actions with a target of p95 ≤150 ms. For COLLAB, measure convergence after commit across 30 operations on two clients with a target of p95 ≤1 s. Record the environment and failures. These are project targets. | P-03,09 |
| S-16 | Capture profiler output and frame time at maximum load in preview. On glasses, compare against the verified target budget. Report desktop and device performance separately. | P-08 |
| S-17 | In every UI state, maintain at least 4.5:1 for text against its effective background and 3:1 for essential visual indicators against adjacent colors. Apply the contrast rules in `design.md`. If the environment prevents verification, use a validated view or pause the affected flow. | P-07,08 |

## Recovery and limits

At five snapshots, block saving and restoring, explain the limit, and let the user choose a snapshot to delete after confirmation. Preserve the active snapshot and any snapshot currently being compared. Exit comparison before managing those snapshots. Keep `baseSnapshotId` as a provenance reference even after the referenced snapshot is deleted. Each full snapshot must remain readable independently.

An operation is confirmed once it meets its durability contract in CORE and, in COLLAB, the authority accepts and persists it. Treat provisional visual movement as pending. A failed write retains the last confirmed state and offers a retry.

## Required evidence

Verify each S requirement through `test-plan.md`. G1 covers platform readiness, G2 covers storage and input, and G3 covers networking and alignment. Resolve those gates to establish SDK support for the proposed implementation.
