// Controlador de Canvas AR: colocación, herramientas e interacción con pellizco o ratón.
import {CapsuleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/CapsuleButton"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Interactor, InteractorInputType} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import SIK from "SpectaclesInteractionKit.lspkg/SIK"
import {CanvasDockUI} from "./CanvasDockUI"
import {CanvasEdgeBarUI, EdgeAction, EdgeTool, RING_RADIUS} from "./CanvasEdgeBarUI"
import {CanvasDocument, CanvasElement, ElementKind, LAYER_COUNT, ShapeKind} from "./CanvasDocument"
import {ICON} from "./CanvasIcons"
import {CanvasInstance, Orientation} from "./CanvasInstance"
import {appendArrow, CanvasLinks} from "./CanvasLinks"
import {appendFill, appendStroke, CanvasShape, resamplePolyline, roundedRect, segmentDistance} from "./CanvasGeometry"
import {BorderGrab, Bounds, CanvasRenderer, elementZ, flushRetired, HitTarget, layerZ, MeshSlot, retire, tintOf} from "./CanvasRenderer"
import {applyTemplate, TemplateName} from "./CanvasTemplates"
import {HandwritingAssist, StrokeBounds} from "./CanvasHandwriting"
import {CanvasMannequin} from "./CanvasMannequin"
import {CanvasLibrary, LibraryKind} from "./CanvasLibraryUI"
import {addPillEdge, makePill, paintPill, setPillIcon} from "./CanvasPill"
import {COLOR, NOTE_COLOR, PALETTE, STROKE_WIDTHS, withAlpha} from "./CanvasTheme"

const THEME_FONT = requireAsset("../Fonts/Inter.ttf") as Font

type Tool = "select" | "connect" | "draw" | "erase" | "underline"

const MIN_W = 12
const MIN_H = 8
const MAX_SIDE = 260
// Franja a cada lado del borde de un canvas desde la que se cambia su tamaño, en unidades del canvas.
const BORDER_GRAB = 2
const TAP_SLOP = 1.0
const DOUBLE_TAP = 0.45
const STROKE_STEP = 0.5
const MENU_TILT = 40
const ERASER_RADIUS = 1.5
const ERASE_STEP = 0.4
const FLIP_TIME = 0.4
const SURFACE_OFFSET = 0.4
const MIN_CORNER_DISTANCE = 5
const DRAG_PLACE_DISTANCE = 8
// Dos canvas se consideran juntos con menos de esta separación, en unidades del canvas.
const ADJACENT_GAP = 6
const SNAP_GAP = 0.4
// El botón de agrupar aparece entre dos canvas con menos de este hueco, en unidades del canvas.
const LINK_BUTTON_GAP = 15
const LINK_BUTTON_SIZE = 4.6
const LINK_BUTTON_Z = 2
const UNDO_SIZE = 4.2
// Separación entre un canvas y su copia, en unidades del canvas.
const DUPLICATE_GAP = 8
// Colaboradora de ejemplo (para el vídeo): dónde aparece, su canvas y el ritmo al que construye la plantilla.
const COLLAB_NAME = "Ana"
const COLLAB_COLOR = new vec4(1, 0.62, 0.04, 1)
const COLLAB_TEMPLATE: TemplateName = "flow"
const COLLAB_ANGLE = 28
const COLLAB_DISTANCE = 230
const COLLAB_LIFT = -12
const COLLAB_EYE_HEIGHT = 160
const COLLAB_CANVAS_W = 80
const COLLAB_CANVAS_H = 52
const COLLAB_SIDE_GAP = 12
const COLLAB_FRONT = 40
const COLLAB_FIRST_DELAY = 1.2
const COLLAB_STEP = 0.9
// Escala de su canvas: más pequeño que uno propio a esa distancia, para que quepan él y Ana en la vista.
const COLLAB_SCALE = 1.1
// Etiqueta con el nombre de quien creó un canvas ajeno, en unidades del canvas.
const OWNER_TAG_H = 4.4
const OWNER_TAG_INSET = 2
const OWNER_TAG_OVERLAP = 0.2
const OWNER_TAG_TEXT = 95
const OWNER_TAG_CHAR_W = 1.8

/** Pestaña: base recta (la que se une al borde) y esquinas de arriba redondeadas. */
function tabOutline(w: number, h: number, r: number): vec2[] {
  const pts: vec2[] = [new vec2(0, 0), new vec2(w, 0)]
  const corner = (cx: number, cy: number, from: number): void => {
    for (let i = 0; i <= 6; i++) {
      const a = from + (i / 6) * (Math.PI / 2)
      pts.push(new vec2(cx + Math.cos(a) * r, cy + Math.sin(a) * r))
    }
  }
  corner(w - r, h - r, 0)
  corner(r, h - r, Math.PI / 2)
  return pts
}
// Pasos de Deshacer que recuerda cada canvas.
const UNDO_LIMIT = 40
const SAME_PLANE_LIMIT = 25
const SAME_PLANE_DOT = 0.9
const BORDER_IDLE = withAlpha(COLOR.outline, 0.6)
// Tiempo máximo de espera de la detección de superficie antes de usar el plano virtual.
const CORNER_QUERY_TIMEOUT = 0.5
// Distancia a la que el contenido se ve a escala 1. Más lejos, todo crece para seguir siendo legible.
const REFERENCE_DISTANCE = 135
// Una superficie más lejana no recibe el canvas: se crea en el aire, a la longitud de un brazo.
const FAR_SURFACE_DISTANCE = 150
const FLOATING_DISTANCE = 50
// A 50 cm, un canvas flotante usa este mínimo: se ve del mismo tamaño que antes a 75 cm con 0,6.
const MIN_SCALE = 0.4
// Los botones de un canvas (+, Deshacer, color) solo se ven en el seleccionado y a esta distancia o menos (cm).
const BUTTONS_MAX_DISTANCE = 100
// Esa distancia se mide hasta el cuerpo del usuario: una barra vertical desde los ojos hasta esta altura por debajo.
const BODY_HEIGHT = 150
const BODY_SAMPLES = 7
const MAX_SCALE = 3
// Al soltar un canvas agarrado, se pega a la superficie apuntada hasta esta distancia (el rayo de SIK llega a 500).
const DROP_MAX_DISTANCE = 450
// Al arrastrar, el canvas pasa a la superficie que se apunta si es de otra orientación.
const STICK_DELAY = 0.15
// Entre dos paredes se exige más: el canto de un marco no debe torcer el canvas al pasar por encima.
const STICK_DELAY_SAME_KIND = 0.5
const STICK_TIME = 0.3
const SAME_SURFACE_DOT = 0.82
const CANDIDATE_DOT = 0.9
const HORIZONTAL_MIN_Y = 0.8
const VERTICAL_MAX_Y = 0.4
const MAX_DRAG_DISTANCE = 600
// Mantener pulsado el interior sin mover la mano encoge el canvas a una miniatura que se lleva en los dedos.
const HOLD_TIME = 0.5
const HOLD_STILL_DOT = 0.9999 // unos 0,8 grados: por debajo, es un toque y el canvas no se mueve
// Agarrado, el canvas se encoge a una miniatura de sí mismo de este tamaño (cm, su lado mayor).
const MINI_SIZE = 7
const BALL_TIME = 0.18
const BALL_SURFACE_GAP = 2
const DELETE_CONFIRM_TIME = 3
const MAX_TEXT = 80
const NOTICE_TIME = 2.5
// Medidas aproximadas del texto a su tamaño normal, para que la caja crezca antes de que se encoja.
const CHARS_PER_CM = 1.1
const TEXT_LINE_H = 2.6
// Texto convertido desde escritura a mano: alto de su letra respecto al de la línea dibujada, y tope de tamaño.
const HANDWRITING_TEXT_RATIO = 0.5
const MAX_TEXT_SCALE = 3
const TEXT_BOX_PADDING = 2

const DEFAULT_SIZE: Record<string, [number, number]> = {
  note: [13, 9],
  text: [16, 5],
  screen: [30, 22],
  process: [14, 7],
  rect: [13, 8],
  decision: [17, 11],
  terminator: [13, 6],
  data: [15, 7],
  circle: [10, 10],
  triangle: [11, 10],
  and: [11, 8],
  or: [11, 8],
  not: [10, 7],
  xor: [11, 8],
  hexagon: [12, 10],
  pentagon: [11, 10],
  octagon: [10, 10],
  arrow: [14, 7],
  speech: [14, 9],
  cross: [9, 9],
  star: [10, 10],
  heart: [10, 9],
}

// Textos de ejemplo que se sustituyen al empezar a escribir.
const PLACEHOLDERS = ["Nueva nota", "Texto", "Pantalla", "Proceso", "¿Decisión?", "Inicio", "Datos", "Post-it"]

const SHAPE_TEXT: Partial<Record<ShapeKind, string>> = {
  process: "Proceso",
  decision: "¿Decisión?",
  terminator: "Inicio",
  data: "Datos",
  and: "AND",
  or: "OR",
  not: "NOT",
  xor: "XOR",
}

interface Press {
  interactor: Interactor
  mode: "move" | "connect" | "draw" | "erase" | "connection" | "placeDrag" | "moveCanvas" | "resizeCanvas"
  id: string | null
  planeZ: number
  start: vec2
  last: vec2
  dragged: boolean
  drag?: CanvasDrag
  resize?: {grab: BorderGrab; from: Bounds}
  eraseRay?: {origin: vec3; dir: vec3}
}

interface SurfaceFrame {
  orientation: Orientation
  normal: vec3
  up: vec3
}

/** Un canvas o su grupo se arrastra como un bloque rígido, sujeto por el punto que se agarró. */
interface CanvasDrag {
  grab: vec3
  planePoint: vec3
  planeNormal: vec3
  rotation: quat
  scale: number
  target: vec3
  members: {canvas: CanvasInstance; localPos: vec3; relRotation: quat; ratio: number}[]
  transition: {fromRotation: quat; toRotation: quat; fromScale: number; toScale: number; start: number} | null
  candidate: {normal: vec3; since: number} | null
  startTime: number
  startDir: vec3
  /** Ya se movió: mantener pulsado dejó de ser un agarre. */
  moved: boolean
  ball: {start: number; fullScale: number; miniScale: number; from: vec3; fromRotation: quat; distance: number; origin: vec3; dir: vec3; travelled: boolean} | null
  surface: SurfaceHit | null
}

/** El botón que une o separa una pareja de canvas cercanos. */
interface LinkButton {
  a: CanvasInstance
  b: CanvasInstance
  root: SceneObject
  button: CapsuleButton
  grouped: boolean
}

interface Placing {
  isNew: boolean
  previous: CanvasInstance | null
  saved?: {position: vec3; rotation: quat; scale: number; bounds: Bounds}
}

type ResolvedTarget = {canvas: CanvasInstance; hit: HitTarget} | {link: string}

interface SurfaceHit {
  position: vec3
  normal: vec3
  time: number
}

@component
export class CanvasApp extends BaseScriptComponent {
  @input
  @hint("Panel de herramientas")
  dock: CanvasDockUI

  private canvases: CanvasInstance[] = []
  private active: CanvasInstance
  private links: CanvasLinks
  private handwriting: HandwritingAssist
  // Panel con todas las figuras o stickers, abierto desde el «…» del menú radial de un canvas.
  private library: {canvas: CanvasInstance; panel: CanvasLibrary} | null = null
  // Colaborador de ejemplo: un maniquí que construye una plantilla en su propio canvas.
  private collaborator: {
    mannequin: CanvasMannequin
    canvas: CanvasInstance
    steps: {kind: "el" | "conn"; data: CanvasElement | {from: string; to: string; label: string}}[]
    ids: Map<string, string>
    next: number
    nextAt: number
  } | null = null
  private linkRubber: MeshSlot
  private placing: Placing | null = null
  private nextCanvasId = 1
  private nextGroupId = 1
  private linkButtons = new Map<string, LinkButton>()
  private cursor: MeshSlot
  private cornerA: MeshSlot
  private eraserRing: MeshSlot
  private camera: Transform

  private phase: "place" | "work" = "place"
  private tool: Tool = "select"
  private multi = false
  private color = -1
  private widthIndex = 1

  private selection = new Set<string>()
  private selectedConn: string | null = null
  private editing: {type: "element" | "connection"; id: string; original: string; created: boolean; startH: number} | null = null
  private noticeUntil = 0
  private elementDeleteArmed: {key: string; until: number} | null = null
  private editFresh = false
  private press: Press | null = null
  private lastTap = {id: "", time: -10}
  private clearArmedUntil = -1
  private drawing: CanvasElement | null = null
  // Color libre elegido en la rueda; si es null, se dibuja con el de la paleta.
  private drawTint: vec4 | null = null

  // Colocación
  private corner: vec3 | null = null
  private planeNormal = new vec3(0, 0, 1)
  private planeUp = vec3.up()
  private surfaceHit: SurfaceHit | null = null
  private hitSession: HitTestSession | null = null
  private hitPending = false
  private cornerQuery: {origin: vec3; dir: vec3; time: number} | null = null

  // Animación del giro
  private flipFrom: quat | null = null
  private flipTo: quat | null = null
  private flipFromPos: vec3 | null = null
  private flipToPos: vec3 | null = null
  private flipStart = 0
  private flipCanvas: CanvasInstance | null = null

  private menuCanvas: CanvasInstance | null = null

  // Borrado
  private deleteArmed: {canvas: CanvasInstance; until: number} | null = null
  private pendingDelete: CanvasInstance | null = null

  // Las herramientas actúan siempre sobre el canvas activo.
  private get doc(): CanvasDocument {
    return this.active.doc
  }
  private get renderer(): CanvasRenderer {
    return this.active.renderer
  }
  private get canvasRoot(): SceneObject {
    return this.active.root
  }
  private get orientation(): Orientation {
    return this.active.orientation
  }
  private set orientation(o: Orientation) {
    this.active.orientation = o
  }
  private get canvasScale(): number {
    return this.active.scale
  }
  private set canvasScale(s: number) {
    this.active.scale = s
  }
  private get activeLayer(): number {
    return this.active.activeLayer
  }
  private set activeLayer(l: number) {
    this.active.activeLayer = l
  }
  private get spawnIndex(): number {
    return this.active.spawnIndex
  }
  private set spawnIndex(i: number) {
    this.active.spawnIndex = i
  }

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.start())
  }

  private createCanvas(orientation: Orientation): CanvasInstance {
    const canvas = new CanvasInstance(this.sceneObject, "Canvas_" + this.nextCanvasId++, orientation)
    canvas.doc.subscribe(() => {
      canvas.undoDirty = true
    })
    this.canvases.push(canvas)
    return canvas
  }

  /** Cambia el canvas sobre el que trabajan las herramientas. */
  private activate(canvas: CanvasInstance): void {
    if (canvas === this.active) return
    this.closeEdgeMenu()
    this.clearSelection()
    this.active = canvas
    this.refreshBorders()
  }

  /** El canvas seleccionado (el activo) brilla entero en cian; los demás quedan en gris tenue, o del color de su dueño. */
  private refreshBorders(candidate: CanvasInstance | null = null): void {
    for (const c of this.canvases) {
      const selected = c === this.active && c.placed
      const idle = c.owner ? withAlpha(c.owner.color, 0.9) : BORDER_IDLE
      c.renderer.setBorderColor(c === candidate || selected ? COLOR.primary : idle)
      c.renderer.setSelected(selected)
    }
  }

  private resolveTarget(i: Interactable | null): ResolvedTarget | null {
    if (!i) return null
    const link = this.links.targetId(i)
    if (link) return {link}
    for (const canvas of this.canvases) {
      const hit = canvas.renderer.target(i)
      if (hit) return {canvas, hit}
    }
    return null
  }

  private canvasUnderRay(origin: vec3, dir: vec3, exclude: CanvasInstance | null): CanvasInstance | null {
    let best: CanvasInstance | null = null
    let bestDistance = Infinity
    for (const c of this.canvases) {
      if (c === exclude || !c.placed) continue
      const p = c.rayPoint(origin, dir)
      if (!p || !c.contains(p)) continue
      const distance = c.toWorld(new vec3(p.x, p.y, 0)).distance(origin)
      if (distance < bestDistance) {
        bestDistance = distance
        best = c
      }
    }
    return best
  }

  private rayNearAnyCanvas(origin: vec3, dir: vec3): boolean {
    for (const c of this.canvases) {
      if (!c.placed) continue
      const p = c.rayPoint(origin, dir)
      if (p && (c.contains(p) || c.onEdgeBar(p) || c.renderer.borderAt(p, BORDER_GRAB))) return true
    }
    return false
  }

  /** El borde del canvas más cercano al que apunta el rayo; un canvas por delante lo tapa. */
  private borderUnderRay(origin: vec3, dir: vec3): {canvas: CanvasInstance; grab: BorderGrab} | null {
    let bestCanvas: CanvasInstance | null = null
    let bestGrab: BorderGrab | null = null
    let bestDistance = Infinity
    for (const c of this.canvases) {
      if (!c.placed) continue
      const p = c.rayPoint(origin, dir)
      if (!p) continue
      const grab = c.renderer.borderAt(p, BORDER_GRAB)
      if (!grab && !c.contains(p)) continue
      const distance = c.toWorld(new vec3(p.x, p.y, 0)).distance(origin)
      // Dos canvas en el mismo plano: gana el borde al que se apunta con más precisión.
      const tied = Math.abs(distance - bestDistance) < 0.01
      const closerBorder = !!grab && (!bestGrab || grab.distance < bestGrab.distance)
      if (tied ? closerBorder : distance < bestDistance) {
        bestCanvas = c
        bestGrab = grab
        bestDistance = distance
      }
    }
    // El borde del canvas de otra persona no se estira (y sigue tapando lo que tiene detrás).
    if (bestCanvas?.owner) return null
    return bestCanvas && bestGrab ? {canvas: bestCanvas, grab: bestGrab} : null
  }

  private start(): void {
    const camera = WorldCameraFinderProvider.getInstance().getComponent()
    this.camera = camera.getTransform()
    this.dock.attachToView(camera.getSceneObject())

    this.links = new CanvasLinks(this.sceneObject)
    this.handwriting = new HandwritingAssist(
      (canvas, ids, text, bounds) => this.convertHandwriting(canvas, ids, text, bounds),
      (message) => {
        this.noticeUntil = getTime() + NOTICE_TIME
        this.dock.setStatus(message, "error")
      },
      (message) => this.log(message)
    )
    this.linkRubber = new MeshSlot(this.sceneObject, "LinkRubber", COLOR.primary)
    this.linkRubber.setVisible(false)
    this.active = this.createCanvas("vertical")
    this.placing = {isNew: true, previous: null}

    const markers = global.scene.createSceneObject("Markers")
    markers.setParent(this.sceneObject)
    this.cursor = this.makeDot(markers, "Cursor", 0.9, COLOR.primary)
    this.cornerA = this.makeDot(markers, "CornerA", 1.1, COLOR.text)
    this.cornerA.setVisible(false)
    this.eraserRing = new MeshSlot(markers, "EraserRing", COLOR.text, false)
    const ring: vec2[] = []
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2
      ring.push(new vec2(Math.cos(a) * ERASER_RADIUS, Math.sin(a) * ERASER_RADIUS))
    }
    appendStroke(this.eraserRing.begin(), ring, true, 0.12, 0)
    this.eraserRing.commit()
    this.eraserRing.setVisible(false)

    this.initSurfaceDetection()
    this.dock.onAction.add((a) => this.onAction(a))
    this.dock.setActive("width:" + this.widthIndex, true)
    this.createEvent("UpdateEvent").bind(() => this.update())
    this.createEvent("KeyPressEvent").bind((e) => this.onKey(e as KeyPressEvent))

    const interactors = SIK.InteractionManager.getInteractorsByType(InteractorInputType.All)
    for (const it of interactors) {
      it.onTriggerStart.add((target) => this.onTriggerStart(it, target))
      it.onTriggerEnd.add(() => this.onTriggerEnd(it))
      it.onTriggerCanceled.add(() => this.onTriggerEnd(it))
    }
    this.enterPlacement()
  }

  private makeDot(parent: SceneObject, name: string, r: number, color: vec4): MeshSlot {
    const slot = new MeshSlot(parent, name, color, false)
    const pts: vec2[] = []
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      pts.push(new vec2(Math.cos(a) * r, Math.sin(a) * r))
    }
    appendFill(slot.begin(), pts, 0)
    slot.commit()
    return slot
  }

  private initSurfaceDetection(): void {
    try {
      const module = require("LensStudio:WorldQueryModule") as WorldQueryModule
      const options = HitTestSessionOptions.create()
      // Sin suavizado: cada consulta debe responder por el punto exacto, no por una media reciente.
      options.filter = false
      this.hitSession = module.createHitTestSessionWithOptions(options)
      this.hitSession.start()
    } catch (e) {
      print("[CanvasAR] Sin detección de superficies: " + e)
      this.hitSession = null
    }
  }

  // ── Geometría de la vista ────────────────────────────────────────────────

  private flatForward(): vec3 {
    const f = this.camera.back // la cámara mira hacia su -Z local
    const flat = new vec3(f.x, 0, f.z)
    return flat.length < 0.01 ? new vec3(0, 0, -1) : flat.normalize()
  }

  /** Punto a cierta distancia en la dirección de la mirada, desplazado en vertical respecto a ella. */
  private viewPoint(distance: number, lift: number): vec3 {
    return this.camera
      .getWorldPosition()
      .add(this.camera.back.uniformScale(distance))
      .add(this.camera.up.uniformScale(lift))
  }

  private basisFor(o: Orientation): {normal: vec3; up: vec3} {
    const forward = this.flatForward()
    return o === "horizontal"
      ? {normal: vec3.up(), up: forward}
      : {normal: forward.uniformScale(-1), up: vec3.up()}
  }

  private activeRay(preferred?: Interactor): {interactor: Interactor; origin: vec3; dir: vec3} | null {
    const candidates = preferred ? [preferred] : SIK.InteractionManager.getTargetingInteractors()
    for (const it of candidates) {
      const origin = it.startPoint
      const dir = it.direction
      if (origin && dir) return {interactor: it, origin, dir}
    }
    return null
  }

  private intersectPlane(origin: vec3, dir: vec3, point: vec3, normal: vec3): vec3 | null {
    const denom = dir.dot(normal)
    if (Math.abs(denom) < 1e-4) return null
    const t = point.sub(origin).dot(normal) / denom
    return t > 0 ? origin.add(dir.uniformScale(t)) : null
  }

  /** Punto sobre el plano z local del canvas al que apunta el rayo. */
  private canvasPoint(interactor: Interactor, planeZ: number): vec2 | null {
    const ray = this.activeRay(interactor)
    if (!ray) return null
    return this.active.rayPoint(ray.origin, ray.dir, planeZ)
  }

  // ── Colocación del canvas ────────────────────────────────────────────────

  private enterPlacement(): void {
    this.phase = "place"
    this.corner = null
    this.cornerQuery = null
    this.surfaceHit = null
    this.cornerA.setVisible(false)
    this.eraserRing.setVisible(false)
    this.cursor.setVisible(true)
    this.renderer.setContentVisible(false)
    this.canvasRoot.enabled = false
    if (this.active.bar) this.active.bar.sceneObject.enabled = false
    if (this.active.undoButton) this.active.undoButton.enabled = false
    this.press = null
    this.clearSelection()
    this.dock.setPhase("place")
    this.syncPlacementButtons()
    this.dock.setStatus("Pellizca una esquina del canvas sobre una mesa o una pared")
  }

  /** Pulsar fuera de los canvas empieza otro; los que ya existen no se tocan. */
  private beginNewCanvas(): void {
    const previous = this.active
    this.clearSelection()
    this.active = this.createCanvas(previous.orientation)
    this.placing = {isNew: true, previous}
    this.refreshBorders()
    this.enterPlacement()
  }

  private beginReplace(): void {
    if (this.active.groupId) {
      this.dock.setStatus("Separa el grupo antes de volver a colocar este canvas")
      return
    }
    const t = this.active.transform
    this.placing = {
      isNew: false,
      previous: null,
      saved: {
        position: t.getWorldPosition(),
        rotation: t.getWorldRotation(),
        scale: this.active.scale,
        bounds: this.renderer.getBounds(),
      },
    }
    this.enterPlacement()
  }

  /** Deshace la primera esquina: vuelve a lo que había o, si es el primer canvas, espera otra esquina. */
  private cancelCorner(): void {
    const placing = this.placing
    if (placing && !(placing.isNew && !placing.previous)) {
      this.cancelPlacement()
      this.dock.setStatus("Canvas cancelado")
      return
    }
    this.corner = null
    this.cornerQuery = null
    this.press = null
    this.cornerA.setVisible(false)
    this.canvasRoot.enabled = false
    this.dock.setStatus("Canvas cancelado. Pellizca una esquina para empezar otro")
    this.log("canvas cancelado")
  }

  private cancelPlacement(): void {
    const placing = this.placing
    if (!placing) return
    if (placing.isNew && !placing.previous) {
      this.dock.setStatus("Coloca tu primer canvas para empezar")
      return
    }
    this.corner = null
    this.cornerQuery = null
    this.press = null
    this.cornerA.setVisible(false)
    this.cursor.setVisible(false)
    if (placing.isNew && placing.previous) {
      const discarded = this.active
      this.canvases = this.canvases.filter((c) => c !== discarded)
      this.handwriting.forget(discarded)
      this.active = placing.previous
      discarded.destroy()
    } else if (placing.saved) {
      const s = placing.saved
      this.setCanvasScale(s.scale)
      this.active.transform.setWorldPosition(s.position)
      this.active.transform.setWorldRotation(s.rotation)
      this.renderer.setBounds(s.bounds)
      this.canvasRoot.enabled = true
      this.renderer.setContentVisible(true)
      if (this.active.bar) this.active.bar.sceneObject.enabled = true
      if (this.active.undoButton) this.active.undoButton.enabled = true
    }
    this.placing = null
    this.phase = "work"
    this.refreshBorders()
    this.dock.setPhase("work")
    this.dock.setStatus(this.toolHint())
    this.log("colocacion cancelada")
  }

  private syncPlacementButtons(): void {
    this.dock.setActive("orient:h", this.orientation === "horizontal")
    this.dock.setActive("orient:v", this.orientation === "vertical")
  }

  /** Superficie real si la hay; si no, un plano virtual según la orientación elegida. */
  private placementPoint(origin: vec3, dir: vec3): {point: vec3 | null; fromSurface: boolean; normal: vec3} {
    const hit = this.surfaceHit
    if (hit && getTime() - hit.time < 0.5) {
      if (!this.isFarSurface(hit.position)) return {point: hit.position, fromSurface: true, normal: hit.normal}
      return {...this.virtualPoint(origin, dir, "vertical"), fromSurface: false}
    }
    return {...this.virtualPoint(origin, dir, this.orientation), fromSurface: false}
  }

  private isFarSurface(point: vec3): boolean {
    return point.distance(this.camera.getWorldPosition()) > FAR_SURFACE_DISTANCE
  }

  private virtualPoint(origin: vec3, dir: vec3, orientation: Orientation): {point: vec3 | null; normal: vec3} {
    const camPos = this.camera.getWorldPosition()
    const normal = this.basisFor(orientation).normal
    const anchor =
      orientation === "horizontal"
        ? camPos.add(new vec3(0, -30, 0))
        : camPos.add(this.flatForward().uniformScale(FLOATING_DISTANCE))
    return {point: this.intersectPlane(origin, dir, anchor, normal), normal}
  }

  /** Pregunta por el punto exacto del clic: lo detectado antes puede ser de otro sitio. */
  private queryFirstCorner(origin: vec3, dir: vec3): void {
    if (!this.hitSession) {
      this.lockFirstCornerVirtual(origin, dir)
      return
    }
    const query = {origin, dir, time: getTime()}
    this.cornerQuery = query
    this.hitSession.hitTest(origin, origin.add(dir.uniformScale(800)), (result) => {
      if (this.cornerQuery !== query || this.corner) return
      this.cornerQuery = null
      if (result && !this.isFarSurface(result.position)) {
        this.lockCorner(result.position, result.normal, true)
        return
      }
      if (result) {
        // Lo que flota delante del usuario queda siempre de frente, aunque se apuntara a un suelo lejano.
        this.orientation = "vertical"
        this.syncPlacementButtons()
        this.log("superficie lejana: canvas delante del usuario")
      }
      this.lockFirstCornerVirtual(origin, dir)
    })
  }

  private lockFirstCornerVirtual(origin: vec3, dir: vec3): void {
    const {point, normal} = this.virtualPoint(origin, dir, this.orientation)
    if (point) this.lockCorner(point, normal, false)
  }

  private updatePlacement(): void {
    const pending = this.cornerQuery
    if (pending && getTime() - pending.time > CORNER_QUERY_TIMEOUT) {
      this.cornerQuery = null
      this.lockFirstCornerVirtual(pending.origin, pending.dir)
    }
    const ray = this.activeRay()
    if (!ray) {
      this.cursor.setVisible(false)
      return
    }
    if (this.hitSession && !this.hitPending) {
      this.hitPending = true
      this.hitSession.hitTest(ray.origin, ray.origin.add(ray.dir.uniformScale(400)), (result) => {
        this.hitPending = false
        if (result) {
          if (!this.surfaceHit) this.log("superficie real detectada")
          this.surfaceHit = {position: result.position, normal: result.normal, time: getTime()}
        }
      })
    }

    if (!this.corner) {
      const p = this.placementPoint(ray.origin, ray.dir)
      if (p.point) {
        this.cursor.setVisible(true)
        const t = this.cursor.sceneObject.getTransform()
        t.setWorldPosition(p.point.add(p.normal.uniformScale(0.3)))
        t.setWorldRotation(quat.lookAt(p.normal, Math.abs(p.normal.y) > 0.9 ? this.flatForward() : vec3.up()))
      }
      return
    }

    const q = this.intersectPlane(ray.origin, ray.dir, this.corner, this.planeNormal)
    if (q) {
      this.cursor.sceneObject.getTransform().setWorldPosition(q.add(this.planeNormal.uniformScale(0.3)))
      this.applyRect(this.corner, q)
    }
  }

  private lockCorner(point: vec3, normal: vec3, fromSurface: boolean): void {
    if (fromSurface) {
      this.orientation = Math.abs(normal.y) > 0.7 ? "horizontal" : "vertical"
      this.syncPlacementButtons()
    }
    if (this.orientation === "horizontal") {
      this.planeNormal = vec3.up()
      this.planeUp = this.flatForward()
    } else {
      this.planeNormal = this.wallNormal(point, normal)
      this.planeUp = vec3.up()
    }
    this.corner = point
    const distance = point.distance(this.camera.getWorldPosition())
    this.setCanvasScale(distance / REFERENCE_DISTANCE)
    const t = this.cornerA.sceneObject.getTransform()
    t.setWorldPosition(point.add(this.planeNormal.uniformScale(0.25)))
    t.setWorldRotation(quat.lookAt(this.planeNormal, this.planeUp))
    this.cornerA.setVisible(true)
    this.canvasRoot.enabled = true
    this.dock.setStatus("Ahora pellizca la esquina opuesta")
  }

  /** El canvas siempre mira al usuario, venga como venga la normal de la superficie. */
  private wallNormal(point: vec3, normal: vec3): vec3 {
    const flat = new vec3(normal.x, 0, normal.z)
    const facing = flat.length > 0.1 ? flat.normalize() : this.flatForward().uniformScale(-1)
    const toCamera = this.camera.getWorldPosition().sub(point)
    return facing.dot(toCamera) >= 0 ? facing : facing.uniformScale(-1)
  }

  private scaleForDistance(distance: number): number {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, distance / REFERENCE_DISTANCE))
  }

  private setCanvasScale(s: number): void {
    this.canvasScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s))
    const k = this.canvasScale
    this.canvasRoot.getTransform().setWorldScale(new vec3(k, k, k))
  }

  private applyRect(a: vec3, b: vec3): {w: number; h: number} {
    const up = this.planeUp
    const right = up.cross(this.planeNormal).normalize()
    const diff = b.sub(a)
    const k = this.canvasScale
    const w = Math.max(MIN_W * k, Math.min(MAX_SIDE * k, Math.abs(diff.dot(right))))
    const h = Math.max(MIN_H * k, Math.min(MAX_SIDE * k, Math.abs(diff.dot(up))))
    const signX = diff.dot(right) >= 0 ? 1 : -1
    const signY = diff.dot(up) >= 0 ? 1 : -1
    // Un poco por delante de la superficie real para que no se mezcle con ella.
    const center = a
      .add(right.uniformScale((w / 2) * signX))
      .add(up.uniformScale((h / 2) * signY))
      .add(this.planeNormal.uniformScale(SURFACE_OFFSET))
    const t = this.canvasRoot.getTransform()
    t.setWorldPosition(center)
    t.setWorldRotation(quat.lookAt(this.planeNormal, up))
    // Los límites van en unidades del canvas: la escala de su raíz los convierte en centímetros.
    this.renderer.setBounds({minX: -w / (2 * k), maxX: w / (2 * k), minY: -h / (2 * k), maxY: h / (2 * k)})
    return {w, h}
  }

  private finishPlacement(b: vec3): void {
    if (this.corner) this.applyRect(this.corner, b)
    this.corner = null
    this.placing = null
    this.phase = "work"
    // Al recolocar, el canvas nunca debe dejar fuera lo que ya contenía.
    this.doc.elements.forEach((el) => this.renderer.growToFit(el.id))
    this.ensureEdgeBar(this.active).sceneObject.enabled = true
    this.refreshBorders()
    this.cornerA.setVisible(false)
    this.cursor.setVisible(false)
    this.renderer.setContentVisible(true)
    this.dock.setPhase("work")
    this.setTool("select")
    this.dock.setStatus(
      this.canvases.length > 1
        ? "Canvas " + this.canvases.length + " listo. Enlázalo con Flecha o júntalo con otro"
        : "Canvas listo. Crea una nota o pulsa + para ver sus herramientas"
    )
    this.log("canvas " + this.active.id + " " + this.orientation + " (total " + this.canvases.length + ")")
  }

  private ensureEdgeBar(canvas: CanvasInstance): CanvasEdgeBarUI {
    if (canvas.bar) return canvas.bar
    const so = global.scene.createSceneObject("EdgeBar")
    so.setParent(canvas.root)
    const bar = so.createComponent(CanvasEdgeBarUI.getTypeName()) as CanvasEdgeBarUI
    bar.onAction.add((action) => this.onEdgeAction(canvas, action))
    bar.onPick.add((action) => {
      this.activate(canvas)
      this.onAction(action)
    })
    canvas.bar = bar
    bar.onColor.add((color) => this.setDrawTint(color))
    bar.setDrawColor(this.currentDrawColor())
    const holder = global.scene.createSceneObject("UndoButton")
    holder.setParent(canvas.root)
    holder.createComponent("Component.Canvas")
    const undo = makePill(holder, "Deshacer", UNDO_SIZE, UNDO_SIZE, 56, () => false, () => this.undo(canvas), ICON.undo)
    addPillEdge(undo)
    canvas.undoButton = holder
    return bar
  }

  private onEdgeAction(canvas: CanvasInstance, action: EdgeAction): void {
    if (this.phase === "place") {
      this.dock.setStatus("Termina de colocar el canvas o pulsa Cancelar")
      return
    }
    this.dock.closeMenu()
    // La rueda no termina lo que se está escribiendo: así también colorea el texto en edición.
    if (action === "palette") {
      const open = !canvas.bar?.isWheelOpen
      this.closeEdgeMenu()
      canvas.bar?.setWheel(open)
      const forSelection = canvas === this.active && this.colorTargets().length > 0
      this.dock.setStatus(open ? (forSelection ? "Elige un color para lo seleccionado" : "Elige un color para dibujar") : this.toolHint())
      this.log("borde " + canvas.id + " palette")
      return
    }
    const wasWritingHere = this.editing !== null && canvas === this.active
    const wasOpen = this.menuCanvas === canvas
    if (this.editing) this.finishEditing()
    this.activate(canvas)
    this.log("borde " + canvas.id + " " + action)
    if (action === "menu") {
      this.closeEdgeMenu()
      if (!wasOpen) {
        this.menuCanvas = canvas
        canvas.bar?.setOpen(true)
        this.dock.setStatus(
          this.tool === "select"
            ? "Elige una herramienta. Pulsa fuera para cerrar"
            : "Elige otra herramienta o pulsa el centro para soltar la actual"
        )
      } else if (this.tool !== "select") {
        // Con el menú abierto, el centro suelta la herramienta: el canvas vuelve a moverse y estirarse.
        this.setTool("select")
        this.dock.setStatus("Herramienta desactivada")
      }
      return
    }
    if (action === "shapes" || action === "stickers" || action === "templates") {
      const open = canvas.bar?.toggleSubmenu(action) ?? false
      const prompt = action === "shapes" ? "Elige una forma para añadir" : action === "stickers" ? "Elige un sticker" : "Elige una plantilla"
      this.dock.setStatus(open ? prompt : "Elige una herramienta. Pulsa fuera para cerrar")
      return
    }
    if (action === "duplicate") {
      this.closeEdgeMenu()
      this.duplicateCanvas(canvas)
      return
    }
    // La papelera deja el menú abierto: puede hacer falta pulsarla otra vez para confirmar.
    if (action === "delete") {
      this.requestDelete(canvas)
      return
    }
    this.closeEdgeMenu()
    if (action === "write") {
      if (!wasWritingHere) this.startWriting()
      return
    }
    const tool: Tool = action === "draw" ? "draw" : action === "erase" ? "erase" : "connect"
    // Elegir una herramienta siempre la activa; para soltarla se pulsa el centro con el menú abierto.
    this.setTool(tool)
  }

  /** Devuelve si había un menú abierto. */
  private closeEdgeMenu(): boolean {
    let wheel = this.closeLibrary()
    for (const c of this.canvases) {
      if (c.bar?.isWheelOpen) {
        c.bar.setWheel(false)
        wheel = true
      }
    }
    const canvas = this.menuCanvas
    if (!canvas) {
      if (wheel) this.dock.setStatus(this.toolHint())
      return wheel
    }
    this.menuCanvas = null
    canvas.bar?.closeSubmenus()
    canvas.bar?.setOpen(false)
    this.dock.setStatus(this.toolHint())
    return true
  }

  /**
   * Trae a Ana, una colaboradora de ejemplo: un maniquí que aparece delante y a la derecha, de pie en el suelo,
   * junto a un canvas suyo en el que va construyendo la plantilla de flujo mientras lo señala.
   */
  private inviteCollaborator(): void {
    if (this.collaborator) {
      this.dock.setStatus(this.collaborator.mannequin.name + " ya está en este espacio")
      return
    }
    const eye = this.camera.getWorldPosition()
    const forward = this.flatForward()
    const side = vec3.up().cross(forward).uniformScale(-1).normalize()
    // Algo a la derecha de la mirada, a una distancia en la que se ve entero.
    const angle = (COLLAB_ANGLE * Math.PI) / 180
    const dir = forward.uniformScale(Math.cos(angle)).add(side.uniformScale(Math.sin(angle))).normalize()
    const center = eye.add(dir.uniformScale(COLLAB_DISTANCE)).add(new vec3(0, COLLAB_LIFT, 0))
    const done = (floorY: number): void => this.spawnCollaborator(center, floorY)
    const below = new vec3(center.x, eye.y, center.z)
    if (!this.hitSession) {
      done(eye.y - COLLAB_EYE_HEIGHT)
      return
    }
    this.hitSession.hitTest(below, below.add(new vec3(0, -400, 0)), (result) => {
      done(result ? result.position.y : eye.y - COLLAB_EYE_HEIGHT)
    })
  }

  private spawnCollaborator(center: vec3, floorY: number): void {
    if (this.collaborator) return
    const eye = this.camera.getWorldPosition()
    const toEye = eye.sub(center)
    const normal = new vec3(toEye.x, 0, toEye.z).normalize()
    const right = vec3.up().cross(normal).normalize()
    const k = Math.min(this.scaleForDistance(toEye.length), COLLAB_SCALE)
    const w = COLLAB_CANVAS_W
    const h = COLLAB_CANVAS_H

    const canvas = this.createCanvas("vertical")
    canvas.owner = {name: COLLAB_NAME, color: COLLAB_COLOR}
    canvas.busy = true
    const t = canvas.transform
    t.setWorldPosition(center)
    t.setWorldRotation(quat.lookAt(normal, vec3.up()))
    t.setWorldScale(new vec3(k, k, k))
    canvas.scale = k
    const bounds = {minX: -w / 2, maxX: w / 2, minY: -h / 2, maxY: h / 2}
    canvas.renderer.setBounds(bounds)
    canvas.root.enabled = true
    canvas.renderer.setContentVisible(true)
    canvas.renderer.setOwned(true)
    this.makeOwnerTag(canvas)

    // La plantilla se prepara aparte y se pasa al canvas pieza a pieza, como si la fuera dibujando.
    const draft = new CanvasDocument()
    applyTemplate(draft, COLLAB_TEMPLATE, bounds)
    const steps: {kind: "el" | "conn"; data: CanvasElement | {from: string; to: string; label: string}}[] = []
    const els = Array.from(draft.elements.values()).sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0))
    for (const el of els) steps.push({kind: "el", data: el})
    draft.connections.forEach((c) => steps.push({kind: "conn", data: {from: c.from, to: c.to, label: c.label}}))

    // De pie a la derecha de su canvas (visto desde aquí), algo adelantada y girada hacia él.
    const half = (w / 2) * k
    const feet = center.add(right.uniformScale(half + COLLAB_SIDE_GAP)).add(normal.uniformScale(COLLAB_FRONT))
    const mannequin = new CanvasMannequin(this.sceneObject, COLLAB_NAME, COLLAB_COLOR)
    mannequin.place(new vec3(feet.x, floorY, feet.z), center.sub(feet))

    this.collaborator = {mannequin, canvas, steps, ids: new Map(), next: 0, nextAt: getTime() + COLLAB_FIRST_DELAY}
    this.refreshBorders()
    this.dock.setPeople([COLLAB_NAME])
    this.dock.setStatus(COLLAB_NAME + " se ha unido y está creando un diagrama de flujo")
    this.log("colaborador " + COLLAB_NAME + " en " + canvas.id)
  }

  /**
   * El canvas de otra persona no lleva menú radial ni Deshacer, porque no se puede editar. En su lugar, una
   * pestaña de su color sale del borde superior, junto a la esquina izquierda, con su nombre encima.
   */
  private makeOwnerTag(canvas: CanvasInstance): void {
    const owner = canvas.owner
    if (!owner) return
    const tag = global.scene.createSceneObject("OwnerTag")
    tag.setParent(canvas.root)
    const h = OWNER_TAG_H
    const w = OWNER_TAG_CHAR_W * owner.name.length + h * 1.4
    const b = canvas.renderer.getBounds()
    // La base se mete un poco en el borde para que pestaña y borde se vean como una sola pieza.
    tag.getTransform().setLocalPosition(new vec3(b.minX + OWNER_TAG_INSET, b.maxY - OWNER_TAG_OVERLAP, 0.05))
    const fill = new MeshSlot(tag, "Tab", owner.color)
    appendFill(fill.begin(), tabOutline(w, h, h * 0.4), 0)
    fill.commit()
    const labelSo = global.scene.createSceneObject("Name")
    labelSo.setParent(tag)
    labelSo.getTransform().setLocalPosition(new vec3(h * 0.7, h / 2, 0.15))
    const t = labelSo.createComponent("Component.Text") as Text
    t.font = THEME_FONT
    t.size = OWNER_TAG_TEXT
    t.depthTest = true
    t.text = owner.name
    // Texto oscuro sobre el color: sobre un naranja o amarillo vivos se lee mejor que el blanco.
    t.textFill.color = COLOR.surface
    t.horizontalAlignment = HorizontalAlignment.Left
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.layoutRect = Rect.create(0, w, -h / 2, h / 2)
  }

  /** Cada cierto tiempo, Ana añade la siguiente pieza de la plantilla y la señala mientras la dibuja. */
  private updateCollaborator(): void {
    const col = this.collaborator
    if (!col) return
    const eye = this.camera.getWorldPosition()
    const canvas = col.canvas
    if (this.canvases.indexOf(canvas) < 0) {
      // Si se borra su canvas, se va.
      col.mannequin.destroy()
      this.collaborator = null
      this.dock.setPeople([])
      return
    }
    col.mannequin.update(getDeltaTime(), eye)
    if (col.next >= col.steps.length || getTime() < col.nextAt) return
    const step = col.steps[col.next++]
    col.nextAt = getTime() + COLLAB_STEP
    if (step.kind === "el") {
      const src = step.data as CanvasElement
      const {id: _old, ...rest} = src
      const copy = canvas.doc.add({...rest, parentId: src.parentId ? (col.ids.get(src.parentId) ?? null) : null})
      col.ids.set(src.id, copy.id)
      canvas.renderer.growToFit(copy.id)
      col.mannequin.setTarget(canvas.toWorld(new vec3(copy.x, copy.y, 1)), true)
    } else {
      const c = step.data as {from: string; to: string; label: string}
      const from = col.ids.get(c.from)
      const to = col.ids.get(c.to)
      if (from && to) {
        canvas.doc.connect(from, to, c.label)
        const a = canvas.doc.elements.get(from)
        const b = canvas.doc.elements.get(to)
        if (a && b) col.mannequin.setTarget(canvas.toWorld(new vec3((a.x + b.x) / 2, (a.y + b.y) / 2, 1)), true)
      }
    }
    if (col.next >= col.steps.length) {
      canvas.busy = false
      col.nextAt = Infinity
      // Al terminar, baja el brazo y mira hacia ti.
      const finish = (): void => col.mannequin.setTarget(null)
      const ev = this.createEvent("DelayedCallbackEvent")
      ev.bind(finish)
      ev.reset(COLLAB_STEP)
      this.dock.setStatus(COLLAB_NAME + " ha terminado su diagrama de flujo")
    }
  }

  /** Una copia del canvas con todo su contenido, justo a su derecha y con la misma forma, tamaño y orientación. */
  private duplicateCanvas(src: CanvasInstance): void {
    const copy = this.createCanvas(src.orientation)
    copy.renderer.setShape(src.renderer.shape)
    copy.renderer.setBounds(src.renderer.getBounds())
    copy.doc.restore(src.doc.serialize())
    const st = src.transform
    const b = src.renderer.getBounds()
    const t = copy.transform
    t.setWorldRotation(st.getWorldRotation())
    t.setWorldScale(st.getWorldScale())
    copy.scale = src.scale
    t.setWorldPosition(st.getWorldPosition().add(st.right.uniformScale((b.maxX - b.minX + DUPLICATE_GAP) * src.scale)))
    copy.root.enabled = true
    copy.renderer.setContentVisible(true)
    this.ensureEdgeBar(copy).sceneObject.enabled = true
    this.activate(copy)
    this.refreshBorders()
    this.dock.setStatus("Canvas duplicado a la derecha del original")
    this.log("canvas " + src.id + " duplicado en " + copy.id)
  }

  private changeShape(canvas: CanvasInstance, shape: CanvasShape): void {
    this.closeEdgeMenu()
    canvas.renderer.setShape(shape)
    this.dock.setStatus(this.toolHint())
    this.log("forma " + canvas.id + " " + shape)
  }

  /** Distancia (cm) desde un punto al punto más cercano del rectángulo del canvas. */
  private distanceToCanvas(c: CanvasInstance, point: vec3): number {
    const local = c.toLocal(point)
    const b = c.renderer.getBounds()
    const x = Math.max(b.minX, Math.min(b.maxX, local.x))
    const y = Math.max(b.minY, Math.min(b.maxY, local.y))
    return c.toWorld(new vec3(x, y, 0)).distance(point)
  }

  /** Distancia (cm) del canvas al cuerpo del usuario, una barra vertical bajo los ojos: una mesa al lado cuenta como cerca. */
  private distanceToBody(c: CanvasInstance, eye: vec3): number {
    let best = Infinity
    for (let i = 0; i < BODY_SAMPLES; i++) {
      const p = eye.add(new vec3(0, (-BODY_HEIGHT * i) / (BODY_SAMPLES - 1), 0))
      best = Math.min(best, this.distanceToCanvas(c, p))
    }
    return best
  }

  /** Los botones solo en el canvas seleccionado y si está cerca; si se ocultan, se cierra lo que tuvieran abierto. */
  private updateButtonsVisibility(c: CanvasInstance, eye: vec3): void {
    if (!c.bar) return
    const show = c === this.active && c.placed && this.distanceToBody(c, eye) <= BUTTONS_MAX_DISTANCE
    const bar = c.bar.sceneObject
    if (bar.enabled === show) return
    if (!show) {
      if (this.library?.canvas === c) this.closeLibrary()
      if (this.menuCanvas === c) this.closeEdgeMenu()
      c.bar.setWheel(false)
    }
    bar.enabled = show
    if (c.undoButton) c.undoButton.enabled = show
  }

  /** El menú va en la esquina superior derecha. En una mesa se inclina hacia el usuario y se eleva para no hundirse en ella. */
  private updateEdgeBarPose(canvas: CanvasInstance): void {
    const b = canvas.renderer.getBounds()
    const shape = canvas.renderer.shape
    if (!canvas.bar || (b === canvas.barBounds && canvas.orientation === canvas.barOrientation && shape === canvas.barShape)) return
    canvas.barBounds = b
    canvas.barOrientation = canvas.orientation
    canvas.barShape = shape
    const hub = canvas.hubPoint
    if (canvas.orientation === "vertical") {
      // Por delante de las notas, sobre las que se despliega.
      canvas.bar.setPose(new vec3(hub.x, hub.y, 1.4), quat.quatIdentity())
    } else {
      const tilt = (MENU_TILT * Math.PI) / 180
      canvas.bar.setPose(new vec3(hub.x, hub.y, 1 + RING_RADIUS * Math.sin(tilt)), quat.angleAxis(tilt, vec3.right()))
    }
    const t = canvas.undoButton?.getTransform()
    if (!t) return
    const u = canvas.undoPoint
    if (canvas.orientation === "vertical") {
      t.setLocalPosition(new vec3(u.x, u.y, 1.4))
      t.setLocalRotation(quat.quatIdentity())
    } else {
      const tilt = (MENU_TILT * Math.PI) / 180
      t.setLocalPosition(new vec3(u.x, u.y, 1 + (UNDO_SIZE / 2) * Math.sin(tilt)))
      t.setLocalRotation(quat.angleAxis(tilt, vec3.right()))
    }
  }

  // ── Deshacer ─────────────────────────────────────────────────────────────

  private undoSnapshot(c: CanvasInstance): string {
    return JSON.stringify({shape: c.renderer.shape, bounds: c.renderer.getBounds(), doc: c.doc.serialize()})
  }

  /**
   * Cada canvas guarda su estado cuando termina una acción: al soltar, al dejar de escribir o tras un botón.
   * Si cambió, el anterior pasa al historial. Así un arrastre entero se deshace de una vez.
   */
  private commitUndoStates(): void {
    if (this.press || this.editing || this.phase !== "work") return
    for (const c of this.canvases) {
      if (!c.placed) continue
      const bounds = c.renderer.getBounds()
      const shape = c.renderer.shape
      if (c.undoState !== null && !c.undoDirty && bounds === c.undoBounds && shape === c.undoShape) continue
      const state = this.undoSnapshot(c)
      if (c.undoState !== null && state !== c.undoState) {
        c.undoStack.push(c.undoState)
        if (c.undoStack.length > UNDO_LIMIT) c.undoStack.shift()
      }
      c.undoState = state
      c.undoDirty = false
      c.undoBounds = bounds
      c.undoShape = shape
    }
  }

  private undo(canvas: CanvasInstance): void {
    if (this.phase !== "work") return
    this.closeEdgeMenu()
    this.dock.closeMenu()
    if (this.editing) this.finishEditing()
    this.activate(canvas)
    this.commitUndoStates()
    const prev = canvas.undoStack.pop()
    if (!prev) {
      this.dock.setStatus("No hay nada que deshacer en este canvas")
      return
    }
    this.clearSelection()
    const data = JSON.parse(prev) as {shape: CanvasShape; bounds: Bounds; doc: string}
    canvas.renderer.setShape(data.shape)
    canvas.renderer.setBounds(data.bounds)
    canvas.doc.restore(data.doc)
    canvas.undoState = prev
    canvas.undoDirty = false
    canvas.undoBounds = canvas.renderer.getBounds()
    canvas.undoShape = canvas.renderer.shape
    this.dock.setStatus(canvas.undoStack.length > 0 ? "Deshecho. Pulsa otra vez para deshacer más" : "Deshecho")
    this.log("deshacer en " + canvas.id + " (quedan " + canvas.undoStack.length + ")")
  }

  private groupMembers(canvas: CanvasInstance): CanvasInstance[] {
    return canvas.groupId ? this.canvases.filter((c) => c.groupId === canvas.groupId) : [canvas]
  }

  private beginMoveCanvas(interactor: Interactor): void {
    const ray = this.activeRay(interactor)
    if (!ray) return
    const anchor = this.active
    const t = anchor.transform
    const normal = anchor.normal
    const hit = this.intersectPlane(ray.origin, ray.dir, t.getWorldPosition(), normal)
    if (!hit) return
    this.flipFrom = null
    this.flipTo = null
    const rotation = t.getWorldRotation()
    const inverse = rotation.invert()
    const grab = anchor.toLocal(hit)
    this.press = {
      interactor, mode: "moveCanvas", id: null, planeZ: 0,
      start: new vec2(0, 0), last: new vec2(0, 0), dragged: true,
      drag: {
        grab: new vec3(grab.x, grab.y, 0),
        planePoint: hit,
        planeNormal: normal,
        rotation,
        scale: anchor.scale,
        target: hit,
        members: this.groupMembers(anchor).map((canvas) => ({
          canvas,
          localPos: anchor.toLocal(canvas.transform.getWorldPosition()),
          relRotation: inverse.multiply(canvas.transform.getWorldRotation()),
          ratio: canvas.scale / anchor.scale,
        })),
        transition: null,
        candidate: null,
        startTime: getTime(),
        startDir: ray.dir,
        moved: false,
        ball: null,
        surface: null,
      },
    }
  }

  /** Se desliza por la superficie actual; lo que contiene viaja con él porque son sus hijos. */
  private updateMoveCanvas(press: Press): void {
    const drag = press.drag
    const ray = this.activeRay(press.interactor)
    if (!ray || !drag) return
    if (!drag.moved && !drag.ball) {
      if (ray.dir.dot(drag.startDir) < HOLD_STILL_DOT) drag.moved = true
      else if (getTime() - drag.startTime >= HOLD_TIME) this.gatherIntoBall(drag)
    }
    if (!drag.moved && !drag.ball) return
    this.queryDragSurface(ray.origin, ray.dir, press)
    if (drag.ball) {
      this.updateBall(drag, ray.origin, ray.dir)
      return
    }
    const tr = drag.transition
    if (tr) {
      const k = Math.min(1, (getTime() - tr.start) / STICK_TIME)
      const e = k * k * (3 - 2 * k)
      drag.rotation = quat.slerp(tr.fromRotation, tr.toRotation, e)
      drag.scale = tr.fromScale + (tr.toScale - tr.fromScale) * e
      if (k >= 1) drag.transition = null
    }
    const q = this.intersectPlane(ray.origin, ray.dir, drag.planePoint, drag.planeNormal)
    // Un rayo casi paralelo a la superficie mandaría el canvas al infinito.
    if (q && q.distance(this.camera.getWorldPosition()) < MAX_DRAG_DISTANCE) drag.target = q
    this.applyDragPose(drag)
  }

  /** A partir de aquí el canvas se sujeta por su centro, que es donde quedará al soltarlo, y se encoge. */
  private gatherIntoBall(drag: CanvasDrag): void {
    const anchor = drag.members[0].canvas
    const b = anchor.renderer.getBounds()
    const center = new vec3((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, 0)
    const fullScale = drag.transition ? drag.transition.toScale : drag.scale
    drag.grab = center
    drag.transition = null
    drag.candidate = null
    const from = anchor.toWorld(center)
    const eye = this.camera.getWorldPosition()
    const miniScale = MINI_SIZE / Math.max(b.maxX - b.minX, b.maxY - b.minY)
    drag.ball = {
      start: getTime(), fullScale, miniScale, from, fromRotation: drag.rotation,
      distance: from.distance(eye), origin: eye, dir: this.camera.back, travelled: false,
    }
    this.closeEdgeMenu()
    this.dock.setStatus("Lleva el canvas adonde quieras y suelta para colocarlo")
    this.log("canvas " + anchor.id + " agarrado")
  }

  private updateBall(drag: CanvasDrag, origin: vec3, dir: vec3): void {
    const ball = drag.ball
    if (!ball) return
    ball.origin = origin
    ball.dir = dir
    if (dir.dot(drag.startDir) < HOLD_STILL_DOT) ball.travelled = true
    // Nunca atraviesa la superficie que tiene delante.
    let distance = FLOATING_DISTANCE
    const hit = drag.surface
    if (hit && getTime() - hit.time < 0.5) {
      distance = Math.min(distance, Math.max(BALL_SURFACE_GAP, hit.position.distance(origin) - BALL_SURFACE_GAP))
    }
    const point = origin.add(dir.uniformScale(distance))
    const k = Math.min(1, (getTime() - ball.start) / BALL_TIME)
    const e = k * k * (3 - 2 * k)
    // Se encoge a una miniatura de sí mismo, con su contenido, que mira hacia el usuario mientras la lleva.
    const facing = quat.lookAt(this.camera.getWorldPosition().sub(point).normalize(), this.camera.up)
    drag.scale = ball.fullScale + (ball.miniScale - ball.fullScale) * e
    drag.rotation = quat.slerp(ball.fromRotation, facing, e)
    drag.target = vec3.lerp(ball.from, point, e)
    this.applyDragPose(drag)
  }

  /**
   * Reaparece en la dirección de la miniatura: en la superficie cercana a la que se apunta o, si no hay, flotando de
   * frente a la distancia que tenía, y con la escala que hace falta para verse del mismo tamaño que antes de agarrarlo.
   * Devuelve si cambió de sitio.
   */
  private dropBall(drag: CanvasDrag): boolean {
    const ball = drag.ball
    if (!ball) return false
    drag.ball = null
    drag.scale = ball.fullScale
    // Si no se ha llevado a ningún sitio, vuelve exactamente a donde estaba.
    if (!ball.travelled) {
      drag.rotation = ball.fromRotation
      drag.target = ball.from
      this.applyDragPose(drag)
      return false
    }
    const hit = drag.surface
    const fresh = hit && getTime() - hit.time < 0.5 ? hit : null
    // Cualquier superficie apuntada al alcance del rayo, aunque esté más lejos que las que reciben un canvas nuevo.
    const near = fresh && fresh.position.distance(ball.origin) <= DROP_MAX_DISTANCE ? fresh : null
    const limit = fresh ? fresh.position.distance(ball.origin) - BALL_SURFACE_GAP : ball.distance
    const point = ball.origin.add(ball.dir.uniformScale(Math.max(BALL_SURFACE_GAP, Math.min(ball.distance, limit))))
    const frame = near ? this.surfaceFrame(near.position, near.normal) : null
    const basis = this.basisFor("vertical")
    drag.rotation = frame ? quat.lookAt(frame.normal, frame.up) : quat.lookAt(basis.normal, basis.up)
    drag.target = frame && near ? near.position.add(frame.normal.uniformScale(SURFACE_OFFSET)) : point
    // Se ve del mismo tamaño que antes de agarrarlo: más lejos, más grande en proporción a la distancia.
    const ratio = drag.target.distance(ball.origin) / Math.max(1, ball.distance)
    drag.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, ball.fullScale * ratio))
    for (const m of drag.members) m.canvas.orientation = frame ? frame.orientation : "vertical"
    this.applyDragPose(drag)
    return true
  }

  private applyDragPose(drag: CanvasDrag): void {
    const position = drag.target.sub(drag.rotation.multiplyVec3(drag.grab.uniformScale(drag.scale)))
    for (const m of drag.members) {
      const k = drag.scale * m.ratio
      const t = m.canvas.transform
      m.canvas.scale = k
      t.setWorldScale(new vec3(k, k, k))
      t.setWorldRotation(drag.rotation.multiply(m.relRotation))
      t.setWorldPosition(position.add(drag.rotation.multiplyVec3(m.localPos.uniformScale(drag.scale))))
    }
  }

  private queryDragSurface(origin: vec3, dir: vec3, press: Press): void {
    if (!this.hitSession || this.hitPending) return
    this.hitPending = true
    this.hitSession.hitTest(origin, origin.add(dir.uniformScale(800)), (result) => {
      this.hitPending = false
      if (this.press !== press || !press.drag) return
      if (press.drag.ball) {
        press.drag.surface = result ? {position: result.position, normal: result.normal, time: getTime()} : null
      } else {
        this.onDragSurface(press.drag, result)
      }
    })
  }

  /** Cómo quedaría un canvas pegado a esa superficie; las normales dudosas y los techos no cuentan. */
  private surfaceFrame(point: vec3, normal: vec3): SurfaceFrame | null {
    const y = Math.abs(normal.y)
    if (y > HORIZONTAL_MIN_Y) {
      if (point.y > this.camera.getWorldPosition().y) return null
      return {orientation: "horizontal", normal: vec3.up(), up: this.flatForward()}
    }
    if (y < VERTICAL_MAX_Y) return {orientation: "vertical", normal: this.wallNormal(point, normal), up: vec3.up()}
    return null
  }

  /** Exige unos instantes apuntando a la superficie para que rozar un borde no haga girar el canvas. */
  private onDragSurface(drag: CanvasDrag, result: WorldQueryHitTestResult | null): void {
    const frame = result ? this.surfaceFrame(result.position, result.normal) : null
    if (!result || !frame || frame.normal.dot(drag.planeNormal) > SAME_SURFACE_DOT) {
      drag.candidate = null
      return
    }
    const now = getTime()
    if (!drag.candidate || drag.candidate.normal.dot(frame.normal) < CANDIDATE_DOT) {
      drag.candidate = {normal: frame.normal, since: now}
      return
    }
    const sameKind = frame.orientation === drag.members[0].canvas.orientation
    if (now - drag.candidate.since >= (sameKind ? STICK_DELAY_SAME_KIND : STICK_DELAY)) {
      this.stickToSurface(drag, frame, result.position)
    }
  }

  private stickToSurface(drag: CanvasDrag, frame: SurfaceFrame, point: vec3): void {
    drag.candidate = null
    drag.planeNormal = frame.normal
    drag.planePoint = point.add(frame.normal.uniformScale(SURFACE_OFFSET))
    drag.target = drag.planePoint
    drag.transition = {
      fromRotation: drag.rotation,
      toRotation: quat.lookAt(frame.normal, frame.up),
      fromScale: drag.scale,
      // Solo estirar los bordes cambia el tamaño: al pegarse a otra superficie conserva su escala.
      toScale: drag.scale,
      start: getTime(),
    }
    for (const m of drag.members) m.canvas.orientation = frame.orientation
    this.dock.setStatus(frame.orientation === "vertical" ? "Pegado a la pared" : "Pegado a la mesa")
    this.log("canvas " + drag.members[0].canvas.id + " pasa a " + frame.orientation)
  }

  /** Separación entre dos canvas casi paralelos, medida en el plano del primero. */
  private measureGap(a: CanvasInstance, b: CanvasInstance): {gapX: number; gapY: number; toX: number; toY: number; z: number} | null {
    if (Math.abs(a.normal.dot(b.normal)) < SAME_PLANE_DOT) return null
    const ab = a.renderer.getBounds()
    const bb = b.renderer.getBounds()
    const corners = [
      new vec3(bb.minX, bb.minY, 0),
      new vec3(bb.maxX, bb.minY, 0),
      new vec3(bb.minX, bb.maxY, 0),
      new vec3(bb.maxX, bb.maxY, 0),
    ].map((p) => a.toLocal(b.toWorld(p)))
    const xs = corners.map((p) => p.x)
    const ys = corners.map((p) => p.y)
    const z = corners.reduce((sum, p) => sum + p.z, 0) / 4
    if (Math.abs(z) > SAME_PLANE_LIMIT) return null
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const right = minX - ab.maxX
    const left = ab.minX - maxX
    const up = minY - ab.maxY
    const down = ab.minY - maxY
    return {
      gapX: Math.max(right, left),
      gapY: Math.max(up, down),
      toX: right >= left ? 1 : -1,
      toY: up >= down ? 1 : -1,
      z,
    }
  }

  /** Al soltar cerca de otro canvas, los deja exactamente pegados y en el mismo plano. */
  private snapToNeighbour(moved: CanvasInstance[]): boolean {
    const anchor = moved[0]
    for (const other of this.canvases) {
      if (moved.indexOf(other) >= 0 || !other.placed) continue
      const g = this.measureGap(anchor, other)
      if (!g) continue
      let dx = 0
      let dy = 0
      if (g.gapX > 0 && g.gapX <= ADJACENT_GAP && g.gapY <= 0) dx = (g.gapX - SNAP_GAP) * g.toX
      else if (g.gapY > 0 && g.gapY <= ADJACENT_GAP && g.gapX <= 0) dy = (g.gapY - SNAP_GAP) * g.toY
      else continue
      const delta = anchor.transform.getWorldTransform().multiplyDirection(new vec3(dx, dy, g.z))
      for (const c of moved) c.transform.setWorldPosition(c.transform.getWorldPosition().add(delta))
      return true
    }
    return false
  }

  private endMoveCanvas(press: Press): void {
    const drag = press.drag
    // Un toque en el interior, sin arrastrar ni agarrar, solo deselecciona.
    if (drag && !drag.moved && !drag.ball) {
      this.clearSelection()
      return
    }
    if (drag?.ball && !this.dropBall(drag)) {
      this.dock.setStatus(this.toolHint())
      return
    }
    if (drag?.transition) {
      // Soltar a mitad de la transición deja el canvas ya en su pose final.
      drag.rotation = drag.transition.toRotation
      drag.scale = drag.transition.toScale
      drag.transition = null
      this.applyDragPose(drag)
    }
    const moved = (drag?.members ?? []).map((m) => m.canvas)
    const snapped = moved.length > 0 && this.snapToNeighbour(moved)
    const near = this.canvases.some(
      (c) => moved.indexOf(c) < 0 && c.placed && moved.some((m) => !this.isGrouped(m, c) && this.linkButtonGap(m, c))
    )
    this.dock.setStatus(near ? "Canvas juntos: pulsa el botón entre ellos para agruparlos" : this.toolHint())
    this.log("canvas movido" + (snapped ? " y pegado" : ""))
  }

  private linkButtonGap(a: CanvasInstance, b: CanvasInstance): boolean {
    const g = this.measureGap(a, b)
    return !!g && g.gapX <= LINK_BUTTON_GAP && g.gapY <= LINK_BUTTON_GAP
  }

  /** Centro del hueco entre dos canvas o, si se solapan en un eje, de la parte compartida. */
  private linkPoint(a: CanvasInstance, b: CanvasInstance): vec3 {
    const ab = a.renderer.getBounds()
    const bb = b.renderer.getBounds()
    const corners = [new vec3(bb.minX, bb.minY, 0), new vec3(bb.maxX, bb.maxY, 0)].map((p) => a.toLocal(b.toWorld(p)))
    const between = (min0: number, max0: number, p: number, q: number): number =>
      (Math.max(min0, Math.min(p, q)) + Math.min(max0, Math.max(p, q))) / 2
    const x = between(ab.minX, ab.maxX, corners[0].x, corners[1].x)
    const y = between(ab.minY, ab.maxY, corners[0].y, corners[1].y)
    return a.toWorld(new vec3(x, y, LINK_BUTTON_Z))
  }

  private isGrouped(a: CanvasInstance, b: CanvasInstance): boolean {
    return a.groupId !== null && a.groupId === b.groupId
  }

  private makeLinkButton(a: CanvasInstance, b: CanvasInstance): LinkButton {
    const root = global.scene.createSceneObject("LinkButton")
    root.setParent(this.sceneObject)
    root.createComponent("Component.Canvas")
    const entry: LinkButton = {a, b, root, grouped: false, button: null}
    entry.button = makePill(
      root,
      "Agrupar o separar",
      LINK_BUTTON_SIZE,
      LINK_BUTTON_SIZE,
      56,
      () => entry.grouped,
      () => this.toggleGroup(entry.a, entry.b),
      ICON.join
    )
    return entry
  }

  /** Cada pareja de canvas cercanos tiene su botón, justo entre los dos y mirando como ellos. */
  private updateLinkButtons(): void {
    const held = this.press?.drag?.ball ? this.press.drag.members.map((m) => m.canvas) : []
    const live = new Set<string>()
    if (this.phase === "work") {
      for (let i = 0; i < this.canvases.length; i++) {
        for (let j = i + 1; j < this.canvases.length; j++) {
          const a = this.canvases[i]
          const b = this.canvases[j]
          if (!a.placed || !b.placed || held.indexOf(a) >= 0 || held.indexOf(b) >= 0) continue
          if (this.menuCanvas === a || this.menuCanvas === b || !this.linkButtonGap(a, b)) continue
          const key = a.id + "|" + b.id
          live.add(key)
          let entry = this.linkButtons.get(key)
          if (!entry) {
            entry = this.makeLinkButton(a, b)
            this.linkButtons.set(key, entry)
          }
          entry.root.enabled = true
          const t = entry.root.getTransform()
          const k = (a.scale + b.scale) / 2
          t.setWorldPosition(this.linkPoint(a, b))
          t.setWorldRotation(a.transform.getWorldRotation())
          t.setWorldScale(new vec3(k, k, k))
          const grouped = this.isGrouped(a, b)
          if (grouped !== entry.grouped) {
            entry.grouped = grouped
            paintPill(entry.button, grouped)
            setPillIcon(entry.button, grouped ? ICON.link_off : ICON.join)
          }
        }
      }
    }
    this.linkButtons.forEach((entry, key) => {
      if (live.has(key)) return
      if (this.canvases.indexOf(entry.a) < 0 || this.canvases.indexOf(entry.b) < 0) {
        this.linkButtons.delete(key)
        retire(entry.root)
      } else {
        entry.root.enabled = false
      }
    })
  }

  /** Abre el panel de figuras o stickers junto a ese canvas, o lo cierra si ya estaba abierto. */
  private toggleLibrary(canvas: CanvasInstance, kind: LibraryKind): void {
    const same = this.library?.canvas === canvas && this.library.panel.kind === kind
    this.closeLibrary()
    if (same) {
      this.dock.setStatus(this.toolHint())
      return
    }
    const panel = new CanvasLibrary(canvas.root, kind, (action) => {
      this.activate(canvas)
      const [verb, arg] = action.split(":")
      if (verb === "shape") this.addElement("shape", arg as ShapeKind)
      else this.addSticker(arg)
    })
    panel.place(canvas.renderer.getBounds())
    this.library = {canvas, panel}
    this.dock.setStatus(kind === "shapes" ? "Elige una forma para añadir. Pulsa fuera para cerrar" : "Elige un sticker para añadir. Pulsa fuera para cerrar")
  }

  /** Devuelve si había uno abierto. */
  private closeLibrary(): boolean {
    if (!this.library) return false
    this.library.panel.destroy()
    this.library = null
    return true
  }

  private rayHitsLibrary(origin: vec3, dir: vec3): boolean {
    const lib = this.library
    if (!lib) return false
    const p = lib.canvas.rayPoint(origin, dir, 1.4)
    return !!p && lib.panel.contains(p, lib.canvas.renderer.getBounds())
  }

  /** El círculo de color o su rueda abierta: pulsarlos nunca cuenta como pulsar el canvas que tienen debajo. */
  private rayHitsPalette(origin: vec3, dir: vec3): boolean {
    return this.canvases.some((c) => {
      if (!c.bar || !c.placed || !c.bar.sceneObject.enabled) return false
      const p = c.rayPoint(origin, dir, 1.4)
      return !!p && c.bar.paletteContains(p.sub(c.hubPoint))
    })
  }

  /** Pulsar este botón nunca debe contar como pulsar fuera, aunque SIK aún no lo tenga apuntado. */
  private rayHitsLinkButton(origin: vec3, dir: vec3): boolean {
    let hit = false
    this.linkButtons.forEach((entry) => {
      if (hit || !entry.root.enabled) return
      const t = entry.root.getTransform()
      const center = t.getWorldPosition()
      const p = this.intersectPlane(origin, dir, center, t.forward)
      if (p && p.distance(center) <= (LINK_BUTTON_SIZE / 2) * t.getWorldScale().x) hit = true
    })
    return hit
  }

  private toggleGroup(a: CanvasInstance, b: CanvasInstance): void {
    this.closeEdgeMenu()
    this.dock.closeMenu()
    if (this.editing) this.finishEditing()
    if (this.isGrouped(a, b)) {
      for (const c of this.groupMembers(a)) c.groupId = null
      this.dock.setStatus("Grupo separado")
      this.log("grupo separado")
      return
    }
    const members = new Set<CanvasInstance>([...this.groupMembers(a), ...this.groupMembers(b)])
    const gid = "canvasGroup_" + this.nextGroupId++
    members.forEach((c) => {
      c.groupId = gid
    })
    this.dock.setStatus(members.size + " canvas agrupados: al mover uno se mueven juntos")
    this.log("grupo " + gid + " con " + members.size)
  }

  /** Un canvas vacío se borra a la primera; con contenido, la X pide una segunda pulsación. */
  private requestDelete(canvas: CanvasInstance): void {
    const armed = this.deleteArmed
    if (canvas.doc.elements.size > 0 && (armed?.canvas !== canvas || getTime() > armed.until)) {
      armed?.canvas.bar?.setDeleteArmed(false)
      this.deleteArmed = {canvas, until: getTime() + DELETE_CONFIRM_TIME}
      canvas.bar?.setDeleteArmed(true)
      this.dock.setStatus("Este canvas tiene contenido: pulsa la papelera otra vez para borrarlo", "warning")
      return
    }
    this.pendingDelete = canvas
  }

  private updateDeleteState(): void {
    if (this.elementDeleteArmed && getTime() > this.elementDeleteArmed.until) {
      this.disarmElementDelete()
      this.publishSelection()
    }
    const armed = this.deleteArmed
    if (armed && getTime() > armed.until) {
      armed.canvas.bar?.setDeleteArmed(false)
      this.deleteArmed = null
      this.dock.setStatus(this.toolHint())
    }
    const canvas = this.pendingDelete
    if (canvas) {
      // Se destruye fuera del evento del botón, que pertenece al propio canvas.
      this.pendingDelete = null
      this.removeCanvas(canvas)
    }
  }

  private removeCanvas(canvas: CanvasInstance): void {
    if (this.deleteArmed?.canvas === canvas) this.deleteArmed = null
    this.closeEdgeMenu()
    this.press = null
    this.clearSelection()
    this.links.removeFor(canvas)
    this.handwriting.forget(canvas)
    if (canvas.groupId) {
      const rest = this.canvases.filter((c) => c !== canvas && c.groupId === canvas.groupId)
      if (rest.length === 1) rest[0].groupId = null
    }
    if (this.flipCanvas === canvas) {
      this.flipFrom = null
      this.flipTo = null
      this.flipCanvas = null
    }
    this.canvases = this.canvases.filter((c) => c !== canvas)
    const orientation = canvas.orientation
    const id = canvas.id
    if (this.canvases.length === 0) {
      this.active = this.createCanvas(orientation)
      this.placing = {isNew: true, previous: null}
      canvas.destroy()
      this.setTool("select")
      this.enterPlacement()
    } else {
      if (this.active === canvas) this.active = this.canvases[this.canvases.length - 1]
      canvas.destroy()
      this.refreshBorders()
        this.dock.setStatus("Canvas borrado")
    }
    this.log("canvas borrado " + id + " (quedan " + this.canvases.filter((c) => c.placed).length + ")")
  }

  private quickPlace(): void {
    const basis = this.basisFor(this.orientation)
    this.planeNormal = basis.normal
    this.planeUp = basis.up
    // A la misma distancia y escala que un canvas creado en el aire.
    this.setCanvasScale(this.scaleForDistance(FLOATING_DISTANCE))
    const k = this.canvasScale
    const right = basis.up.cross(basis.normal).normalize()
    const base = this.orientation === "vertical" ? this.viewPoint(FLOATING_DISTANCE, 0) : this.comfortableCenter("horizontal")
    // Cada canvas colocado así se sitúa junto al anterior, sin taparlo.
    const center = base.add(right.uniformScale(80 * k * (this.canvases.length - 1)))
    const a = center.sub(right.uniformScale(36 * k)).sub(basis.up.uniformScale(22 * k))
    const b = center.add(right.uniformScale(36 * k)).add(basis.up.uniformScale(22 * k))
    this.canvasRoot.enabled = true
    this.corner = a
    this.finishPlacement(b)
  }

  /** Pulsar el panel nunca debe marcar una esquina, aunque SIK aún no lo tenga apuntado. */
  private rayHitsDock(origin: vec3, dir: vec3): boolean {
    return this.dock.hitsRay(origin, dir)
  }

  /** Pose cómoda para cada orientación: una mesa por debajo de la vista, una pared de frente. */
  private comfortableCenter(o: Orientation): vec3 {
    const b = this.renderer.getBounds()
    const forward = this.flatForward()
    const h = b.maxY - b.minY
    const k = this.canvasScale
    return o === "vertical"
      ? this.viewPoint(REFERENCE_DISTANCE * k, 12 * k)
      : this.camera
          .getWorldPosition()
          .add(forward.uniformScale(Math.max(118, h / 2 + 96) * k))
          .add(new vec3(0, -32 * k, 0))
  }

  private flip(): void {
    if (this.active.groupId) {
      this.dock.setStatus("Separa el grupo antes de girar este canvas")
      return
    }
    const next: Orientation = this.orientation === "vertical" ? "horizontal" : "vertical"
    const basis = this.basisFor(next)
    const t = this.canvasRoot.getTransform()
    this.orientation = next
    this.flipFrom = t.getWorldRotation()
    this.flipTo = quat.lookAt(basis.normal, basis.up)
    this.flipFromPos = t.getWorldPosition()
    this.flipCanvas = this.active
    this.flipToPos = this.comfortableCenter(next)
    this.flipStart = getTime()
    this.log("giro a " + next)
  }

  private updateFlip(): void {
    if (!this.flipFrom || !this.flipTo || !this.flipFromPos || !this.flipToPos || !this.flipCanvas) return
    const k = Math.min(1, (getTime() - this.flipStart) / FLIP_TIME)
    const e = k * k * (3 - 2 * k)
    const t = this.flipCanvas.transform
    t.setWorldRotation(quat.slerp(this.flipFrom, this.flipTo, e))
    t.setWorldPosition(vec3.lerp(this.flipFromPos, this.flipToPos, e))
    if (k >= 1) {
      this.flipFrom = null
      this.flipTo = null
    }
  }

  // ── Entrada ──────────────────────────────────────────────────────────────

  private onTriggerStart(interactor: Interactor, target: Interactable | null): void {
    if (this.phase === "place") {
      // La superficie del canvas ya aparece tras la primera esquina: apuntarla no es pulsar el panel.
      if (target && !this.resolveTarget(target)) return
      const ray = this.activeRay(interactor)
      if (!ray || this.rayHitsDock(ray.origin, ray.dir)) return
      if (this.dock.closeMenu()) return
      if (!this.corner) {
        if (this.cornerQuery) return
        this.queryFirstCorner(ray.origin, ray.dir)
        this.press = {
          interactor, mode: "placeDrag", id: null, planeZ: 0,
          start: new vec2(0, 0), last: new vec2(0, 0), dragged: false,
        }
      } else {
        const q = this.intersectPlane(ray.origin, ray.dir, this.corner, this.planeNormal)
        if (!q) return
        // Un segundo clic en el mismo sitio que el primero cancela el canvas.
        if (q.distance(this.corner) < MIN_CORNER_DISTANCE * this.canvasScale) {
          this.cancelCorner()
          return
        }
        this.finishPlacement(q)
      }
      return
    }

    let resolved = this.resolveTarget(target)
    if (target && !resolved) return // pulsación sobre un panel o un botón

    // Una pulsación sobre el panel de figuras o stickers (aunque caiga entre dos botones) no lo cierra.
    const panelRay = this.activeRay(interactor)
    if (panelRay && this.rayHitsLibrary(panelRay.origin, panelRay.dir)) return
    // Pulsar fuera de un menú abierto solo lo cierra.
    if (this.closeEdgeMenu()) return
    const pressRay = this.activeRay(interactor)
    if (pressRay && (this.rayHitsDock(pressRay.origin, pressRay.dir) || this.rayHitsLinkButton(pressRay.origin, pressRay.dir) || this.handwriting.hitsRay(pressRay.origin, pressRay.dir) || this.rayHitsPalette(pressRay.origin, pressRay.dir) || this.rayHitsLibrary(pressRay.origin, pressRay.dir))) return
    if (this.dock.closeMenu()) return

    const wasEditing = this.editing !== null
    if (wasEditing) this.finishEditing()

    // Lo que hay encima del borde (un elemento, una flecha) tiene prioridad sobre él.
    if (this.tool === "select" && (!resolved || ("canvas" in resolved && resolved.hit.type === "surface"))) {
      if (this.beginResizeCanvas(interactor)) return
    }

    // El colisionador es rectangular: las esquinas que quedan fuera de la forma no son del canvas.
    if (resolved && "canvas" in resolved && resolved.hit.type === "surface") {
      const ray = this.activeRay(interactor)
      const p = ray ? resolved.canvas.rayPoint(ray.origin, ray.dir) : null
      if (ray && p && !resolved.canvas.contains(p)) {
        const other = this.canvasUnderRay(ray.origin, ray.dir, resolved.canvas)
        resolved = other ? {canvas: other, hit: {type: "surface"}} : null
      }
    }

    if (!resolved) {
      // Pulsar fuera siempre empieza otro canvas, sea cual sea la herramienta o aunque se estuviera escribiendo.
      this.startCanvasOutside(interactor)
      return
    }
    // El canvas de otra persona no se puede tocar.
    if ("canvas" in resolved && resolved.canvas.owner) {
      const owner = resolved.canvas.owner.name
      this.dock.setStatus(resolved.canvas.busy ? owner + " está trabajando en este canvas" : "Este canvas es de " + owner + ": solo puede editarlo quien lo creó")
      return
    }
    if ("link" in resolved) {
      this.clearSelection()
      this.links.select(resolved.link)
      this.publishSelection()
      return
    }
    this.links.select(null)
    this.activate(resolved.canvas)
    const hit = resolved.hit

    if (this.tool === "draw") {
      this.beginStroke(interactor)
      return
    }
    if (this.tool === "erase") {
      this.press = {
        interactor, mode: "erase", id: null, planeZ: 0,
        start: new vec2(0, 0), last: new vec2(0, 0), dragged: true,
      }
      this.eraseStep(this.press)
      return
    }
    if (this.tool === "underline") {
      if (hit.type === "element") this.underline(hit.id)
      return
    }
    if (this.tool === "connect") {
      const el = hit.type === "element" ? this.doc.elements.get(hit.id) : null
      const from = el && el.kind !== "stroke" ? el : null
      const z = from ? elementZ(from) : layerZ(0)
      const p = this.canvasPoint(interactor, z) ?? new vec2(0, 0)
      this.press = {interactor, mode: "connect", id: from?.id ?? null, planeZ: z, start: p, last: p, dragged: false}
      return
    }

    if (hit.type === "element") {
      const el = this.doc.elements.get(hit.id)
      if (!el) return
      const z = elementZ(el)
      const p = this.canvasPoint(interactor, z) ?? new vec2(el.x, el.y)
      this.press = {interactor, mode: "move", id: hit.id, planeZ: z, start: p, last: p, dragged: false}
    } else if (hit.type === "connection") {
      const p = new vec2(0, 0)
      this.press = {interactor, mode: "connection", id: hit.id, planeZ: 0, start: p, last: p, dragged: false}
    } else {
      this.beginMoveCanvas(interactor)
    }
  }

  private beginResizeCanvas(interactor: Interactor): boolean {
    const ray = this.activeRay(interactor)
    if (!ray || this.rayHitsDock(ray.origin, ray.dir)) return false
    const hit = this.borderUnderRay(ray.origin, ray.dir)
    if (!hit) return false
    this.links.select(null)
    this.activate(hit.canvas)
    const p = hit.canvas.rayPoint(ray.origin, ray.dir) ?? new vec2(0, 0)
    this.press = {
      interactor, mode: "resizeCanvas", id: null, planeZ: 0, start: p, last: p, dragged: false,
      resize: {grab: hit.grab, from: this.renderer.getBounds()},
    }
    hit.canvas.renderer.setBorderHighlight(hit.grab)
    return true
  }

  /** Mueve solo los lados agarrados: el opuesto se queda donde estaba. */
  private updateResizeCanvas(press: Press, p: vec2): void {
    const resize = press.resize
    if (!resize) return
    if (!press.dragged) {
      if (p.distance(press.start) <= TAP_SLOP) return
      press.dragged = true
    }
    const f = resize.from
    const dx = p.x - press.start.x
    const dy = p.y - press.start.y
    const next: Bounds = {minX: f.minX, maxX: f.maxX, minY: f.minY, maxY: f.maxY}
    if (resize.grab.x < 0) next.minX = Math.max(f.maxX - MAX_SIDE, Math.min(f.maxX - MIN_W, f.minX + dx))
    if (resize.grab.x > 0) next.maxX = Math.min(f.minX + MAX_SIDE, Math.max(f.minX + MIN_W, f.maxX + dx))
    if (resize.grab.y < 0) next.minY = Math.max(f.maxY - MAX_SIDE, Math.min(f.maxY - MIN_H, f.minY + dy))
    if (resize.grab.y > 0) next.maxY = Math.min(f.minY + MAX_SIDE, Math.max(f.minY + MIN_H, f.maxY + dy))
    this.renderer.resizeTo(next)
  }

  private endResizeCanvas(press: Press): void {
    this.renderer.setBorderHighlight(null)
    if (!press.dragged) {
      this.clearSelection()
      return
    }
    const b = this.renderer.getBounds()
    this.log("canvas " + this.active.id + " redimensionado a " + (b.maxX - b.minX).toFixed(1) + "x" + (b.maxY - b.minY).toFixed(1))
  }

  private startCanvasOutside(interactor: Interactor): void {
    const ray = this.activeRay(interactor)
    if (!ray || this.rayHitsDock(ray.origin, ray.dir) || this.rayNearAnyCanvas(ray.origin, ray.dir)) return
    this.beginNewCanvas()
    this.queryFirstCorner(ray.origin, ray.dir)
    this.press = {
      interactor, mode: "placeDrag", id: null, planeZ: 0,
      start: new vec2(0, 0), last: new vec2(0, 0), dragged: false,
    }
  }

  private onTriggerEnd(interactor: Interactor): void {
    const press = this.press
    if (!press || press.interactor !== interactor) return
    this.press = null

    switch (press.mode) {
      case "placeDrag": {
        // Mantener y soltar lejos también define el rectángulo; un pellizco corto espera al segundo.
        const ray = this.activeRay(interactor)
        if (ray && this.corner) {
          const q = this.intersectPlane(ray.origin, ray.dir, this.corner, this.planeNormal)
          if (q && q.distance(this.corner) > DRAG_PLACE_DISTANCE * this.canvasScale) this.finishPlacement(q)
        }
        break
      }
      case "move":
        if (press.dragged && press.id) this.endMove(press.id)
        else if (press.id) this.tapElement(press.id)
        break
      case "connection":
        this.selectConnection(press.id)
        break
      case "connect":
        this.endConnect(press, interactor)
        break
      case "draw":
        this.endStroke()
        break
      case "erase":
        this.log("goma: quedan " + this.countStrokes() + " trazos")
        break
      case "moveCanvas":
        this.endMoveCanvas(press)
        break
      case "resizeCanvas":
        this.endResizeCanvas(press)
        break
    }
  }

  private update(): void {
    flushRetired()
    this.updateLinkButtons()
    this.handwriting.update(this.drawing ? this.active : null)
    this.updateCollaborator()
    this.commitUndoStates()
    this.updateDeleteState()
    this.updateFlip()
    if (this.phase === "place") {
      this.updatePlacement()
      return
    }

    // Texto legible desde el otro lado de una mesa: gira media vuelta en cada gafa.
    const eye = this.camera.getWorldPosition()
    for (const c of this.canvases) {
      c.renderer.setTextFlipped(c.orientation === "horizontal" && c.toLocal(eye).y > 0)
      this.updateEdgeBarPose(c)
      this.updateButtonsVisibility(c, eye)
      if (this.library?.canvas === c) this.library.panel.place(c.renderer.getBounds())
    }
    this.links.update()
    this.updateEraserRing()

    const press = this.press
    if (!press) {
      this.updateHover()
      return
    }
    if (press.mode === "moveCanvas") {
      this.updateMoveCanvas(press)
      return
    }
    if (press.mode === "erase") {
      this.eraseStep(press)
      return
    }
    const p = this.canvasPoint(press.interactor, press.planeZ)
    if (!p) return

    if (press.mode === "move" && press.id) {
      if (!press.dragged && p.distance(press.start) > TAP_SLOP) {
        press.dragged = true
        this.ensureSelected(press.id)
      }
      if (press.dragged) {
        this.doc.moveBy(press.id, p.x - press.last.x, p.y - press.last.y)
        press.last = p
      }
    } else if (press.mode === "connect") {
      this.updateConnectRubber(press, p)
      press.dragged = true
    } else if (press.mode === "draw") {
      this.extendStroke(p)
    } else if (press.mode === "resizeCanvas") {
      this.updateResizeCanvas(press, p)
    }
  }

  /** Mientras se arrastra, la flecha muestra de dónde sale y qué canvas la recibiría. */
  private updateConnectRubber(press: Press, p: vec2): void {
    const ray = this.activeRay(press.interactor)
    if (!ray) return
    const el = press.id ? this.doc.elements.get(press.id) : null
    const from = this.active.toWorld(el ? new vec3(el.x, el.y, press.planeZ + 0.2) : new vec3(press.start.x, press.start.y, 0.3))
    const candidate = this.canvasUnderRay(ray.origin, ray.dir, this.active)
    let to = this.active.toWorld(new vec3(p.x, p.y, press.planeZ + 0.2))
    if (candidate) {
      const q = candidate.rayPoint(ray.origin, ray.dir)
      if (q) to = candidate.toWorld(new vec3(q.x, q.y, 0.3))
    }
    appendArrow(this.linkRubber.begin(), from, to, this.active.scale)
    this.linkRubber.commit()
    this.linkRubber.setVisible(true)
    this.refreshBorders(candidate)
  }

  private updateHover(): void {
    let hoverCanvas: CanvasInstance | null = null
    let hoverId: string | null = null
    let border: {canvas: CanvasInstance; grab: BorderGrab} | null = null
    if (this.tool !== "draw" && this.tool !== "erase") {
      const it = SIK.InteractionManager.getTargetingInteractors()[0]
      const current = it ? it.currentInteractable : null
      const resolved = this.resolveTarget(current)
      if (resolved && "canvas" in resolved && resolved.hit.type === "element") {
        hoverCanvas = resolved.canvas
        hoverId = resolved.hit.id
      }
      const free = !current || (resolved && "canvas" in resolved && resolved.hit.type === "surface")
      if (this.tool === "select" && it && free && it.startPoint && it.direction && !this.rayHitsDock(it.startPoint, it.direction)) {
        border = this.borderUnderRay(it.startPoint, it.direction)
      }
    }
    for (const c of this.canvases) {
      c.renderer.setHover(c === hoverCanvas ? hoverId : null)
      // El lado se ilumina al apuntarlo: es la pista de que se puede arrastrar.
      c.renderer.setBorderHighlight(border?.canvas === c ? border.grab : null)
    }
  }

  // ── Selección ────────────────────────────────────────────────────────────

  private clearSelection(): void {
    this.selection.clear()
    this.selectedConn = null
    this.links.select(null)
    this.publishSelection()
  }

  private selectWithGroup(id: string): void {
    const el = this.doc.elements.get(id)
    if (!el) return
    this.selection.add(id)
    if (el.groupId) {
      this.doc.elements.forEach((o) => {
        if (o.groupId === el.groupId) this.selection.add(o.id)
      })
    }
  }

  private ensureSelected(id: string): void {
    if (this.selection.has(id)) return
    if (!this.multi) this.selection.clear()
    this.selectedConn = null
    this.selectWithGroup(id)
    this.publishSelection()
  }

  private tapElement(id: string): void {
    const now = getTime()
    const isDouble = this.lastTap.id === id && now - this.lastTap.time < DOUBLE_TAP
    this.lastTap = {id, time: now}
    this.selectedConn = null
    if (this.multi) {
      if (this.selection.has(id)) this.selection.delete(id)
      else this.selectWithGroup(id)
    } else {
      this.selection.clear()
      this.selectWithGroup(id)
    }
    this.publishSelection()
    if (isDouble && !this.multi) this.beginEditing()
  }

  private selectConnection(id: string | null): void {
    this.selection.clear()
    this.selectedConn = id
    this.publishSelection()
  }

  private publishSelection(): void {
    this.renderer.setSelection(this.selection, this.selectedConn)
    this.refreshColorTargets()
    if (this.phase !== "work" || this.editing || getTime() < this.noticeUntil) return
    if (this.selection.size > 1) {
      this.dock.setStatus(this.selection.size + " elementos seleccionados")
    } else if (this.selection.size === 1) {
      const el = this.selectedElement()
      this.dock.setStatus(el ? this.describe(el) : "")
    } else if (this.links.getSelected()) {
      this.dock.setStatus("Enlace entre canvas seleccionado: pulsa Borrar para quitarlo")
    } else if (this.selectedConn) {
      this.dock.setStatus("Flecha seleccionada: edita su etiqueta o bórrala")
    } else {
      this.dock.setStatus(this.toolHint())
    }
  }

  private describe(el: CanvasElement): string {
    const label = el.text ? el.text.split("\n")[0] : el.kind === "stroke" ? "Trazo" : "Sin texto"
    return "Seleccionado: " + label + " · capa " + (el.layer + 1)
  }

  private toolHint(): string {
    switch (this.tool) {
      case "connect":
        return "Arrastra de un bloque a otro, o de este canvas a otro canvas"
      case "draw":
        return "Dibuja sobre el canvas: fuera de él no se pinta"
      case "erase":
        return "Arrastra para borrar: los trazos se borran por partes y lo demás, entero"
      case "underline":
        return "Pellizca un elemento para subrayarlo"
      default:
        return this.multi
          ? "Toca varios elementos y pulsa Agrupar"
          : "Arrastra el canvas para moverlo o un borde para estirarlo. Mantén pulsado para agarrarlo"
    }
  }

  private selectedElement(): CanvasElement | null {
    const first = this.selection.values().next()
    return first.done ? null : (this.doc.elements.get(first.value) ?? null)
  }

  // ── Movimiento, conexión y dibujo ────────────────────────────────────────

  private endMove(id: string): void {
    const set = this.doc.moveSet(id)
    for (const el of set) this.renderer.growToFit(el.id)
    this.assignToScreen(id)
    this.log("movido " + id)
  }

  /** Soltar un elemento dentro de una pantalla lo guarda en ella; sacarlo lo libera. */
  private assignToScreen(id: string): void {
    const el = this.doc.elements.get(id)
    if (!el || el.kind === "screen" || el.kind === "stroke" || el.groupId) return
    let best: CanvasElement | null = null
    this.doc.elements.forEach((s) => {
      if (s.kind !== "screen" || s.layer !== el.layer) return
      const inside = Math.abs(el.x - s.x) < s.w / 2 && Math.abs(el.y - s.y) < s.h / 2
      if (inside && (!best || s.w * s.h < best.w * best.h)) best = s
    })
    const parent = (best as CanvasElement | null)?.id ?? null
    if (el.parentId !== parent) this.doc.update(id, {parentId: parent})
  }

  private endConnect(press: Press, interactor: Interactor): void {
    this.linkRubber.setVisible(false)
    this.refreshBorders()
    const ray = this.activeRay(interactor)
    const other = ray ? this.canvasUnderRay(ray.origin, ray.dir, this.active) : null
    if (other) {
      const added = this.links.add(this.active, other)
      this.dock.setStatus(added ? "Canvas enlazados" : "Esos canvas ya están enlazados")
      this.log("enlace " + this.active.id + " -> " + other.id + (added ? "" : " (ya existia)"))
      return
    }
    if (!press.id) {
      this.dock.setStatus("Suelta la flecha sobre otro canvas")
      return
    }
    const direct = this.renderer.target(interactor.currentInteractable)
    let toId: string | null = direct && direct.type === "element" ? direct.id : null
    if (toId === press.id || !toId) {
      toId = this.elementAtPointer(interactor, press.id)
    }
    if (!toId) {
      this.dock.setStatus("Suelta la flecha sobre otro bloque")
      return
    }
    const from = this.doc.elements.get(press.id)
    const taken = this.doc.outgoingCount(press.id)
    const label = from?.shape === "decision" ? (taken === 0 ? "Sí" : taken === 1 ? "No" : "") : ""
    const conn = this.doc.connect(press.id, toId, label)
    this.dock.setStatus(conn ? "Conexión creada" : "Esos bloques ya están conectados")
    this.log("conexion " + press.id + " -> " + toId + (conn ? "" : " (ya existia)"))
  }

  private elementAtPointer(interactor: Interactor, exclude: string): string | null {
    let found: string | null = null
    let foundZ = -Infinity
    this.doc.elements.forEach((el) => {
      if (el.id === exclude || el.kind === "stroke" || el.kind === "screen") return
      const z = elementZ(el)
      const p = this.canvasPoint(interactor, z)
      if (!p) return
      if (Math.abs(p.x - el.x) <= el.w / 2 && Math.abs(p.y - el.y) <= el.h / 2 && z > foundZ) {
        found = el.id
        foundZ = z
      }
    })
    return found
  }

  private insideCanvas(p: vec2): boolean {
    return this.active.contains(p)
  }

  private beginStroke(interactor: Interactor): void {
    const z = layerZ(this.activeLayer) + 0.9
    const p = this.canvasPoint(interactor, z)
    if (!p) return
    this.press = {interactor, mode: "draw", id: null, planeZ: z, start: p, last: p, dragged: true}
    if (this.insideCanvas(p)) this.startStrokeAt(p)
  }

  private startStrokeAt(p: vec2): void {
    this.drawing = this.doc.add({
      kind: "stroke",
      x: 0,
      y: 0,
      w: 2,
      h: 2,
      layer: this.activeLayer,
      color: this.color >= 0 ? this.color : 0,
      tint: this.drawTint ? [this.drawTint.x, this.drawTint.y, this.drawTint.z] : null,
      strokeWidth: STROKE_WIDTHS[this.widthIndex],
      points: [p],
    })
    this.handwriting.strokeStarted(this.active)
  }

  /** Solo se pinta dentro del canvas: al salir se cierra el trazo y al volver empieza otro. */
  private extendStroke(p: vec2): void {
    if (!this.insideCanvas(p)) {
      this.endStroke()
      return
    }
    if (!this.drawing) {
      this.startStrokeAt(p)
      return
    }
    const s = this.drawing
    const last = s.points[s.points.length - 1]
    if (p.distance(last) < STROKE_STEP) return
    s.points.push(p)
    this.doc.update(s.id, {points: s.points})
  }

  private endStroke(): void {
    const s = this.drawing
    this.drawing = null
    if (!s) return
    if (s.points.length < 2) {
      this.doc.remove(s.id)
      return
    }
    this.doc.update(s.id, this.strokeFrame(s.points))
    this.handwriting.strokeEnded(this.active, s.id)
    this.log("trazo con " + s.points.length + " puntos")
  }

  /** Cambia unos trazos escritos a mano por un texto con lo que dicen, en el mismo sitio. */
  private convertHandwriting(canvas: CanvasInstance, ids: string[], text: string, b: StrokeBounds): void {
    this.closeEdgeMenu()
    if (this.editing) this.finishEditing()
    this.activate(canvas)
    // El texto conserva el color de lo escrito: el libre de la rueda o, si no es el blanco por defecto, el de la paleta.
    const first = ids.map((id) => this.doc.elements.get(id)).find((el): el is CanvasElement => !!el)
    const inkColor = first ? (tintOf(first) ?? (first.color > 0 ? PALETTE[first.color]?.stroke ?? null : null)) : null
    for (const id of ids) {
      this.selection.delete(id)
      this.doc.remove(id)
    }
    const value = Array.from(text).slice(0, MAX_TEXT).join("")
    const chars = Array.from(value).length
    // La letra crece con la escritura, sin llegar a su tamaño: nunca menor que la normal ni mayor que el triple.
    const drawnLines = Math.max(1, value.split("\n").length)
    const drawnLineH = (b.maxY - b.minY) / drawnLines
    const scale = Math.max(1, Math.min(MAX_TEXT_SCALE, (drawnLineH * HANDWRITING_TEXT_RATIO) / TEXT_LINE_H))
    const naturalW = (chars / CHARS_PER_CM) * scale + TEXT_BOX_PADDING + 1
    const w = Math.max(10, Math.min(60 * scale, Math.max(b.maxX - b.minX, naturalW)))
    const perLine = Math.max(6, Math.floor(((w - TEXT_BOX_PADDING) * CHARS_PER_CM) / scale))
    const lines = Math.max(drawnLines, Math.ceil(chars / perLine))
    const h = lines * TEXT_LINE_H * scale + TEXT_BOX_PADDING
    const el = this.doc.add({
      kind: "text", shape: "rect", x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, w, h,
      layer: this.activeLayer, text: value, color: 0, textScale: scale,
      tint: inkColor ? [inkColor.x, inkColor.y, inkColor.z] : null,
    })
    this.growAround(el.id)
    this.dock.setStatus("Escritura convertida en texto. Deshacer recupera los trazos")
    this.log("escritura convertida en " + el.id)
  }

  /** Expresa un trazo respecto a su centro para que su caja de selección sea correcta. */
  private strokeFrame(points: vec2[]): Partial<CanvasElement> {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const p of points) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    return {
      x: cx,
      y: cy,
      w: Math.max(maxX - minX, 2),
      h: Math.max(maxY - minY, 2),
      points: points.map((p) => new vec2(p.x - cx, p.y - cy)),
    }
  }

  private countStrokes(): number {
    let n = 0
    this.doc.elements.forEach((el) => {
      if (el.kind === "stroke") n++
    })
    return n
  }

  /** Borra lo que toca desde la última posición: así un gesto rápido no deja huecos sin borrar. */
  private eraseStep(press: Press): void {
    const ray = this.activeRay(press.interactor)
    if (!ray) return
    const prev = press.eraseRay ?? ray
    press.eraseRay = {origin: ray.origin, dir: ray.dir}
    const strokes: CanvasElement[] = []
    this.doc.elements.forEach((el) => {
      if (el.kind === "stroke") strokes.push(el)
    })
    let removed = false
    for (const s of strokes) {
      // Cada capa está a otra profundidad: la goma se mide en el plano de cada trazo.
      const z = elementZ(s)
      const a = this.active.rayPoint(prev.origin, prev.dir, z)
      const b = this.active.rayPoint(ray.origin, ray.dir, z)
      if (a && b && this.eraseFromStroke(s, a, b)) removed = true
    }
    // Lo demás se borra entero al tocarlo. Una pantalla, solo por su borde: así se puede borrar lo
    // dibujado dentro sin perderla.
    const hits: string[] = []
    this.doc.elements.forEach((el) => {
      if (el.kind === "stroke") return
      const z = elementZ(el)
      const a = this.active.rayPoint(prev.origin, prev.dir, z)
      const b = this.active.rayPoint(ray.origin, ray.dir, z)
      if (a && b && this.eraserTouches(el, a, b)) hits.push(el.id)
    })
    if (hits.length > 0) {
      this.clearSelection()
      for (const id of hits) this.doc.remove(id)
      this.log("goma: borrados " + hits.join(", "))
      return
    }
    if (removed) this.publishSelection()
  }

  /** Si la goma, al pasar de a a b, toca el elemento; en una pantalla, solo su borde. */
  private eraserTouches(el: CanvasElement, a: vec2, b: vec2): boolean {
    const steps = Math.max(1, Math.ceil(a.distance(b) / ERASE_STEP))
    for (let i = 0; i <= steps; i++) {
      const p = vec2.lerp(a, b, i / steps)
      const dx = Math.abs(p.x - el.x) - el.w / 2
      const dy = Math.abs(p.y - el.y) - el.h / 2
      const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0))
      const distance = el.kind === "screen" && dx < 0 && dy < 0 ? -Math.max(dx, dy) : outside
      if (distance <= ERASER_RADIUS) return true
    }
    return false
  }

  /** Quita de un trazo lo que queda bajo la goma y lo parte si hace falta. Devuelve si desapareció entero. */
  private eraseFromStroke(s: CanvasElement, a: vec2, b: vec2): boolean {
    const reach = ERASER_RADIUS + s.strokeWidth / 2
    if (
      Math.max(a.x, b.x) < s.x - s.w / 2 - reach ||
      Math.min(a.x, b.x) > s.x + s.w / 2 + reach ||
      Math.max(a.y, b.y) < s.y - s.h / 2 - reach ||
      Math.min(a.y, b.y) > s.y + s.h / 2 + reach
    ) {
      return false
    }
    const points = resamplePolyline(
      s.points.map((p) => new vec2(s.x + p.x, s.y + p.y)),
      ERASE_STEP
    )
    const runs: vec2[][] = []
    let current: vec2[] = []
    let erased = false
    for (const p of points) {
      if (segmentDistance(p, a, b) <= reach) {
        erased = true
        if (current.length > 1) runs.push(current)
        current = []
      } else {
        current.push(p)
      }
    }
    if (current.length > 1) runs.push(current)
    if (!erased) return false
    if (runs.length === 0) {
      this.selection.delete(s.id)
      this.doc.remove(s.id)
      return true
    }
    this.doc.update(s.id, this.strokeFrame(runs[0]))
    for (let i = 1; i < runs.length; i++) {
      this.doc.add({
        kind: "stroke",
        layer: s.layer,
        color: s.color,
        tint: s.tint,
        strokeWidth: s.strokeWidth,
        parentId: s.parentId,
        groupId: s.groupId,
        ...this.strokeFrame(runs[i]),
      })
    }
    return false
  }

  /** Muestra lo que abarca la goma sobre el canvas al que se apunta. */
  private updateEraserRing(): void {
    const pressing = this.press?.mode === "erase"
    const ray = this.tool === "erase" ? this.activeRay(pressing ? this.press?.interactor : undefined) : null
    const canvas = !ray ? null : pressing ? this.active : this.canvasUnderRay(ray.origin, ray.dir, null)
    const z = canvas ? layerZ(canvas.activeLayer) + 1 : 0
    const p = canvas && ray ? canvas.rayPoint(ray.origin, ray.dir, z) : null
    this.eraserRing.setVisible(!!p)
    if (!canvas || !p) return
    const t = this.eraserRing.sceneObject.getTransform()
    t.setWorldPosition(canvas.toWorld(new vec3(p.x, p.y, z)))
    t.setWorldRotation(canvas.transform.getWorldRotation())
    t.setWorldScale(new vec3(canvas.scale, canvas.scale, canvas.scale))
  }

  private underline(id: string): void {
    const el = this.doc.elements.get(id)
    if (!el || el.kind === "stroke") return
    const w = el.w * 0.8
    this.doc.add({
      kind: "stroke",
      x: el.x,
      y: el.y - el.h / 2 - 0.8,
      w,
      h: 1.5,
      layer: el.layer,
      color: this.color >= 0 ? this.color : 3,
      strokeWidth: STROKE_WIDTHS[this.widthIndex],
      parentId: el.id,
      points: [new vec2(-w / 2, 0), new vec2(w / 2, 0)],
    })
    this.dock.setStatus("Subrayado añadido")
  }

  // ── Texto ────────────────────────────────────────────────────────────────

  /** Escribe en el elemento seleccionado o, si no hay ninguno, en un texto nuevo. */
  private startWriting(): void {
    const selected = this.selection.size === 1 ? this.selectedElement() : null
    if (selected && selected.kind !== "stroke") {
      this.setTool("select")
      this.selection.clear()
      this.selection.add(selected.id)
      this.publishSelection()
      this.beginEditing()
      return
    }
    this.addElement("text", "rect")
    this.beginEditing(true)
  }

  private beginEditing(created: boolean = false): void {
    if (this.selectedConn) {
      const c = this.doc.connections.get(this.selectedConn)
      this.editing = {type: "connection", id: this.selectedConn, original: c?.label ?? "", created: false, startH: 0}
      this.editFresh = false
      if (c) this.renderer.showCaretConnection(c, true)
      this.openKeyboard(c?.label ?? "")
    } else {
      const el = this.selectedElement()
      if (!el || el.kind === "stroke") {
        this.dock.setStatus("Selecciona primero un elemento con texto")
        return
      }
      this.editing = {type: "element", id: el.id, original: el.text, created, startH: el.h}
      this.editFresh = PLACEHOLDERS.indexOf(el.text) >= 0
      this.renderer.showCaretElement(el, true)
      this.openKeyboard(this.editFresh ? "" : el.text)
    }
    this.active?.bar?.setActive("write")
    this.dock.setStatus("Escribe con el teclado. Toca fuera del texto para terminar")
  }

  private openKeyboard(initial: string): void {
    // El teclado AR no se muestra en Preview; ahí se usa el teclado del ordenador (onKey).
    if (global.deviceInfoSystem.isEditor()) return
    const options = new TextInputSystem.KeyboardOptions()
    options.enablePreview = true
    options.keyboardType = TextInputSystem.KeyboardType.Text
    options.returnKeyType = TextInputSystem.ReturnKeyType.Done
    options.initialText = initial
    options.onTextChanged = (text: string) => {
      this.editFresh = false
      this.setEditingText(text)
    }
    options.onReturnKeyPressed = () => this.finishEditing()
    global.textInputSystem.requestKeyboard(options)
  }

  private currentEditingText(): string {
    if (!this.editing) return ""
    return this.editing.type === "element"
      ? (this.doc.elements.get(this.editing.id)?.text ?? "")
      : (this.doc.connections.get(this.editing.id)?.label ?? "")
  }

  private setEditingText(text: string): void {
    if (!this.editing) return
    if (Array.from(text).length > MAX_TEXT) {
      this.dock.setStatus("Máximo " + MAX_TEXT + " caracteres", "error")
      return
    }
    if (this.editing.type === "element") {
      this.doc.update(this.editing.id, {text})
      this.fitTextBox(this.editing.id, this.editing.startH)
      const el = this.doc.elements.get(this.editing.id)
      if (el) this.renderer.showCaretElement(el, true)
    } else {
      this.doc.updateConnection(this.editing.id, {label: text})
      const c = this.doc.connections.get(this.editing.id)
      if (c) this.renderer.showCaretConnection(c, true)
    }
  }

  private finishEditing(): void {
    const editing = this.editing
    if (!editing) return
    this.editing = null
    if (editing.type === "element") {
      const el = this.doc.elements.get(editing.id)
      if (el) {
        this.renderer.showCaretElement(el, false)
        this.settleText(el, editing.original, editing.created, editing.startH)
      }
    } else {
      const c = this.doc.connections.get(editing.id)
      if (c) this.renderer.showCaretConnection(c, false)
    }
    if (!global.deviceInfoSystem.isEditor()) global.textInputSystem.dismissKeyboard()
    this.refreshEdgeTool()
    this.publishSelection()
    this.log("texto terminado")
  }

  /** Crece hacia abajo con el texto, sin bajar del tamaño con el que empezó a editarse. */
  private fitTextBox(id: string, startH: number): void {
    const el = this.doc.elements.get(id)
    if (!el || (el.kind !== "note" && el.kind !== "text")) return
    const scale = el.textScale ?? 1
    const perLine = Math.max(6, Math.floor(((el.w - TEXT_BOX_PADDING) * CHARS_PER_CM) / scale))
    const lines = Math.ceil(Array.from(el.text).length / perLine)
    const h = Math.max(startH, lines * TEXT_LINE_H * scale + TEXT_BOX_PADDING)
    if (h === el.h) return
    this.doc.update(id, {h, y: el.y + (el.h - h) / 2})
    this.growAround(id)
  }

  private settleText(el: CanvasElement, original: string, created: boolean, startH: number): void {
    const text = el.text.trim()
    const required = el.kind === "note" || el.kind === "text"
    if (created && (this.editFresh || !text)) {
      // Se pulsó Escribir y no se escribió nada: no deja un texto de ejemplo suelto.
      this.selection.delete(el.id)
      this.doc.remove(el.id)
    } else if (required && !text) {
      this.doc.update(el.id, {text: original, h: startH, y: el.y + (el.h - startH) / 2})
      this.noticeUntil = getTime() + NOTICE_TIME
      this.dock.setStatus("El texto no puede quedar vacío: se recupera el anterior", "error")
    } else if (text !== el.text) {
      this.doc.update(el.id, {text})
    }
  }

  private refreshEdgeTool(): void {
    const tool = this.tool
    for (const c of this.canvases) c.bar?.setActive(this.edgeToolFor(tool))
  }

  private edgeToolFor(tool: Tool): EdgeTool | null {
    return tool === "draw" ? "draw" : tool === "erase" ? "erase" : tool === "connect" ? "arrow" : null
  }

  private onKey(e: KeyPressEvent): void {
    if (!this.editing) return
    const key = e.key
    let typed: string
    if (key === Keys.Space) {
      typed = " "
    } else if (key >= Keys.Zero && key <= Keys.Nine) {
      typed = String(key - Keys.Zero)
    } else if (key >= Keys.A && key <= Keys.Z) {
      const letter = String.fromCharCode(97 + (key - Keys.A))
      typed = e.modifiers.indexOf(KeyModifiers.Shift) >= 0 ? letter.toUpperCase() : letter
    } else if (key === Keys.Backspace) {
      typed = ""
    } else {
      return // Shift o una flecha no escriben: el texto de ejemplo debe seguir esperando
    }
    const current = this.editFresh ? "" : this.currentEditingText()
    this.editFresh = false
    this.setEditingText(key === Keys.Backspace ? current.slice(0, -1) : current + typed)
  }

  // ── Acciones del panel ───────────────────────────────────────────────────

  private setTool(tool: Tool): void {
    this.tool = tool
    this.dock.setActive("tool:select", tool === "select")
    this.dock.setActive("tool:connect", tool === "connect")
    this.dock.setActive("tool:draw", tool === "draw")
    this.dock.setActive("tool:erase", tool === "erase")
    this.dock.setActive("tool:underline", tool === "underline")
    for (const c of this.canvases) c.bar?.setActive(this.edgeToolFor(tool))
    this.dock.setStatus(this.toolHint())
  }

  private onAction(action: string): void {
    const [verb, arg] = action.split(":")
    this.log("accion " + action)
    this.closeEdgeMenu()
    if (this.editing && verb !== "edit") this.finishEditing()
    switch (verb) {
      case "orient":
        this.orientation = arg === "h" ? "horizontal" : "vertical"
        this.syncPlacementButtons()
        this.corner = null
        this.cornerA.setVisible(false)
        this.canvasRoot.enabled = false
        break
      case "quick":
        this.quickPlace()
        break
      // De demostración, para el vídeo: avisan como si guardaran, pero no guardan nada.
      case "invite":
        this.inviteCollaborator()
        break
      case "save": {
        const placed = this.canvases.filter((c) => c.placed).length
        this.dock.setStatus(
          arg === "all"
            ? placed === 1 ? "Canvas guardado" : "Guardados los " + placed + " canvas"
            : "Canvas seleccionado guardado"
        )
        break
      }
      // Una Lens no puede cerrarse sola: solo informa.
      case "exit":
        this.dock.setStatus("Para salir, usa el gesto del sistema de las gafas")
        break
      case "tool":
        this.setTool(arg as Tool)
        break
      case "multi":
        this.multi = !this.multi
        this.dock.setActive("multi", this.multi)
        this.dock.setStatus(this.toolHint())
        break
      case "tab":
        this.dock.showTab(arg)
        break
      case "add":
        this.addElement(arg as ElementKind, "rect")
        break
      case "shape":
        this.addElement("shape", arg as ShapeKind)
        break
      case "sticker":
        this.addSticker(arg)
        break
      case "more":
        this.toggleLibrary(this.active, arg as LibraryKind)
        break
      case "color":
        this.setColor(parseInt(arg))
        break
      case "width":
        this.widthIndex = parseInt(arg)
        for (let i = 0; i < STROKE_WIDTHS.length; i++) this.dock.setActive("width:" + i, i === this.widthIndex)
        break
      case "layer":
        this.changeLayer(parseInt(arg))
        break
      case "edit":
        if (this.editing) this.finishEditing()
        else this.beginEditing()
        break
      case "group":
        this.groupSelection()
        break
      case "ungroup":
        this.ungroupSelection()
        break
      case "delete":
        this.deleteSelection()
        break
      case "template":
        this.useTemplate(arg as TemplateName)
        break
      case "canvasShape":
        this.changeShape(this.active, arg as CanvasShape)
        break
      case "flip":
        this.flip()
        break
      case "replace":
        this.beginReplace()
        break
      case "cancel":
        this.cancelPlacement()
        break
      case "clear":
        this.clearAll()
        break
    }
  }

  /** El color con el que se dibuja ahora: el de la rueda o, si no hay, el de la paleta. */
  private currentDrawColor(): vec4 {
    return this.drawTint ?? PALETTE[this.color >= 0 ? this.color : 0].stroke
  }

  /** Elementos seleccionados a los que la rueda puede cambiar el color: textos, figuras, notas y trazos. */
  private colorTargets(): CanvasElement[] {
    const out: CanvasElement[] = []
    this.selection.forEach((id) => {
      const el = this.doc.elements.get(id)
      if (el && el.kind !== "screen") out.push(el)
    })
    return out
  }

  private elementColor(el: CanvasElement): vec4 {
    const palette = PALETTE[el.color] ?? PALETTE[0]
    return tintOf(el) ?? (el.kind === "stroke" || el.kind === "text" ? palette.stroke : palette.fill)
  }

  /** Con un texto o una figura seleccionados, el círculo de color aparece en su canvas y muestra su color. */
  private refreshColorTargets(): void {
    const targets = this.colorTargets()
    for (const c of this.canvases) {
      const on = c === this.active && targets.length > 0
      c.bar?.setColorTarget(on)
      c.bar?.setDrawColor(on ? this.elementColor(targets[0]) : this.currentDrawColor())
    }
  }

  private setDrawTint(color: vec4): void {
    const rgb = [color.x, color.y, color.z]
    const targets = this.colorTargets()
    if (targets.length > 0) {
      for (const el of targets) this.doc.update(el.id, {tint: rgb})
      this.dock.setStatus(targets.length === 1 ? "Color cambiado" : "Color cambiado en " + targets.length + " elementos")
      this.log("color de " + targets.map((el) => el.id).join(", "))
      return
    }
    this.drawTint = color
    for (const c of this.canvases) c.bar?.setDrawColor(color)
    this.dock.setStatus("Color elegido: dibuja sobre el canvas")
    this.log("color de dibujo " + rgb.map((v) => v.toFixed(2)).join(","))
  }

  private setColor(index: number): void {
    this.color = index
    this.drawTint = null
    for (const c of this.canvases) c.bar?.setDrawColor(this.currentDrawColor())
    for (let i = 0; i < PALETTE.length; i++) this.dock.setActive("color:" + i, i === index)
    this.selection.forEach((id) => this.doc.update(id, {color: index, tint: null}))
  }

  private changeLayer(delta: number): void {
    const el = this.selectedElement()
    if (el) {
      this.doc.setLayer(el.id, el.layer + delta)
      this.activeLayer = this.doc.elements.get(el.id)?.layer ?? this.activeLayer
      this.publishSelection()
    } else {
      this.activeLayer = Math.max(0, Math.min(LAYER_COUNT - 1, this.activeLayer + delta))
      this.dock.setStatus("Lo nuevo se creará en la capa " + (this.activeLayer + 1))
    }
  }

  private nextSpawn(w: number, h: number): vec2 {
    const b: Bounds = this.renderer.getBounds()
    const cols = Math.max(1, Math.floor((b.maxX - b.minX - 8) / 17))
    const rows = Math.max(1, Math.floor((b.maxY - b.minY - 6) / 12))
    const total = cols * rows
    // Primera casilla libre que quepa en la forma; si ninguna cabe, va al centro y el canvas crecerá.
    for (let k = 0; k < total; k++) {
      const i = (this.spawnIndex + k) % total
      const x = b.minX + 4 + w / 2 + (i % cols) * 17
      const y = b.maxY - 3 - h / 2 - Math.floor(i / cols) * 12
      if (this.renderer.fitsRect(x, y, w + 2, h + 2)) {
        this.spawnIndex = i + 1
        return new vec2(x, y)
      }
    }
    this.spawnIndex++
    return new vec2((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2)
  }

  private addElement(kind: ElementKind, shape: ShapeKind): void {
    const key = kind === "shape" ? shape : kind
    const [w, h] = DEFAULT_SIZE[key] ?? [13, 8]
    const isScreen = kind === "screen"
    const b = this.renderer.getBounds()
    const pos = isScreen ? new vec2((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2) : this.nextSpawn(w, h)
    const color =
      this.color >= 0 ? this.color : kind === "note" ? NOTE_COLOR : shape === "decision" ? NOTE_COLOR : kind === "shape" ? 1 : 0
    const text =
      kind === "note" ? "Nueva nota" : kind === "text" ? "Texto" : isScreen ? "Pantalla" : (SHAPE_TEXT[shape] ?? "")
    const el = this.doc.add({kind, shape, x: pos.x, y: pos.y, w, h, layer: this.activeLayer, text, color})
    this.growAround(el.id)
    this.setTool("select")
    this.selection.clear()
    this.selectedConn = null
    this.selection.add(el.id)
    this.publishSelection()
    this.log("creado " + el.id)
  }

  private addSticker(name: string): void {
    const defs: Record<string, {shape: ShapeKind; color: number; text: string; kind?: ElementKind; size?: number}> = {
      star: {shape: "star", color: 3, text: ""},
      heart: {shape: "heart", color: 5, text: ""},
      warning: {shape: "triangle", color: 4, text: "!"},
      done: {shape: "circle", color: 2, text: "OK"},
      postit: {shape: "rect", color: NOTE_COLOR, text: "Post-it", kind: "note", size: 11},
      question: {shape: "circle", color: 1, text: "?"},
      idea: {shape: "circle", color: 3, text: "Idea"},
      like: {shape: "circle", color: 2, text: "+1"},
      urgent: {shape: "hexagon", color: 4, text: "!!"},
      stop: {shape: "octagon", color: 5, text: "STOP", size: 8},
    }
    const def = defs[name]
    if (!def) return
    const size = def.size ?? 7
    const pos = this.nextSpawn(size, size)
    const el = this.doc.add({
      kind: def.kind ?? "shape", shape: def.shape, x: pos.x, y: pos.y, w: size, h: size,
      layer: this.activeLayer, text: def.text, color: def.color,
    })
    this.growAround(el.id)
    this.setTool("select")
    this.selection.clear()
    this.selectedConn = null
    this.selection.add(el.id)
    this.publishSelection()
    this.log("sticker " + name)
  }

  /** Un canvas pequeño crece lo justo para contener lo que se le añade. */
  private growAround(id: string): void {
    this.renderer.growToFit(id)
  }

  private groupSelection(): void {
    const ids = Array.from(this.selection)
    if (this.doc.group(ids)) this.dock.setStatus(ids.length + " elementos agrupados")
    else this.dock.setStatus("Activa Varios y selecciona al menos dos elementos")
  }

  private ungroupSelection(): void {
    const el = this.selectedElement()
    if (!el?.groupId) {
      this.dock.setStatus("Este elemento no pertenece a un grupo")
      return
    }
    this.doc.ungroup(el.id)
    this.selection.clear()
    this.selection.add(el.id)
    this.publishSelection()
  }

  /** Con elementos seleccionados, pide una segunda pulsación, como la X del canvas. */
  private confirmElementDelete(): boolean {
    if (this.selection.size === 0) return true
    const key = Array.from(this.selection).sort().join()
    const armed = this.elementDeleteArmed
    if (armed?.key === key && getTime() <= armed.until) {
      this.disarmElementDelete()
      return true
    }
    this.elementDeleteArmed = {key, until: getTime() + DELETE_CONFIRM_TIME}
    this.dock.setActive("delete", true)
    const el = this.selection.size === 1 ? this.selectedElement() : null
    const name = el ? "«" + (el.text ? el.text.split("\n")[0] : "este elemento") + "»" : this.selection.size + " elementos"
    this.noticeUntil = getTime() + DELETE_CONFIRM_TIME
    this.dock.setStatus("Pulsa Borrar otra vez para eliminar " + name, "warning")
    return false
  }

  private disarmElementDelete(): void {
    this.elementDeleteArmed = null
    this.noticeUntil = 0
    this.dock.setActive("delete", false)
  }

  private deleteSelection(): void {
    if (!this.confirmElementDelete()) return
    const link = this.links.getSelected()
    if (link) this.links.remove(link)
    if (this.selectedConn) this.doc.removeConnection(this.selectedConn)
    Array.from(this.selection).forEach((id) => this.doc.remove(id))
    this.clearSelection()
  }

  private useTemplate(name: TemplateName): void {
    if (this.doc.elements.size > 0) {
      this.dock.setStatus("Vacía el canvas antes de aplicar una plantilla")
      return
    }
    const b = this.renderer.getBounds()
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    // Las plantillas necesitan espacio para ser legibles.
    if (w < 76 || h < 48) {
      const cx = (b.minX + b.maxX) / 2
      const cy = (b.minY + b.maxY) / 2
      this.renderer.setBounds({
        minX: cx - Math.max(w, 76) / 2,
        maxX: cx + Math.max(w, 76) / 2,
        minY: cy - Math.max(h, 48) / 2,
        maxY: cy + Math.max(h, 48) / 2,
      })
    }
    applyTemplate(this.doc, name, this.renderer.getBounds())
    this.doc.elements.forEach((el) => this.renderer.growToFit(el.id))
    this.setTool("select")
    this.dock.setStatus("Plantilla lista: todo se puede editar")
    this.log("plantilla " + name + " con " + this.doc.elements.size + " elementos")
  }

  private clearAll(): void {
    const now = getTime()
    if (now > this.clearArmedUntil) {
      this.clearArmedUntil = now + 3
      this.dock.setStatus("Pulsa Vaciar otra vez para borrarlo todo", "warning")
      return
    }
    this.clearArmedUntil = -1
    this.doc.clear()
    this.clearSelection()
    this.spawnIndex = 0
    this.dock.setStatus("Canvas vacío")
  }

  private log(msg: string): void {
    print("[CanvasAR] " + msg)
  }
}
