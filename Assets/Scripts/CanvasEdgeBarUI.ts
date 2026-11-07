// Botones pegados al borde del canvas. Son hijos del canvas, así que viajan con él.
import {CapsuleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/CapsuleButton"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {CanvasShape} from "./CanvasGeometry"
import {ICON} from "./CanvasIcons"
import {makePill, paintPill} from "./CanvasPill"
import {TONE} from "./CanvasTheme"

const BTN_W = 10
const BTN_H = 3.6
const GAP = 0.8
const TEXT_SIZE = 56
// Por delante del contenido del canvas, sobre el que se despliega en una pared.
const MENU_Z = 1.5

export type EdgeTool = "move" | "draw" | "write" | "arrow"
export type EdgeExtra = "group" | "separate"
export type EdgeAction = EdgeTool | EdgeExtra | "delete" | "shapeMenu"

const TOOLS: {action: EdgeTool; label: string; icon: Texture}[] = [
  {action: "move", label: "Mover", icon: ICON.open_with},
  {action: "draw", label: "Dibujar", icon: ICON.draw},
  {action: "write", label: "Escribir", icon: ICON.edit_note},
  {action: "arrow", label: "Flecha", icon: ICON.trending_flat},
]

const SHAPES: {shape: CanvasShape; label: string; icon: Texture}[] = [
  {shape: "rect", label: "Rectángulo", icon: ICON.rectangle},
  {shape: "oval", label: "Óvalo", icon: ICON.circle},
  {shape: "triangle", label: "Triángulo", icon: ICON.change_history},
  {shape: "diamond", label: "Rombo", icon: ICON.diamond},
]

const EXTRAS: {action: EdgeExtra; label: string; icon: Texture}[] = [
  {action: "group", label: "Agrupar", icon: ICON.join},
  {action: "separate", label: "Separar", icon: ICON.ungroup},
]

@component
export class CanvasEdgeBarUI extends BaseScriptComponent {
  private _onAction = new Event<EdgeAction>()
  private _onShape = new Event<CanvasShape>()
  private shapeButton: CapsuleButton | null = null
  private menu: SceneObject | null = null
  private menuItems = new Map<CanvasShape, CapsuleButton>()
  private menuOpen = false
  private menuShape: CanvasShape = "rect"
  private buttons = new Map<EdgeTool, CapsuleButton>()
  private extras = new Map<EdgeExtra, SceneObject>()
  private active: EdgeTool | null = null
  private deleteButton: CapsuleButton | null = null
  private deleteArmed = false

  get onAction(): PublicApi<EdgeAction> {
    return this._onAction.publicApi()
  }

  get onShape(): PublicApi<CanvasShape> {
    return this._onShape.publicApi()
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")

    const rowSo = global.scene.createSceneObject("Tools")
    rowSo.setParent(this.sceneObject)
    const row = rowSo.createComponent(FlexLayout.getTypeName()) as FlexLayout
    const rowWidth = BTN_W * (TOOLS.length + 1) + GAP * TOOLS.length
    row.width = rowWidth
    row.height = BTN_H
    row.direction = FlexDirection.Row
    row.justifyContent = FlexJustify.Center
    row.alignItems = FlexAlign.Center
    row.columnGap = GAP
    for (const def of TOOLS) {
      const btn = makePill(
        rowSo,
        def.label,
        BTN_W,
        BTN_H,
        TEXT_SIZE,
        () => this.active === def.action,
        () => this._onAction.invoke(def.action),
        def.icon
      )
      this.buttons.set(def.action, btn)
    }

    this.shapeButton = makePill(
      rowSo,
      "Forma",
      BTN_W,
      BTN_H,
      TEXT_SIZE,
      () => this.menuOpen,
      () => this._onAction.invoke("shapeMenu"),
      ICON.category
    )

    this.menu = global.scene.createSceneObject("ShapeMenu")
    this.menu.setParent(this.sceneObject)
    this.menu.getTransform().setLocalPosition(new vec3(rowWidth / 2 - BTN_W / 2, 0, MENU_Z))
    for (const def of SHAPES) {
      const item = makePill(
        this.menu,
        def.label,
        BTN_W,
        BTN_H,
        TEXT_SIZE,
        () => this.menuShape === def.shape,
        () => this._onShape.invoke(def.shape),
        def.icon
      )
      this.menuItems.set(def.shape, item)
    }
    this.setMenuDirection(false)
    this.menu.enabled = false

    // La X queda aparte de las herramientas para no pulsarla sin querer.
    const closeHolder = global.scene.createSceneObject("Borrar")
    closeHolder.setParent(this.sceneObject)
    closeHolder.getTransform().setLocalPosition(new vec3(rowWidth / 2 + GAP * 1.5 + BTN_H / 2, 0, 0))
    this.deleteButton = makePill(
      closeHolder,
      "Borrar canvas",
      BTN_H,
      BTN_H,
      TEXT_SIZE,
      () => this.deleteArmed,
      () => this._onAction.invoke("delete"),
      ICON.close
    )

    // Agrupar o Separar solo aparecen cuando tienen sentido, en una fila propia sobre las herramientas
    // para que la barra de un canvas pegado no los tape.
    for (const def of EXTRAS) {
      const holder = global.scene.createSceneObject(def.label)
      holder.setParent(this.sceneObject)
      holder.getTransform().setLocalPosition(new vec3(0, BTN_H + GAP, 0))
      makePill(
        holder,
        def.label,
        BTN_W,
        BTN_H,
        TEXT_SIZE,
        () => false,
        () => this._onAction.invoke(def.action),
        def.icon
      )
      holder.enabled = false
      this.extras.set(def.action, holder)
    }
  }

  setActive(action: EdgeTool | null): void {
    this.active = action
    this.buttons.forEach((btn, key) => paintPill(btn, key === action))
  }

  /** Color de aviso mientras espera la segunda pulsación que confirma el borrado. */
  setDeleteArmed(armed: boolean): void {
    this.deleteArmed = armed
    if (this.deleteButton) paintPill(this.deleteButton, armed, TONE.warning)
  }

  setShapeMenu(open: boolean, current: CanvasShape): void {
    this.menuOpen = open
    this.menuShape = current
    if (this.menu) this.menu.enabled = open
    if (this.shapeButton) paintPill(this.shapeButton, open)
    this.menuItems.forEach((btn, shape) => paintPill(btn, shape === current))
  }

  /** En una pared cae sobre el canvas; en una mesa se levanta, porque hacia abajo no hay sitio. */
  setMenuDirection(upward: boolean): void {
    let index = 1
    for (const def of SHAPES) {
      const y = (upward ? 1 : -1) * (BTN_H + GAP) * index++
      this.menuItems.get(def.shape)?.sceneObject.getTransform().setLocalPosition(new vec3(0, y, 0))
    }
  }

  showExtra(extra: EdgeExtra | null): void {
    this.extras.forEach((holder, key) => {
      holder.enabled = key === extra
    })
  }

  setPose(position: vec3, rotation: quat): void {
    const t = this.sceneObject.getTransform()
    t.setLocalPosition(position)
    t.setLocalRotation(rotation)
  }
}
