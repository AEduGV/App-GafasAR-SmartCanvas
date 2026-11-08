// Reconocimiento de escritura a mano: pinta unos trazos en una imagen y se la pasa a un modelo con visión
// a través de Remote Service Gateway. No conoce la escena; CanvasApp decide cuándo preguntar y qué hacer.
import {OpenAI} from "RemoteServiceGateway.lspkg/HostedExternal/OpenAI"
import {CapsuleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/CapsuleButton"
import {CanvasElement} from "./CanvasDocument"
import {CanvasInstance} from "./CanvasInstance"
import {addPillEdge, makePill} from "./CanvasPill"
import {retire} from "./CanvasRenderer"

const MODEL = "gpt-4.1-mini"
// Lado mayor de la imagen, sin contar el margen, y margen en píxeles.
const IMAGE_SIDE = 448
const IMAGE_PAD = 24
const MIN_SIDE = 96
const LINE_PX = 5

const PROMPT =
  "La imagen muestra trazos dibujados a mano en una pizarra, en negro sobre blanco. " +
  "Si contienen escritura, aunque sea una sola letra, una palabra corta o números, transcribe exactamente lo escrito, " +
  "respetando mayúsculas, tildes y saltos de línea. Ante la duda entre letra y dibujo, elige la letra. " +
  "Solo si son claramente dibujos, flechas, figuras geométricas o garabatos, devuelve un texto vacío. " +
  'Responde solo con JSON: {"text": "..."}'

export interface StrokeBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Caja que envuelve los trazos, en coordenadas del canvas. */
export function strokeBounds(strokes: CanvasElement[]): StrokeBounds {
  const b = {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity}
  for (const s of strokes) {
    for (const p of s.points) {
      b.minX = Math.min(b.minX, s.x + p.x)
      b.maxX = Math.max(b.maxX, s.x + p.x)
      b.minY = Math.min(b.minY, s.y + p.y)
      b.maxY = Math.max(b.maxY, s.y + p.y)
    }
  }
  return b
}

/** Los trazos en negro sobre blanco, con la escritura derecha (la fila 0 de la textura es la de abajo). */
function rasterize(strokes: CanvasElement[]): Texture {
  const b = strokeBounds(strokes)
  const bw = Math.max(0.01, b.maxX - b.minX)
  const bh = Math.max(0.01, b.maxY - b.minY)
  const s = IMAGE_SIDE / Math.max(bw, bh)
  const w = Math.max(MIN_SIDE, Math.ceil(bw * s) + IMAGE_PAD * 2)
  const h = Math.max(MIN_SIDE, Math.ceil(bh * s) + IMAGE_PAD * 2)
  // Centrado, por si el lado corto quedó por debajo del mínimo.
  const ox = (w - bw * s) / 2
  const oy = (h - bh * s) / 2
  const data = new Uint8Array(w * h * 4).fill(255)
  const r = LINE_PX / 2
  const dot = (cx: number, cy: number): void => {
    const x0 = Math.max(0, Math.floor(cx - r))
    const x1 = Math.min(w - 1, Math.ceil(cx + r))
    const y0 = Math.max(0, Math.floor(cy - r))
    const y1 = Math.min(h - 1, Math.ceil(cy + r))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r * r) continue
        const i = (y * w + x) * 4
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      }
    }
  }
  for (const st of strokes) {
    const pts = st.points.map((p) => new vec2(ox + (st.x + p.x - b.minX) * s, oy + (st.y + p.y - b.minY) * s))
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k]
      const c = k + 1 < pts.length ? pts[k + 1] : a
      const steps = Math.max(1, Math.ceil(a.distance(c)))
      for (let j = 0; j <= steps; j++) dot(a.x + ((c.x - a.x) * j) / steps, a.y + ((c.y - a.y) * j) / steps)
    }
  }
  const tex = ProceduralTextureProvider.createWithFormat(w, h, TextureFormat.RGBA8Unorm)
  ;(tex.control as ProceduralTextureProvider).setPixels(0, 0, w, h, data)
  return tex
}

function encode(tex: Texture): Promise<string> {
  return new Promise((resolve, reject) => {
    Base64.encodeTextureAsync(tex, resolve, () => reject("no se pudo codificar la imagen"), CompressionQuality.IntermediateQuality, EncodingType.Png)
  })
}

/** Lo que dicen los trazos, o "" si no hay escritura. Rechaza si falla la red o el servicio. */
export function recognizeHandwriting(strokes: CanvasElement[]): Promise<string> {
  return encode(rasterize(strokes))
    .then((b64) =>
      OpenAI.chatCompletions({
        model: MODEL,
        temperature: 0,
        response_format: {type: "json_object"},
        messages: [
          {
            role: "user",
            content: [
              {type: "text", text: PROMPT},
              {type: "image_url", image_url: {url: "data:image/png;base64," + b64, detail: "high"}},
            ],
          },
        ],
      })
    )
    .then((resp) => {
      const raw = resp.choices?.[0]?.message?.content
      const content = typeof raw === "string" ? raw : ""
      try {
        const parsed = JSON.parse(content) as {text?: unknown}
        return typeof parsed.text === "string" ? parsed.text.trim() : ""
      } catch (e) {
        return content.trim()
      }
    })
}

// Tras dejar de dibujar este tiempo (s), se pregunta qué dicen los trazos recientes.
const PAUSE = 1.2
// Trazos a menos de esta distancia cuentan como el mismo texto: un mínimo en unidades del canvas o,
// con letra grande, una parte de la altura de lo escrito.
const CLUSTER_GAP = 4
const CLUSTER_GAP_RATIO = 1
const BUTTON_H = 3.4
const BUTTON_TEXT = 52
const BUTTON_CHAR_W = 0.62
const BUTTON_GAP = 1.2
const BUTTON_Z = 1.4
const LABEL_MAX = 28

interface Suggestion {
  ids: string[]
  text: string
  root: SceneObject
  button: CapsuleButton | null
}

interface WatchState {
  // Trazos aún sin convertir; cada trazo nuevo cambia la versión y anula lo que estuviera en camino.
  pending: Set<string>
  lastStroke: number
  version: number
  asked: number
  suggestion: Suggestion | null
}

function idNumber(id: string): number {
  const m = /_(\d+)$/.exec(id)
  return m ? Number(m[1]) : 0
}

function overlaps(a: StrokeBounds, b: StrokeBounds, gap: number): boolean {
  return a.minX <= b.maxX + gap && a.maxX >= b.minX - gap && a.minY <= b.maxY + gap && a.maxY >= b.minY - gap
}

/**
 * Vigila lo que se escribe a mano en cada canvas. Al hacer una pausa, pregunta qué dicen los trazos
 * recientes y, si hay palabras, pone debajo un botón para cambiarlos por un texto.
 */
export class HandwritingAssist {
  private states = new Map<CanvasInstance, WatchState>()
  private failedNotice = false

  constructor(
    private readonly onConvert: (canvas: CanvasInstance, ids: string[], text: string, bounds: StrokeBounds) => void,
    private readonly onError: (message: string) => void,
    private readonly log: (message: string) => void
  ) {}

  private state(canvas: CanvasInstance): WatchState {
    let st = this.states.get(canvas)
    if (!st) {
      st = {pending: new Set(), lastStroke: 0, version: 0, asked: 0, suggestion: null}
      this.states.set(canvas, st)
    }
    return st
  }

  /** Mientras se sigue escribiendo, el botón se aparta para no estorbar. */
  strokeStarted(canvas: CanvasInstance): void {
    const st = this.state(canvas)
    st.version++
    this.hide(st)
  }

  strokeEnded(canvas: CanvasInstance, id: string): void {
    const st = this.state(canvas)
    st.pending.add(id)
    st.lastStroke = getTime()
    st.version++
  }

  forget(canvas: CanvasInstance): void {
    const st = this.states.get(canvas)
    if (st) this.hide(st)
    this.states.delete(canvas)
  }

  update(drawingOn: CanvasInstance | null): void {
    const now = getTime()
    this.states.forEach((st, canvas) => {
      st.pending.forEach((id) => {
        if (!canvas.doc.elements.has(id)) st.pending.delete(id)
      })
      if (st.suggestion) this.placeSuggestion(canvas, st)
      if (canvas === drawingOn || st.asked === st.version || st.pending.size === 0 || now - st.lastStroke < PAUSE) return
      st.asked = st.version
      this.ask(canvas, st)
    })
  }

  /** El trazo más reciente y los que le rodean, encadenados por cercanía. */
  private cluster(canvas: CanvasInstance, st: WatchState): CanvasElement[] {
    const strokes: CanvasElement[] = []
    st.pending.forEach((id) => {
      const el = canvas.doc.elements.get(id)
      if (el && el.kind === "stroke" && el.points.length > 0) strokes.push(el)
    })
    if (strokes.length === 0) return []
    strokes.sort((a, b) => idNumber(b.id) - idNumber(a.id))
    const picked = [strokes[0]]
    let rest = strokes.slice(1)
    let grew = true
    while (grew) {
      grew = false
      const b = strokeBounds(picked)
      const gap = Math.max(CLUSTER_GAP, (b.maxY - b.minY) * CLUSTER_GAP_RATIO)
      const keep: CanvasElement[] = []
      for (const s of rest) {
        if (overlaps(strokeBounds([s]), b, gap)) {
          picked.push(s)
          grew = true
        } else {
          keep.push(s)
        }
      }
      rest = keep
    }
    return picked
  }

  private ask(canvas: CanvasInstance, st: WatchState): void {
    const strokes = this.cluster(canvas, st)
    if (strokes.length === 0) return
    const version = st.version
    const ids = strokes.map((s) => s.id)
    this.log("escritura: leyendo " + ids.length + " trazos")
    recognizeHandwriting(strokes)
      .then((text) => {
        this.failedNotice = false
        this.log("escritura: «" + text + "»")
        if (st.version !== version || this.states.get(canvas) !== st || !text) return
        this.show(canvas, st, ids, text)
      })
      .catch((e) => {
        this.log("escritura: error " + String(e).slice(0, 200))
        if (this.failedNotice) return
        this.failedNotice = true
        this.onError("No se pudo leer la escritura. Revisa la conexión o renueva los tokens de Remote Service Gateway")
      })
  }

  private show(canvas: CanvasInstance, st: WatchState, ids: string[], text: string): void {
    this.hide(st)
    const flat = text.replace(/\s+/g, " ")
    const label = "Convertir en texto: " + (flat.length > LABEL_MAX ? flat.slice(0, LABEL_MAX - 1) + "…" : flat)
    const width = label.length * BUTTON_CHAR_W + 3
    const root = global.scene.createSceneObject("HandwritingButton")
    root.setParent(canvas.root)
    root.createComponent("Component.Canvas")
    const sug: Suggestion = {ids, text, root, button: null}
    sug.button = makePill(root, label, width, BUTTON_H, BUTTON_TEXT, () => true, () => this.convert(canvas, st, sug))
    addPillEdge(sug.button)
    st.suggestion = sug
    this.placeSuggestion(canvas, st)
  }

  /** Debajo de lo escrito, siguiéndolo si se mueve; desaparece si se borran sus trazos. */
  private placeSuggestion(canvas: CanvasInstance, st: WatchState): void {
    const sug = st.suggestion
    if (!sug) return
    const strokes = this.existing(canvas, sug.ids)
    if (strokes.length === 0) {
      this.hide(st)
      return
    }
    const b = strokeBounds(strokes)
    sug.root.getTransform().setLocalPosition(new vec3((b.minX + b.maxX) / 2, b.minY - BUTTON_GAP - BUTTON_H / 2, BUTTON_Z))
  }

  private existing(canvas: CanvasInstance, ids: string[]): CanvasElement[] {
    const out: CanvasElement[] = []
    for (const id of ids) {
      const el = canvas.doc.elements.get(id)
      if (el) out.push(el)
    }
    return out
  }

  private convert(canvas: CanvasInstance, st: WatchState, sug: Suggestion): void {
    if (st.suggestion !== sug) return
    const strokes = this.existing(canvas, sug.ids)
    this.hide(st)
    if (strokes.length === 0) return
    const ids = strokes.map((s) => s.id)
    for (const id of ids) st.pending.delete(id)
    this.onConvert(canvas, ids, sug.text, strokeBounds(strokes))
  }

  private hide(st: WatchState): void {
    if (!st.suggestion) return
    retire(st.suggestion.root)
    st.suggestion = null
  }

  /** Si un rayo apunta al botón: así no cuenta también como pulsar en el canvas o fuera de él. */
  hitsRay(origin: vec3, dir: vec3): boolean {
    let hit = false
    this.states.forEach((st) => {
      const sug = st.suggestion
      if (hit || !sug || !sug.button) return
      const t = sug.root.getTransform()
      const n = t.forward
      const denom = n.dot(dir)
      if (Math.abs(denom) < 1e-5) return
      const k = t.getWorldPosition().sub(origin).dot(n) / denom
      if (k < 0) return
      const local = t.getInvertedWorldTransform().multiplyPoint(origin.add(dir.uniformScale(k)))
      const size = sug.button.size
      if (Math.abs(local.x) <= size.x / 2 && Math.abs(local.y) <= size.y / 2) hit = true
    })
    return hit
  }
}
