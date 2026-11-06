// Colores de indicaciones/design.md, que mandan sobre la marca en texto, selección y avisos.
// Las superficies siguen apple-brand-package/tokens.json (surface-tile-*): en una pantalla
// aditiva el negro es transparente.

function hex(h: string, a: number = 1): vec4 {
  const n = parseInt(h.slice(1), 16)
  return new vec4(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a)
}

export function withAlpha(c: vec4, a: number): vec4 {
  return new vec4(c.x, c.y, c.z, a)
}

export const COLOR = {
  primary: hex("#73D8FF"),          // design.md, selección: también lo activo, un solo color de foco
  text: hex("#F4F7FA"),             // design.md, texto principal
  warning: hex("#FFD27A"),          // design.md, pendiente/aviso
  error: hex("#FF9DA4"),            // design.md, error
  // Etiqueta sobre un botón de color claro. No es de design.md: el texto principal no se leería encima.
  onAccent: hex("#10242E"),
  textMuted: hex("#cccccc"),        // body-muted
  surface: hex("#272729"),          // surface-tile-1
  surfaceRaised: hex("#2a2a2c"),    // surface-tile-2
  surfaceDeep: hex("#252527"),      // surface-tile-3
  hairline: hex("#7a7a7a"),         // ink-muted-48
  // En pantalla aditiva los tile oscuros de la guía casi no suman luz: estos son el mismo gris neutro, más claro.
  chip: hex("#55555a"),
  panel: hex("#3a3a3d"),
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
  {name: "Grafito", stroke: hex("#ffffff"), fill: hex("#5f5f64")},
  {name: "Azul", stroke: hex("#2997ff"), fill: hex("#14508f")},
  {name: "Verde", stroke: hex("#30d158"), fill: hex("#1c6b35")},
  {name: "Amarillo", stroke: hex("#ffd60a"), fill: hex("#8a7000")},
  {name: "Naranja", stroke: hex("#ff9f0a"), fill: hex("#99590a")},
  {name: "Rojo", stroke: hex("#ff453a"), fill: hex("#8f2a24")},
]

export const STROKE_WIDTHS = [0.25, 0.5, 1.0]
export const LAYER_GAP = 11

export const NOTE_COLOR = 3
