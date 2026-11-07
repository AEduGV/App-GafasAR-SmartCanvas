# PRD · Collaborative AR Canvas

Status: PROPOSED. Product scope awaits validation with Alba. Concept source: [L2] in `sources.md`.

## Problem, users, and value

In-person workshops involve reorganizing ideas and discussing alternatives. Preserving a physical arrangement can interrupt work on the next one. We want to explore a shared spatial canvas where participants can return to editable versions and explain what changed.

The primary users are a UX or product facilitator and one in-person collaborator. Future users include technical teams that model relationships and review physical objects. User interviews and productivity gains remain unverified.

Job to be done: “When I reorganize ideas with my team, I want to compare an earlier proposal with the current one and explore an alternative without losing later work.”

## Why AR

The canvas is positioned relative to a physical table so participants have a shared reference for conversation. Space and note positions are part of the work. Keep tasks that are better suited to a desktop form on the desktop. Test the value of the spatial workflow with users.

## Proposed scope

**CORE.** One active canvas, one closed card-sorting template, three editable categories, up to 12 notes, and five snapshots per canvas. The demo starts with six sample notes across “Now,” “Later,” and “Explore.”

**COLLAB.** Two co-located participants can edit different notes, with exclusive editing for any single note. Activation depends on gate G3 in `decisions.md`. CORE supports the versioning workflow in solo mode.

These are proposed demo limits. Centralize the values in the SRD and implementation configuration.

## Requirements and acceptance criteria

| ID | Priority and mode | Observable behavior and acceptance criteria |
| --- | --- | --- |
| P-01 | P0 CORE | Offer canvas placement on startup. Confirming a valid reference shows three categories and the sample notes. Canceling creates no duplicate content. Preview may use a clearly labeled simulated reference. |
| P-02 | P0 CORE | Create, rename, and delete notes. Confirming a text edit saves the new text. Canceling preserves the original. Reject empty or overlong input with a clear message. Ask for confirmation before deletion. |
| P-03 | P0 CORE | Move a note to another category. Releasing inside the target updates membership and position. Releasing outside restores the previous state. Selecting a note shows its outline and available actions. |
| P-04 | P0 CORE | Save a named snapshot with an optional decision note. Show “Saved” only after confirming a durable local write. A restart retains snapshots and the last confirmed state. |
| P-05 | P0 CORE | Selecting two saved snapshots shows added, removed, and modified notes by ID. Distinguish text, category, and position changes. Comparison is read-only. |
| P-06 | P0 CORE | Restoring a snapshot creates a new current revision from its content and keeps later versions available. Canceling leaves the state as it was. |
| P-07 | P0 CORE | Show placement, editing, saving, comparison, and error states. If the spatial reference is lost, suspend manipulation and offer repositioning while preserving content. |
| P-08 | P0 CORE | Demonstrate the complete primary flow and its error recovery path in preview with sample data. Label simulations and unavailable capabilities. |
| P-09 | P1 COLLAB | After joining and aligning, both clients see the same note IDs, text, categories, and positions. Two different notes can be edited without losing changes. Each note allows one editor at a time. |
| P-10 | P1 COLLAB | A disconnection blocks new writes. On reconnection, recover the authoritative state. If the host leaves, explicitly close the session and retain data already saved on the host device. |

## Main demo flow

Place the canvas → organize six notes → edit one → save V1 → change text and move a note → add another note and save V2 → compare V1 and V2 → restore V1 as an alternative → verify that V2 is still available.

If COLLAB has been verified, show one edit by each participant before saving V1. Clearly label any simulated session.

## Outside MVP scope

Freehand drawing, multiple templates, symbols, logic gates, arrows, diagramming, photos and OCR, stickers, comments and mentions, imports from external tools, Git-style branching and merging, remote collaboration, more than two participants, custom accounts, cross-device sync of durable snapshots, automatic anchor recovery across sessions, and in-app generative AI.

Restoring a version as a new revision lets users explore an alternative within the existing history.

## Success and release criteria

CORE test cases pass in preview, with real storage exercised where required and no silent data loss. The proposed exploratory usability target is for three of four participants to organize, save, compare, and restore within five minutes of a short introduction and explain that restoring preserves V2.

For the hackathon, deliver a consistent flow and a video that reflects the implementation. Check external submission conditions in `docs/hackathon.md`. Approve the demo mode and document pending capabilities before recording.
