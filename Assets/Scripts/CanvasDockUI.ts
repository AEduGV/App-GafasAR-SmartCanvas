// Botón de menú, línea de estado y panel de herramientas, pegados a la vista como una capa plana.
// Solo expone acciones como texto y pinta el estado que le envían.
import {CapsuleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/CapsuleButton"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {ICON} from "./CanvasIcons"
import {LABEL_Z, makePill, paintPill, setPillHintListener, setPillIcon} from "./CanvasPill"
import {appendFill, appendStroke, outlineFacing, roundedRect} from "./CanvasGeometry"
import {MeshSlot} from "./CanvasRenderer"
import {COLOR, TONE, withAlpha} from "./CanvasTheme"

const THEME_FONT = requireAsset("../Fonts/Inter.ttf") as Font

// Con este alfa, el texto de error de la línea de estado llega a 4,5:1 aunque detrás haya blanco.
const PLATE_ALPHA = 0.92
const PLATE_RADIUS = 1.6

// Fondo del menú tipo «liquid glass»: vidrio translúcido con un canto claro y un brillo arriba. Los botones
// llevan su propio fondo opaco, así que el vidrio puede ser más transparente que la línea de estado.
const GLASS_TINT = new vec4(0.11, 0.16, 0.24, 0.62)
const GLASS_SHEEN = new vec4(1, 1, 1, 0.06)
const GLASS_RIM = new vec4(1, 1, 1, 0.22)
const GLASS_GLINT = new vec4(1, 1, 1, 0.65)
// Al abrir brota del botón como una gota y se estira con un rebote; al cerrar se recoge más deprisa.
const OPEN_TIME = 0.42
const CLOSE_TIME = 0.2
const SPRING = 1.5
// Los iconos aparecen cuando el vidrio ya casi ha llegado a su tamaño.
const CONTENT_FROM = 0.55

// Barra lateral: cada sección es una columna que baja desde el botón, una junto a otra.
const BTN_H = 3
const ICON_W = 5.2
const GAP = 0.5
const COL_GAP = 0.8
const PAD = 1

const BUTTON_SIZE = 39
const STATUS_SIZE = 41

// Lo más cerca posible sin molestar, para que ningún canvas se interponga. Las medidas de este archivo
// son las de un panel a VIEW_REFERENCE cm, y se escalan para verse igual de grandes a esta distancia.
const VIEW_DISTANCE = 50
const VIEW_REFERENCE = 105
// Esquina superior izquierda de la franja donde la Preview muestra lo virtual, en esas medidas.
const TOGGLE_SIZE = 4.4
const TOGGLE_X = -27
const TOGGLE_Y = 31
const STATUS_H = 3.4
const STATUS_LEFT = TOGGLE_X + TOGGLE_SIZE / 2 + 0.6
const STATUS_MAX_W = 29.5 - STATUS_LEFT
const STATUS_PAD = 1.2
// Anchura aproximada por carácter: la placa se ajusta al mensaje para tapar lo menos posible.
const STATUS_CHAR_W = 0.5
const MENU_TOP = TOGGLE_Y - TOGGLE_SIZE / 2 - 0.8
// Borde izquierdo de la franja visible: la barra baja pegada a él.
const MENU_LEFT = -29.5

// Tras estas acciones el menú sigue abierto: llevan a otro botón del menú o piden una segunda pulsación.
const KEEP_OPEN = new Set(["tab", "width", "color", "layer", "orient", "multi", "delete", "clear"])

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
  private statusPlate: MeshSlot | null = null
  private menu: SceneObject | null = null
  private toggle: CapsuleButton | null = null
  private opened = false
  private content: SceneObject | null = null
  private glassFill: MeshSlot | null = null
  private glassSheen: MeshSlot | null = null
  private glassRim: MeshSlot | null = null
  private glassGlint: MeshSlot | null = null
  private plateSize = new vec2(ICON_W + PAD * 2, BTN_H + PAD * 2)
  private columns: {so: SceneObject; count: number; width: number}[] = []
  private progress = 0
  private panes = new Map<string, SceneObject>()
  private buttons = new Map<string, CapsuleButton>()
  private toolsColumn: SceneObject | null = null
  private tabsColumn: SceneObject | null = null
  private selectionColumn: SceneObject | null = null
  private placementColumn: SceneObject | null = null
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
    this.makeStatus()
    this.makeToggle()

    const menu = global.scene.createSceneObject("Menu")
    menu.setParent(this.sceneObject)
    this.menu = menu
    this.glassFill = new MeshSlot(menu, "GlassFill", GLASS_TINT, false)
    this.glassSheen = new MeshSlot(menu, "GlassSheen", GLASS_SHEEN, false)
    this.glassRim = new MeshSlot(menu, "GlassRim", GLASS_RIM, false)
    this.glassGlint = new MeshSlot(menu, "GlassGlint", GLASS_GLINT, false)
    this.createEvent("UpdateEvent").bind(() => this.animate())
    this.build(menu)
  }

  /** Queda fijo a la cámara: mirando hacia ella, sin perspectiva y a la misma distancia aunque se mueva. */
  attachToView(camera: SceneObject): void {
    this.sceneObject.setParent(camera)
    const t = this.sceneObject.getTransform()
    t.setLocalPosition(new vec3(0, 0, -VIEW_DISTANCE))
    t.setLocalRotation(quat.quatIdentity())
    t.setLocalScale(vec3.one().uniformScale(VIEW_DISTANCE / VIEW_REFERENCE))
  }

  /** Devuelve si estaba abierto. */
  closeMenu(): boolean {
    const was = this.opened
    this.setOpen(false)
    return was
  }

  private setOpen(open: boolean): void {
    this.opened = open
    if (open && this.menu) this.menu.enabled = true
    // Los botones no se pueden pulsar mientras se cierra.
    if (!open && this.content) this.content.enabled = false
    if (!open && this.progress === 0 && this.menu) this.menu.enabled = false
    if (this.toggle) setPillIcon(this.toggle, open ? ICON.close : ICON.menu)
    this.setActive("menu", open)
    // Un botón que desaparece bajo el cursor no avisa de que ya no se le apunta.
    if (!open) this.showHint(null)
  }

  private makeToggle(): void {
    const btn = makePill(
      this.sceneObject,
      "Menú",
      TOGGLE_SIZE,
      TOGGLE_SIZE,
      BUTTON_SIZE,
      () => this.opened,
      () => {
        this.setOpen(!this.opened)
        this._onAction.invoke("menu")
      },
      ICON.menu
    )
    btn.getSceneObject().getTransform().setLocalPosition(new vec3(TOGGLE_X, TOGGLE_Y, 0.6))
    this.toggle = btn
    this.buttons.set("menu", btn)
  }

  private setPlateSize(size: vec2): void {
    this.plateSize = size
    this.drawGlass()
  }

  private animate(): void {
    const target = this.opened ? 1 : 0
    if (this.progress === target) return
    const step = getDeltaTime() / (this.opened ? OPEN_TIME : CLOSE_TIME)
    this.progress = this.opened ? Math.min(1, this.progress + step) : Math.max(0, this.progress - step)
    this.drawGlass()
    if (this.progress === 0 && this.menu) this.menu.enabled = false
  }

  /**
   * De la forma del botón a la de la barra. Al abrir se ensancha enseguida y cae hacia abajo con un rebote
   * elástico; al cerrar se recoge con suavidad. El origen del menú es la esquina superior izquierda de la barra.
   */
  private drawGlass(): void {
    if (!this.glassFill || !this.glassSheen || !this.glassRim || !this.glassGlint) return
    const k = this.progress
    const t = k - 1
    const drop = this.opened ? 1 + (SPRING + 1) * t * t * t + SPRING * t * t : k * k * (3 - 2 * k)
    const kw = Math.min(1, k * 1.8)
    const widen = this.opened ? kw * (2 - kw) : drop
    const full = this.plateSize
    const w = Math.max(TOGGLE_SIZE * 0.6, TOGGLE_SIZE + (full.x - TOGGLE_SIZE) * widen)
    const h = Math.max(TOGGLE_SIZE * 0.6, TOGGLE_SIZE + (full.y - TOGGLE_SIZE) * drop)
    // La esquina superior izquierda va de la del botón a la de la barra: crece hacia la derecha y hacia abajo.
    const fromX = TOGGLE_X - TOGGLE_SIZE / 2 - MENU_LEFT
    const fromY = TOGGLE_Y + TOGGLE_SIZE / 2 - MENU_TOP
    const c = new vec2(fromX * (1 - widen) + w / 2, fromY * (1 - drop) - h / 2)
    const r = Math.min(w, h) / 2 + (PLATE_RADIUS - Math.min(w, h) / 2) * Math.min(1, Math.max(0, drop))
    const pts = roundedRect(w, h, Math.max(0.1, r)).map((p) => p.add(c))

    appendFill(this.glassFill.begin(), pts, 0.2)
    this.glassFill.commit()
    const band = roundedRect(Math.max(0.2, w - 0.8), h * 0.42, Math.max(0.1, r - 0.4)).map((p) => new vec2(p.x + c.x, p.y + c.y + h * 0.27))
    appendFill(this.glassSheen.begin(), band, 0.22)
    this.glassSheen.commit()
    appendStroke(this.glassRim.begin(), pts, true, 0.12, 0.24)
    this.glassRim.commit()
    const glint = this.glassGlint.begin()
    for (const run of outlineFacing(pts.map((p) => p.sub(c)), new vec2(0, 1), 0.75)) {
      appendStroke(glint, run.map((p) => p.add(c)), false, 0.22, 0.26)
    }
    this.glassGlint.commit()

    if (this.content) {
      const show = this.opened && k >= CONTENT_FROM
      this.content.enabled = show
      if (show) {
        const pop = 0.9 + 0.1 * Math.min(1, (k - CONTENT_FROM) / (1 - CONTENT_FROM))
        this.content.getTransform().setLocalScale(new vec3(pop, pop, 1))
      }
    }
  }

  private build(host: SceneObject): void {
    const content = global.scene.createSceneObject("Content")
    content.setParent(host)
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    this.content = content

    const paneWidth = Math.max(...Object.keys(PANES).map((name) => this.columnWidth(PANES[name])))
    this.toolsColumn = this.makeColumn(content, TOOLS)
    this.tabsColumn = this.makeColumn(content, TABS)
    for (const name of Object.keys(PANES)) {
      const col = this.makeColumn(content, PANES[name], paneWidth)
      this.panes.set(name, col)
      col.enabled = name === "crear"
    }
    this.selectionColumn = this.makeColumn(content, SELECTION)
    this.placementColumn = this.makeColumn(content, PLACEMENT)

    this.ready = true
    this.setActive("tab:crear", true)
    this.setPhase(this.pendingPhase)
    this.activeActions.forEach((a) => this.paint(a))
    this.setOpen(false)
  }

  private buttonWidth(def: ButtonDef): number {
    return def.icon ? ICON_W : def.w ?? ICON_W
  }

  private columnWidth(defs: ButtonDef[]): number {
    return Math.max(...defs.map((d) => this.buttonWidth(d)))
  }

  private columnHeight(count: number): number {
    return count * BTN_H + (count - 1) * GAP
  }

  private makeStatus(): void {
    const root = global.scene.createSceneObject("Status")
    root.setParent(this.sceneObject)
    root.getTransform().setLocalPosition(new vec3(STATUS_LEFT, TOGGLE_Y, 0.2))
    this.statusPlate = new MeshSlot(root, "StatusPlate", withAlpha(COLOR.surface, PLATE_ALPHA), false)

    const so = global.scene.createSceneObject("StatusText")
    so.setParent(root)
    so.getTransform().setLocalPosition(new vec3(STATUS_PAD, 0, LABEL_Z))
    const t = so.createComponent("Component.Text") as Text
    t.font = THEME_FONT
    t.size = STATUS_SIZE
    t.depthTest = true
    t.textFill.color = COLOR.textMuted
    t.horizontalAlignment = HorizontalAlignment.Left
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.layoutRect = Rect.create(0, STATUS_MAX_W - STATUS_PAD * 2, -STATUS_H / 2, STATUS_H / 2)
    this.status = t
  }

  private writeStatus(text: string, color: vec4): void {
    if (!this.status || !this.statusPlate) return
    this.status.text = text
    this.status.textFill.color = color
    const b = this.statusPlate.begin()
    if (text.length > 0) {
      const w = Math.min(STATUS_MAX_W, text.length * STATUS_CHAR_W + STATUS_PAD * 2)
      const pts = roundedRect(w, STATUS_H, PLATE_RADIUS).map((p) => new vec2(p.x + w / 2, p.y))
      appendFill(b, pts, 0)
    }
    this.statusPlate.commit()
  }

  private makeColumn(parent: SceneObject, defs: ButtonDef[], width: number = this.columnWidth(defs)): SceneObject {
    const col = global.scene.createSceneObject("Column")
    col.setParent(parent)
    const flex = col.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = width
    flex.height = this.columnHeight(defs.length)
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Center
    flex.rowGap = GAP
    for (const def of defs) {
      const btn = makePill(
        col,
        def.label,
        this.buttonWidth(def),
        BTN_H,
        BUTTON_SIZE,
        () => this.activeActions.has(def.action),
        () => {
          this._onAction.invoke(def.action)
          if (!KEEP_OPEN.has(def.action.split(":")[0])) this.setOpen(false)
        },
        def.icon
      )
      this.buttons.set(def.action, btn)
    }
    this.columns.push({so: col, count: defs.length, width})
    return col
  }

  /** Coloca de izquierda a derecha las columnas visibles, colgando del borde superior, y ajusta el vidrio. */
  private layoutColumns(): void {
    const order = this.pendingPhase === "work"
      ? [this.toolsColumn, this.tabsColumn, this.visiblePane(), this.selectionColumn]
      : [this.placementColumn]
    let x = PAD
    let tallest = 0
    for (const so of order) {
      const info = this.columns.find((c) => c.so === so)
      if (!info) continue
      const h = this.columnHeight(info.count)
      info.so.getTransform().setLocalPosition(new vec3(x + info.width / 2, -PAD - h / 2, 0))
      x += info.width + COL_GAP
      tallest = Math.max(tallest, h)
    }
    this.setPlateSize(new vec2(x - COL_GAP + PAD, tallest + PAD * 2))
  }

  private visiblePane(): SceneObject | null {
    let found: SceneObject | null = null
    this.panes.forEach((col, key) => {
      if (this.activeActions.has("tab:" + key)) found = col
    })
    return found
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
    this.panes.forEach((col, key) => {
      col.enabled = key === name
    })
    for (const tab of TABS) this.setActive(tab.action, tab.action === "tab:" + name)
    if (this.ready) this.layoutColumns()
  }

  /** El nombre del botón de solo icono al que se apunta; al salir vuelve el mensaje que había. */
  private showHint(label: string | null): void {
    if (label) this.writeStatus(label, COLOR.text)
    else this.setStatus(this.pendingStatus, this.pendingTone)
  }

  /** El color refuerza el mensaje, que siempre explica por sí mismo qué ocurre. */
  setStatus(msg: string, tone: StatusTone = "normal"): void {
    this.pendingStatus = msg
    this.pendingTone = tone
    this.writeStatus(
      (tone === "warning" ? "Aviso: " : tone === "error" ? "Error: " : "") + msg,
      tone === "warning" ? COLOR.warning : tone === "error" ? COLOR.error : COLOR.textMuted
    )
  }

  setPhase(phase: "place" | "work"): void {
    this.pendingPhase = phase
    if (!this.ready) return
    const working = phase === "work"
    this.menu?.getTransform().setLocalPosition(new vec3(MENU_LEFT, MENU_TOP, 0))
    this.setOpen(false)
    if (this.toolsColumn) this.toolsColumn.enabled = working
    if (this.tabsColumn) this.tabsColumn.enabled = working
    this.panes.forEach((col) => {
      col.enabled = working && this.activeActions.has("tab:" + this.paneName(col))
    })
    if (this.selectionColumn) this.selectionColumn.enabled = working
    if (this.placementColumn) this.placementColumn.enabled = !working
    this.layoutColumns()
  }

  private paneName(target: SceneObject): string {
    let found = ""
    this.panes.forEach((row, key) => {
      if (row === target) found = key
    })
    return found
  }

  /** Si un rayo pasa por algo visible de esta capa: el botón, el estado o el menú abierto. */
  hitsRay(origin: vec3, dir: vec3): boolean {
    const inv = this.sceneObject.getTransform().getInvertedWorldTransform()
    const o = inv.multiplyPoint(origin)
    const d = inv.multiplyPoint(origin.add(dir)).sub(o)
    if (Math.abs(d.z) < 1e-4) return false
    const k = -o.z / d.z
    if (k <= 0) return false
    const x = o.x + d.x * k
    const y = o.y + d.y * k
    if (Math.abs(x - TOGGLE_X) < TOGGLE_SIZE / 2 && Math.abs(y - TOGGLE_Y) < TOGGLE_SIZE / 2) return true
    if (this.pendingStatus && x > STATUS_LEFT && x < STATUS_LEFT + STATUS_MAX_W && Math.abs(y - TOGGLE_Y) < STATUS_H / 2) return true
    if (!this.opened) return false
    const size = this.plateSize
    return x > MENU_LEFT && x < MENU_LEFT + size.x && y < MENU_TOP && y > MENU_TOP - size.y
  }
}
