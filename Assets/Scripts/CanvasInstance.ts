// Un canvas: su contenido, su pose en el mundo y sus botones. Lo demás es común a todos.
import {CanvasDocument} from "./CanvasDocument"
import {CanvasEdgeBarUI, RING_RADIUS, SHAPE_RING_RADIUS} from "./CanvasEdgeBarUI"
import {outlineIntersection} from "./CanvasGeometry"
import {Bounds, CanvasRenderer, retire} from "./CanvasRenderer"

export type Orientation = "horizontal" | "vertical"

// El botón + queda justo dentro de la esquina: por fuera lo cortaría la franja visible de la Preview en un
// canvas normal. La esquina sigue pudiendo agarrarse para cambiar el tamaño por su franja exterior.
const HUB_INSET = 3.2
const HUB_REACH = 3.5

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
  barShape: string | null = null

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

  /** Dónde va el botón +: en la esquina superior derecha o, en otra forma, en el borde en esa dirección. */
  get hubPoint(): vec2 {
    const b = this.renderer.getBounds()
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    const edge = outlineIntersection(this.renderer.outlinePoints(), new vec2(w, h))
    const inset = HUB_INSET * Math.SQRT1_2
    return new vec2((b.minX + b.maxX) / 2 + edge.x - inset, (b.minY + b.maxY) / 2 + edge.y - inset)
  }

  /** La zona del botón + o, abierto, de su anillo, incluidos los huecos entre botones. */
  onEdgeBar(p: vec2): boolean {
    if (!this.bar) return false
    const reach = !this.bar.isOpen ? 0 : this.bar.isShapeOpen ? SHAPE_RING_RADIUS : RING_RADIUS
    return p.distance(this.hubPoint) <= reach + HUB_REACH
  }

  /** Solo se tiene en cuenta si ya está colocado y visible. */
  get placed(): boolean {
    return this.root.isEnabledInHierarchy
  }

  destroy(): void {
    retire(this.root)
  }
}
