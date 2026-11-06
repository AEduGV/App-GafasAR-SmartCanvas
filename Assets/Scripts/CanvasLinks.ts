// Flechas entre canvas. Guardan solo quién enlaza con quién: la forma se deduce de sus poses.
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {appendCone, appendTube, outlineIntersection} from "./CanvasGeometry"
import {CanvasInstance} from "./CanvasInstance"
import {makeHitBox, MeshSlot, retire} from "./CanvasRenderer"
import {COLOR} from "./CanvasTheme"

const LIFT = 0.3
const TUBE = 0.2
const HEAD_RADIUS = 0.7
const HEAD_LENGTH = 2

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
  private key = ""

  constructor(parent: SceneObject, id: string, readonly from: CanvasInstance, readonly to: CanvasInstance) {
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
    this.interactable = hit.interactable
    appendTube(this.dot.begin(), [new vec3(-0.5, 0, 0), new vec3(0.5, 0, 0)], 0.6)
    this.dot.commit()
    this.refresh()
  }

  refresh(): void {
    const key = poseKey(this.from) + "|" + poseKey(this.to)
    if (key === this.key) return
    this.key = key
    const start = edgeToward(this.from, worldCenter(this.to))
    const end = edgeToward(this.to, worldCenter(this.from))
    const scale = (this.from.scale + this.to.scale) / 2
    const tb = this.tube.begin()
    appendArrow(tb, start, end, scale)
    this.tube.commit()
    const ob = this.outline.begin()
    if (end.distance(start) > 0.5) appendTube(ob, [start, end], TUBE * 2 * scale)
    this.outline.commit()
    const t = this.handle.getTransform()
    t.setWorldPosition(start.add(end).uniformScale(0.5))
    t.setWorldRotation(this.from.transform.getWorldRotation())
    t.setWorldScale(new vec3(scale, scale, scale))
  }

  setSelected(v: boolean): void {
    this.outline.setVisible(v)
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
