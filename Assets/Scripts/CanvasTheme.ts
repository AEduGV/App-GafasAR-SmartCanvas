// Colores de indicaciones/design.md, con su contraste medido sobre #182230 (mínimo 4,5:1 en texto).
// En una pantalla aditiva el fondo oscuro es casi transparente: en las gafas no tapa el entorno.

function hex(h: string, a: number = 1): vec4 {
  const n = parseInt(h.slice(1), 16)
  return new vec4(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a)
}

export function withAlpha(c: vec4, a: number): vec4 {
  return new vec4(c.x, c.y, c.z, a)
}

export const COLOR = {
  text: hex("#F4F7FA"),             // texto principal
  textMuted: hex("#C8D2DE"),        // texto secundario y pistas
  outline: hex("#A0B1C5"),          // contorno neutro de notas y canvas
  surface: hex("#182230"),          // fondo de referencia
  primary: hex("#2E9FD8"),          // selección y botón activo. Más oscuro que el #73D8FF de design.md, a petición del usuario
  primaryPressed: hex("#2689C4"),
  secondary: hex("#C8D2DE"),        // borde de botón secundario
  secondaryPressed: hex("#B3BFCD"),
  warning: hex("#FFD27A"),
  error: hex("#FF9DA4"),
}

/** Color del borde de un botón en reposo y mientras se pulsa. */
export interface ButtonTone {
  color: vec4
  pressed: vec4
}

export const TONE: Record<"secondary" | "primary" | "warning", ButtonTone> = {
  secondary: {color: COLOR.secondary, pressed: COLOR.secondaryPressed},
  primary: {color: COLOR.primary, pressed: COLOR.primaryPressed},
  // design.md no define su pulsado: es el mismo ámbar, más oscuro.
  warning: {color: COLOR.warning, pressed: hex("#E0B662")},
}

// Radios en cm: la escala de la guía (11 px y 18 px) a ~0,1 cm/px para distancia de lectura.
export const RADIUS = {card: 1.8, small: 1.1}

// Colores básicos del §5 de la especificación. Son contenido del usuario, no interfaz,
// por eso no se limitan al azul de la marca. Sin negro: no se vería en las gafas.
export interface PaletteEntry {
  name: string
  stroke: vec4
  fill: vec4
}

export const PALETTE: PaletteEntry[] = [
  {name: "Grafito", stroke: hex("#F4F7FA"), fill: hex("#5f5f64")},
  {name: "Azul", stroke: hex("#2997ff"), fill: hex("#14508f")},
  {name: "Verde", stroke: hex("#30d158"), fill: hex("#1c6b35")},
  {name: "Amarillo", stroke: hex("#ffd60a"), fill: hex("#806a00")}, // más claro no llega a 4,5:1 con el texto
  {name: "Naranja", stroke: hex("#ff9f0a"), fill: hex("#99590a")},
  {name: "Rojo", stroke: hex("#ff453a"), fill: hex("#8f2a24")},
]

export const STROKE_WIDTHS = [0.25, 0.5, 1.0]
export const LAYER_GAP = 11

export const NOTE_COLOR = 3
