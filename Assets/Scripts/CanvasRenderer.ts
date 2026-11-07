// Dibuja el documento. Nunca decide nada: observa CanvasDocument y reconstruye lo que cambia.
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {CanvasConnection, CanvasDocument, CanvasElement, DocEvent, LAYER_COUNT} from "./CanvasDocument"
import {
  appendCone,
  appendFill,
  appendStroke,
  appendTube,
  appendWall,
  canvasOutline,
  CanvasShape,
  clearBuilder,
  createBuilder,
  insideConvex,
  outlineDistance,
  outlineFacing,
  outlineIntersection,
  roundedRect,
  shapeOutline,
} from "./CanvasGeometry"
import {COLOR, LAYER_GAP, PALETTE, RADIUS, withAlpha} from "./CanvasTheme"

const BASE_MATERIAL = requireAsset("../Materials/CanvasUnlit.mat") as Material
const THEME_FONT = requireAsset("../Fonts/Inter.ttf") as Font

const BODY_SIZE = 64
const TITLE_SIZE = 72
// Con este alfa, el texto sobre el canvas llega a 4,5:1 aunque detrás haya blanco.
const SURFACE_ALPHA = 0.75
// Grosor de la lámina, hacia detrás de la cara: de lado se ve como una hoja, no como un plano que desaparece.
const SHEET_DEPTH = 0.8
const SHEET_FRONT = -0.05
const SCREEN_ALPHA = 0.9

// Orden dentro de una capa: pantalla debajo, trazos encima.
const KIND_Z: Record<string, number> = {screen: 0, shape: 0.5, note: 0.5, text: 0.5, stroke: 0.9}

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Qué lados mueve agarrar el borde en un punto: -1 mínimo, 1 máximo, 0 ninguno. */
// El tramo resaltado es el que mira hacia el lado agarrado, hasta unos 60 grados de esa dirección.
const BORDER_HIGHLIGHT_DOT = 0.5
const BORDER_HIGHLIGHT_WIDTH = 0.3

export interface BorderGrab {
  x: number
  y: number
  distance: number
}

export type HitTarget =
  | {type: "element"; id: string}
  | {type: "connection"; id: string}
  | {type: "surface"}

export function layerZ(layer: number): number {
  return layer * LAYER_GAP
}

export function elementZ(el: CanvasElement): number {
  return layerZ(el.layer) + (KIND_Z[el.kind] ?? 0.5)
}

function makeMaterial(color: vec4, depthWrite: boolean): Material {
  const m = BASE_MATERIAL.clone()
  m.mainPass.baseColor = color
  m.mainPass.blendMode = BlendMode.Normal
  m.mainPass.twoSided = true
  m.mainPass.depthTest = true
  m.mainPass.depthWrite = depthWrite
  return m
}

/** Una malla procedural con su material propio. */
export class MeshSlot {
  readonly sceneObject: SceneObject
  readonly builder: MeshBuilder
  private visual: RenderMeshVisual
  private material: Material

  constructor(parent: SceneObject, name: string, color: vec4, depthWrite: boolean = true) {
    this.sceneObject = global.scene.createSceneObject(name)
    this.sceneObject.setParent(parent)
    this.builder = createBuilder()
    this.visual = this.sceneObject.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.material = makeMaterial(color, depthWrite)
    this.visual.mainMaterial = this.material
  }

  begin(): MeshBuilder {
    clearBuilder(this.builder)
    return this.builder
  }

  commit(): void {
    if (this.builder.getIndicesCount() === 0 || !this.builder.isValid()) {
      this.visual.enabled = false
      return
    }
    this.builder.updateMesh()
    this.visual.mesh = this.builder.getMesh()
    this.visual.enabled = true
  }

  setColor(c: vec4): void {
    this.material.mainPass.baseColor = c
  }

  setVisible(v: boolean): void {
    this.sceneObject.enabled = v
  }
}

function makeText(parent: SceneObject, size: number, color: vec4): Text {
  const so = global.scene.createSceneObject("Label")
  so.setParent(parent)
  const t = so.createComponent("Component.Text") as Text
  t.font = THEME_FONT
  t.size = size
  t.depthTest = true
  t.textFill.color = color
  t.horizontalAlignment = HorizontalAlignment.Center
  t.verticalAlignment = VerticalAlignment.Center
  t.horizontalOverflow = HorizontalOverflow.Wrap
  t.verticalOverflow = VerticalOverflow.Shrink
  return t
}

export function makeHitBox(so: SceneObject): {interactable: Interactable; shape: BoxShape; collider: ColliderComponent} {
  const collider = so.createComponent("Physics.ColliderComponent") as ColliderComponent
  const shape = Shape.createBoxShape()
  collider.fitVisual = false
  collider.shape = shape
  const interactable = so.createComponent(Interactable.getTypeName()) as Interactable
  return {interactable, shape, collider}
}

class ElementView {
  readonly root: SceneObject
  readonly interactable: Interactable
  private fill: MeshSlot
  private detail: MeshSlot
  private outline: MeshSlot
  private text: Text
  private textSo: SceneObject
  private shape: BoxShape
  private collider: ColliderComponent
  private selected = false
  private hovered = false

  constructor(parent: SceneObject, el: CanvasElement) {
    this.root = global.scene.createSceneObject(el.id)
    this.root.setParent(parent)
    this.fill = new MeshSlot(this.root, "Fill", PALETTE[0].fill)
    this.detail = new MeshSlot(this.root, "Detail", COLOR.text)
    this.outline = new MeshSlot(this.root, "Outline", COLOR.primary)
    this.text = makeText(this.root, BODY_SIZE, COLOR.text)
    this.textSo = this.text.getSceneObject()
    this.textSo.getTransform().setLocalPosition(new vec3(0, 0, 0.12))
    const hit = makeHitBox(this.root)
    this.interactable = hit.interactable
    this.shape = hit.shape
    this.collider = hit.collider
    this.rebuild(el)
  }

  rebuild(el: CanvasElement): void {
    this.root.getTransform().setLocalPosition(new vec3(el.x, el.y, elementZ(el)))
    const palette = PALETTE[el.color] ?? PALETTE[0]

    const fb = this.fill.begin()
    const db = this.detail.begin()
    const ob = this.outline.begin()

    if (el.kind === "stroke") {
      this.fill.setColor(palette.stroke)
      appendStroke(fb, el.points, false, el.strokeWidth, 0)
      appendStroke(ob, el.points, false, el.strokeWidth + 0.35, -0.02)
      this.text.enabled = false
    } else {
      const pts = el.kind === "text" ? roundedRect(el.w, el.h, RADIUS.small) : shapeOutline(el.shape, el.w, el.h)
      this.fill.setColor(this.fillColor(el))
      if (el.kind !== "text") appendFill(fb, pts, 0)
      if (el.kind === "screen" || el.kind === "note") appendStroke(db, pts, true, 0.1, 0.02)
      this.appendGateDetails(db, el)
      appendStroke(ob, pts, true, 0.28, 0.04)
      this.text.enabled = true
      this.applyText(el)
    }

    this.detail.setColor(el.kind === "screen" || el.kind === "note" ? COLOR.outline : COLOR.text)
    this.fill.commit()
    this.detail.commit()
    this.outline.commit()
    this.refreshOutline()

    this.shape.size = new vec3(Math.max(el.w, 2), Math.max(el.h, 2), 0.6)
    this.collider.shape = this.shape
  }

  private fillColor(el: CanvasElement): vec4 {
    if (el.kind === "screen") return withAlpha(COLOR.surface, SCREEN_ALPHA)
    return (PALETTE[el.color] ?? PALETTE[0]).fill
  }

  private appendGateDetails(b: MeshBuilder, el: CanvasElement): void {
    const hw = el.w / 2
    const hh = el.h / 2
    const pin = el.w * 0.16
    const stub = (x0: number, y0: number, x1: number, y1: number): void =>
      appendStroke(b, [new vec2(x0, y0), new vec2(x1, y1)], false, 0.22, 0.02)
    switch (el.shape) {
      case "and":
        stub(-hw - pin, hh * 0.45, -hw, hh * 0.45)
        stub(-hw - pin, -hh * 0.45, -hw, -hh * 0.45)
        stub(hw, 0, hw + pin, 0)
        break
      case "or":
      case "xor":
        stub(-hw - pin, hh * 0.45, -hw + el.w * 0.1, hh * 0.45)
        stub(-hw - pin, -hh * 0.45, -hw + el.w * 0.1, -hh * 0.45)
        stub(hw, 0, hw + pin, 0)
        if (el.shape === "xor") {
          const arc: vec2[] = []
          for (let i = 0; i <= 12; i++) {
            const t = i / 12
            arc.push(new vec2(-hw - el.w * 0.09 + Math.sin(t * Math.PI) * el.w * 0.14, hh - t * el.h))
          }
          appendStroke(b, arc, false, 0.22, 0.02)
        }
        break
      case "not": {
        const r = el.w * 0.07
        const bubble: vec2[] = []
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2
          bubble.push(new vec2(hw - r + Math.cos(a) * r, Math.sin(a) * r))
        }
        appendStroke(b, bubble, true, 0.22, 0.02)
        stub(-hw - pin, 0, -hw, 0)
        stub(hw, 0, hw + pin, 0)
        break
      }
      default:
        break
    }
  }

  private applyText(el: CanvasElement): void {
    const pad = el.kind === "screen" ? 1.4 : 0.9
    const isDiamond = el.shape === "decision"
    const insetX = isDiamond ? el.w * 0.2 : pad
    const insetY = isDiamond ? el.h * 0.2 : pad
    const isScreen = el.kind === "screen"
    this.text.size = isScreen ? TITLE_SIZE : BODY_SIZE
    this.text.verticalAlignment = isScreen ? VerticalAlignment.Top : VerticalAlignment.Center
    this.text.layoutRect = Rect.create(-el.w / 2 + insetX, el.w / 2 - insetX, -el.h / 2 + insetY, el.h / 2 - insetY)
    this.text.text = el.text
  }

  setCaret(el: CanvasElement, editing: boolean): void {
    this.text.text = editing ? el.text + "|" : el.text
  }

  setSelected(v: boolean): void {
    this.selected = v
    this.refreshOutline()
  }

  setHovered(v: boolean): void {
    this.hovered = v
    this.refreshOutline()
  }

  setTextFlipped(flip: boolean): void {
    this.textSo.getTransform().setLocalRotation(flip ? quat.fromEulerAngles(0, 0, Math.PI) : quat.quatIdentity())
  }

  private refreshOutline(): void {
    this.outline.setVisible(this.selected || this.hovered)
    this.outline.setColor(this.selected ? COLOR.primary : COLOR.outline)
  }

  destroy(): void {
    retire(this.root)
  }
}

class ConnectionView {
  readonly root: SceneObject
  readonly interactable: Interactable
  private tube: MeshSlot
  private outline: MeshSlot
  private handle: SceneObject
  private label: Text
  private labelSo: SceneObject
  private plate: MeshSlot

  constructor(parent: SceneObject, doc: CanvasDocument, conn: CanvasConnection) {
    this.root = global.scene.createSceneObject(conn.id)
    this.root.setParent(parent)
    this.tube = new MeshSlot(this.root, "Tube", COLOR.text)
    this.outline = new MeshSlot(this.root, "Selected", COLOR.primary)
    this.outline.setVisible(false)
    this.handle = global.scene.createSceneObject("Handle")
    this.handle.setParent(this.root)
    this.plate = new MeshSlot(this.handle, "Plate", COLOR.surface)
    this.label = makeText(this.handle, BODY_SIZE, COLOR.text)
    this.labelSo = this.label.getSceneObject()
    this.labelSo.getTransform().setLocalPosition(new vec3(0, 0, 0.12))
    const hit = makeHitBox(this.handle)
    this.interactable = hit.interactable
    hit.shape.size = new vec3(3.2, 3.2, 1.6)
    hit.collider.shape = hit.shape
    this.rebuild(doc, conn)
  }

  rebuild(doc: CanvasDocument, conn: CanvasConnection): void {
    const a = doc.elements.get(conn.from)
    const c = doc.elements.get(conn.to)
    if (!a || !c) return
    const path = connectionPath(a, c)
    const tb = this.tube.begin()
    const ob = this.outline.begin()
    const head = 1.5
    const n = path.length
    const tip = path[n - 1]
    const before = path[n - 2]
    const dir = tip.sub(before).normalize()
    const neck = tip.sub(dir.uniformScale(head))
    const body = path.slice(0, n - 1)
    body.push(neck)
    appendTube(tb, body, 0.16)
    appendCone(tb, neck, tip, 0.55)
    appendTube(ob, body, 0.3)
    this.tube.commit()
    this.outline.commit()

    const mid = path[Math.floor((n - 1) / 2)].add(path[Math.ceil((n - 1) / 2)]).uniformScale(0.5)
    this.handle.getTransform().setLocalPosition(mid.add(new vec3(0, 0, 0.3)))

    const hasLabel = conn.label.length > 0
    const pb = this.plate.begin()
    const pw = Math.max(3.2, conn.label.length * 1.1 + 1.8)
    if (hasLabel) appendFill(pb, roundedRect(pw, 2.8, 1.4), 0)
    else appendFill(pb, roundedRect(1.1, 1.1, 0.55), 0)
    this.plate.setColor(hasLabel ? COLOR.surface : COLOR.text)
    this.plate.commit()
    this.label.text = conn.label
    this.label.horizontalOverflow = HorizontalOverflow.Overflow
    this.label.layoutRect = Rect.create(-pw / 2, pw / 2, -1.2, 1.2)
  }

  setCaret(conn: CanvasConnection, editing: boolean): void {
    this.label.text = editing ? conn.label + "|" : conn.label
  }

  setSelected(v: boolean): void {
    this.outline.setVisible(v)
  }

  setTextFlipped(flip: boolean): void {
    this.labelSo.getTransform().setLocalRotation(flip ? quat.fromEulerAngles(0, 0, Math.PI) : quat.quatIdentity())
  }

  destroy(): void {
    retire(this.root)
  }
}

/** Línea entre los bordes reales de dos elementos; curva cuando cruza entre capas. */
export function connectionPath(a: CanvasElement, c: CanvasElement): vec3[] {
  const za = elementZ(a) + 0.15
  const zc = elementZ(c) + 0.15
  const dx = c.x - a.x
  const dy = c.y - a.y
  const edgeA = outlineIntersection(shapeOutline(a.shape, a.w, a.h), new vec2(dx, dy))
  const edgeC = outlineIntersection(shapeOutline(c.shape, c.w, c.h), new vec2(-dx, -dy))
  const p0 = new vec3(a.x + edgeA.x, a.y + edgeA.y, za)
  const p3 = new vec3(c.x + edgeC.x, c.y + edgeC.y, zc)
  if (Math.abs(za - zc) < 0.01) return [p0, p3]
  // Sale y llega perpendicular a cada capa para que el salto de nivel se lea como tal.
  const lift = (zc - za) * 0.55
  const p1 = p0.add(new vec3(0, 0, lift))
  const p2 = p3.add(new vec3(0, 0, -lift))
  const out: vec3[] = []
  const steps = 18
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push(
      p0
        .uniformScale(u * u * u)
        .add(p1.uniformScale(3 * u * u * t))
        .add(p2.uniformScale(3 * u * t * t))
        .add(p3.uniformScale(t * t * t))
    )
  }
  return out
}

// El cursor de SIK guarda durante un instante los objetos que apuntó y falla si ya no existen.
// Desactivar apaga sus colisionadores al momento; la destrucción real espera a que los olvide.
const RETIRE_DELAY = 1.5
// Holgura del contenido en una forma no rectangular: un margen mayor la agranda mucho.
const SHAPE_MARGIN = 0.5
// Hacia dentro, la franja del borde no debe comerse un canvas pequeño.
const BORDER_INNER_RATIO = 0.15
// En una forma no rectangular, a partir de qué parte del semieje un agarre mueve ese lado.
const BORDER_AXIS_THRESHOLD = 0.45
const retired: {so: SceneObject; at: number}[] = []

export function retire(so: SceneObject): void {
  so.enabled = false
  retired.push({so, at: getTime() + RETIRE_DELAY})
}

export function flushRetired(): void {
  const now = getTime()
  for (let i = retired.length - 1; i >= 0; i--) {
    if (now < retired[i].at) continue
    retired[i].so.destroy()
    retired.splice(i, 1)
  }
}

export class CanvasRenderer {
  readonly root: SceneObject
  private content: SceneObject
  private surface: MeshSlot
  private surfaceBorder: MeshSlot
  private sheetEdge: MeshSlot
  private sheetBack: MeshSlot
  private borderHighlight: MeshSlot
  private highlightGrab: BorderGrab | null = null
  private surfaceHit: {interactable: Interactable; shape: BoxShape; collider: ColliderComponent}
  private layerPlanes: MeshSlot[] = []
  private layerLabels: Text[] = []
  private elements = new Map<string, ElementView>()
  private connections = new Map<string, ConnectionView>()
  private targets = new Map<Interactable, HitTarget>()
  private bounds: Bounds = {minX: -30, maxX: 30, minY: -20, maxY: 20}
  private currentShape: CanvasShape = "rect"
  private outline: vec2[] = []
  // Tamaño anterior a que una forma lo agrandara: volver atrás no debe dejar el canvas crecido.
  private shapeBase: Bounds | null = null
  private textFlipped = false
  private hoveredId: string | null = null

  constructor(root: SceneObject, private doc: CanvasDocument) {
    this.root = root
    this.surface = new MeshSlot(root, "Surface", withAlpha(COLOR.surface, SURFACE_ALPHA), false)
    this.surfaceBorder = new MeshSlot(root, "SurfaceBorder", COLOR.outline, false)
    this.sheetEdge = new MeshSlot(root, "SheetEdge", withAlpha(COLOR.outline, 0.28), false)
    this.sheetBack = new MeshSlot(root, "SheetBack", withAlpha(COLOR.outline, 0.45), false)
    this.borderHighlight = new MeshSlot(root, "BorderHighlight", COLOR.primary, false)
    this.surfaceHit = makeHitBox(this.surface.sceneObject)
    this.targets.set(this.surfaceHit.interactable, {type: "surface"})
    for (let i = 1; i < LAYER_COUNT; i++) {
      const plane = new MeshSlot(root, "LayerPlane" + i, COLOR.outline, false)
      plane.setVisible(false)
      this.layerPlanes.push(plane)
      const label = makeText(plane.sceneObject, 39, COLOR.textMuted)
      label.horizontalAlignment = HorizontalAlignment.Left
      label.text = "Capa " + (i + 1)
      this.layerLabels.push(label)
    }
    this.content = global.scene.createSceneObject("Content")
    this.content.setParent(root)
    doc.subscribe((e) => this.onDocEvent(e))
    this.setBounds(this.bounds)
  }

  getBounds(): Bounds {
    return this.bounds
  }

  setContentVisible(v: boolean): void {
    this.content.enabled = v
  }

  get shape(): CanvasShape {
    return this.currentShape
  }

  /** Contorno centrado en el centro de los límites. */
  outlinePoints(): vec2[] {
    return this.outline
  }

  setShape(shape: CanvasShape): void {
    if (shape === this.currentShape) return
    const base = this.shapeBase ?? this.bounds
    this.currentShape = shape
    this.applyBounds(base)
    if (shape === "rect") this.doc.elements.forEach((el) => this.growToFit(el.id))
    else this.fitShapeToContent()
    this.shapeBase = base
  }

  /** Punto en unidades del canvas. El colisionador es rectangular: lo que cuenta es la forma. */
  containsPoint(p: vec2): boolean {
    const b = this.bounds
    if (p.x < b.minX || p.x > b.maxX || p.y < b.minY || p.y > b.maxY) return false
    if (this.currentShape === "rect") return true
    return insideConvex(this.outline, new vec2(p.x - (b.minX + b.maxX) / 2, p.y - (b.minY + b.maxY) / 2))
  }

  /** Si un rectángulo centrado en (x, y) cabe entero dentro de la forma. */
  fitsRect(x: number, y: number, w: number, h: number): boolean {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        if (!this.containsPoint(new vec2(x + (sx * w) / 2, y + (sy * h) / 2))) return false
      }
    }
    return true
  }

  setBounds(b: Bounds): void {
    this.shapeBase = null
    this.applyBounds(b)
  }

  /** El borde en ese punto, con una franja de hasta `margin` unidades a cada lado. */
  borderAt(p: vec2, margin: number): BorderGrab | null {
    const b = this.bounds
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    const inner = Math.min(margin, Math.min(w, h) * BORDER_INNER_RATIO)
    if (this.currentShape === "rect") {
      const side = (v: number, lo: number, hi: number): number => {
        if (v >= lo - margin && v <= lo + inner) return -1
        if (v >= hi - inner && v <= hi + margin) return 1
        return 0
      }
      if (p.x < b.minX - margin || p.x > b.maxX + margin || p.y < b.minY - margin || p.y > b.maxY + margin) return null
      const x = side(p.x, b.minX, b.maxX)
      const y = side(p.y, b.minY, b.maxY)
      if (x === 0 && y === 0) return null
      const dx = x === 0 ? Infinity : Math.abs(p.x - (x < 0 ? b.minX : b.maxX))
      const dy = y === 0 ? Infinity : Math.abs(p.y - (y < 0 ? b.minY : b.maxY))
      return {x, y, distance: Math.min(dx, dy)}
    }
    const cx = (b.minX + b.maxX) / 2
    const cy = (b.minY + b.maxY) / 2
    const rel = new vec2(p.x - cx, p.y - cy)
    const distance = outlineDistance(this.outline, rel)
    if (distance > (this.containsPoint(p) ? inner : margin)) return null
    const u = rel.x / (w / 2)
    const v = rel.y / (h / 2)
    const x = Math.abs(u) >= BORDER_AXIS_THRESHOLD ? Math.sign(u) : 0
    const y = Math.abs(v) >= BORDER_AXIS_THRESHOLD ? Math.sign(v) : 0
    return x === 0 && y === 0 ? null : {x, y, distance}
  }

  /** Se acerca todo lo posible a ese tamaño sin dejar contenido fuera; cada eje se limita por separado. */
  resizeTo(next: Bounds): void {
    const pts = this.contentPoints()
    const closest = (from: Bounds, to: Bounds): Bounds => {
      if (this.contentFits(pts, to)) return to
      const at = (t: number): Bounds => ({
        minX: from.minX + (to.minX - from.minX) * t,
        maxX: from.maxX + (to.maxX - from.maxX) * t,
        minY: from.minY + (to.minY - from.minY) * t,
        maxY: from.maxY + (to.maxY - from.maxY) * t,
      })
      let lo = 0
      let hi = 1
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2
        if (this.contentFits(pts, at(mid))) lo = mid
        else hi = mid
      }
      return lo > 0 ? at(lo) : from
    }
    const b = this.bounds
    const xDone = closest(b, {minX: next.minX, maxX: next.maxX, minY: b.minY, maxY: b.maxY})
    const done = closest(xDone, {minX: xDone.minX, maxX: xDone.maxX, minY: next.minY, maxY: next.maxY})
    if (done.minX !== b.minX || done.maxX !== b.maxX || done.minY !== b.minY || done.maxY !== b.maxY) this.setBounds(done)
  }

  private contentFits(pts: vec2[], b: Bounds): boolean {
    if (this.currentShape === "rect") {
      return pts.every((p) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY)
    }
    const outline = canvasOutline(this.currentShape, b.maxX - b.minX, b.maxY - b.minY, RADIUS.card)
    const cx = (b.minX + b.maxX) / 2
    const cy = (b.minY + b.maxY) / 2
    return pts.every((p) => insideConvex(outline, new vec2(p.x - cx, p.y - cy)))
  }

  private applyBounds(b: Bounds): void {
    this.bounds = b
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    const cx = (b.minX + b.maxX) / 2
    const cy = (b.minY + b.maxY) / 2
    // El colisionador se centra en su objeto, así que la superficie se mueve con el centro.
    const pts = canvasOutline(this.currentShape, w, h, RADIUS.card)
    this.outline = pts
    appendFill(this.surface.begin(), pts, SHEET_FRONT)
    this.surface.commit()
    appendWall(this.sheetEdge.begin(), pts, SHEET_FRONT, SHEET_FRONT - SHEET_DEPTH)
    this.sheetEdge.commit()
    appendStroke(this.sheetBack.begin(), pts, true, 0.08, SHEET_FRONT - SHEET_DEPTH)
    this.sheetBack.commit()
    this.sheetEdge.sceneObject.getTransform().setLocalPosition(new vec3(cx, cy, 0))
    this.sheetBack.sceneObject.getTransform().setLocalPosition(new vec3(cx, cy, 0))
    appendStroke(this.surfaceBorder.begin(), pts, true, 0.12, -0.03)
    this.surfaceBorder.commit()
    this.surfaceHit.shape.size = new vec3(w, h, 0.2)
    this.surfaceHit.collider.shape = this.surfaceHit.shape
    this.surface.sceneObject.getTransform().setLocalPosition(new vec3(cx, cy, 0))
    this.surfaceBorder.sceneObject.getTransform().setLocalPosition(new vec3(cx, cy, 0))
    this.borderHighlight.sceneObject.getTransform().setLocalPosition(new vec3(cx, cy, 0))
    this.drawBorderHighlight()
    this.refreshLayerPlanes()
  }

  /** Crece para contener lo que se haya sacado de la zona inicial. Nunca encoge. */
  growToFit(id: string): void {
    const el = this.doc.elements.get(id)
    if (!el) return
    const m = 2
    const b = this.bounds
    if (this.currentShape !== "rect") {
      this.fitShapeToContent()
      return
    }
    const next: Bounds = {
      minX: Math.min(b.minX, el.x - el.w / 2 - m),
      maxX: Math.max(b.maxX, el.x + el.w / 2 + m),
      minY: Math.min(b.minY, el.y - el.h / 2 - m),
      maxY: Math.max(b.maxY, el.y + el.h / 2 + m),
    }
    if (next.minX !== b.minX || next.maxX !== b.maxX || next.minY !== b.minY || next.maxY !== b.maxY) {
      this.setBounds(next)
    }
  }

  private contentPoints(): vec2[] {
    const pts: vec2[] = []
    this.doc.elements.forEach((el) => {
      if (el.kind === "stroke" && el.points) {
        for (const p of el.points) pts.push(new vec2(el.x + p.x, el.y + p.y))
        return
      }
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          pts.push(new vec2(el.x + sx * (el.w / 2 + SHAPE_MARGIN), el.y + sy * (el.h / 2 + SHAPE_MARGIN)))
        }
      }
    })
    return pts
  }

  /**
   * Lo mínimo para que el contenido quepa, sin cambiar de proporción: crece solo lo necesario y se
   * desplaza solo lo necesario. En un triángulo el contenido se apoya en la base, donde es ancho.
   */
  private fitShapeToContent(): void {
    const pts = this.contentPoints()
    if (pts.every((p) => this.containsPoint(p))) return
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const x0 = Math.min(...xs)
    const x1 = Math.max(...xs)
    const y0 = Math.min(...ys)
    const y1 = Math.max(...ys)
    const b = this.bounds
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    const from = new vec2((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2)
    const tx = (x0 + x1) / 2
    let factor = 1
    let ty = (y0 + y1) / 2
    if (this.currentShape === "triangle") {
      const fitH = y1 - y0 + (x1 - x0) * (h / w)
      factor = Math.max(1, fitH / h)
      ty = y0 + (h * factor) / 2
    } else {
      for (const p of pts) {
        const rel = new vec2(p.x - tx, p.y - ty)
        const edge = outlineIntersection(this.outline, rel).length
        if (edge > 0) factor = Math.max(factor, rel.length / edge)
      }
    }
    factor *= 1.002 // los puntos que tocan justo el contorno no deben contar como fuera
    const at = (t: number) => new vec2(from.x + (tx - from.x) * t, from.y + (ty - from.y) * t)
    const fits = (c: vec2) => pts.every((p) => insideConvex(this.outline, new vec2((p.x - c.x) / factor, (p.y - c.y) / factor)))
    let lo = 0
    let hi = 1
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2
      if (fits(at(mid))) hi = mid
      else lo = mid
    }
    const c = at(hi)
    const hw = (w / 2) * factor
    const hh = (h / 2) * factor
    this.setBounds({minX: c.x - hw, maxX: c.x + hw, minY: c.y - hh, maxY: c.y + hh})
  }

  private refreshLayerPlanes(): void {
    const used = new Set<number>()
    this.doc.elements.forEach((e) => used.add(e.layer))
    const b = this.bounds
    const pts = this.outline.map((p) => new vec2(p.x + (b.minX + b.maxX) / 2, p.y + (b.minY + b.maxY) / 2))
    for (let i = 1; i < LAYER_COUNT; i++) {
      const slot = this.layerPlanes[i - 1]
      const visible = used.has(i)
      slot.setVisible(visible)
      if (!visible) continue
      appendStroke(slot.begin(), pts, true, 0.1, layerZ(i))
      slot.commit()
      const label = this.layerLabels[i - 1]
      label.getSceneObject().getTransform().setLocalPosition(new vec3(b.minX + 5, b.maxY + 1.4, layerZ(i)))
      label.horizontalOverflow = HorizontalOverflow.Overflow
      label.layoutRect = Rect.create(-4, 4, -1, 1)
    }
  }

  private onDocEvent(e: DocEvent): void {
    switch (e.type) {
      case "added": {
        const el = this.doc.elements.get(e.id)
        if (!el) return
        const v = new ElementView(this.content, el)
        v.setTextFlipped(this.textFlipped)
        this.elements.set(e.id, v)
        this.targets.set(v.interactable, {type: "element", id: e.id})
        this.refreshLayerPlanes()
        break
      }
      case "changed": {
        const el = this.doc.elements.get(e.id)
        const v = this.elements.get(e.id)
        if (el && v) v.rebuild(el)
        this.rebuildConnectionsOf(e.id)
        this.refreshLayerPlanes()
        break
      }
      case "removed": {
        const v = this.elements.get(e.id)
        if (v) {
          this.targets.delete(v.interactable)
          v.destroy()
          this.elements.delete(e.id)
        }
        this.refreshLayerPlanes()
        break
      }
      case "connAdded": {
        const c = this.doc.connections.get(e.id)
        if (!c) return
        const v = new ConnectionView(this.content, this.doc, c)
        v.setTextFlipped(this.textFlipped)
        this.connections.set(e.id, v)
        this.targets.set(v.interactable, {type: "connection", id: e.id})
        break
      }
      case "connChanged": {
        const c = this.doc.connections.get(e.id)
        const v = this.connections.get(e.id)
        if (c && v) v.rebuild(this.doc, c)
        break
      }
      case "connRemoved": {
        const v = this.connections.get(e.id)
        if (v) {
          this.targets.delete(v.interactable)
          v.destroy()
          this.connections.delete(e.id)
        }
        break
      }
    }
  }

  private rebuildConnectionsOf(elementId: string): void {
    this.doc.connections.forEach((c) => {
      if (c.from === elementId || c.to === elementId) this.connections.get(c.id)?.rebuild(this.doc, c)
    })
  }

  target(i: Interactable | null): HitTarget | null {
    return i ? (this.targets.get(i) ?? null) : null
  }

  setSelection(ids: Set<string>, connId: string | null): void {
    this.elements.forEach((v, id) => v.setSelected(ids.has(id)))
    this.connections.forEach((v, id) => v.setSelected(id === connId))
  }

  setHover(id: string | null): void {
    if (id === this.hoveredId) return
    if (this.hoveredId) this.elements.get(this.hoveredId)?.setHovered(false)
    this.hoveredId = id
    if (id) this.elements.get(id)?.setHovered(true)
  }

  showCaretElement(el: CanvasElement, editing: boolean): void {
    this.elements.get(el.id)?.setCaret(el, editing)
  }

  showCaretConnection(c: CanvasConnection, editing: boolean): void {
    this.connections.get(c.id)?.setCaret(c, editing)
  }

  setTextFlipped(flip: boolean): void {
    if (flip === this.textFlipped) return
    this.textFlipped = flip
    this.elements.forEach((v) => v.setTextFlipped(flip))
    this.connections.forEach((v) => v.setTextFlipped(flip))
  }

  setBorderColor(c: vec4): void {
    this.surfaceBorder.setColor(c)
  }

  /** Resalta solo el lado que se agarraría; en una esquina, sus dos lados. */
  setBorderHighlight(grab: BorderGrab | null): void {
    const before = this.highlightGrab
    if (before === grab || (before && grab && before.x === grab.x && before.y === grab.y)) return
    this.highlightGrab = grab
    this.drawBorderHighlight()
  }

  private drawBorderHighlight(): void {
    const builder = this.borderHighlight.begin()
    const grab = this.highlightGrab
    if (grab) {
      for (const run of outlineFacing(this.outline, new vec2(grab.x, grab.y).normalize(), BORDER_HIGHLIGHT_DOT)) {
        appendStroke(builder, run, false, BORDER_HIGHLIGHT_WIDTH, -0.02)
      }
    }
    this.borderHighlight.commit()
  }
}
