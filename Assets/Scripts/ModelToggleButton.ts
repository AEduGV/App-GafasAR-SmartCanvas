// Botón apoyado en la mesa que muestra u oculta un modelo 3D de la escena (la maqueta). Sigue las reglas de cercanía
// de los botones de los canvas: solo se ve a 1 m o menos del cuerpo del usuario y crece desde cero al aparecer.
import {CapsuleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/CapsuleButton"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {ICON} from "./CanvasIcons"
import {addPillEdge, makePill, paintPill} from "./CanvasPill"

// Las mismas medidas que los botones de los canvas (CanvasApp): distancia máxima hasta una barra vertical que va de
// los ojos a 150 cm por debajo, y animación de aparición.
const MAX_DISTANCE = 100
const BODY_HEIGHT = 150
const BODY_SAMPLES = 7
const APPEAR_TIME = 0.3

@component
export class ModelToggleButton extends BaseScriptComponent {
  @input
  @hint("Objeto que el botón muestra y oculta")
  target: SceneObject

  @input
  @hint("Lado del botón (cm)")
  size: number = 5

  private holder: SceneObject
  private button: CapsuleButton
  private camera: Transform | null = null
  private appearStart: number | null = null

  onAwake(): void {
    this.holder = global.scene.createSceneObject("ModelToggle")
    this.holder.setParent(this.getSceneObject())
    this.holder.createComponent("Component.Canvas")
    this.button = makePill(this.holder, "Show or hide the 3D model", this.size, this.size, 56, () => this.isShown(), () => this.toggle(), ICON.view_in_ar)
    addPillEdge(this.button)
    this.holder.enabled = false
    this.createEvent("OnStartEvent").bind(() => {
      this.camera = WorldCameraFinderProvider.getInstance().getComponent().getTransform()
    })
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  private isShown(): boolean {
    return !!this.target && this.target.enabled
  }

  private toggle(): void {
    if (!this.target) return
    this.target.enabled = !this.target.enabled
    paintPill(this.button, this.target.enabled)
    print("[CanvasAR] maqueta " + (this.target.enabled ? "visible" : "oculta"))
  }

  /** Distancia (cm) del botón a la barra del cuerpo bajo los ojos. */
  private distanceToBody(eye: vec3): number {
    const p = this.holder.getTransform().getWorldPosition()
    let best = Infinity
    for (let i = 0; i < BODY_SAMPLES; i++) {
      best = Math.min(best, p.distance(eye.add(new vec3(0, (-BODY_HEIGHT * i) / (BODY_SAMPLES - 1), 0))))
    }
    return best
  }

  private tick(): void {
    if (!this.camera) return
    const near = this.distanceToBody(this.camera.getWorldPosition()) <= MAX_DISTANCE
    if (near !== this.holder.enabled) {
      this.holder.enabled = near
      this.appearStart = near ? getTime() : null
    }
    if (this.appearStart === null) return
    const k = Math.min(1, (getTime() - this.appearStart) / APPEAR_TIME)
    // easeOutBack, como los botones de los canvas.
    const s1 = 1.70158
    const e = k >= 1 ? 1 : 1 + (s1 + 1) * Math.pow(k - 1, 3) + s1 * Math.pow(k - 1, 2)
    const v = Math.max(0.001, e)
    this.holder.getTransform().setLocalScale(new vec3(v, v, v))
    if (k >= 1) {
      this.appearStart = null
      paintPill(this.button, this.isShown())
    }
  }
}
