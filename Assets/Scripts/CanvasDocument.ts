// Modelo de datos de Canvas AR. No conoce la escena: los renderizadores lo observan.
// Todas las coordenadas son locales al canvas (cm), con origen en su centro.

export type ElementKind = "note" | "text" | "screen" | "shape" | "stroke"

export type ShapeKind =
  | "rect" | "process" | "decision" | "terminator" | "data"
  | "circle" | "triangle" | "and" | "or" | "not" | "xor" | "star" | "heart"

export interface CanvasElement {
  id: string
  kind: ElementKind
  shape: ShapeKind
  x: number
  y: number
  w: number
  h: number
  layer: number
  text: string
  color: number
  groupId: string | null
  parentId: string | null  // pantalla contenedora o elemento subrayado
  points: vec2[]           // trazos: puntos relativos a (x, y)
  strokeWidth: number
}

export interface CanvasConnection {
  id: string
  from: string
  to: string
  label: string
}

export type DocEvent =
  | {type: "added" | "changed" | "removed"; id: string}
  | {type: "connAdded" | "connChanged" | "connRemoved"; id: string}

export const LAYER_COUNT = 4

export class CanvasDocument {
  readonly elements = new Map<string, CanvasElement>()
  readonly connections = new Map<string, CanvasConnection>()
  private listeners: ((e: DocEvent) => void)[] = []
  private nextId = 1

  subscribe(fn: (e: DocEvent) => void): void {
    this.listeners.push(fn)
  }

  private emit(e: DocEvent): void {
    for (const fn of this.listeners) fn(e)
  }

  newId(prefix: string): string {
    return prefix + "_" + this.nextId++
  }

  add(init: Partial<CanvasElement> & {kind: ElementKind}): CanvasElement {
    const el: CanvasElement = {
      id: this.newId(init.kind),
      shape: "rect", x: 0, y: 0, w: 14, h: 9, layer: 0,
      text: "", color: 0, groupId: null, parentId: null, points: [], strokeWidth: 0.5,
      ...init,
    }
    this.elements.set(el.id, el)
    this.emit({type: "added", id: el.id})
    return el
  }

  update(id: string, patch: Partial<CanvasElement>): void {
    const el = this.elements.get(id)
    if (!el) return
    Object.assign(el, patch)
    this.emit({type: "changed", id})
  }

  /** El elemento, sus compañeros de grupo y lo que contiene o lleva subrayado, sin repetir. */
  moveSet(id: string): CanvasElement[] {
    const out = new Map<string, CanvasElement>()
    const visit = (eid: string): void => {
      const el = this.elements.get(eid)
      if (!el || out.has(eid)) return
      out.set(eid, el)
      if (el.groupId) {
        this.elements.forEach((o) => {
          if (o.groupId === el.groupId) visit(o.id)
        })
      }
      this.elements.forEach((o) => {
        if (o.parentId === eid) visit(o.id)
      })
    }
    visit(id)
    return Array.from(out.values())
  }

  moveBy(id: string, dx: number, dy: number): void {
    for (const el of this.moveSet(id)) {
      el.x += dx
      el.y += dy
      this.emit({type: "changed", id: el.id})
    }
  }

  setLayer(id: string, layer: number): void {
    const clamped = Math.max(0, Math.min(LAYER_COUNT - 1, layer))
    const anchor = this.elements.get(id)
    if (!anchor) return
    const delta = clamped - anchor.layer
    for (const el of this.moveSet(id)) {
      el.layer = Math.max(0, Math.min(LAYER_COUNT - 1, el.layer + delta))
      this.emit({type: "changed", id: el.id})
    }
  }

  remove(id: string): void {
    const el = this.elements.get(id)
    if (!el) return
    this.connections.forEach((c) => {
      if (c.from === id || c.to === id) this.removeConnection(c.id)
    })
    const children: string[] = []
    this.elements.forEach((o) => {
      if (o.parentId === id) children.push(o.id)
    })
    for (const cid of children) {
      const child = this.elements.get(cid)
      // Un subrayado no tiene sentido sin su elemento; lo demás sale de la pantalla y se conserva.
      if (child?.kind === "stroke") this.remove(cid)
      else if (child) this.update(cid, {parentId: null})
    }
    this.elements.delete(id)
    this.emit({type: "removed", id})
  }

  connect(from: string, to: string, label: string = ""): CanvasConnection | null {
    if (from === to || !this.elements.has(from) || !this.elements.has(to)) return null
    let exists = false
    this.connections.forEach((c) => {
      if (c.from === from && c.to === to) exists = true
    })
    if (exists) return null
    const conn: CanvasConnection = {id: this.newId("conn"), from, to, label}
    this.connections.set(conn.id, conn)
    this.emit({type: "connAdded", id: conn.id})
    return conn
  }

  outgoingCount(id: string): number {
    let n = 0
    this.connections.forEach((c) => {
      if (c.from === id) n++
    })
    return n
  }

  updateConnection(id: string, patch: Partial<CanvasConnection>): void {
    const c = this.connections.get(id)
    if (!c) return
    Object.assign(c, patch)
    this.emit({type: "connChanged", id})
  }

  removeConnection(id: string): void {
    if (this.connections.delete(id)) this.emit({type: "connRemoved", id})
  }

  group(ids: string[]): string | null {
    if (ids.length < 2) return null
    const gid = this.newId("group")
    for (const id of ids) this.update(id, {groupId: gid})
    return gid
  }

  ungroup(id: string): void {
    const gid = this.elements.get(id)?.groupId
    if (!gid) return
    const ids: string[] = []
    this.elements.forEach((o) => {
      if (o.groupId === gid) ids.push(o.id)
    })
    for (const m of ids) this.update(m, {groupId: null})
  }

  clear(): void {
    Array.from(this.connections.keys()).forEach((id) => this.removeConnection(id))
    Array.from(this.elements.keys()).forEach((id) => {
      this.elements.delete(id)
      this.emit({type: "removed", id})
    })
  }
}
