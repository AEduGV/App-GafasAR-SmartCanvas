// Menú radial de un canvas: un botón + en su esquina que despliega las herramientas a su alrededor.
// Es hijo del canvas, así que viaja con él. Solo decide cómo se ve: las acciones las resuelve CanvasApp.
import {CapsuleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/CapsuleButton"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {CanvasShape} from "./CanvasGeometry"
import {ICON} from "./CanvasIcons"
import {makePill, paintPill, setPillIcon, setPillIconRotation} from "./CanvasPill"
import {TONE} from "./CanvasTheme"

const HUB_SIZE = 4.6
const ITEM_SIZE = 4.2
const TEXT_SIZE = 56
// Un cuarto de círculo hacia dentro del canvas, de la izquierda (180°) hacia abajo (270°), para que el
// menú quede entero sobre él. En dos anillos, para que los botones no se peguen, con los del exterior
// en los huecos que dejan los del interior.
const INNER_RADIUS = 7.5
export const RING_RADIUS = 13
export const SHAPE_RING_RADIUS = 19
const INNER_ANGLES = [180, 225, 270]
const OUTER_ANGLES = [198, 225, 252]
const SHAPE_STEP = 15
const OPEN_TIME = 0.16

export type EdgeTool = "draw" | "erase" | "write" | "arrow"
export type EdgeAction = EdgeTool | "delete" | "shapeMenu" | "menu"

const TOOLS: {action: EdgeTool; label: string; icon: Texture}[] = [
  {action: "draw", label: "Dibujar", icon: ICON.draw},
  {action: "erase", label: "Goma", icon: ICON.ink_eraser},
  {action: "write", label: "Escribir", icon: ICON.edit_note},
  {action: "arrow", label: "Flecha", icon: ICON.trending_flat},
]

const SHAPES: {shape: CanvasShape; label: string; icon: Texture}[] = [
  {shape: "rect", label: "Rectángulo", icon: ICON.rectangle},
  {shape: "oval", label: "Óvalo", icon: ICON.circle},
  {shape: "triangle", label: "Triángulo", icon: ICON.change_history},
  {shape: "diamond", label: "Rombo", icon: ICON.diamond},
]

function polar(angle: number, radius: number): vec3 {
  const a = (angle * Math.PI) / 180
  return new vec3(Math.cos(a) * radius, Math.sin(a) * radius, 0)
}

@component
export class CanvasEdgeBarUI extends BaseScriptComponent {
  private _onAction = new Event<EdgeAction>()
  private _onShape = new Event<CanvasShape>()
  private hub: CapsuleButton | null = null
  private ring: SceneObject | null = null
  private shapeRing: SceneObject | null = null
  private shapeButton: CapsuleButton | null = null
  private deleteButton: CapsuleButton | null = null
  private buttons = new Map<EdgeTool, CapsuleButton>()
  private shapeItems = new Map<CanvasShape, CapsuleButton>()
  // Cada botón del menú con el ángulo y el radio que le tocan.
  private slots: {so: SceneObject; angle: number; radius: number}[] = []
  private active: EdgeTool | null = null
  private deleteArmed = false
  private shapeOpen = false
  private shapeCurrent: CanvasShape = "rect"
  private opened = false
  private progress = 0

  get onAction(): PublicApi<EdgeAction> {
    return this._onAction.publicApi()
  }

  get onShape(): PublicApi<CanvasShape> {
    return this._onShape.publicApi()
  }

  get isOpen(): boolean {
    return this.opened
  }

  get isShapeOpen(): boolean {
    return this.shapeOpen
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")

    this.ring = global.scene.createSceneObject("Ring")
    this.ring.setParent(this.sceneObject)

    for (const def of TOOLS) {
      this.buttons.set(def.action, this.makeItem(this.ring, def.label, def.icon, () => this.active === def.action, () => this._onAction.invoke(def.action)))
    }
    this.shapeButton = this.makeItem(this.ring, "Forma", ICON.category, () => this.shapeOpen, () => this._onAction.invoke("shapeMenu"))
    this.deleteButton = this.makeItem(this.ring, "Borrar canvas", ICON.delete, () => this.deleteArmed, () => this._onAction.invoke("delete"))

    this.shapeRing = global.scene.createSceneObject("ShapeRing")
    this.shapeRing.setParent(this.ring)
    for (const def of SHAPES) {
      this.shapeItems.set(def.shape, this.makeItem(this.shapeRing, def.label, def.icon, () => this.shapeCurrent === def.shape, () => this._onShape.invoke(def.shape)))
    }
    this.shapeRing.enabled = false

    this.hub = makePill(this.sceneObject, "Herramientas", HUB_SIZE, HUB_SIZE, TEXT_SIZE, () => this.opened || this.active !== null, () => this._onAction.invoke("menu"), ICON.add)

    this.layout()
    this.ring.enabled = false
    this.createEvent("UpdateEvent").bind(() => this.animate())
  }

  private makeItem(parent: SceneObject, label: string, icon: Texture, isActive: () => boolean, onPress: () => void): CapsuleButton {
    return makePill(parent, label, ITEM_SIZE, ITEM_SIZE, TEXT_SIZE, isActive, onPress, icon)
  }

  /** Dibujar, Goma y Escribir en el anillo interior; Flecha, Forma y la papelera en el exterior. */
  private layout(): void {
    const inner: CapsuleButton[] = [this.buttons.get("draw"), this.buttons.get("erase"), this.buttons.get("write")]
    const outer: CapsuleButton[] = [this.buttons.get("arrow"), this.shapeButton, this.deleteButton]
    this.slots = [
      ...inner.map((btn, i) => ({so: btn.sceneObject, angle: INNER_ANGLES[i], radius: INNER_RADIUS})),
      ...outer.map((btn, i) => ({so: btn.sceneObject, angle: OUTER_ANGLES[i], radius: RING_RADIUS})),
    ]
    const shapeSlot = this.slots.find((s) => s.so === this.shapeButton.sceneObject)
    let i = 0
    for (const def of SHAPES) {
      const offset = (i++ - (SHAPES.length - 1) / 2) * SHAPE_STEP
      this.shapeItems.get(def.shape)?.sceneObject.getTransform().setLocalPosition(polar(shapeSlot.angle + offset, SHAPE_RING_RADIUS))
    }
    this.applyProgress()
  }

  private applyProgress(): void {
    const k = this.progress
    const e = k * k * (3 - 2 * k)
    const scale = Math.max(e, 0.01)
    for (const slot of this.slots) {
      const t = slot.so.getTransform()
      t.setLocalPosition(polar(slot.angle, slot.radius * e))
      t.setLocalScale(new vec3(scale, scale, scale))
    }
    if (this.hub) setPillIconRotation(this.hub, this.showsPlus() ? (e * Math.PI) / 4 : 0)
  }

  private animate(): void {
    const target = this.opened ? 1 : 0
    if (this.progress === target) return
    const delta = getDeltaTime() / OPEN_TIME
    this.progress = target > this.progress ? Math.min(1, this.progress + delta) : Math.max(0, this.progress - delta)
    this.applyProgress()
    if (this.progress === 0 && this.ring) this.ring.enabled = false
  }

  private showsPlus(): boolean {
    return this.opened || this.active === null
  }

  private refreshHub(): void {
    if (!this.hub) return
    const tool = TOOLS.find((def) => def.action === this.active)
    setPillIcon(this.hub, this.showsPlus() || !tool ? ICON.add : tool.icon)
    paintPill(this.hub, this.opened || this.active !== null)
    this.applyProgress()
  }

  setOpen(open: boolean): void {
    if (open === this.opened) return
    this.opened = open
    if (open && this.ring) this.ring.enabled = true
    if (!open) this.setShapeMenu(false, this.shapeCurrent)
    this.refreshHub()
  }

  /** Con el menú cerrado, el botón + muestra la herramienta activa. */
  setActive(action: EdgeTool | null): void {
    this.active = action
    this.buttons.forEach((btn, key) => paintPill(btn, key === action))
    this.refreshHub()
  }

  /** Color de aviso mientras espera la segunda pulsación que confirma el borrado. */
  setDeleteArmed(armed: boolean): void {
    this.deleteArmed = armed
    if (this.deleteButton) paintPill(this.deleteButton, armed, TONE.warning)
  }

  setShapeMenu(open: boolean, current: CanvasShape): void {
    this.shapeOpen = open
    this.shapeCurrent = current
    if (this.shapeRing) this.shapeRing.enabled = open
    if (this.shapeButton) paintPill(this.shapeButton, open)
    this.shapeItems.forEach((btn, shape) => paintPill(btn, shape === current))
  }

  setPose(position: vec3, rotation: quat): void {
    const t = this.sceneObject.getTransform()
    t.setLocalPosition(position)
    t.setLocalRotation(rotation)
  }
}
