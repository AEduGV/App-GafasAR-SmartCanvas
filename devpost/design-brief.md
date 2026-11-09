---
status: approved
---

# Design brief: Canvas AR

<!-- Written with the plan-lens template (challengepost/learn-specs). The project was planned in the
     product guides in indicaciones/ (PRD, SRD, design.md) and built iteratively; this brief records the
     decisions as they stand in the finished build. Values the team did not choose explicitly are marked (default). -->

## The one spatial moment
I'm standing by the meeting-room table with a 3D model of the project floating over it. I pin a few work canvases to the wall and to the table next to it, sketch and sort ideas on them with pinches, and draw arrows from my notes straight to the model and to each other, while a teammate builds a card-sorting board on her own canvas beside me.

## Why it belongs on glasses
- Uses: draws in the world, leaves your body free.
- Why it's better than the phone or laptop version: the canvases live on the real wall and table, at the size you choose, around the thing being discussed. You walk between them instead of scrolling a whiteboard, and arrows can point at real objects in the room, which a laptop whiteboard can't do.

## Product or overlay
- Type: product. The canvases are the experience; they attach to real surfaces.
- What the real version would sense: walls and tables (surface detection), and objects in the room as arrow targets.
- Stand-in for the preview:
  - Surfaces come from the preview's simulated room (WorldQueryModule hit test). If nothing is detected or the surface is more than 1.5 m away, the canvas floats 50 cm in front of the user.
  - Arrows to the world stop at the room's surfaces or at scene objects with a collider. The 3D model on the table is a real Lens object, not a recognized one.
  - The collaborator "Ana" is a simulated teammate: a wooden mannequin who builds a card-sorting template on her own canvas. Nobody else is really connected.
  - Voice input is replaced by the keyboard ("Write" tool).
  - Save and the shared-session buttons only show a status message. Restarting the Lens clears the content.

## Where things live
- Where the user is looking during the main task: at the canvas they are working on, on the wall or the table at about arm's length, and at the model over the table.
- Canvas: pinned flat to a wall or table where the user marks two corners, at real scale (minimum 12 x 8 units). Its scale follows distance / 135, between 0.4 and 3. A floating canvas sits 50 cm away.
- Canvas buttons (+ radial menu, Undo, colour wheel): on the selected canvas, + in the top-right corner, Undo in the top-left corner. They only show when the canvas is within 1 m of the user's body, measured to a vertical bar from the eyes down 150 cm, so a canvas on a table next to you keeps its buttons.
- Radial menu: a full circle of nine round buttons (8 units radius) around the +. On a table it tilts 40° towards the user.
- More shapes / stickers panel: a two-column panel attached to the right side of the canvas.
- Main menu and status line: head-locked in the top-left corner of the visible area, 30 cm away, scaled to look like a panel at 105 cm (default). The menu is a single round button that opens a narrow glass bar with five icons.
- 3D model: about 90 cm wide, floating 100 cm above the round table of the Sunlit Room. A round toggle button sits on the front edge of the table, tilted 50° towards the user.
- Collaborator: Ana stands on the detected floor about 2.3 m ahead and 28° to the right, with her canvas beside her.

## Hands and input
- Place a canvas: pinch two corners on a wall or table.
- Use a tool: pinch the + to open the radial menu (Draw, Eraser, Write text, Arrow, Shapes, Stickers, Templates, Duplicate, Delete canvas), then pinch on the canvas.
- Move a canvas: drag its inside. Aiming at a surface of the other orientation within 1.5 m makes it turn and stick to it.
- Resize: drag an edge or a corner. Only the side that will move lights up.
- Grab: hold the inside for half a second. The canvas shrinks to a 7 cm miniature that follows the hand and reappears where it is dropped, at the same apparent size.
- Arrow: drag from one canvas to another, or release outside any canvas to point at the real surface or 3D object in that direction. Pinching a world arrow removes it.
- Handwriting: after drawing, a "Convert to text" button appears under the strokes. A pinch swaps them for typed text.
- Comment on a teammate's canvas: pinch the star button on her canvas and choose a sticker. Your own stickers there can be moved, and your post-it can be written on.
- Show or hide the model: pinch the button on the table.
- Targets are big round buttons that highlight when aimed at, and the status line names the button under the cursor.
- Voice: not used. The keyboard "Write" tool does the same job.

## When things show
- Canvas buttons: show on the selected canvas within 1 m of the user and grow in with a small bounce (0.3 s). They hide at once when the user walks away, and their menu closes.
- Radial menu and its arcs: open in a staggered fan when the + is pinched. They close after choosing a tool or pinching outside.
- Edge highlight: only on the side that would be resized, while aiming at it or dragging it.
- Surface ripples: blue waves leave the edges of a grabbed or dragged canvas only while it will stick to the wall or table it is aimed at.
- Alignment glow: a subtle pulsing line on the side of the neighbour canvas it will snap to, only while it is that close.
- "Convert to text": shows 1.2 s after the user stops drawing if the strokes contain writing. It hides on a new stroke or when another canvas is selected.
- Sticker button on Ana's canvas: within 2 m of the user.
- Model toggle button: within 1 m of the user.
- If something needs attention out of view: none. The status line, which is always in view, carries hints, warnings and errors.

## Done criteria
Each one can be checked in Lens Studio's preview (Sunlit Room).
1. Pinching two corners on the wall gives a canvas flat on the wall. Two corners on the table give a canvas lying on the table. Corners on a wall more than 1.5 m away give a canvas floating 50 cm in front of you.
2. Pinching + opens the radial menu. With Draw you can draw on the canvas, with Eraser you can erase part of a stroke, and Undo brings it back.
3. Holding a canvas makes a miniature. Aiming it at a nearby wall shows ripples and the status line says "Touching the wall: release to stick it". Releasing pins the canvas there at the size it looked before.
4. Dropping a canvas within 10 cm of another places it side by side at the same height, and the target side glows before release.
5. With Arrow, dragging from one canvas to another links them. Dragging to the 3D model leaves an arrow that ends on the model, and pinching that arrow removes it.
6. Inviting Ana from the Collaboration panel makes her build a card-sorting board. The star button on her canvas adds a sticker, and you can move it.
7. The button on the table hides the 3D model and shows it again.

## Out of scope
- Real multi-user sessions (Ana is simulated), saving or versions (content is lost on restart), Snap Cloud, voice input.
- Images, capture, comments other than stickers, and alignment with physical objects.

## Risks and open questions
- The main menu and status line are head-locked. That goes against "not stuck to the face", but they are small, in the corner, and always reachable. Their position was measured for the preview's visible area; on real Specs it is unmeasured.
- Handwriting recognition needs internet and short-lived Remote Service Gateway tokens. Without them the status line warns once, and typing with the keyboard still works. The tokens are not in the repository: generate them in Lens Studio (Window > Remote Service Gateway Token) before trying it.
- The 3D model and its table button are placed for the Sunlit Room. In another preview room they do not sit on a table.
- Feel unproven: comfort over time, real hand tracking, contrast on the real additive display, and the usable area of real Specs.
- Known bug: Spectacles Interaction Kit sometimes logs "Object is null" when erasing shapes or stickers with the real mouse.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: how it was judged
- **Does it work?** There are no LEAF scenarios. Every done criterion was checked by hand in the preview, with simulated pinches and drags (InjectPreviewGesture), screenshots and the Lens log. The team also tried most of it with the real mouse.
- **Logic proven:** all seven done criteria.
- **Feel unproven:** comfort over time, reach on real Specs, contrast on the additive display, and real hand tracking.
- **The three questions:**
  - It puts work in the user's space, on the wall and table where it belongs.
  - It lets them walk between canvases with their eyes up.
  - It connects notes to real things with arrows.
  - A phone version would lose the room-scale layout and the arrows to real objects.
- **Design notes applied while iterating** (examples):
  - Canvas buttons now appear only near the user, measured to the body rather than the head.
  - A canvas dropped far away keeps its apparent size.
  - Ripples warn when a canvas will stick to a surface.
  - The alignment glow was toned down.
  - Post-its got a folded corner.
- **Credits:**
  - 3D model: "Maqueta Viciana Vila-real" by 3DRestaurAM (CC BY 4.0).
  - Icons: Material Symbols (Apache 2.0).
  - See `THIRD_PARTY_NOTICES.md`.
