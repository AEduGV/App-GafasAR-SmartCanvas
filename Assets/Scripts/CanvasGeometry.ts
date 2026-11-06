// Geometría procedural de Canvas AR: contornos 2D, rellenos, trazos y tubos.
import {ShapeKind} from "./CanvasDocument"

const LAYOUT = [
  {name: "position", components: 3},
  {name: "normal", components: 3, normalized: true},
  {name: "texture0", components: 2},
]

export function createBuilder(): MeshBuilder {
  const b = new MeshBuilder(LAYOUT)
  b.topology = MeshTopology.Triangles
  b.indexType = MeshIndexType.UInt16
  return b
}

export function clearBuilder(b: MeshBuilder): void {
  if (b.getIndicesCount() > 0) b.eraseIndices(0, b.getIndicesCount())
  if (b.getVerticesCount() > 0) b.eraseVertices(0, b.getVerticesCount())
}

function arc(out: vec2[], cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, steps: number): void {
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    out.push(new vec2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry))
  }
}

export function roundedRect(w: number, h: number, radius: number): vec2[] {
  const hw = w / 2
  const hh = h / 2
  const r = Math.min(radius, hw, hh)
  const pts: vec2[] = []
  arc(pts, hw - r, hh - r, r, r, 0, Math.PI / 2, 6)
  arc(pts, -hw + r, hh - r, r, r, Math.PI / 2, Math.PI, 6)
  arc(pts, -hw + r, -hh + r, r, r, Math.PI, Math.PI * 1.5, 6)
  arc(pts, hw - r, -hh + r, r, r, Math.PI * 1.5, Math.PI * 2, 6)
  return pts
}

/** Contorno en sentido antihorario, centrado en el origen y con forma estrellada desde él. */
export function shapeOutline(shape: ShapeKind, w: number, h: number): vec2[] {
  const hw = w / 2
  const hh = h / 2
  switch (shape) {
    case "decision":
      return [new vec2(hw, 0), new vec2(0, hh), new vec2(-hw, 0), new vec2(0, -hh)]
    case "terminator":
      return roundedRect(w, h, hh)
    case "data": {
      const s = w * 0.14
      return [new vec2(hw, hh), new vec2(-hw + s, hh), new vec2(-hw, -hh), new vec2(hw - s, -hh)]
    }
    case "circle": {
      const pts: vec2[] = []
      arc(pts, 0, 0, hw, hh, 0, Math.PI * 2 * (31 / 32), 31)
      return pts
    }
    case "triangle":
      return [new vec2(hw, -hh), new vec2(0, hh), new vec2(-hw, -hh)]
    case "and": {
      const pts: vec2[] = [new vec2(-hw, -hh), new vec2(0, -hh)]
      arc(pts, 0, 0, hw, hh, -Math.PI / 2, Math.PI / 2, 16)
      pts.push(new vec2(-hw, hh))
      return pts
    }
    case "or":
    case "xor": {
      const pts: vec2[] = []
      for (let i = 0; i <= 10; i++) {
        const t = i / 10
        pts.push(new vec2(-hw + (hw * 1.6 * t * t * 0.6 + hw * 1.6 * 0.4 * t), -hh + hh * 0.72 * t * t))
      }
      pts.push(new vec2(hw, 0))
      for (let i = 10; i >= 0; i--) {
        const t = i / 10
        pts.push(new vec2(-hw + (hw * 1.6 * t * t * 0.6 + hw * 1.6 * 0.4 * t), hh - hh * 0.72 * t * t))
      }
      for (let i = 1; i < 8; i++) {
        const t = i / 8
        pts.push(new vec2(-hw + Math.sin(t * Math.PI) * w * 0.14, hh - t * h))
      }
      return pts
    }
    case "not": {
      const tip = hw - w * 0.14
      return [new vec2(-hw, -hh), new vec2(tip, 0), new vec2(-hw, hh)]
    }
    case "star": {
      const pts: vec2[] = []
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i / 10) * Math.PI * 2
        const k = i % 2 === 0 ? 1 : 0.45
        pts.push(new vec2(Math.cos(a) * hw * k, Math.sin(a) * hh * k))
      }
      return pts
    }
    case "heart": {
      const pts: vec2[] = []
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2
        const x = 16 * Math.pow(Math.sin(a), 3)
        const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)
        pts.push(new vec2((x / 16) * hw, ((y + 2.5) / 14.5) * hh))
      }
      return pts.reverse()
    }
    case "process":
    case "rect":
    default:
      return roundedRect(w, h, Math.min(1.6, Math.min(w, h) * 0.18))
  }
}

export type CanvasShape = "rect" | "oval" | "triangle" | "diamond"

/** Contorno convexo de un canvas, centrado en el origen. */
export function canvasOutline(shape: CanvasShape, w: number, h: number, radius: number): vec2[] {
  switch (shape) {
    case "oval":
      return shapeOutline("circle", w, h)
    case "triangle":
      return subdivide(shapeOutline("triangle", w, h))
    case "diamond":
      return subdivide(shapeOutline("decision", w, h))
    default:
      return roundedRect(w, h, radius)
  }
}

/** Con solo los vértices, el trazo calcula mal su grosor: en un triángulo llega a perder un lado. */
function subdivide(pts: vec2[], parts: number = 4): vec2[] {
  const out: vec2[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const c = pts[(i + 1) % pts.length]
    for (let k = 0; k < parts; k++) {
      const t = k / parts
      out.push(new vec2(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t))
    }
  }
  return out
}

/** Para contornos convexos en sentido antihorario. */
export function insideConvex(pts: vec2[], p: vec2): boolean {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const c = pts[(i + 1) % pts.length]
    if ((c.x - a.x) * (p.y - a.y) - (c.y - a.y) * (p.x - a.x) < 0) return false
  }
  return true
}

/** Distancia de un punto al contorno cerrado. */
export function outlineDistance(pts: vec2[], p: vec2): number {
  let best = Infinity
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const c = pts[(i + 1) % pts.length]
    const ex = c.x - a.x
    const ey = c.y - a.y
    const lengthSq = ex * ex + ey * ey
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / lengthSq)) : 0
    best = Math.min(best, Math.hypot(p.x - (a.x + ex * t), p.y - (a.y + ey * t)))
  }
  return best
}

export function appendFill(b: MeshBuilder, pts: vec2[], z: number): void {
  const base = b.getVerticesCount()
  let cx = 0
  let cy = 0
  for (const p of pts) {
    cx += p.x
    cy += p.y
  }
  cx /= pts.length
  cy /= pts.length
  const verts: number[] = [cx, cy, z, 0, 0, 1, 0.5, 0.5]
  for (const p of pts) verts.push(p.x, p.y, z, 0, 0, 1, 0.5, 0.5)
  b.appendVerticesInterleaved(verts)
  const idx: number[] = []
  for (let i = 0; i < pts.length; i++) {
    idx.push(base, base + 1 + i, base + 1 + ((i + 1) % pts.length))
  }
  b.appendIndices(idx)
}

/** Cinta plana de grosor constante sobre el plano z. */
export function appendStroke(b: MeshBuilder, pts: vec2[], closed: boolean, width: number, z: number): void {
  const n = pts.length
  if (n < 2) return
  const base = b.getVerticesCount()
  const hw = width / 2
  const verts: number[] = []
  const count = closed ? n + 1 : n
  for (let k = 0; k < count; k++) {
    const i = k % n
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)]
    const next = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const p = pts[i]
    verts.push(p.x + nx * hw, p.y + ny * hw, z, 0, 0, 1, 0, 0)
    verts.push(p.x - nx * hw, p.y - ny * hw, z, 0, 0, 1, 1, 0)
  }
  b.appendVerticesInterleaved(verts)
  const idx: number[] = []
  for (let k = 0; k < count - 1; k++) {
    const a = base + k * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  b.appendIndices(idx)
}

function ringBasis(dir: vec3): {u: vec3; v: vec3} {
  const ref = Math.abs(dir.z) < 0.9 ? new vec3(0, 0, 1) : new vec3(1, 0, 0)
  const u = dir.cross(ref).normalize()
  const v = dir.cross(u).normalize()
  return {u, v}
}

/** Tubo redondo: se lee como línea desde cualquier ángulo, también entre capas. */
export function appendTube(b: MeshBuilder, pts: vec3[], radius: number, sides: number = 8): void {
  if (pts.length < 2) return
  const base = b.getVerticesCount()
  const verts: number[] = []
  for (let i = 0; i < pts.length; i++) {
    const dir = pts[Math.min(i + 1, pts.length - 1)].sub(pts[Math.max(i - 1, 0)]).normalize()
    const {u, v} = ringBasis(dir)
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2
      const n = u.uniformScale(Math.cos(a)).add(v.uniformScale(Math.sin(a)))
      const p = pts[i].add(n.uniformScale(radius))
      verts.push(p.x, p.y, p.z, n.x, n.y, n.z, 0, 0)
    }
  }
  b.appendVerticesInterleaved(verts)
  const idx: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    for (let s = 0; s < sides; s++) {
      const a = base + i * sides + s
      const c = base + i * sides + ((s + 1) % sides)
      idx.push(a, c, a + sides, c, c + sides, a + sides)
    }
  }
  b.appendIndices(idx)
}

/** Punta de flecha: comunica la dirección del flujo. */
export function appendCone(b: MeshBuilder, basePoint: vec3, tip: vec3, radius: number, sides: number = 10): void {
  const dir = tip.sub(basePoint).normalize()
  const {u, v} = ringBasis(dir)
  const base = b.getVerticesCount()
  const verts: number[] = [tip.x, tip.y, tip.z, dir.x, dir.y, dir.z, 0, 0]
  for (let s = 0; s < sides; s++) {
    const a = (s / sides) * Math.PI * 2
    const n = u.uniformScale(Math.cos(a)).add(v.uniformScale(Math.sin(a)))
    const p = basePoint.add(n.uniformScale(radius))
    verts.push(p.x, p.y, p.z, n.x, n.y, n.z, 0, 0)
  }
  b.appendVerticesInterleaved(verts)
  const idx: number[] = []
  for (let s = 0; s < sides; s++) {
    idx.push(base, base + 1 + s, base + 1 + ((s + 1) % sides))
  }
  // Tapa de la base
  for (let s = 1; s < sides - 1; s++) {
    idx.push(base + 1, base + 1 + s, base + 1 + s + 1)
  }
  b.appendIndices(idx)
}

/** Punto donde el segmento desde el centro hacia `toward` corta el contorno. */
export function outlineIntersection(pts: vec2[], toward: vec2): vec2 {
  const len = toward.length
  if (len < 1e-4) return new vec2(0, 0)
  const dx = toward.x / len
  const dy = toward.y / len
  let best = -1
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const c = pts[(i + 1) % pts.length]
    const ex = c.x - a.x
    const ey = c.y - a.y
    const det = dx * -ey + ex * dy
    if (Math.abs(det) < 1e-6) continue
    const t = (a.x * -ey + ex * a.y) / det
    const s = (dx * a.y - dy * a.x) / det
    if (t > 0 && s >= -1e-4 && s <= 1 + 1e-4 && t > best) best = t
  }
  return best > 0 ? new vec2(dx * best, dy * best) : new vec2(0, 0)
}
