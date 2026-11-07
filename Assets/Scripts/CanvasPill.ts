// Botón píldora de design.md: fondo oscuro, etiqueta en blanco frío y borde según su estado.
import {CapsuleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/CapsuleButton"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {GradientParameters} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Utility/Assets"
import {ButtonTone, COLOR, TONE} from "./CanvasTheme"

const THEME_FONT = requireAsset("../Fonts/Inter.ttf") as Font

// La etiqueta va por delante de la cara del botón para que no la tape al verla en ángulo.
export const LABEL_Z = 0.35

// Grosor del borde en cm: el pulsado se refuerza con más grosor, además de con el color.
const BORDER_DEFAULT = 0.11 // más fino se rompe a tramos en la Preview
const BORDER_ACTIVE = 0.18
const BORDER_PRESSED = 0.26
const HOVER_LIGHTEN = 0.08
// Parte de la altura del botón que ocupa su icono.
const ICON_RATIO = 0.72

function solid(c: vec4): GradientParameters {
  return {
    enabled: true,
    type: "Linear",
    start: new vec2(0, 1),
    end: new vec2(0, -1),
    stop0: {enabled: true, percent: 0, color: c},
    stop1: {enabled: true, percent: 1, color: c},
  }
}

function lighten(c: vec4, amount: number): vec4 {
  return new vec4(Math.min(1, c.x + amount), Math.min(1, c.y + amount), Math.min(1, c.z + amount), c.w)
}

/** El fondo no cambia al activarlo: el estado se lee en el color y el grosor del borde. */
export function paintPill(btn: CapsuleButton, active: boolean, tone: ButtonTone = TONE.primary): void {
  const vis = btn.visual as RoundedRectangleVisual
  if (!vis) return
  const current = active ? tone : TONE.secondary
  const size = active ? BORDER_ACTIVE : BORDER_DEFAULT
  vis.defaultBaseType = "Gradient"
  vis.hoveredBaseType = "Gradient"
  vis.triggeredBaseType = "Gradient"
  vis.defaultGradient = solid(COLOR.surface)
  vis.hoveredGradient = solid(lighten(COLOR.surface, HOVER_LIGHTEN))
  vis.triggeredGradient = solid(COLOR.surface)
  vis.defaultHasBorder = true
  vis.hoveredHasBorder = true
  vis.triggeredHasBorder = true
  // Como en el relleno, un color sólido solo se consigue con un degradado de un solo color.
  vis.defaultBorderType = "Gradient"
  vis.hoveredBorderType = "Gradient"
  vis.triggeredBorderType = "Gradient"
  vis.borderDefaultGradient = solid(current.color)
  vis.borderHoveredGradient = solid(current.color)
  vis.borderTriggeredGradient = solid(current.pressed)
  vis.defaultBorderSize = size
  vis.hoveredBorderSize = size
  vis.triggeredBorderSize = BORDER_PRESSED
}

let hintListener: ((label: string | null) => void) | null = null

/** Quien muestra el nombre de un botón de solo icono mientras se apunta a él. */
export function setPillHintListener(fn: (label: string | null) => void): void {
  hintListener = fn
}

function makeIcon(parent: SceneObject, icon: Texture, height: number): void {
  const so = global.scene.createSceneObject("Icon")
  so.setParent(parent)
  const t = so.getTransform()
  const size = height * ICON_RATIO
  t.setLocalPosition(new vec3(0, 0, LABEL_Z))
  t.setLocalScale(new vec3(size, size, 1))
  const image = so.createComponent("Component.Image") as Image
  image.mainMaterial = IMAGE_MATERIAL_ASSET.clone()
  image.mainPass.baseTex = icon
  image.mainPass.baseColor = COLOR.text
  image.stretchMode = StretchMode.Stretch
}

export function makePill(
  parent: SceneObject,
  label: string,
  width: number,
  height: number,
  textSize: number,
  isActive: () => boolean,
  onPress: () => void,
  icon?: Texture
): CapsuleButton {
  const so = global.scene.createSceneObject(label)
  so.setParent(parent)
  const btn = so.createComponent(CapsuleButton.getTypeName()) as CapsuleButton
  btn.size = new vec3(width, height, 1)
  btn.onInitialized.add(() => paintPill(btn, isActive()))
  btn.onTriggerUp.add(onPress)

  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
  item.overrideWidth = width
  item.overrideHeight = height

  if (icon) {
    makeIcon(so, icon, height)
    btn.onInitialized.add(() => {
      btn.onHoverEnter.add(() => hintListener?.(label))
      btn.onHoverExit.add(() => hintListener?.(null))
    })
    return btn
  }

  const labelSo = global.scene.createSceneObject("Label")
  labelSo.setParent(so)
  labelSo.getTransform().setLocalPosition(new vec3(0, 0, LABEL_Z))
  const t = labelSo.createComponent("Component.Text") as Text
  t.font = THEME_FONT
  t.text = label
  t.size = textSize
  t.depthTest = true
  t.textFill.color = COLOR.text
  t.horizontalAlignment = HorizontalAlignment.Center
  t.verticalAlignment = VerticalAlignment.Center
  t.horizontalOverflow = HorizontalOverflow.Overflow
  t.layoutRect = Rect.create(-width / 2, width / 2, -height / 2, height / 2)
  return btn
}
