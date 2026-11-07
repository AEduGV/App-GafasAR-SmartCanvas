// Panel de herramientas. Solo expone acciones como texto y pinta el estado que le envían.
import {CapsuleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/CapsuleButton"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {ContentVerticalAlignment} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/LayoutTypes"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {ICON} from "./CanvasIcons"
import {LABEL_Z, makePill, paintPill, setPillHintListener} from "./CanvasPill"
import {appendFill, roundedRect} from "./CanvasGeometry"
import {MeshSlot} from "./CanvasRenderer"
import {COLOR, TONE, withAlpha} from "./CanvasTheme"

const THEME_FONT = requireAsset("../Fonts/Inter.ttf") as Font

// BackPlate solo ofrece grises fijos. Con este alfa, el texto de error llega a 4,5:1 aunque detrás haya blanco.
const PLATE_ALPHA = 0.92
const PLATE_RADIUS = 1.6
const PLATE_Z = 0.2

const PANEL_W = 57
const ROW_H = 3
const PANEL_H = ROW_H * 5 + 2.2
const BTN_H = 2.6
const GAP = 0.5

const BUTTON_SIZE = 39
const STATUS_SIZE = 41
// Al colocar el canvas solo se ve el estado y una fila: el panel no debe tapar mesas ni paredes.
const COMPACT_H = ROW_H * 2 + 2.4

export type StatusTone = "normal" | "warning" | "error"

interface ButtonDef {
  label: string
  action: string
  w?: number
  icon?: Texture
}

const TOOLS: ButtonDef[] = [
  {label: "Seleccionar", action: "tool:select", icon: ICON.arrow_selector_tool},
  {label: "Conectar", action: "tool:connect", icon: ICON.polyline},
  {label: "Dibujar", action: "tool:draw", icon: ICON.draw},
  {label: "Goma", action: "tool:erase", icon: ICON.ink_eraser},
  {label: "Subrayar", action: "tool:underline", icon: ICON.format_underlined},
  {label: "Varios", action: "multi", icon: ICON.library_add_check},
]

const TABS: ButtonDef[] = [
  {label: "Crear", action: "tab:crear", w: 7, icon: ICON.add_box},
  {label: "Flujo", action: "tab:flujo", w: 7, icon: ICON.account_tree},
  {label: "Lógica", action: "tab:logica", w: 7, icon: ICON.memory},
  {label: "Marcar", action: "tab:marcar", w: 7, icon: ICON.brush},
  {label: "Stickers", action: "tab:stickers", w: 7, icon: ICON.kid_star},
  {label: "Plantillas", action: "tab:plantillas", w: 7, icon: ICON.dashboard},
  {label: "Canvas", action: "tab:canvas", w: 7, icon: ICON.crop_free},
]

const PANES: Record<string, ButtonDef[]> = {
  crear: [
    {label: "Nota", action: "add:note", icon: ICON.sticky_note_2},
    {label: "Texto", action: "add:text", icon: ICON.title},
    {label: "Pantalla", action: "add:screen", icon: ICON.web_asset},
    {label: "Rectángulo", action: "shape:rect", icon: ICON.rectangle},
    {label: "Círculo", action: "shape:circle", icon: ICON.circle},
    {label: "Triángulo", action: "shape:triangle", icon: ICON.change_history},
  ],
  flujo: [
    {label: "Proceso", action: "shape:process", icon: ICON.square},
    {label: "Decisión", action: "shape:decision", icon: ICON.diamond},
    {label: "Inicio / fin", action: "shape:terminator", icon: ICON.stadium},
    {label: "Datos", action: "shape:data", icon: ICON.database},
  ],
  // Las puertas lógicas y los nombres de color no tienen un icono que los distinga: siguen en texto.
  logica: [
    {label: "AND", action: "shape:and"},
    {label: "OR", action: "shape:or"},
    {label: "NOT", action: "shape:not"},
    {label: "XOR", action: "shape:xor"},
  ],
  marcar: [
    {label: "Fino", action: "width:0", w: 5.5, icon: ICON.pen_size_1},
    {label: "Medio", action: "width:1", w: 5.5, icon: ICON.pen_size_3},
    {label: "Grueso", action: "width:2", w: 5.5, icon: ICON.pen_size_5},
    {label: "Blanco", action: "color:0", w: 6},
    {label: "Azul", action: "color:1", w: 5},
    {label: "Verde", action: "color:2", w: 5.5},
    {label: "Amarillo", action: "color:3", w: 7.5},
    {label: "Naranja", action: "color:4", w: 7},
    {label: "Rojo", action: "color:5", w: 5},
  ],
  stickers: [
    {label: "Estrella", action: "sticker:star", icon: ICON.star},
    {label: "Corazón", action: "sticker:heart", icon: ICON.favorite},
    {label: "Aviso", action: "sticker:warning", icon: ICON.warning},
    {label: "Hecho", action: "sticker:done", icon: ICON.check_circle},
  ],
  plantillas: [
    {label: "Flujo", action: "template:flow", icon: ICON.account_tree},
    {label: "Card sorting", action: "template:cards", icon: ICON.view_kanban},
    {label: "User journey", action: "template:journey", icon: ICON.route},
    {label: "Arquitectura", action: "template:architecture", icon: ICON.hub},
    {label: "Secuencia", action: "template:sequence", icon: ICON.format_list_numbered},
  ],
  canvas: [
    {label: "Horizontal / vertical", action: "flip", icon: ICON.screen_rotation},
    {label: "Colocar de nuevo", action: "replace", icon: ICON.place_item},
    {label: "Vaciar", action: "clear", icon: ICON.delete_sweep},
  ],
}

const SELECTION: ButtonDef[] = [
  {label: "Editar", action: "edit", icon: ICON.edit},
  {label: "Capa −", action: "layer:-1", icon: ICON.flip_to_back},
  {label: "Capa +", action: "layer:1", icon: ICON.flip_to_front},
  {label: "Agrupar", action: "group", icon: ICON.join},
  {label: "Separar", action: "ungroup", icon: ICON.ungroup},
  {label: "Borrar", action: "delete", icon: ICON.delete},
]

const PLACEMENT: ButtonDef[] = [
  {label: "Horizontal", action: "orient:h", icon: ICON.crop_landscape},
  {label: "Vertical", action: "orient:v", icon: ICON.crop_portrait},
  {label: "Colocar delante", action: "quick", icon: ICON.center_focus_strong},
  {label: "Cancelar", action: "cancel", icon: ICON.close},
]

@component
export class CanvasDockUI extends BaseScriptComponent {
  private _onAction = new Event<string>()
  private status: Text | null = null
  private content: SceneObject | null = null
  private plate: BackPlate | null = null
  private plateFill: MeshSlot | null = null
  private panes = new Map<string, SceneObject>()
  private buttons = new Map<string, CapsuleButton>()
  private workRows: SceneObject[] = []
  private selectionRow: SceneObject | null = null
  private placementRow: SceneObject | null = null
  private ready = false
  private pendingStatus = ""
  private pendingTone: StatusTone = "normal"
  private activeActions = new Set<string>()
  private pendingPhase: "place" | "work" = "place"

  get onAction(): PublicApi<string> {
    return this._onAction.publicApi()
  }

  onAwake(): void {
    setPillHintListener((label) => this.showHint(label))
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "dark"
    plate.size = new vec2(PANEL_W + 2, PANEL_H + 1.4)
    this.plate = plate
    this.plateFill = new MeshSlot(this.sceneObject, "PlateFill", withAlpha(COLOR.surface, PLATE_ALPHA), false)
    this.plateFill.sceneObject.getTransform().setLocalPosition(new vec3(0, 0, PLATE_Z))
    this.build(this.sceneObject)
  }

  private setPlateSize(size: vec2): void {
    if (this.plate) this.plate.size = size
    if (this.plateFill) {
      appendFill(this.plateFill.begin(), roundedRect(size.x, size.y, PLATE_RADIUS), 0)
      this.plateFill.commit()
    }
  }

  private build(host: SceneObject): void {
    const content = global.scene.createSceneObject("Content")
    content.setParent(host)
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    this.content = content

    const column = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    column.width = PANEL_W
    column.height = PANEL_H
    column.direction = FlexDirection.Column
    column.justifyContent = FlexJustify.Start
    column.alignItems = FlexAlign.Center
    column.rowGap = 0.3
    column.verticalAlignment = ContentVerticalAlignment.Center

    const items: FlexItem[] = []
    const addSlot = (name: string, h: number): SceneObject => {
      const so = global.scene.createSceneObject(name)
      so.setParent(content)
      const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
      item.overrideWidth = PANEL_W
      item.overrideHeight = h
      items.push(item)
      return so
    }

    this.status = this.makeStatus(addSlot("Status", ROW_H + 0.6))
    const toolsSlot = addSlot("Tools", ROW_H)
    const tabsSlot = addSlot("Tabs", ROW_H)
    const paneSlot = addSlot("Pane", ROW_H)
    const selSlot = addSlot("Selection", ROW_H)

    this.workRows.push(this.makeRow(toolsSlot, TOOLS), this.makeRow(tabsSlot, TABS))
    for (const name of Object.keys(PANES)) {
      const row = this.makeRow(paneSlot, PANES[name])
      this.panes.set(name, row)
      row.enabled = name === "crear"
    }
    this.selectionRow = this.makeRow(selSlot, SELECTION)
    this.placementRow = this.makeRow(toolsSlot, PLACEMENT)

    this.ready = true
    this.setActive("tab:crear", true)
    this.setStatus(this.pendingStatus, this.pendingTone)
    this.setPhase(this.pendingPhase)
    this.activeActions.forEach((a) => this.paint(a))
  }

  private makeStatus(parent: SceneObject): Text {
    const so = global.scene.createSceneObject("StatusText")
    so.setParent(parent)
    so.getTransform().setLocalPosition(new vec3(0, 0, LABEL_Z))
    const t = so.createComponent("Component.Text") as Text
    t.font = THEME_FONT
    t.size = STATUS_SIZE
    t.depthTest = true
    t.textFill.color = COLOR.textMuted
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.layoutRect = Rect.create(-PANEL_W / 2, PANEL_W / 2, -1.5, 1.5)
    return t
  }

  private makeRow(parent: SceneObject, defs: ButtonDef[]): SceneObject {
    const row = global.scene.createSceneObject("Row")
    row.setParent(parent)
    const flex = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = PANEL_W
    flex.height = ROW_H
    flex.direction = FlexDirection.Row
    flex.justifyContent = FlexJustify.Center
    flex.alignItems = FlexAlign.Center
    flex.columnGap = GAP
    for (const def of defs) {
      const btn = makePill(
        row,
        def.label,
        def.w ?? 8,
        BTN_H,
        BUTTON_SIZE,
        () => this.activeActions.has(def.action),
        () => this._onAction.invoke(def.action),
        def.icon
      )
      this.buttons.set(def.action, btn)
    }
    return row
  }

  private paint(action: string): void {
    const btn = this.buttons.get(action)
    if (btn && btn.visual) paintPill(btn, this.activeActions.has(action), action === "delete" ? TONE.warning : TONE.primary)
  }

  setActive(action: string, active: boolean): void {
    if (active) this.activeActions.add(action)
    else this.activeActions.delete(action)
    if (this.ready) this.paint(action)
  }

  showTab(name: string): void {
    this.panes.forEach((row, key) => {
      row.enabled = key === name
    })
    for (const tab of TABS) this.setActive(tab.action, tab.action === "tab:" + name)
  }

  /** El nombre del botón de solo icono al que se apunta; al salir vuelve el mensaje que había. */
  private showHint(label: string | null): void {
    if (!this.status) return
    if (label) {
      this.status.text = label
      this.status.textFill.color = COLOR.text
    } else {
      this.setStatus(this.pendingStatus, this.pendingTone)
    }
  }

  /** El color refuerza el mensaje, que siempre explica por sí mismo qué ocurre. */
  setStatus(msg: string, tone: StatusTone = "normal"): void {
    this.pendingStatus = msg
    this.pendingTone = tone
    if (!this.status) return
    this.status.text = (tone === "warning" ? "Aviso: " : tone === "error" ? "Error: " : "") + msg
    this.status.textFill.color = tone === "warning" ? COLOR.warning : tone === "error" ? COLOR.error : COLOR.textMuted
  }

  setPhase(phase: "place" | "work"): void {
    this.pendingPhase = phase
    if (!this.ready) return
    const working = phase === "work"
    this.setPlateSize(new vec2(PANEL_W + 2, working ? PANEL_H + 1.4 : COMPACT_H))
    // La columna empieza arriba: en modo compacto se baja para centrar lo visible en la placa.
    const shift = working ? 0 : (PANEL_H - COMPACT_H) / 2
    this.content?.getTransform().setLocalPosition(new vec3(0, -shift, 0.6))
    for (const row of this.workRows) row.enabled = working
    this.panes.forEach((row) => {
      row.enabled = working && this.activeActions.has("tab:" + this.paneName(row))
    })
    if (this.selectionRow) this.selectionRow.enabled = working
    if (this.placementRow) this.placementRow.enabled = !working
  }

  private paneName(target: SceneObject): string {
    let found = ""
    this.panes.forEach((row, key) => {
      if (row === target) found = key
    })
    return found
  }

  /** Media altura de la placa visible, en centímetros. */
  get halfHeight(): number {
    return (this.pendingPhase === "work" ? PANEL_H + 1.4 : COMPACT_H) / 2
  }

  getTransform(): Transform {
    return this.sceneObject.getTransform()
  }

  setPose(position: vec3, rotation: quat): void {
    const t = this.sceneObject.getTransform()
    t.setWorldPosition(position)
    t.setWorldRotation(rotation)
  }
}
