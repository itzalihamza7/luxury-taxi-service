'use client'

import { ContactShadows, Environment, Lightformer, PerformanceMonitor, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, type RootState } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  SRGBColorSpace,
  Vector3,
  type MeshStandardMaterial,
  type Object3D,
} from 'three'

/** The car, optimised for the web (see the README), and the decoder for its compressed geometry, both served by the site. */
export const MODEL = '/models/maybach.glb'
const DRACO = '/draco/'

/** The night's horizon: the floor fades into it, and it is a shade lighter than the page so the black car stands out. */
const HORIZON = '#1a2232'

/*
 * The model points to −x. The camera travels through three stations as the visitor scrolls:
 * front three-quarter, side profile and rear three-quarter, each a direction from the car,
 * low enough that the car stands against the lights of the city behind it.
 */
const STATIONS = [new Vector3(-6.1, 0.9, 4.5).normalize(), new Vector3(0.2, 0.7, 7.2).normalize(), new Vector3(5.8, 1.05, 4.4).normalize()]
const AIMS = [new Vector3(-0.2, 0.62, 0), new Vector3(0, 0.6, 0), new Vector3(0.3, 0.55, 0)]
/** Scroll progress at which the camera reaches each station: the middle of each block of words in `Showroom`. */
const AT = [0, 0.46, 0.84]

const easeOut = (x: number) => 1 - (1 - x) ** 3
const smoothstep = (x: number) => x * x * (3 - 2 * x)

/** Scroll progress (0 to 1) to a position along the camera path, slowing into each station. */
function pathAt(p: number) {
  for (let i = 1; i < AT.length; i++) {
    const end = AT[i] ?? 1
    const start = AT[i - 1] ?? 0
    if (p <= end) return (i - 1 + smoothstep(MathUtils.clamp((p - start) / (end - start), 0, 1))) / (AT.length - 1)
  }
  return 1
}

export interface Pointer {
  x: number
  y: number
}

/** The part of the canvas the car may take, in CSS pixels from its top left corner. */
export interface Frame {
  left: number
  top: number
  right: number
  bottom: number
}

interface Props {
  /** Scroll progress through the showroom, 0 to 1, written by the page. */
  progress: RefObject<number>
  /** The pointer over the page, -1 to 1 on both axes. */
  pointer: RefObject<Pointer>
  /** Where the words leave room for the car, written by the page. */
  frame: RefObject<Frame>
  /** Off screen, nothing is drawn. */
  active: boolean
  /** Phones and small tablets: a lighter scene. */
  compact: boolean
  onReady: () => void
}

/** The head- and taillights, brought up from dark to full as the scene opens. */
class CarLights {
  constructor(
    private readonly head: MeshStandardMaterial[],
    private readonly tail: MeshStandardMaterial[],
  ) {}

  update(level: number) {
    for (const material of this.head) material.emissiveIntensity = 2.4 * level
    for (const material of this.tail) material.emissiveIntensity = 1.8 * level
  }
}

/** Directions spread evenly over a sphere (a Fibonacci lattice). */
function directions(count: number) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / count
    const r = Math.sqrt(1 - y * y)
    return new Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r)
  })
}

/** The car's outermost points in many directions: enough to know its outline from any side. */
function outlineOf(root: Object3D): Vector3[] {
  const support = directions(64).map((direction) => ({ direction, reach: -Infinity, point: new Vector3() }))
  const meshes: Mesh[] = []
  root.updateMatrixWorld(true)
  root.traverse((object) => {
    if (object instanceof Mesh && object.visible) meshes.push(object)
  })
  // A sample of the vertices is plenty, and keeps this to a few milliseconds.
  const total = meshes.reduce((sum, mesh) => sum + mesh.geometry.getAttribute('position').count, 0)
  const step = Math.max(1, Math.round(total / 20000))
  const vertex = new Vector3()
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position')
    for (let i = 0; i < position.count; i += step) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld)
      for (const entry of support) {
        const reach = vertex.dot(entry.direction)
        if (reach > entry.reach) {
          entry.reach = reach
          entry.point.copy(vertex)
        }
      }
    }
  }
  return support.filter((entry) => entry.reach > -Infinity).map((entry) => entry.point)
}

/** The Mercedes-Maybach, its lights coming on as the scene opens. */
function Car({ intro, outlineRef, onReady }: { intro: RefObject<number>; outlineRef: RefObject<Vector3[] | null>; onReady: () => void }) {
  const { scene } = useGLTF(MODEL, DRACO, false)
  const lights = useRef<CarLights | null>(null)
  // Deep black metallic paint under a clear coat: what makes the studio lights glide over the body.
  const paint = useMemo(() => new MeshPhysicalMaterial({ color: '#040508', metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.25 }), [])

  useLayoutEffect(() => {
    const head: MeshStandardMaterial[] = []
    const tail: MeshStandardMaterial[] = []
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return
      const material = object.material as MeshStandardMaterial
      // A fully transparent helper plane in the model: never drawn, and kept out of the way.
      if (material.transparent && material.opacity === 0) {
        object.visible = false
        return
      }
      switch (material.name) {
        case 'Car_Paint_With_Flakes':
          object.material = paint
          break
        case 'Car_Paint.001':
          material.emissive = new Color('#fff4e2')
          head.push(material)
          break
        case 'Red_car_lights_glass':
        case 'Material.001':
          material.emissive = new Color('#ff1d1d')
          tail.push(material)
          break
      }
    })
    lights.current = new CarLights(head, tail)
    outlineRef.current = outlineOf(scene)
  }, [scene, paint, outlineRef])

  useEffect(() => onReady(), [onReady])
  useFrame(() => lights.current?.update(easeOut(intro.current)))

  return <primitive object={scene} />
}

/**
 * Lighting, as reflections: a soft box overhead, long strips either side, a warm gold glow and
 * the street lamps behind. On larger screens one strip sweeps along the car as the visitor scrolls.
 */
function Studio({ progress, sweep }: { progress: RefObject<number>; sweep: boolean }) {
  const strip = useRef<Mesh>(null)
  useFrame(() => {
    if (strip.current) strip.current.position.x = MathUtils.lerp(-9, 9, progress.current)
  })
  return (
    <Environment resolution={256} frames={sweep ? Infinity : 1}>
      <Lightformer form="rect" intensity={2.6} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 5, 1]} />
      <Lightformer form="rect" intensity={1.6} position={[0, 2.2, 8]} scale={[18, 1.1, 1]} />
      <Lightformer form="rect" intensity={1.3} position={[0, 2.6, -8]} rotation-y={Math.PI} scale={[18, 0.8, 1]} />
      <Lightformer form="rect" intensity={1.8} position={[-9, 1.8, 0]} rotation-y={Math.PI / 2} scale={[10, 2.5, 1]} />
      <Lightformer form="rect" intensity={1.2} position={[9, 1.8, 0]} rotation-y={-Math.PI / 2} scale={[10, 1.5, 1]} />
      <Lightformer form="circle" color="#d4b67e" intensity={4} position={[9, 2.5, -4]} scale={4} />
      {[-150, -115, -80, -45, -10].map((angle) => (
        <Lightformer
          key={angle}
          form="circle"
          color="#ffc98a"
          intensity={5}
          position={[Math.cos(MathUtils.degToRad(angle)) * 9, 2.2, Math.sin(MathUtils.degToRad(angle)) * 9]}
          scale={0.9}
          target={[0, 1, 0]}
        />
      ))}
      {sweep ? <Lightformer ref={strip} form="rect" intensity={3} position={[-9, 3.2, 5]} rotation-x={-0.4} scale={[1.4, 6, 1]} /> : null}
    </Environment>
  )
}

/** A vertical gradient, drawn once on a small canvas. */
function gradientTexture(stops: [number, string][]) {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, 256)
    for (const [at, color] of stops) gradient.addColorStop(at, color)
    context.fillStyle = gradient
    context.fillRect(0, 0, 2, 256)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** A soft round highlight, squeezed sideways for `narrow` below 1. */
function glowTexture(stops: [number, string][], narrow = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')
  if (context) {
    context.translate(64, 64)
    context.scale(narrow, 1)
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 64)
    for (const [at, color] of stops) gradient.addColorStop(at, color)
    context.fillStyle = gradient
    context.fillRect(-64, -64, 128, 128)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * The street at night: a dark floor melting into the horizon under a deep blue sky, with a pool
 * of light under the car. Drawn in exact colours, outside the tone mapping the car gets: tone
 * mapping darkens the sky more than the floor's haze, and the two would meet in a visible line.
 */
function Stage() {
  // Below the horizon the sky is the colour the floor fades to, so the two meet without a line.
  const dome = useMemo(
    () =>
      gradientTexture([
        [0, '#03060c'],
        [0.3, '#07101f'],
        [0.45, '#111c31'],
        [0.5, HORIZON],
        [1, HORIZON],
      ]),
    [],
  )
  const pool = useMemo(
    () =>
      glowTexture([
        [0, 'rgba(255,255,255,0.7)'],
        [0.4, 'rgba(255,255,255,0.22)'],
        [1, 'rgba(255,255,255,0)'],
      ]),
    [],
  )
  return (
    <group>
      <mesh scale={80}>
        <sphereGeometry args={[1, 48, 24]} />
        <meshBasicMaterial map={dome} side={BackSide} fog={false} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Unlit, so it fades evenly into the horizon instead of catching the studio light. It leaves the depth alone, so the city's reflections show in it. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.001}>
        <circleGeometry args={[60, 64]} />
        <meshBasicMaterial color="#080b11" toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} scale={[15, 9, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={pool} color="#efe3cb" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** A small seeded random generator (mulberry32): the same city on every visit. */
function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Street lamps, windows, headlights and the odd taillight, weighted by how often they appear. */
const CITY_COLOURS: [string, number][] = [
  ['#ffd7a1', 5],
  ['#ffbd6e', 5],
  ['#e3cc9f', 3],
  ['#fff3e0', 2],
  ['#ff5444', 0.6],
  ['#a8c2ff', 0.4],
]

/** One layer of lights on a ring behind the car, from `near` to `far` metres away. */
function lightLayer(random: () => number, count: number, near: number, far: number) {
  const positions = new Float32Array(count * 3)
  const colours = new Float32Array(count * 4)
  const weight = CITY_COLOURS.reduce((sum, [, w]) => sum + w, 0)
  const colour = new Color()
  for (let i = 0; i < count; i++) {
    // The far side of the car, where the camera looks, with a margin either side.
    const angle = MathUtils.degToRad(-200 + random() * 220)
    const radius = near + random() * (far - near)
    let pick = random() * weight
    const [hex] = CITY_COLOURS.find(([, w]) => (pick -= w) < 0) ?? CITY_COLOURS[0] ?? ['#ffd7a1']
    // Street level up to the first floors, so they gather in a band behind the car; red ones only at the height of a car.
    const height = hex === '#ff5444' ? 0.4 + random() * 0.5 : 0.2 + random() ** 1.3 * 3.3
    positions.set([Math.cos(angle) * radius, height, Math.sin(angle) * radius], i * 3)
    colour.set(hex)
    colours.set([colour.r, colour.g, colour.b, 0.18 + random() * 0.4], i * 4)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colours, 4))
  return geometry
}

/** Madrid at night behind the car, out of focus as through a fast lens, and mirrored in the wet floor. */
function City() {
  const { layers, disc, streak } = useMemo(() => {
    const random = seeded(11)
    return {
      layers: [
        { geometry: lightLayer(random, 220, 42, 60), size: 1.2 },
        { geometry: lightLayer(random, 120, 28, 42), size: 2 },
        { geometry: lightLayer(random, 40, 18, 28), size: 3.2 },
      ],
      // A real lens draws an out-of-focus light as a soft disc with a slightly brighter rim.
      disc: glowTexture([
        [0, 'rgba(255,255,255,0.4)'],
        [0.7, 'rgba(255,255,255,0.46)'],
        [0.88, 'rgba(255,255,255,0.5)'],
        [0.96, 'rgba(255,255,255,0.22)'],
        [1, 'rgba(255,255,255,0)'],
      ]),
      streak: glowTexture(
        [
          [0, 'rgba(255,255,255,0.6)'],
          [0.5, 'rgba(255,255,255,0.2)'],
          [1, 'rgba(255,255,255,0)'],
        ],
        0.4,
      ),
    }
  }, [])
  return (
    <group>
      {layers.map((layer) => (
        <points key={layer.size} geometry={layer.geometry} frustumCulled={false}>
          <pointsMaterial map={disc} size={layer.size} vertexColors transparent depthWrite={false} blending={AdditiveBlending} fog={false} toneMapped={false} />
        </points>
      ))}
      <group scale={[1, -1, 1]}>
        {layers.map((layer) => (
          <points key={layer.size} geometry={layer.geometry} frustumCulled={false}>
            <pointsMaterial map={streak} size={layer.size * 1.3} vertexColors transparent opacity={0.32} depthWrite={false} blending={AdditiveBlending} fog={false} toneMapped={false} />
          </points>
        ))}
      </group>
    </group>
  )
}

/** A warm light on the wall behind the car, wherever the camera stands. */
function Halo() {
  const mesh = useRef<Mesh>(null)
  const texture = useMemo(
    () =>
      glowTexture([
        [0, 'rgba(255,255,255,0.9)'],
        [0.35, 'rgba(255,255,255,0.35)'],
        [1, 'rgba(255,255,255,0)'],
      ]),
    [],
  )
  const behind = useMemo(() => new Vector3(), [])
  useFrame(({ camera }) => {
    const glow = mesh.current
    if (!glow) return
    behind.set(0, 0.6, 0).sub(camera.position).setY(0).normalize()
    glow.position.set(0, 2.2, 0).addScaledVector(behind, 22)
    glow.quaternion.copy(camera.quaternion)
  })
  return (
    <mesh ref={mesh} scale={[34, 20, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} color="#c9a46a" transparent opacity={0.42} blending={AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  )
}

interface RigInput {
  progress: number
  pointer: Pointer
  frame: Frame
  outline: Vector3[] | null
  intro: number
  compact: boolean
}

/** The camera: along its path as the visitor scrolls, framing the car in the room the words leave, gliding in as the scene opens. */
class CameraRig {
  private readonly path = new CatmullRomCurve3(STATIONS, false, 'centripetal')
  private readonly aims = new CatmullRomCurve3(AIMS, false, 'centripetal')
  private readonly direction = new Vector3()
  private readonly target = new Vector3()
  private readonly point = new Vector3()
  private readonly right = new Vector3()
  private readonly up = new Vector3()
  /** The room for the car, in normalised device coordinates (−1 to 1, y up), eased towards the page's figure. */
  private readonly room = { left: 0, top: 0, right: 0, bottom: 0, set: false }
  private readonly bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  private distance = 12
  private p = 0
  private x = 0
  private y = 0

  private place(camera: PerspectiveCamera, distance: number, lift = 0) {
    camera.position.copy(this.target).addScaledVector(this.direction, distance)
    camera.position.y += lift
    camera.lookAt(this.target)
    camera.updateMatrixWorld()
  }

  /** The outline's extent on screen, in normalised device coordinates. */
  private measure(camera: PerspectiveCamera, outline: Vector3[]) {
    const b = this.bounds
    b.minX = b.minY = Infinity
    b.maxX = b.maxY = -Infinity
    for (const vertex of outline) {
      this.point.copy(vertex).project(camera)
      b.minX = Math.min(b.minX, this.point.x)
      b.maxX = Math.max(b.maxX, this.point.x)
      b.minY = Math.min(b.minY, this.point.y)
      b.maxY = Math.max(b.maxY, this.point.y)
    }
    return b
  }

  update(state: RootState, delta: number, input: RigInput) {
    const { camera, scene, size } = state
    if (!(camera instanceof PerspectiveCamera) || !input.outline || size.width === 0) return
    const dt = Math.min(delta, 0.1)
    this.p = MathUtils.damp(this.p, input.progress, 5, dt)
    this.x = MathUtils.damp(this.x, input.compact ? 0 : input.pointer.x, 2.2, dt)
    this.y = MathUtils.damp(this.y, input.compact ? 0 : input.pointer.y, 2.2, dt)

    // A longer lens on a wide screen, a wider one on a tall screen.
    const aspect = size.width / Math.max(1, size.height)
    const fov = aspect < 1 ? 44 : aspect < 1.4 ? 36 : 30
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    // The room for the car: when the words or the screen change, the car eases into its new place.
    const room = this.room
    const ease = room.set ? 1 - Math.exp(-4 * dt) : 1
    const { frame } = input
    room.left += ((frame.left / size.width) * 2 - 1 - room.left) * ease
    room.right += ((frame.right / size.width) * 2 - 1 - room.right) * ease
    room.top += (1 - (frame.top / size.height) * 2 - room.top) * ease
    room.bottom += (1 - (frame.bottom / size.height) * 2 - room.bottom) * ease
    room.set = true

    const t = pathAt(this.p)
    this.path.getPoint(t, this.direction).normalize()
    this.aims.getPoint(t, this.target)

    // Stand back until the car's outline fits its room; a few rounds settle the distance.
    camera.clearViewOffset()
    let distance = this.distance
    for (let i = 0; i < 3; i++) {
      this.place(camera, distance)
      const b = this.measure(camera, input.outline)
      distance *= Math.max((b.maxX - b.minX) / Math.max(0.05, room.right - room.left), (b.maxY - b.minY) / Math.max(0.05, room.top - room.bottom))
    }
    this.distance = distance

    // Opening: the camera starts further back and lower, and the studio lights come up.
    const k = 1 - easeOut(input.intro)
    this.place(camera, distance * (1 + 0.5 * k), -0.6 * k)
    scene.environmentIntensity = 0.2 + 1.1 * (1 - k)
    // The haze starts behind the car, wherever the camera stands.
    if (scene.fog && 'near' in scene.fog) {
      scene.fog.near = distance * 1.05
      scene.fog.far = distance * 3
    }

    // A little parallax with the pointer.
    this.right.setFromMatrixColumn(camera.matrixWorld, 0)
    this.up.setFromMatrixColumn(camera.matrixWorld, 1)
    camera.position.addScaledVector(this.right, this.x * 0.6).addScaledVector(this.up, this.y * 0.3)
    camera.lookAt(this.target)
    camera.updateMatrixWorld()

    // A shifted lens, as on an architect's camera, puts the car in the middle of its room without turning the camera.
    const b = this.measure(camera, input.outline)
    const shiftX = (room.left + room.right) / 2 - (b.minX + b.maxX) / 2
    const shiftY = (room.top + room.bottom) / 2 - (b.minY + b.maxY) / 2
    camera.setViewOffset(size.width, size.height, (-shiftX * size.width) / 2, (shiftY * size.height) / 2, size.width, size.height)
  }
}

function Rig({ progress, pointer, frame, outline, intro, compact }: { progress: RefObject<number>; pointer: RefObject<Pointer>; frame: RefObject<Frame>; outline: RefObject<Vector3[] | null>; intro: RefObject<number>; compact: boolean }) {
  const rig = useRef<CameraRig | null>(null)
  useFrame((state, delta) => {
    rig.current ??= new CameraRig()
    rig.current.update(state, delta, { progress: progress.current, pointer: pointer.current, frame: frame.current, outline: outline.current, intro: intro.current, compact })
  })
  return null
}

function Scene({ progress, pointer, frame, compact, onReady }: Omit<Props, 'active'>) {
  const intro = useRef(0)
  const outline = useRef<Vector3[] | null>(null)
  useFrame((_, delta) => {
    if (intro.current < 1) intro.current = Math.min(1, intro.current + Math.min(delta, 0.1) / 2.4)
  })
  return (
    <>
      <color attach="background" args={['#080c13']} />
      <fog attach="fog" args={[HORIZON, 12, 36]} />
      <Studio progress={progress} sweep={!compact} />
      <Stage />
      {/* On a phone the lights read as coloured dots around the words: there the warm glow alone sets the night. */}
      {compact ? null : <City />}
      <Halo />
      <Car intro={intro} outlineRef={outline} onReady={onReady} />
      <ContactShadows position={[0, 0.004, 0]} scale={12} resolution={compact ? 512 : 1024} far={1.6} blur={2.4} opacity={0.9} frames={1} color="#000000" />
      <Rig progress={progress} pointer={pointer} frame={frame} outline={outline} intro={intro} compact={compact} />
    </>
  )
}

/** The showroom's 3D view. Loaded on demand by `Showroom`, never rendered on the server. */
export default function ShowroomCanvas({ progress, pointer, frame, active, compact, onReady }: Props) {
  const [dpr, setDpr] = useState(compact ? 1.25 : 1.5)
  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 30, near: 0.1, far: 200, position: [-12, 2, 9] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.15
      }}
      aria-hidden
    >
      {/* Sharper on a strong GPU, softer on a struggling one. */}
      <PerformanceMonitor onIncline={() => setDpr(compact ? 1.5 : 2)} onDecline={() => setDpr(1)} />
      <Suspense fallback={null}>
        <Scene progress={progress} pointer={pointer} frame={frame} compact={compact} onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload(MODEL, DRACO, false)
