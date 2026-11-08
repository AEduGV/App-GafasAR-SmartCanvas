// Menú radial de un canvas: un botón + en su esquina que despliega las herramientas a su alrededor.
// Es hijo del canvas, así que viaja con él. Solo decide cómo se ve: las acciones las resuelve CanvasApp.
import {CapsuleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/CapsuleButton"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {ICON} from "./CanvasIcons"
import {addPillEdge, makePill, paintPill, setPillIcon, setPillIconRotation} from "./CanvasPill"
import {TONE} from "./CanvasTheme"

const HUB_SIZE = 4.6
const ITEM_SIZE = 4.2
const TEXT_SIZE = 56
// Círculo completo de un solo anillo alrededor del +, empezando arriba (90°) y girando hacia la izquierda.
// Con nueve botones a 40° entre sí, este radio deja algo de aire entre ellos sin alejarlos del +.
export const RING_RADIUS = 8
// Formas, Stickers y Plantillas despliegan sus opciones en un arco exterior, centrado en su botón.
export const SHAPE_RING_RADIUS = 13.5
const SUB_STEP = 22
const ARC_START = 90
const OPEN_TIME = 0.16

export type EdgeTool = "draw" | "erase" | "write" | "arrow"
export type EdgeSubmenu = "shapes" | "stickers" | "templates"
export type EdgeAction = EdgeTool | EdgeSubmenu | "duplicate" | "delete" | "menu"

interface ItemDef {
  action: EdgeAction
  label: string
  icon: Texture
}

const TOOLS: {action: EdgeTool; label: string; icon: Texture}[] = [
  {action: "draw", label: "Dibujar", icon: ICON.draw},
  {action: "erase", label: "Goma", icon: ICON.ink_eraser},
  {action: "write", label: "Escribir texto", icon: ICON.edit_note},
  {action: "arrow", label: "Flecha", icon: ICON.trending_flat},
]

// En el orden del círculo, desde arriba y girando hacia la izquierda.
const ITEMS: ItemDef[] = [
  ...TOOLS,
  {action: "shapes", label: "Formas", icon: ICON.category},
  {action: "stickers", label: "Stickers", icon: ICON.kid_star},
  {action: "templates", label: "Plantillas", icon: ICON.dashboard},
  {action: "duplicate", label: "Duplicar canvas", icon: ICON.content_copy},
  {action: "delete", label: "Borrar canvas", icon: ICON.delete},
]

// Las opciones de cada arco usan las mismas acciones que el menú principal.
const SUBMENUS: Record<EdgeSubmenu, {action: string; label: string; icon: Texture}[]> = {
  shapes: [
    {action: "shape:rect", label: "Rectángulo", icon: ICON.rectangle},
    {action: "shape:circle", label: "Círculo", icon: ICON.circle},
    {action: "shape:triangle", label: "Triángulo", icon: ICON.change_history},
    {action: "shape:process", label: "Proceso", icon: ICON.square},
    {action: "shape:decision", label: "Decisión", icon: ICON.diamond},
    {action: "shape:terminator", label: "Inicio / fin", icon: ICON.stadium},
  ],
  stickers: [
    {action: "sticker:star", label: "Estrella", icon: ICON.star},
    {action: "sticker:heart", label: "Corazón", icon: ICON.favorite},
    {action: "sticker:warning", label: "Aviso", icon: ICON.warning},
    {action: "sticker:done", label: "Hecho", icon: ICON.check_circle},
  ],
  templates: [
    {action: "template:flow", label: "Flujo", icon: ICON.account_tree},
    {action: "template:cards", label: "Card sorting", icon: ICON.view_kanban},
    {action: "template:journey", label: "User journey", icon: ICON.route},
    {action: "template:architecture", label: "Arquitectura", icon: ICON.hub},
    {action: "template:sequence", label: "Secuencia", icon: ICON.format_list_numbered},
  ],
}

function polar(angle: number, radius: number): vec3 {
  const a = (angle * Math.PI) / 180
  return new vec3(Math.cos(a) * radius, Math.sin(a) * radius, 0)
}

@component
export class CanvasEdgeBarUI extends BaseScriptComponent {
  private _onAction = new Event<EdgeAction>()
  private _onPick = new Event<string>()
  private hub: CapsuleButton | null = null
  private ring: SceneObject | null = null
  private items = new Map<EdgeAction, CapsuleButton>()
  private subRings = new Map<EdgeSubmenu, SceneObject>()
  // Cada botón del menú con el ángulo y el radio que le tocan.
  private slots: {so: SceneObject; angle: number; radius: number}[] = []
  private active: EdgeTool | null = null
  private deleteArmed = false
  private openSub: EdgeSubmenu | null = null
  private opened = false
  private progress = 0

  get onAction(): PublicApi<EdgeAction> {
    return this._onAction.publicApi()
  }

  /** Una opción de un arco exterior, con la acción del menú principal que le corresponde. */
  get onPick(): PublicApi<string> {
    return this._onPick.publicApi()
  }

  get isOpen(): boolean {
    return this.opened
  }

  get hasSubmenuOpen(): boolean {
    return this.openSub !== null
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")

    this.ring = global.scene.createSceneObject("Ring")
    this.ring.setParent(this.sceneObject)

    for (const def of ITEMS) {
      const isActive = (): boolean =>
        def.action === "delete" ? this.deleteArmed : this.active === def.action || this.openSub === def.action
      this.items.set(def.action, this.makeItem(this.ring, def.label, def.icon, isActive, () => this._onAction.invoke(def.action)))
    }
    for (const key of Object.keys(SUBMENUS) as EdgeSubmenu[]) {
      const sub = global.scene.createSceneObject("Sub_" + key)
      sub.setParent(this.ring)
      for (const opt of SUBMENUS[key]) {
        this.makeItem(sub, opt.label, opt.icon, () => false, () => this._onPick.invoke(opt.action))
      }
      sub.enabled = false
      this.subRings.set(key, sub)
    }

    this.hub = makePill(this.sceneObject, "Herramientas", HUB_SIZE, HUB_SIZE, TEXT_SIZE, () => this.opened || this.active !== null, () => this._onAction.invoke("menu"), ICON.add)
    addPillEdge(this.hub)

    this.layout()
    this.ring.enabled = false
    this.createEvent("UpdateEvent").bind(() => this.animate())
  }

  private makeItem(parent: SceneObject, label: string, icon: Texture, isActive: () => boolean, onPress: () => void): CapsuleButton {
    const btn = makePill(parent, label, ITEM_SIZE, ITEM_SIZE, TEXT_SIZE, isActive, onPress, icon)
    addPillEdge(btn)
    return btn
  }

  /** Reparte los botones por igual en el círculo y cada arco exterior alrededor de su botón. */
  private layout(): void {
    const step = 360 / ITEMS.length
    this.slots = ITEMS.map((def, i) => ({so: this.items.get(def.action).sceneObject, angle: ARC_START + step * i, radius: RING_RADIUS}))
    this.subRings.forEach((sub, key) => {
      const angle = ARC_START + step * ITEMS.findIndex((d) => d.action === key)
      const children = sub.getChildrenCount()
      for (let i = 0; i < children; i++) {
        const offset = (i - (children - 1) / 2) * SUB_STEP
        sub.getChild(i).getTransform().setLocalPosition(polar(angle + offset, SHAPE_RING_RADIUS))
      }
    })
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
    if (!open) this.closeSubmenus()
    this.refreshHub()
  }

  /** Con el menú cerrado, el botón + muestra la herramienta activa. */
  setActive(action: EdgeTool | null): void {
    this.active = action
    for (const def of TOOLS) {
      const btn = this.items.get(def.action)
      if (btn) paintPill(btn, def.action === action)
    }
    this.refreshHub()
  }

  /** Color de aviso mientras espera la segunda pulsación que confirma el borrado. */
  setDeleteArmed(armed: boolean): void {
    this.deleteArmed = armed
    const btn = this.items.get("delete")
    if (btn) paintPill(btn, armed, TONE.warning)
  }

  /** Abre el arco de esa opción, o lo cierra si ya estaba abierto. Devuelve si quedó abierto. */
  toggleSubmenu(key: EdgeSubmenu): boolean {
    const open = this.openSub !== key
    this.closeSubmenus()
    if (open) {
      this.openSub = key
      const sub = this.subRings.get(key)
      if (sub) sub.enabled = true
      const btn = this.items.get(key)
      if (btn) paintPill(btn, true)
    }
    return open
  }

  closeSubmenus(): void {
    this.openSub = null
    this.subRings.forEach((sub, key) => {
      sub.enabled = false
      const btn = this.items.get(key)
      if (btn) paintPill(btn, false)
    })
  }

  setPose(position: vec3, rotation: quat): void {
    const t = this.sceneObject.getTransform()
    t.setLocalPosition(position)
    t.setLocalRotation(rotation)
  }
}
