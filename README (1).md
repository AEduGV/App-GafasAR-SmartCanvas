<p align="center">
  <img src="assets/eyecanvas-icon.png" alt="EyeCanvas app icon" width="132">
</p>

<h1 align="center">EyeCanvas</h1>

<p align="center"><strong>A shared canvas for smart glasses.</strong></p>

<p align="center">
  <a href="#the-demo">Demo walkthrough</a> ·
  <a href="#why-smart-glasses">Why smart glasses</a> ·
  <a href="#project-docs">Project docs</a>
</p>

---

In a workshop, moving sticky notes is easy. Reconstructing the layout everyone agreed on ten minutes ago is harder.

**EyeCanvas** turns a physical table into an augmented reality workspace. Arrange digital notes around the table, save an editable version, and compare it with what came next. Restore an earlier arrangement as a new revision to explore an alternative while keeping later versions available.

> **Project status:** Proposed SPECS experience for the Learn AR with SPECS hackathon. This package contains the design, requirements, and validation plan. Implementation and device testing are pending.

## The demo

The proposed demo follows one workshop decision from the first arrangement to a restored alternative.

| Step | What happens |
| --- | --- |
| **01 · Place** | Position the canvas over a table. Start with six sample notes and three categories: **Now**, **Later**, and **Explore**. |
| **02 · Arrange** | Edit and sort the notes, then save the arrangement as **V1**. |
| **03 · Compare** | Move a note, change its text, or add a new one. Save **V2** and see which notes were added, removed, or changed. |
| **04 · Restore** | Restore **V1** as a new working revision and open the history to see that **V2** is still available. |

**CORE** is the planned solo demo with local snapshots. **COLLAB** is the proposed mode for two people at the same table. It depends on verifying both synchronization and shared spatial alignment. See the decision log for the criteria. [`decisions.md`](decisions.md)

## Why smart glasses

The table gives participants a physical reference for the layout. A note’s position shows which group it belongs to, and its details appear when selected. In a shared session, participants can refer to the same area of the table while talking through a decision.

The design uses category labels, selection outlines, and short status messages. Text and essential controls have contrast targets for every state, including while a button is pressed. Optical readability will be checked on the glasses. [`design.md`](design.md)

## Project docs

| Start here | What it covers |
| --- | --- |
| [`prd.md`](prd.md) · [`srd.md`](srd.md) | MVP scope, acceptance criteria, and software requirements |
| [`design.md`](design.md) · [`ux-research.md`](ux-research.md) | Spatial interaction, visual design, and the usability study plan |
| [`technical-spec.md`](technical-spec.md) · [`test-plan.md`](test-plan.md) | Architecture, snapshot behavior, and verification |
| [`decisions.md`](decisions.md) · [`tasks.md`](tasks.md) | Open decisions, technical checks, and build order |
| [`CLAUDE.md`](CLAUDE.md) · [`AGENTS.md`](AGENTS.md) · [`prompts.md`](prompts.md) | Context and instructions for Claude Code and other agents |
| [`docs/hackathon.md`](docs/hackathon.md) · [`devpost/README.md`](devpost/README.md) | Hackathon workflow and preparation for the official design brief |
| [`sources.md`](sources.md) | Source material and what it supports |

## Build workflow

1. Confirm the demo mode and target device in the decision log.
2. Create a SPECS project in Lens Studio and place these documents at its root.
3. Follow the hackathon guide to set up Claude Code, CLAD, and Lens Studio MCP. Run `plan-lens` in the project and reconcile its brief with the proposed experience.
4. Build the CORE flow first. Use the test plan to record evidence from preview and glasses separately before enabling COLLAB.

Start a coding session with [`CLAUDE.md`](CLAUDE.md) and the active task in [`tasks.md`](tasks.md). Use the PRD for scope, the official brief for the experience once generated, the SRD and technical spec for implementation, and the test plan for evidence. Resolve conflicts before implementing the affected behavior.
