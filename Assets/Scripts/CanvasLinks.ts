// Flechas entre canvas, o de un canvas a un punto del entorno real. Guardan solo quién enlaza con quién (o con qué
// punto): la forma se deduce de sus poses.
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {appendCone, appendTube, outlineIntersection} from "./CanvasGeometry"
import {CanvasInstance} from "./CanvasInstance"
import {makeHitBox, MeshSlot, retire} from "./CanvasRenderer"
import {COLOR} from "./CanvasTheme"

const LIFT = 0.3
const TUBE = 0.2
const HEAD_RADIUS = 0.7
const HEAD_LENGTH = 2
// Grosor (cm) de la zona pulsable de una flecha al entorno, a lo largo de toda ella.
const WORLD_HIT_THICKNESS = 4

function center(inst: CanvasInstance): vec2 {
  const b = inst.renderer.getBounds()
  return new vec2((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2)
}

/** Punto del borde de un canvas en dirección a otro punto del mundo. */
function edgeToward(inst: CanvasInstance, world: vec3): vec3 {
  const c = center(inst)
  const local = inst.toLocal(world)
  const toward = new vec2(local.x - c.x, local.y - c.y)
  const edge = outlineIntersection(inst.renderer.outlinePoints(), toward)
  return inst.toWorld(new vec3(c.x + edge.x, c.y + edge.y, LIFT))
}

export function worldCenter(inst: CanvasInstance): vec3 {
  const c = center(inst)
  return inst.toWorld(new vec3(c.x, c.y, LIFT))
}

function poseKey(inst: CanvasInstance): string {
  const p = inst.transform.getWorldPosition()
  const r = inst.transform.getWorldRotation()
  const b = inst.renderer.getBounds()
  return [p.x, p.y, p.z, r.x, r.y, r.z, r.w, inst.scale, inst.renderer.shape, b.minX, b.maxX, b.minY, b.maxY].join(",")
}

export function appendArrow(tube: MeshBuilder, from: vec3, to: vec3, scale: number): void {
  const length = to.distance(from)
  if (length < 0.5) return
  const dir = to.sub(from).normalize()
  const neck = to.sub(dir.uniformScale(Math.min(HEAD_LENGTH * scale, length * 0.5)))
  appendTube(tube, [from, neck], TUBE * scale)
  appendCone(tube, neck, to, HEAD_RADIUS * scale)
}

class LinkView {
  readonly interactable: Interactable
  private root: SceneObject
  private tube: MeshSlot
  private outline: MeshSlot
  private handle: SceneObject
  private dot: MeshSlot
  private hit: {shape: BoxShape; collider: ColliderComponent}
  private key = ""

  /** `to`: otro canvas, o un punto fijo del mundo al que apunta (un objeto físico, sin reconocerlo). */
  constructor(parent: SceneObject, id: string, readonly from: CanvasInstance, readonly to: CanvasInstance | vec3) {
    this.root = global.scene.createSceneObject(id)
    this.root.setParent(parent)
    this.tube = new MeshSlot(this.root, "Tube", COLOR.text)
    this.outline = new MeshSlot(this.root, "Selected", COLOR.primary)
    this.outline.setVisible(false)
    this.handle = global.scene.createSceneObject("Handle")
    this.handle.setParent(this.root)
    this.dot = new MeshSlot(this.handle, "Dot", COLOR.text)
    const hit = makeHitBox(this.handle)
    hit.shape.size = new vec3(3.4, 3.4, 3.4)
    hit.collider.shape = hit.shape
    this.hit = hit
    this.interactable = hit.interactable
    appendTube(this.dot.begin(), [new vec3(-0.5, 0, 0), new vec3(0.5, 0, 0)], 0.6)
    this.dot.commit()
    this.refresh()
  }

  refresh(): void {
    const to = this.to
    const point = to instanceof CanvasInstance ? null : to
    const key = poseKey(this.from) + "|" + (point ? point.toString() : poseKey(to as CanvasInstance))
    if (key === this.key) return
    this.key = key
    const target = point ?? worldCenter(to as CanvasInstance)
    const start = edgeToward(this.from, target)
    const end = point ?? edgeToward(to as CanvasInstance, worldCenter(this.from))
    const scale = point ? this.from.scale : (this.from.scale + (to as CanvasInstance).scale) / 2
    const tb = this.tube.begin()
    appendArrow(tb, start, end, scale)
    this.tube.commit()
    const ob = this.outline.begin()
    if (end.distance(start) > 0.5) appendTube(ob, [start, end], TUBE * 2 * scale)
    this.outline.commit()
    const t = this.handle.getTransform()
    t.setWorldPosition(start.add(end).uniformScale(0.5))
    if (point) {
      // Hacia el entorno la flecha suele ser larga y lejana: se pulsa en cualquier punto de ella, no solo en el centro.
      const dir = end.sub(start)
      const length = Math.max(dir.length, 1)
      const up = Math.abs(dir.normalize().y) > 0.95 ? vec3.forward() : vec3.up()
      t.setWorldRotation(quat.lookAt(dir.normalize(), up))
      t.setWorldScale(vec3.one())
      this.hit.shape.size = new vec3(WORLD_HIT_THICKNESS, WORLD_HIT_THICKNESS, length)
      this.hit.collider.shape = this.hit.shape
      return
    }
    t.setWorldRotation(this.from.transform.getWorldRotation())
    t.setWorldScale(new vec3(scale, scale, scale))
  }

  setSelected(v: boolean): void {
    this.outline.setVisible(v)
  }

  /** Apunta a un punto del entorno, no a otro canvas. */
  get pointsAtWorld(): boolean {
    return !(this.to instanceof CanvasInstance)
  }

  destroy(): void {
    retire(this.root)
  }
}

export class CanvasLinks {
  private root: SceneObject
  private views = new Map<string, LinkView>()
  private nextId = 1
  private selected: string | null = null

  constructor(parent: SceneObject) {
    this.root = global.scene.createSceneObject("CanvasLinks")
    this.root.setParent(parent)
  }

  /** Devuelve falso si esos dos canvas ya estaban enlazados en ese sentido. */
  add(from: CanvasInstance, to: CanvasInstance): boolean {
    let exists = false
    this.views.forEach((v) => {
      if (v.from === from && v.to === to) exists = true
    })
    if (exists) return false
    const id = "link_" + this.nextId++
    this.views.set(id, new LinkView(this.root, id, from, to))
    return true
  }

  /** Una flecha desde un canvas hasta un punto del entorno real. */
  addToPoint(from: CanvasInstance, point: vec3): void {
    const id = "link_" + this.nextId++
    this.views.set(id, new LinkView(this.root, id, from, point))
  }

  /** Si la flecha apunta al entorno (se quita con una pulsación) en vez de a otro canvas. */
  pointsAtWorld(id: string): boolean {
    return this.views.get(id)?.pointsAtWorld ?? false
  }

  remove(id: string): void {
    const v = this.views.get(id)
    if (!v) return
    v.destroy()
    this.views.delete(id)
    if (this.selected === id) this.selected = null
  }

  /** Quita todas las flechas que entran o salen de un canvas. */
  removeFor(canvas: CanvasInstance): void {
    const ids: string[] = []
    this.views.forEach((v, id) => {
      if (v.from === canvas || v.to === canvas) ids.push(id)
    })
    ids.forEach((id) => this.remove(id))
  }

  targetId(i: Interactable | null): string | null {
    if (!i) return null
    let found: string | null = null
    this.views.forEach((v, id) => {
      if (v.interactable === i) found = id
    })
    return found
  }

  select(id: string | null): void {
    this.selected = id
    this.views.forEach((v, key) => v.setSelected(key === id))
  }

  getSelected(): string | null {
    return this.selected
  }

  /** Las flechas siguen a sus canvas: solo se reconstruyen si alguno ha cambiado. */
  update(): void {
    this.views.forEach((v) => v.refresh())
  }
}
