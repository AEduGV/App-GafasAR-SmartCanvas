# Experience Design · Canvas AR

Status: PROPOSED. This document complements the future `devpost/design-brief.md`. Record and resolve any differences between them. Confirm hardware-specific optical parameters on the target device.

## Design principles

Prioritize the scene and shared context over persistent panels [F3]. Show details on demand and dismiss controls when the action is complete [F5,F6]. Design around the visible field of view and help users find their bearings [F7]. Show system status and provide ways to cancel and recover throughout each flow [F10]. These principles are adapted from other platforms. Verify their application on SPECS.

The canvas uses the table as a shared reference so people can discuss and organize ideas together. In card sorting, notes stay on a virtual surface near the table and depth carries no meaning. Using depth to represent architectural relationships is outside the MVP scope.

## Proposed spatial layout

- Use a subtle frame to mark the canvas boundary. Give each of the three categories a labeled zone.
- Start at a scale that lets users recognize the overall layout. Show a note's details when the user selects it.
- Use the table as a spatial reference and grouping surface. Test angled notes or detail panels so users can read them without bending over. Keep shared note positions stable.
- Place a contextual toolbar next to the canvas. Allow one editing or history panel at a time per person.
- Avoid panels that continuously follow the user's head. “Find canvas” shows a directional cue. Moving the canvas requires confirmation.
- When the canvas is outside the field of view, guide the user toward it without demanding sudden turns or occupying the center of their vision.

Physical size, tilt, and viewing distance depend on G1/G2 and comfort testing. Evaluate angular size before converting web pixels to physical dimensions. Confirm the focal plane on the target SPECS device.

## Visual language and readability

The supplied Apple, Expo, and Figma references inform hierarchy, restraint, and focus. Adapt their backgrounds, shadows, and sizing to the optical display. On additive displays, black can appear transparent, and large bright areas or halos can impair readability [F4]. Confirm how the target device renders these elements.

### Extended palette

These HEX values are starting points. Check readability on the glasses over light, dark, and textured tables.

| Role | Color | HEX | Application |
| --- | --- | --- | --- |
| Primary text | Cool white | `#F4F7FA` | Headings and note text |
| Secondary text | Pearl gray | `#C8D2DE` | Metadata and short hints |
| Neutral outline | Light slate blue | `#A0B1C5` | Unselected notes and canvas boundaries |
| Now category | Lavender blue | `#A6B8FF` | Zone label and border |
| Later category | Peach | `#FFC1A6` | Zone label and border |
| Explore category | Lilac | `#D7B6FF` | Zone label and border |
| Selection | Light cyan | `#73D8FF` | Emphasized outline and “Selected” label |
| Saved | Mint green | `#8FE3B0` | Confirmation icon and “Saved” label |
| Pending or warning | Light amber | `#FFD27A` | Icon and “Saving” or “Warning” label |
| Error | Coral pink | `#FF9DA4` | Error icon, message, and recovery action |

Apply the category color to the label and border. Keep note text in cool white. When a note moves between categories, update its category label and retain the cyan outline while the note is selected.

#### Buttons and pressed state

| Button type | Examples | Default | Pressed (on tap) |
| --- | --- | --- | --- |
| Secondary | Cancel, Back | Pearl gray `#C8D2DE` | Darker pearl gray `#B3BFCD` |
| Primary | Save, Confirm | Light cyan `#73D8FF` | Darker cyan `#59BFE8` |

Apply the pressed color to the button border and icon while the user holds the press or pinch. Restore the default color on release or cancellation. Keep the label readable and use a thicker outline to reinforce the pressed state. Use pearl gray for secondary text. Treat a button press and a note's persistent selection as separate states.

### AA contrast in every state

- **Visible text**, including button labels and hints, must have at least **4.5:1** contrast against its effective background. WCAG 2.2 allows **3:1** for large text. Canvas AR uses **4.5:1** for all UI text. [WCAG 2.2, 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum)
- **Informative icons, borders needed to identify controls, and focus, selection, and press indicators** must have at least **3:1** contrast against the relevant adjacent colors. Reinforce the pressed state with a change in outline thickness or shape. [WCAG 2.2, 1.4.11](https://www.w3.org/TR/WCAG22/#non-text-contrast)
- Check default, focused, pressed, selected, disabled, warning, and error states. Evaluate the final appearance after applying transparency, layers, and animations. Use the unrounded ratio to determine whether it meets the threshold.

**Reference background for preview and opaque surfaces:** `#182230`. Use the palette colors as foregrounds. Draw cool white button text and each state's borders and icons against this background. If a button touches another surface, also check any border required to identify the control against that surface.

| Foreground | sRGB contrast ratio against `#182230` |
| --- | ---: |
| `#F4F7FA` | 14.91:1 |
| `#C8D2DE` | 10.48:1 |
| `#A0B1C5` | 7.32:1 |
| `#A6B8FF` | 8.34:1 |
| `#FFC1A6` | 10.25:1 |
| `#D7B6FF` | 9.18:1 |
| `#73D8FF` | 9.92:1 |
| `#8FE3B0` | 10.52:1 |
| `#FFD27A` | 11.26:1 |
| `#FF9DA4` | 8.10:1 |
| `#B3BFCD` | 8.59:1 |
| `#59BFE8` | 7.66:1 |

On transparent glasses, check contrast against the effective background on the device under the intended conditions of use. Use the dark reference background as a fallback only if the hardware can render it with sufficient contrast. If a real background brings contrast below the minimum or prevents verification, switch to a surface or view with verified contrast. If that view is unavailable, pause the affected flow. Record preview and on-device checks separately in T-22.

Use a compatible font with a verified license. Keep lines short, choose a readable font weight, and leave enough space between interaction targets.

## Interaction

| Action | Proposed interaction | Feedback and cancellation |
| --- | --- | --- |
| Place | Aim at the reference surface and confirm with a supported input | Preview the frame. Cancel returns to the starting state. |
| Select | Target the note and pinch or activate through SIK | Show the outline, title, and available actions. |
| Move | Drag the selected note and release it over a category | Show a ghost preview and highlight the destination. Releasing outside a category returns the note to its original position. |
| Edit text | Open a compatible editor, then confirm or cancel | Preserve the original text until the change is committed. |
| Delete | Choose the contextual action and confirm | Show the note name in the dialog. Cancel keeps the note. |
| Save | Enter a name and an optional comment | Show “Saving” until persistence is confirmed. |
| Compare | Select versions A and B in history | Show a read-only summary of changes by field. |
| Restore | Select a version and confirm the copy | Explain what will be replaced and that saved versions will remain available. |

Pinch is a candidate gesture. Verify available gestures on the target device. Avoid custom gestures without visible cues, sustained pinches, fine targeting, and prolonged raised-arm interactions. Validate these decisions with project testing. The supplied Meta reference could not be read, so this document attributes no specific thresholds or rules to it [F8].

For preview, label any implemented alternative input clearly. Show voice recognition or a spatial keyboard in the demo only after testing the capability.

## Components and states

| Component | Minimum states |
| --- | --- |
| Note | Default, focused, selected, moving, pending, locked by another participant, error |
| Category | Default, valid drop target, unavailable drop target |
| Session status | CORE, connecting, aligning, shared, disconnected, closed |
| History | Empty, list, saving, limit reached, error |
| Comparison | A/B selection, no changes, differences, exit |
| Spatial reference | Awaiting placement, valid, lost, repositioning |

In the comparison, show “Added” with `+`, “Removed” with `−`, and “Modified” with a list of changed fields. Show removed notes as read-only ghost previews during comparison. Keep the current canvas when the user exits.

## Reference microcopy

- “Place the canvas over a clear table.”
- “Couldn’t save. Try again.”
- “In use by Participant 2.”
- “Spatial reference lost. Reposition the canvas to continue.”
- “Create an alternative from V1. Your current layout will change. Your saved versions will stay available.”
- “Solo mode” / “Simulated collaboration” / “Shared session,” according to the verified mode.

## Experience validation

Check whether users understand selection and saving, can read headings, find the canvas, cancel actions, and restore a version without losing saved work. Check whether they can interact comfortably with relaxed hands. Stop the interaction and record the issue if discomfort occurs. Run the demo in a clear space while participants are stationary. See `ux-research.md` for the full protocol.
