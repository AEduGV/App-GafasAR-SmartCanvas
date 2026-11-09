// Panel con todas las figuras o todos los stickers, pegado al lado derecho de un canvas. Lo abre el botón «…»
// de los arcos de Formas y Stickers del menú radial. Solo muestra botones: la acción la resuelve CanvasApp.
import {appendFill, roundedRect} from "./CanvasGeometry"
import {ICON} from "./CanvasIcons"
import {addPillEdge, LABEL_Z, makePill} from "./CanvasPill"
import {Bounds, MeshSlot, retire} from "./CanvasRenderer"
import {COLOR, withAlpha} from "./CanvasTheme"

const THEME_FONT = requireAsset("../Fonts/Inter.ttf") as Font

export type LibraryKind = "shapes" | "stickers"

export interface LibraryItem {
  action: string
  label: string
  icon: Texture
}

export const LIBRARY: Record<LibraryKind, {title: string; items: LibraryItem[]}> = {
  shapes: {
    title: "Shapes",
    items: [
      {action: "shape:rect", label: "Rectangle", icon: ICON.rectangle},
      {action: "shape:circle", label: "Circle", icon: ICON.circle},
      {action: "shape:triangle", label: "Triangle", icon: ICON.change_history},
      {action: "shape:process", label: "Process", icon: ICON.square},
      {action: "shape:decision", label: "Decision", icon: ICON.diamond},
      {action: "shape:terminator", label: "Start / end", icon: ICON.stadium},
      {action: "shape:data", label: "Data", icon: ICON.database},
      {action: "shape:hexagon", label: "Hexagon", icon: ICON.hexagon},
      {action: "shape:pentagon", label: "Pentagon", icon: ICON.pentagon},
      {action: "shape:arrow", label: "Arrow", icon: ICON.forward},
      {action: "shape:speech", label: "Speech bubble", icon: ICON.chat_bubble},
      {action: "shape:cross", label: "Cross", icon: ICON.add},
      {action: "shape:star", label: "Star", icon: ICON.star},
    ],
  },
  stickers: {
    title: "Stickers",
    items: [
      {action: "sticker:postit", label: "Post-it", icon: ICON.sticky_note_2},
      {action: "sticker:star", label: "Star", icon: ICON.star},
      {action: "sticker:heart", label: "Heart", icon: ICON.favorite},
      {action: "sticker:done", label: "Done", icon: ICON.check_circle},
      {action: "sticker:warning", label: "Warning", icon: ICON.warning},
      {action: "sticker:question", label: "Question", icon: ICON.help},
      {action: "sticker:idea", label: "Idea", icon: ICON.lightbulb},
      {action: "sticker:like", label: "Like", icon: ICON.thumb_up},
      {action: "sticker:urgent", label: "Urgent", icon: ICON.priority_high},
      {action: "sticker:stop", label: "Stop", icon: ICON.block},
    ],
  },
}

// Medidas en unidades del canvas.
const BTN = 4.2
const GAP = 0.8
const PAD = 1.2
const COLUMNS = 2
const TITLE_H = 4
const SIDE_GAP = 2.4
const Z = 1.4

export class CanvasLibrary {
  readonly root: SceneObject
  readonly size: vec2

  constructor(parent: SceneObject, readonly kind: LibraryKind, onPick: (action: string) => void) {
    const def = LIBRARY[kind]
    this.root = global.scene.createSceneObject("Library_" + kind)
    this.root.setParent(parent)
    this.root.createComponent("Component.Canvas")
    const rows = Math.ceil(def.items.length / COLUMNS)
    const w = PAD * 2 + COLUMNS * BTN + (COLUMNS - 1) * GAP
    const h = PAD * 2 + TITLE_H + rows * BTN + (rows - 1) * GAP
    this.size = new vec2(w, h)

    // Origen del panel en su esquina superior izquierda.
    const plate = new MeshSlot(this.root, "Plate", withAlpha(COLOR.surface, 0.92), false)
    appendFill(plate.begin(), roundedRect(w, h, 1.6).map((p) => new vec2(p.x + w / 2, p.y - h / 2)), 0)
    plate.commit()

    const titleSo = global.scene.createSceneObject("Title")
    titleSo.setParent(this.root)
    titleSo.getTransform().setLocalPosition(new vec3(PAD, -PAD - TITLE_H / 2, LABEL_Z))
    const t = titleSo.createComponent("Component.Text") as Text
    t.font = THEME_FONT
    t.size = 60
    t.depthTest = true
    t.text = def.title
    t.textFill.color = COLOR.text
    t.horizontalAlignment = HorizontalAlignment.Left
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.layoutRect = Rect.create(0, w - PAD * 2, -TITLE_H / 2, TITLE_H / 2)

    def.items.forEach((item, i) => {
      const col = i % COLUMNS
      const row = Math.floor(i / COLUMNS)
      const btn = makePill(this.root, item.label, BTN, BTN, 56, () => false, () => onPick(item.action), item.icon)
      addPillEdge(btn)
      btn.getSceneObject().getTransform().setLocalPosition(
        new vec3(PAD + BTN / 2 + col * (BTN + GAP), -PAD - TITLE_H - BTN / 2 - row * (BTN + GAP), 0.2)
      )
    })
  }

  /** A la derecha del canvas, con el borde superior alineado con el suyo. */
  place(b: Bounds): void {
    this.root.getTransform().setLocalPosition(new vec3(b.maxX + SIDE_GAP, b.maxY, Z))
  }

  /** Si un punto del canvas cae dentro del panel. */
  contains(p: vec2, b: Bounds): boolean {
    const left = b.maxX + SIDE_GAP
    return p.x >= left && p.x <= left + this.size.x && p.y <= b.maxY && p.y >= b.maxY - this.size.y
  }

  destroy(): void {
    retire(this.root)
  }
}
