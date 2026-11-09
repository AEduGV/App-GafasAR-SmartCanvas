// Hace flotar un objeto como un holograma: sube y baja suavemente y gira despacio sobre su eje vertical.
// Va en un objeto vacío colocado en el centro del modelo, que es su hijo, para que gire sobre sí mismo.
@component
export class HologramFloat extends BaseScriptComponent {
  @input
  @hint("Altura (cm) que sube y baja")
  bobHeight: number = 1.5

  @input
  @hint("Segundos que tarda en subir y bajar")
  bobPeriod: number = 4

  @input
  @hint("Grados por segundo que gira")
  spinSpeed: number = 8

  private base: vec3 = vec3.zero()
  private start = 0

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => {
      this.base = this.getTransform().getLocalPosition()
      this.start = getTime()
    })
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  private tick(): void {
    const t = getTime() - this.start
    const y = Math.sin((t / this.bobPeriod) * Math.PI * 2) * this.bobHeight
    const transform = this.getTransform()
    transform.setLocalPosition(this.base.add(new vec3(0, y, 0)))
    transform.setLocalRotation(quat.angleAxis((t * this.spinSpeed * Math.PI) / 180, vec3.up()))
  }
}
