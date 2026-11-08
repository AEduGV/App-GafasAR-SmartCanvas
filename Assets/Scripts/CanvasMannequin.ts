// Maniquí articulado de un colaborador de ejemplo: piezas ovaladas con articulaciones esféricas, como un
// maniquí de artista de madera. Solo se ve y se mueve; quién trabaja en qué lo decide CanvasApp.
import {createBuilder} from "./CanvasGeometry"
import {retire} from "./CanvasRenderer"

const WOOD = requireAsset("../Materials/MannequinPBR.mat") as Material
const UNLIT = requireAsset("../Materials/CanvasUnlit.mat") as Material
const THEME_FONT = requireAsset("../Fonts/Inter.ttf") as Font

// Medidas en cm, con el origen en el suelo entre los pies y el maniquí mirando hacia su +Z local.
const HIP_Y = 92
const SHOULDER_Y = 143
const SHOULDER_X = 19
const UPPER_ARM = 28
const FOREARM = 25
const TAG_Y = 192
// El brazo sigue al objetivo con suavidad, y al dibujar describe pequeños círculos.
const AIM_SMOOTH = 6
const SCRIBBLE_RADIUS = 1.6
const SCRIBBLE_SPEED = 7

let sphereMesh: RenderMesh | null = null

/** Esfera de radio 1 con normales, compartida por todas las piezas. */
function unitSphere(): RenderMesh {
  if (sphereMesh) return sphereMesh
  const b = createBuilder()
  const rings = 14
  const segments = 20
  const verts: number[] = []
  for (let i = 0; i <= rings; i++) {
    const v = i / rings
    const phi = v * Math.PI
    for (let j = 0; j <= segments; j++) {
      const u = j / segments
      const theta = u * Math.PI * 2
      const x = Math.sin(phi) * Math.cos(theta)
      const y = Math.cos(phi)
      const z = Math.sin(phi) * Math.sin(theta)
      verts.push(x, y, z, x, y, z, u, v)
    }
  }
  const idx: number[] = []
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j
      const c = a + segments + 1
      idx.push(a, a + 1, c, a + 1, c + 1, c)
    }
  }
  b.appendVerticesInterleaved(verts)
  b.appendIndices(idx)
  b.updateMesh()
  sphereMesh = b.getMesh()
  return sphereMesh
}

function node(parent: SceneObject, name: string, pos: vec3): SceneObject {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  so.getTransform().setLocalPosition(pos)
  return so
}

/** Una pieza ovalada: elipsoide de semiejes `size`, centrado en `center` respecto a su articulación. */
function piece(parent: SceneObject, name: string, center: vec3, size: vec3, material: Material = WOOD): SceneObject {
  const so = node(parent, name, center)
  so.getTransform().setLocalScale(size)
  const visual = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
  visual.mesh = unitSphere()
  visual.mainMaterial = material
  return so
}

function tinted(color: vec4): Material {
  const m = UNLIT.clone()
  m.mainPass.baseColor = color
  return m
}

export class CanvasMannequin {
  readonly root: SceneObject
  private body: SceneObject
  private chest: SceneObject
  private head: SceneObject
  private shoulderR: SceneObject
  private elbowR: SceneObject
  private wristR: SceneObject
  private shoulderL: SceneObject
  private ray: SceneObject
  private tip: SceneObject
  private tag: SceneObject
  private target: vec3 | null = null
  private aim: vec3 | null = null
  private drawing = false
  private time = Math.random() * 10

  constructor(parent: SceneObject, readonly name: string, readonly color: vec4) {
    this.root = node(parent, "Collaborator_" + name, vec3.zero())
    this.body = node(this.root, "Body", vec3.zero())

    // Piernas
    for (const side of [-1, 1]) {
      const hip = node(this.body, side < 0 ? "HipR" : "HipL", new vec3(9 * side, HIP_Y, 0))
      piece(hip, "Thigh", new vec3(0, -22, 0), new vec3(6.4, 22, 6.4))
      const knee = node(hip, "Knee", new vec3(0, -44, 0))
      piece(knee, "KneeJoint", vec3.zero(), new vec3(4.6, 4.6, 4.6))
      piece(knee, "Shin", new vec3(0, -22, 0), new vec3(5, 21, 5))
      const ankle = node(knee, "Ankle", new vec3(0, -44, 0))
      piece(ankle, "AnkleJoint", vec3.zero(), new vec3(3.2, 3.2, 3.2))
      piece(ankle, "Foot", new vec3(0, -2, 5), new vec3(4.6, 2.6, 11))
    }

    // Tronco
    piece(this.body, "Pelvis", new vec3(0, HIP_Y + 3, 0), new vec3(15, 10, 10))
    const spine = node(this.body, "Spine", new vec3(0, HIP_Y + 8, 0))
    piece(spine, "Waist", new vec3(0, 12, 0), new vec3(11.5, 12, 8.5))
    this.chest = node(spine, "Chest", new vec3(0, 26, 0))
    piece(this.chest, "Torso", new vec3(0, 8, 0), new vec3(17, 16, 10.5))
    // Una franja de su color en el pecho, para saber quién es también de lejos.
    piece(this.chest, "Badge", new vec3(0, 12, 9.6), new vec3(9, 1.2, 1.2), tinted(color))
    const neck = node(this.chest, "Neck", new vec3(0, 24, 0))
    piece(neck, "NeckPiece", new vec3(0, 3, 0), new vec3(4, 6, 4))
    this.head = node(neck, "Head", new vec3(0, 8, 0))
    piece(this.head, "Skull", new vec3(0, 11, 0.5), new vec3(9.5, 12, 10.5))

    // Brazos: el derecho trabaja, el izquierdo descansa un poco separado del cuerpo.
    const arms = (side: number): {shoulder: SceneObject; elbow: SceneObject; wrist: SceneObject} => {
      const shoulder = node(this.chest, side < 0 ? "ShoulderR" : "ShoulderL", new vec3(SHOULDER_X * side, SHOULDER_Y - (HIP_Y + 8 + 26), 0))
      piece(shoulder, "ShoulderJoint", vec3.zero(), new vec3(4.6, 4.6, 4.6))
      piece(shoulder, "UpperArm", new vec3(0, -UPPER_ARM / 2, 0), new vec3(4.2, UPPER_ARM / 2, 4.2))
      const elbow = node(shoulder, "Elbow", new vec3(0, -UPPER_ARM, 0))
      piece(elbow, "ElbowJoint", vec3.zero(), new vec3(3.4, 3.4, 3.4))
      piece(elbow, "Forearm", new vec3(0, -FOREARM / 2, 0), new vec3(3.6, FOREARM / 2, 3.6))
      const wrist = node(elbow, "Wrist", new vec3(0, -FOREARM, 0))
      piece(wrist, "Hand", new vec3(0, -5, 0), new vec3(3.4, 5.5, 1.8))
      return {shoulder, elbow, wrist}
    }
    const right = arms(-1)
    this.shoulderR = right.shoulder
    this.elbowR = right.elbow
    this.wristR = right.wrist
    this.shoulderL = arms(1).shoulder
    this.shoulderL.getTransform().setLocalRotation(quat.angleAxis(0.12, vec3.forward()))

    // Rayo de su color desde la mano hasta lo que toca, con un punto al final.
    const rayMat = tinted(new vec4(color.x, color.y, color.z, 0.85))
    this.ray = piece(this.root, "Ray", vec3.zero(), new vec3(0.25, 1, 0.25), rayMat)
    this.tip = piece(this.root, "Tip", vec3.zero(), new vec3(1, 1, 1), tinted(color))
    this.ray.enabled = false
    this.tip.enabled = false

    // Placa con el nombre, siempre de cara a quien mira.
    this.tag = node(this.root, "NameTag", new vec3(0, TAG_Y, 0))
    piece(this.tag, "Dot", new vec3(-6, 0, 0), new vec3(1.6, 1.6, 0.4), tinted(color))
    const label = node(this.tag, "Label", new vec3(-3.5, 0, 0))
    const t = label.createComponent("Component.Text") as Text
    t.font = THEME_FONT
    t.size = 120
    t.text = name
    t.textFill.color = new vec4(0.96, 0.97, 0.98, 1)
    t.horizontalAlignment = HorizontalAlignment.Left
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.layoutRect = Rect.create(0, 20, -3, 3)
  }

  /** De pie en `floor`, mirando hacia `facing` (se ignora la inclinación). */
  place(floor: vec3, facing: vec3): void {
    const flat = new vec3(facing.x, 0, facing.z)
    const dir = flat.length < 0.01 ? vec3.forward() : flat.normalize()
    const t = this.root.getTransform()
    t.setWorldPosition(floor)
    t.setWorldRotation(quat.lookAt(dir, vec3.up()))
  }

  /** Apunta y, si `drawing`, garabatea alrededor de ese punto; null baja el brazo. */
  setTarget(point: vec3 | null, drawing: boolean = false): void {
    this.target = point
    this.drawing = drawing
  }

  update(dt: number, eye: vec3): void {
    this.time += dt
    const s = this.time
    // Respira y se balancea un poco: un maniquí completamente quieto parece un objeto, no alguien.
    this.body.getTransform().setLocalRotation(quat.angleAxis(Math.sin(s * 0.7) * 0.015, vec3.forward()))
    this.chest.getTransform().setLocalScale(new vec3(1, 1 + Math.sin(s * 1.6) * 0.008, 1))

    let goal = this.target
    if (goal && this.drawing) {
      const r = this.root.getTransform()
      goal = goal
        .add(r.right.uniformScale(Math.cos(s * SCRIBBLE_SPEED) * SCRIBBLE_RADIUS))
        .add(vec3.up().uniformScale(Math.sin(s * SCRIBBLE_SPEED * 1.3) * SCRIBBLE_RADIUS * 0.7))
    }
    if (goal) {
      const k = Math.min(1, dt * AIM_SMOOTH)
      this.aim = this.aim ? vec3.lerp(this.aim, goal, k) : goal
    }

    const shoulder = this.shoulderR.getTransform()
    if (this.aim && this.target) {
      // El brazo extendido hacia el objetivo, con el codo algo doblado.
      const dir = this.aim.sub(shoulder.getWorldPosition()).normalize()
      shoulder.setWorldRotation(quat.rotationFromTo(vec3.down(), dir).multiply(quat.angleAxis(0.18, vec3.right())))
      this.elbowR.getTransform().setLocalRotation(quat.angleAxis(-0.3, vec3.right()))
      const from = this.wristR.getTransform().getWorldPosition().add(dir.uniformScale(9))
      this.setRay(from, this.aim)
      this.lookAt(this.aim)
    } else {
      shoulder.setLocalRotation(quat.angleAxis(-0.1, vec3.forward()))
      this.elbowR.getTransform().setLocalRotation(quat.angleAxis(-0.15, vec3.right()))
      this.ray.enabled = false
      this.tip.enabled = false
      this.lookAt(eye)
    }

    const tag = this.tag.getTransform()
    const toEye = eye.sub(tag.getWorldPosition())
    tag.setWorldRotation(quat.lookAt(new vec3(toEye.x, 0, toEye.z).normalize(), vec3.up()))
  }

  private lookAt(point: vec3): void {
    const head = this.head.getTransform()
    const dir = point.sub(head.getWorldPosition())
    if (dir.length < 0.01) return
    head.setWorldRotation(quat.lookAt(dir.normalize(), vec3.up()))
  }

  private setRay(from: vec3, to: vec3): void {
    const span = to.sub(from)
    const len = span.length
    if (len < 0.5) {
      this.ray.enabled = false
      return
    }
    const r = this.ray.getTransform()
    r.setWorldPosition(from.add(span.uniformScale(0.5)))
    r.setWorldRotation(quat.rotationFromTo(vec3.up(), span.normalize()))
    r.setWorldScale(new vec3(0.25, len / 2, 0.25))
    this.ray.enabled = true
    this.tip.getTransform().setWorldPosition(to)
    this.tip.enabled = true
  }

  destroy(): void {
    retire(this.root)
  }
}
