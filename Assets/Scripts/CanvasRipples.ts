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

export type AlignSide = "left" | "right" | "top" | "bottom"

const GLOW_WIDTH = 0.5 // cm
const GLOW_REACH = 3 // cm que recorren las ondas hacia fuera
const GLOW_PERIOD = 0.9

/**
 * Brillo en un lado de un canvas: el lado al que se pegará el canvas que se está arrastrando si se suelta ahora. Una
 * línea que late sobre el borde y dos ondas que salen de él hacia fuera, hacia el canvas que llega.
 */
export class EdgeGlow {
  private root: SceneObject
  private line: MeshSlot
  private waves: MeshSlot[] = []
  private start = getTime()
  private a: vec2
  private b: vec2
  private out: vec2

  constructor(parent: SceneObject, bounds: Bounds, side: AlignSide, private scale: number) {
    this.root = global.scene.createSceneObject("AlignGlow")
    this.root.setParent(parent)
    const {minX, maxX, minY, maxY} = bounds
    if (side === "right") [this.a, this.b, this.out] = [new vec2(maxX, minY), new vec2(maxX, maxY), new vec2(1, 0)]
    else if (side === "left") [this.a, this.b, this.out] = [new vec2(minX, minY), new vec2(minX, maxY), new vec2(-1, 0)]
    else if (side === "top") [this.a, this.b, this.out] = [new vec2(minX, maxY), new vec2(maxX, maxY), new vec2(0, 1)]
    else [this.a, this.b, this.out] = [new vec2(minX, minY), new vec2(maxX, minY), new vec2(0, -1)]
    this.line = new MeshSlot(this.root, "Line", withAlpha(COLOR.primary, 1), false)
    appendStroke(this.line.begin(), [this.a, this.b], false, GLOW_WIDTH / scale, Z)
    this.line.commit()
    for (let i = 0; i < 2; i++) this.waves.push(new MeshSlot(this.root, "Wave" + i, withAlpha(COLOR.primary, 0), false))
    this.update()
  }

  update(): void {
    const t = (getTime() - this.start) / GLOW_PERIOD
    this.line.setColor(withAlpha(COLOR.primary, 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))))
    this.waves.forEach((w, i) => {
      const phase = (t + i / this.waves.length) % 1
      const d = (phase * GLOW_REACH) / this.scale
      const off = this.out.uniformScale(d)
      appendStroke(w.begin(), [this.a.add(off), this.b.add(off)], false, (GLOW_WIDTH * 0.6) / this.scale, Z)
      w.commit()
      w.setColor(withAlpha(COLOR.primary, 0.7 * Math.min(1, phase * 6) * (1 - phase)))
    })
  }

  destroy(): void {
    retire(this.root)
  }
}
