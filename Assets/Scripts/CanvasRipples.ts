// Ondas que salen de los bordes de un canvas agarrado cuando, al soltarlo, se pegaría a la pared o mesa apuntada.
import {appendStroke} from "./CanvasGeometry"
import {Bounds, MeshSlot, retire} from "./CanvasRenderer"
import {COLOR, withAlpha} from "./CanvasTheme"

const RINGS = 3
const PERIOD = 1.2 // s que tarda cada onda en salir y desvanecerse
const REACH = 0.22 // hasta dónde llega, en proporción al lado mayor del canvas
const WIDTH = 0.018
const ALPHA = 0.7
const Z = 0.3

export class CanvasRipples {
  private root: SceneObject
  private rings: MeshSlot[] = []
  private start = getTime()

  constructor(parent: SceneObject, private outline: vec2[], private bounds: Bounds) {
    this.root = global.scene.createSceneObject("Ripples")
    this.root.setParent(parent)
    const cx = (bounds.minX + bounds.maxX) / 2
    const cy = (bounds.minY + bounds.maxY) / 2
    this.root.getTransform().setLocalPosition(new vec3(cx, cy, 0))
    for (let i = 0; i < RINGS; i++) this.rings.push(new MeshSlot(this.root, "Ring" + i, withAlpha(COLOR.primary, 0), false))
    this.update()
  }

  /** Cada onda crece desde el borde y se apaga; van escalonadas para que siempre haya alguna saliendo. */
  update(): void {
    const hw = (this.bounds.maxX - this.bounds.minX) / 2
    const hh = (this.bounds.maxY - this.bounds.minY) / 2
    const size = Math.max(hw, hh) * 2
    const t = (getTime() - this.start) / PERIOD
    this.rings.forEach((ring, i) => {
      const phase = (t + i / RINGS) % 1
      const d = phase * REACH * size
      // Margen igual en los cuatro lados aunque el canvas no sea cuadrado.
      const sx = (hw + d) / Math.max(hw, 0.001)
      const sy = (hh + d) / Math.max(hh, 0.001)
      const pts = this.outline.map((p) => new vec2(p.x * sx, p.y * sy))
      appendStroke(ring.begin(), pts, true, WIDTH * size * (1 - phase * 0.5), Z)
      ring.commit()
      // Entra suave y se desvanece al alejarse.
      const fade = Math.min(1, phase * 6) * (1 - phase)
      ring.setColor(withAlpha(COLOR.primary, ALPHA * fade))
    })
  }

  destroy(): void {
    retire(this.root)
  }
}
