// Botón de menú, línea de estado y panel de herramientas, pegados a la vista como una capa plana.
// Solo expone acciones como texto y pinta el estado que le envían.
import {CapsuleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/CapsuleButton"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {ICON} from "./CanvasIcons"
import {LABEL_Z, makePill, paintPill, setPillHintListener, setPillIcon} from "./CanvasPill"
import {appendFill, appendStroke, outlineFacing, roundedRect} from "./CanvasGeometry"
import {MeshSlot, retire} from "./CanvasRenderer"
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
// Al cambiar de sección, las cabeceras se deslizan, el vidrio se ajusta y los botones nuevos aparecen escalonados.
const SECTION_TIME = 0.3
const SECTION_STAGGER = 0.06
const SPRING = 1.5
// Los iconos aparecen cuando el vidrio ya casi ha llegado a su tamaño.
const CONTENT_FROM = 0.55

// Barra lateral de una sola columna con secciones plegables: una cabecera con nombre por sección y,
// debajo de la abierta, sus botones. Con la sección más larga abierta cabe justo en la franja visible.
// Los botones de la barra son círculos del tamaño del que la abre.
const ROUND = 4.4
const BTN_H = ROUND
const HEADER_H = 2.6
const HEADER_W = 9
const ICON_W = ROUND
// Anchura de la columna del menú: solo lleva iconos.
const COLUMN_W = ROUND
// Hueco entre botones: con los dedos es fácil pulsar el de al lado si están pegados.
const GAP = 1.8
const PAD = 1

const BUTTON_SIZE = 56
const STATUS_SIZE = 58

// Lo más cerca posible sin molestar, para que ningún canvas se interponga. Las medidas de este archivo
// son las de un panel a VIEW_REFERENCE cm, y se escalan para verse igual de grandes a esta distancia.
// Más cerca que los canvas flotantes (50 cm), para que ninguno lo atraviese.
const VIEW_DISTANCE = 30
const VIEW_REFERENCE = 105
// Esquina superior izquierda de la franja donde la Preview muestra lo virtual, en esas medidas.
const TOGGLE_SIZE = ROUND
const TOGGLE_X = -27
const TOGGLE_Y = 31
const STATUS_H = 4.6
const STATUS_LEFT = TOGGLE_X + TOGGLE_SIZE / 2 + 0.6
const STATUS_MAX_W = 29.5 - STATUS_LEFT
const STATUS_PAD = 1.2
// Anchura aproximada por carácter: la placa se ajusta al mensaje para tapar lo menos posible.
const STATUS_CHAR_W = 0.7
const MENU_TOP = TOGGLE_Y - TOGGLE_SIZE / 2 - 0.8
// Borde izquierdo de la franja visible: la barra baja pegada a él.
const MENU_LEFT = -29.5

// Tras estas acciones el menú sigue abierto: llevan a otro botón del menú o piden una segunda pulsación.
const KEEP_OPEN = new Set(["orient", "save", "exit"])

export type StatusTone = "normal" | "warning" | "error"

interface ButtonDef {
  label: string
  action: string
  w?: number
  icon?: Texture
}

// El menú solo tiene estos iconos (2026-11-08). Guardar y Salir son de demostración: no guardan ni cierran.
const MAIN: ButtonDef[] = [
  {label: "Account", action: "info:account", icon: ICON.account_circle},
  {label: "Collaboration", action: "info:collab", icon: ICON.groups},
  {label: "Save", action: "info:save", icon: ICON.save},
  {label: "Tutorials", action: "info:tutorials", icon: ICON.school},
  {label: "Exit", action: "exit", icon: ICON.logout},
]

// Paneles de ejemplo que se abren a la derecha del menú: un título, unas líneas y botones que aún no hacen nada.
interface InfoPanel {
  title: string
  lines: string[]
  buttons: string[]
}

const SESSION_BUTTON = "sesión compartida"

const PANELS: Record<string, InfoPanel> = {
  account: {
    title: "Account",
    lines: ["Sample user", "ejemplo@canvasar.app", "To work as a team"],
    buttons: ["Sign in", "Account settings", "Sign out"],
  },
  collab: {
    title: "Collaboration",
    lines: ["In this space: just you"],
    // La sesión compartida va al final y destacada; su texto cambia según esté abierta o no.
    buttons: ["Invite someone", "Edit permissions", SESSION_BUTTON],
  },
  tutorials: {
    title: "Tutorials",
    lines: ["Learn step by step"],
    buttons: ["Create a canvas", "Draw and write", "The radial menu", "Move and group canvases", "Handwriting to text"],
  },
}

const PANEL_W = 26

// Opciones que despliega Guardar, a su derecha.
const SAVE_OPTIONS: ButtonDef[] = [
  {label: "Save all canvases", action: "save:all", icon: ICON.folder_copy},
  {label: "Save the selected canvas", action: "save:canvas", icon: ICON.save_as},
]
const PANEL_GAP = 1
const PANEL_BTN_H = 3.8
const PANEL_LINE_H = 3
const PANEL_TITLE_H = 4.2
const PANEL_TITLE_SIZE = 72
const PANEL_TEXT_SIZE = 54

const PLACEMENT: ButtonDef[] = [
  {label: "Horizontal", action: "orient:h", icon: ICON.crop_landscape},
  {label: "Vertical", action: "orient:v", icon: ICON.crop_portrait},
  {label: "Place in front", action: "quick", icon: ICON.center_focus_strong},
  {label: "Cancel", action: "cancel", icon: ICON.close},
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
  private sections: {key: string; header: SceneObject; items: SceneObject; count: number}[] = []
  private expanded = "tools"
  private progress = 0
  // Transición entre secciones: de dónde a dónde va cada pieza y cuánto ha avanzado (1 = terminada).
  private slide: {so: SceneObject; x: number; from: number; to: number}[] = []
  private slideFrom = 0
  private slideTo = 0
  private slideProgress = 1
  private appearing: SceneObject | null = null
  private buttons = new Map<string, CapsuleButton>()
  private placementColumn: SceneObject | null = null
  private mainColumn: SceneObject | null = null
  private panel: SceneObject | null = null
  private panelPlate: MeshSlot | null = null
  private panelBody: SceneObject | null = null
  private openPanel: string | null = null
  // Sesión compartida de ejemplo (para el vídeo): solo cambia el botón y avisa.
  private sharedSession = false
  private panelSize = new vec2(PANEL_W, 10)
  private panelTop = MENU_TOP
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
    if (!open) this.togglePanel(null)
  }

  private makeToggle(): void {
    const btn = makePill(
      this.sceneObject,
      "Menu",
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
    this.animateSections()
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

    this.mainColumn = this.makeColumn(content, MAIN)
    this.placementColumn = this.makeColumn(content, PLACEMENT)
    this.buildPanel()

    this.ready = true
    this.setPhase(this.pendingPhase)
    this.activeActions.forEach((a) => this.paint(a))
    this.setOpen(false)
  }

  /** Una cabecera que despliega la sección y, debajo, la columna con sus botones. */
  private addSection(parent: SceneObject, key: string, label: string, defs: ButtonDef[]): void {
    const action = "section:" + key
    const header = makePill(parent, label, HEADER_W, HEADER_H, BUTTON_SIZE, () => this.activeActions.has(action), () => this.openSection(key))
    this.buttons.set(action, header)
    const items = this.makeColumn(parent, defs)
    this.sections.push({key, header: header.getSceneObject(), items, count: defs.length})
  }

  private openSection(key: string): void {
    this.expanded = key
    for (const sec of this.sections) this.setActive("section:" + sec.key, sec.key === key)
    if (this.ready) this.layoutColumns()
  }

  private buildPanel(): void {
    const panel = global.scene.createSceneObject("InfoPanel")
    panel.setParent(this.sceneObject)
    this.panel = panel
    // Casi opaco, como la línea de estado: el texto del panel se lee aunque detrás haya un canvas.
    this.panelPlate = new MeshSlot(panel, "PanelGlass", withAlpha(COLOR.surface, PLATE_ALPHA), false)
    panel.enabled = false
  }

  /** Abre el panel de ejemplo de esa opción, o lo cierra si ya estaba abierto (null cierra cualquiera). */
  private togglePanel(key: string | null): void {
    const next = key !== null && key !== this.openPanel ? key : null
    if (this.openPanel) this.setActive("info:" + this.openPanel, false)
    this.openPanel = next
    if (!this.panel) return
    if (this.panelBody) {
      retire(this.panelBody)
      this.panelBody = null
    }
    if (!next) {
      this.panel.enabled = false
      return
    }
    this.setActive("info:" + next, true)
    const body = global.scene.createSceneObject("Body")
    body.setParent(this.panel)
    body.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    this.panelBody = body
    if (next === "save") {
      this.buildSaveOptions(body)
      return
    }
    const def = PANELS[next]
    const inner = PANEL_W - PAD * 2
    let y = -PAD
    const text = (value: string, size: number, h: number, color: vec4): void => {
      const so = global.scene.createSceneObject("Line")
      so.setParent(body)
      so.getTransform().setLocalPosition(new vec3(PAD, y - h / 2, LABEL_Z))
      const t = so.createComponent("Component.Text") as Text
      t.font = THEME_FONT
      t.size = size
      t.depthTest = true
      t.textFill.color = color
      t.horizontalAlignment = HorizontalAlignment.Left
      t.verticalAlignment = VerticalAlignment.Center
      t.horizontalOverflow = HorizontalOverflow.Shrink
      t.layoutRect = Rect.create(0, inner, -h / 2, h / 2)
      t.text = value
      y -= h
    }
    text(def.title, PANEL_TITLE_SIZE, PANEL_TITLE_H, COLOR.text)
    for (const line of def.lines) text(line, PANEL_TEXT_SIZE, PANEL_LINE_H, COLOR.textMuted)
    // Con el hueco entre botones ya grande, basta uno para separar el texto de los botones.
    y -= GAP
    for (const item of def.buttons) {
      const isSession = item === SESSION_BUTTON
      const label = isSession ? (this.sharedSession ? "End shared session" : "Start shared session") : item
      // La sesión compartida lleva siempre el borde azul y grueso del estado activo: es la acción principal.
      const btn = makePill(body, label, inner, PANEL_BTN_H, BUTTON_SIZE, () => isSession, () => {
        if (isSession) {
          this.sharedSession = !this.sharedSession
          this.setStatus(this.sharedSession ? "Shared session started: others can join now" : "Shared session ended")
          // Se vuelve a montar el panel para que el botón muestre su texto nuevo.
          this.openPanel = null
          this.togglePanel("collab")
          return
        }
        // Invitar trae a un colaborador de ejemplo; los demás botones aún no hacen nada.
        if (label === "Invite someone") {
          this._onAction.invoke("invite")
          this.togglePanel(null)
          return
        }
        this.setStatus("\"" + label + "\" is a sample: not available yet")
      })
      // Iniciar en azul; Cerrar, en rojo, para distinguirlos de un vistazo.
      if (isSession && this.sharedSession) btn.onInitialized.add(() => paintPill(btn, true, TONE.danger))
      btn.getSceneObject().getTransform().setLocalPosition(new vec3(PAD + inner / 2, y - PANEL_BTN_H / 2, 0))
      y -= PANEL_BTN_H + GAP
    }
    this.panelSize = new vec2(PANEL_W, -y + PAD - GAP)
    this.drawPanelPlate()
    this.showPanelAt(MENU_TOP)
  }

  /** Las dos formas de guardar, en fila y a la altura del botón Guardar. */
  private buildSaveOptions(body: SceneObject): void {
    SAVE_OPTIONS.forEach((def, i) => {
      const btn = makePill(body, def.label, ROUND, ROUND, BUTTON_SIZE, () => false, () => {
        this._onAction.invoke(def.action)
        this.togglePanel(null)
      }, def.icon)
      btn.getSceneObject().getTransform().setLocalPosition(new vec3(PAD + ROUND / 2 + i * (ROUND + GAP), -PAD - ROUND / 2, 0))
    })
    this.panelSize = new vec2(PAD * 2 + SAVE_OPTIONS.length * ROUND + (SAVE_OPTIONS.length - 1) * GAP, PAD * 2 + ROUND)
    this.drawPanelPlate()
    const index = MAIN.findIndex((d) => d.action === "info:save")
    const center = MENU_TOP - PAD - index * (ROUND + GAP) - ROUND / 2
    this.showPanelAt(center + this.panelSize.y / 2)
  }

  private drawPanelPlate(): void {
    const size = this.panelSize
    const pts = roundedRect(size.x, size.y, PLATE_RADIUS).map((p) => p.add(new vec2(size.x / 2, -size.y / 2)))
    if (this.panelPlate) {
      appendFill(this.panelPlate.begin(), pts, 0.2)
      this.panelPlate.commit()
    }
  }

  /** A la derecha del menú, con su borde superior a esta altura. */
  private showPanelAt(top: number): void {
    if (!this.panel) return
    this.panelTop = top
    this.panel.getTransform().setLocalPosition(new vec3(MENU_LEFT + this.plateSize.x + PANEL_GAP, top, 0))
    this.panel.enabled = true
  }

  private buttonWidth(def: ButtonDef): number {
    return def.icon ? ICON_W : def.w ?? ICON_W
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
    // Con la letra más grande, un mensaje largo se encoge un poco en vez de salirse de su placa.
    t.horizontalOverflow = HorizontalOverflow.Shrink
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

  private makeColumn(parent: SceneObject, defs: ButtonDef[]): SceneObject {
    const col = global.scene.createSceneObject("Column")
    col.setParent(parent)
    const flex = col.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = COLUMN_W
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
          const [verb, arg] = def.action.split(":")
          if (verb === "info") {
            this.togglePanel(arg)
            return
          }
          this._onAction.invoke(def.action)
          if (!KEEP_OPEN.has(verb)) this.setOpen(false)
        },
        def.icon
      )
      this.buttons.set(def.action, btn)
    }
    return col
  }

  private animateSections(): void {
    if (this.slideProgress >= 1) return
    this.slideProgress = Math.min(1, this.slideProgress + getDeltaTime() / SECTION_TIME)
    this.applySlide()
  }

  private applySlide(): void {
    const k = this.slideProgress
    const e = 1 - Math.pow(1 - k, 3)
    for (const s of this.slide) s.so.getTransform().setLocalPosition(new vec3(s.x, s.from + (s.to - s.from) * e, 0))
    // Solo el alto cambia: el ancho de la barra es siempre el mismo.
    this.setPlateSize(new vec2(COLUMN_W + PAD * 2, this.slideFrom + (this.slideTo - this.slideFrom) * e))
    const col = this.appearing
    if (!col) return
    const n = col.getChildrenCount()
    const span = 1 - SECTION_STAGGER * Math.max(0, n - 1)
    for (let i = 0; i < n; i++) {
      const ki = Math.min(1, Math.max(0, (k - SECTION_STAGGER * i) / span))
      const c1 = 1.4
      const pop = Math.max(0.01, 1 + (c1 + 1) * Math.pow(ki - 1, 3) + c1 * Math.pow(ki - 1, 2))
      col.getChild(i).getTransform().setLocalScale(new vec3(pop, pop, 1))
    }
  }

  /** Apila de arriba abajo las cabeceras y, bajo la abierta, sus botones; el vidrio se ajusta al total. */
  private layoutColumns(): void {
    const working = this.pendingPhase === "work"
    const x = PAD + COLUMN_W / 2
    let y = -PAD
    const before = new Map(this.slide.map((s) => [s.so, s.so.getTransform().getLocalPosition().y]))
    const wasEnabled = new Map(this.sections.map((sec) => [sec.items, sec.items.enabled]))
    this.slide = []
    const place = (so: SceneObject, h: number): void => {
      const to = y - h / 2
      this.slide.push({so, x, from: before.get(so) ?? to, to})
      y -= h + GAP
    }
    if (working) {
      for (const sec of this.sections) {
        sec.header.enabled = true
        place(sec.header, HEADER_H)
        const open = sec.key === this.expanded
        sec.items.enabled = open
        if (open) place(sec.items, this.columnHeight(sec.count))
      }
    } else {
      for (const sec of this.sections) {
        sec.header.enabled = false
        sec.items.enabled = false
      }
    }
    if (this.mainColumn) {
      this.mainColumn.enabled = working
      if (working) place(this.mainColumn, this.columnHeight(MAIN.length))
    }
    if (this.placementColumn) {
      this.placementColumn.enabled = !working
      if (!working) place(this.placementColumn, this.columnHeight(PLACEMENT.length))
    }
    // Solo se anima un cambio de sección con el menú ya abierto; si no, todo va directo a su sitio.
    const animated = this.opened && this.progress >= 1
    this.slideFrom = this.plateSize.y
    this.slideTo = -y - GAP + PAD
    this.appearing = null
    if (animated) {
      for (const sec of this.sections) if (sec.items.enabled && !wasEnabled.get(sec.items)) this.appearing = sec.items
      // Los botones nuevos salen de debajo de su cabecera.
      const fresh = this.slide.find((s) => s.so === this.appearing)
      if (fresh) fresh.from = fresh.to + this.columnHeight(1)
    }
    this.slideProgress = animated ? 0 : 1
    if (!animated) {
      for (const s of this.slide) s.from = s.to
      this.slideFrom = this.slideTo
      this.sections.forEach((sec) => {
        for (let i = 0; i < sec.items.getChildrenCount(); i++) sec.items.getChild(i).getTransform().setLocalScale(vec3.one())
      })
    }
    this.applySlide()
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

  /** Quién más está en el espacio, para el panel de Colaboración. */
  setPeople(names: string[]): void {
    PANELS.collab.lines[0] = names.length === 0 ? "In this space: just you" : "In this space: you and " + names.join(", ")
  }

  /** Las pestañas de antes son ahora secciones: se despliega la suya. */
  showTab(name: string): void {
    this.openSection(name)
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
      (tone === "warning" ? "Warning: " : tone === "error" ? "Error: " : "") + msg,
      tone === "warning" ? COLOR.warning : tone === "error" ? COLOR.error : COLOR.textMuted
    )
  }

  setPhase(phase: "place" | "work"): void {
    this.pendingPhase = phase
    if (!this.ready) return
    this.menu?.getTransform().setLocalPosition(new vec3(MENU_LEFT, MENU_TOP, 0))
    this.setOpen(false)
    this.openSection(this.expanded)
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
    if (x > MENU_LEFT && x < MENU_LEFT + size.x && y < MENU_TOP && y > MENU_TOP - size.y) return true
    if (!this.openPanel) return false
    const left = MENU_LEFT + size.x + PANEL_GAP
    return x > left && x < left + this.panelSize.x && y < this.panelTop && y > this.panelTop - this.panelSize.y
  }
}
