// Plantillas: solo crean elementos normales, así que siguen siendo editables.
import {CanvasDocument, CanvasElement, ElementKind, ShapeKind} from "./CanvasDocument"
import {Bounds} from "./CanvasRenderer"

type Spec = Partial<CanvasElement> & {kind: ElementKind}

function shape(shapeKind: ShapeKind, x: number, y: number, text: string, w = 14, h = 7, layer = 0, color = 1): Spec {
  return {kind: "shape", shape: shapeKind, x, y, text, w, h, layer, color}
}

export type TemplateName = "flow" | "cards" | "journey" | "architecture" | "sequence"

export function applyTemplate(doc: CanvasDocument, name: TemplateName, b: Bounds): void {
  const w = b.maxX - b.minX
  const h = b.maxY - b.minY
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  const add = (s: Spec): string => doc.add(s).id

  switch (name) {
    case "flow": {
      const sx = w / 4.4
      const start = add(shape("terminator", cx - sx * 1.5, cy + h * 0.22, "Start", 12, 6, 0, 2))
      const step = add(shape("process", cx - sx * 0.3, cy + h * 0.22, "Process"))
      const dec = add(shape("decision", cx + sx * 1.1, cy + h * 0.22, "Correct?", 17, 11, 0, 3))
      const end = add(shape("terminator", cx + sx * 1.1, cy - h * 0.28, "End", 12, 6, 0, 2))
      const fix = add(shape("process", cx - sx * 0.3, cy - h * 0.28, "Fix", 14, 7, 0, 4))
      doc.connect(start, step)
      doc.connect(step, dec)
      doc.connect(dec, end, "Yes")
      doc.connect(dec, fix, "No")
      doc.connect(fix, step)
      break
    }
    case "cards": {
      const cols = ["Category A", "Category B", "Category C"]
      const colW = (w - 8) / 3
      cols.forEach((title, i) => {
        const x = cx + (i - 1) * (colW + 1.5)
        add({kind: "screen", x, y: cy, w: colW, h: h - 5, text: title})
      })
      const notes = ["Idea 1", "Idea 2", "Idea 3", "Idea 4", "Idea 5"]
      notes.forEach((text, i) => {
        add({
          kind: "note",
          shape: "rect",
          text,
          color: 3,
          w: Math.min(11, colW * 0.75),
          h: 5.5,
          x: cx + (i % 3 - 1) * (colW + 1.5),
          y: cy + h * 0.14 - Math.floor(i / 3) * 7,
        })
      })
      break
    }
    case "journey": {
      const stages = ["Discover", "Try", "Use"]
      const rows: {title: string; color: number}[] = [
        {title: "Action", color: 1},
        {title: "Pain point", color: 5},
        {title: "Opportunity", color: 2},
      ]
      const colW = (w - 6) / 3
      const rowH = (h - 10) / 3
      stages.forEach((stage, c) => {
        const x = cx + (c - 1) * colW
        add(shape("terminator", x, b.maxY - 3.5, stage, colW - 2, 4.5, 0, 0))
        rows.forEach((row, r) => {
          add({
            kind: "note",
            shape: "rect",
            text: row.title,
            color: row.color,
            x,
            y: b.maxY - 7.5 - rowH / 2 - r * rowH,
            w: colW - 2,
            h: rowH - 1,
          })
        })
      })
      break
    }
    case "architecture": {
      const sx = w * 0.24
      const client = add(shape("process", cx - sx * 0.2, cy + h * 0.3, "Client app", 15, 7, 2, 1))
      const api = add(shape("process", cx - sx * 0.2, cy, "API", 13, 7, 1, 2))
      const auth = add(shape("process", cx + sx * 1.1, cy, "Authentication", 18, 7, 1, 4))
      const db = add(shape("process", cx - sx * 1.1, cy - h * 0.3, "Database", 18, 7, 0, 3))
      const files = add(shape("process", cx + sx * 0.7, cy - h * 0.3, "Files", 14, 7, 0, 3))
      doc.connect(client, api)
      doc.connect(api, auth)
      doc.connect(api, db)
      doc.connect(api, files)
      break
    }
    case "sequence": {
      const people = ["User", "App", "Server"]
      const spacing = (w - 22) / 2
      const xs = people.map((_, i) => cx + (i - 1) * spacing)
      people.forEach((title, i) => add(shape("process", xs[i], b.maxY - 4, title, 13, 5, 0, 1)))
      const lifeTop = b.maxY - 6.5
      const lifeBottom = b.minY + 2
      xs.forEach((x) => {
        add({
          kind: "stroke",
          x,
          y: 0,
          w: 1,
          h: lifeTop - lifeBottom,
          color: 0,
          strokeWidth: 0.12,
          points: [new vec2(0, lifeTop), new vec2(0, lifeBottom)],
        })
      })
      const stepH = (lifeTop - lifeBottom) / 4
      const node = (col: number, row: number, text: string): string =>
        add(shape("terminator", xs[col], lifeTop - stepH * (row + 0.6), text, 11, 3.6, 0, 0))
      const a = node(0, 0, "Request")
      const c = node(1, 0, "Receive")
      const d = node(2, 1, "Process")
      const e = node(1, 2, "Show")
      doc.connect(a, c)
      doc.connect(c, d)
      doc.connect(d, e)
      break
    }
  }
}
