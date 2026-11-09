# ⚠️ Important: handwriting-to-text needs Remote Service Gateway tokens

**Please read before testing Canvas AR.**

One feature, turning **handwriting into typed text**, sends the drawn strokes to OpenAI through Snap's Remote Service Gateway. That service needs **tokens**. They are personal and expire after about an hour, so **they are not included in this repository**: the scene ships with the placeholders `[INSERT OPENAI TOKEN HERE]`, `[INSERT GOOGLE TOKEN HERE]` and `[INSERT SNAP TOKEN HERE]`.

**Everything else works without tokens.** Without them, only the "Convert to text: …" button never appears. After you draw, the status line shows once:

> Couldn't read the handwriting. Check the connection or renew the Remote Service Gateway tokens

## How to enable it (about 1 minute)

1. Open `Prueba_Lens_Proyecto2.esproj` in Lens Studio, signed in with your Snapchat account and connected to the internet.
2. Open **Window → Remote Service Gateway Token** and generate the tokens (OpenAI is the one this feature uses; generating all three is fine).
3. In the Scene Hierarchy, select the root object **`RemoteServiceGatewayCredentials`**. Check that its token fields now hold the generated tokens instead of the `[INSERT … TOKEN HERE]` text. If they don't, paste each token into its field.
4. Save the project (Ctrl+S / Cmd+S) and restart the preview.

If the feature stops working later, the tokens have probably expired: generate them again (step 2).

## How to try it

1. Place a canvas.
2. Open its **+** menu and choose **Draw**.
3. Write a word with the mouse and wait about a second.
4. A **"Convert to text: …"** button appears under the strokes. Pinch (click) it to replace the strokes with typed text.

Typing with the keyboard (the **Write text** tool) never needs tokens.

---

More about the project: [`devpost/design-brief.md`](devpost/design-brief.md).
