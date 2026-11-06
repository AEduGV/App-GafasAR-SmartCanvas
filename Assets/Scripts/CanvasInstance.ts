// Un canvas: su contenido, su pose en el mundo y sus botones. Lo demás es común a todos.
import {CanvasDocument} from "./CanvasDocument"
import {CanvasEdgeBarUI} from "./CanvasEdgeBarUI"
import {Bounds, CanvasRenderer, retire} from "./CanvasRenderer"

export type Orientation = "horizontal" | "vertical"

const BAR_HALF_WIDTH = 32
const BAR_DEPTH = 10

export class CanvasInstance {
  readonly doc = new CanvasDocument()
  readonly root: SceneObject
  readonly renderer: CanvasRenderer
  orientation: Orientation
  scale = 1
  groupId: string | null = null
  spawnIndex = 0
  activeLayer = 0
  bar: CanvasEdgeBarUI | null = null
  barBounds: Bounds | null = null
  barOrientation: Orientation | null = null

  constructor(parent: SceneObject, readonly id: string, orientation: Orientation) {
    this.orientation = orientation
    this.root = global.scene.createSceneObject(id)
    this.root.setParent(parent)
    this.renderer = new CanvasRenderer(this.root, this.doc)
    this.root.enabled = false
  }

  get transform(): Transform {
    return this.root.getTransform()
  }

  get normal(): vec3 {
    return this.transform.forward
  }

  toWorld(local: vec3): vec3 {
    return this.transform.getWorldTransform().multiplyPoint(local)
  }

  toLocal(world: vec3): vec3 {
    return this.transform.getInvertedWorldTransform().multiplyPoint(world)
  }

  /** Punto del plano z local por el que pasa el rayo, en unidades del canvas. */
  rayPoint(origin: vec3, dir: vec3, z: number = 0): vec2 | null {
    const o = this.toLocal(origin)
    const d = this.toLocal(origin.add(dir)).sub(o)
    if (Math.abs(d.z) < 1e-4) return null
    const t = (z - o.z) / d.z
    if (t <= 0) return null
    return new vec2(o.x + d.x * t, o.y + d.y * t)
  }

  contains(p: vec2): boolean {
    return this.renderer.containsPoint(p)
  }

  /** En un canvas más estrecho que sus botones, estos pisarían a los de sus vecinos. */
  get barFits(): boolean {
    const b = this.renderer.getBounds()
    return b.maxX - b.minX >= BAR_HALF_WIDTH * 2
  }

  /** Franja que ocupan los botones del borde, incluidos los huecos entre ellos. */
  onEdgeBar(p: vec2): boolean {
    if (!this.bar || !this.bar.sceneObject.enabled) return false
    const b = this.renderer.getBounds()
    if (Math.abs(p.x - (b.minX + b.maxX) / 2) > BAR_HALF_WIDTH) return false
    return this.orientation === "vertical"
      ? p.y >= b.maxY && p.y <= b.maxY + BAR_DEPTH
      : p.y <= b.minY && p.y >= b.minY - BAR_DEPTH
  }

  /** Solo se tiene en cuenta si ya está colocado y visible. */
  get placed(): boolean {
    return this.root.isEnabledInHierarchy
  }

  destroy(): void {
    retire(this.root)
  }
}
