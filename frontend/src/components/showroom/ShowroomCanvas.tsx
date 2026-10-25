'use client'

import { ContactShadows, Environment, Lightformer, PerformanceMonitor, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, type RootState } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { BackSide, CanvasTexture, CatmullRomCurve3, Color, MathUtils, Mesh, MeshPhysicalMaterial, SRGBColorSpace, Vector3, type MeshStandardMaterial } from 'three'

/** The car, optimised for the web (see the README), and the decoder for its compressed geometry, both served by the site. */
export const MODEL = '/models/maybach.glb'
const DRACO = '/draco/'

/** The studio's horizon: the floor fades into it, and it is a shade lighter than the page so the black car stands out. */
const HORIZON = '#121a26'

/** The car's length with its mirrors, in metres: how much width to leave for it. */
const CAR_SPAN = 5.4

/*
 * The model points to −x. The camera travels through four stations as the visitor scrolls:
 * front three-quarter, side profile, rear three-quarter, and a high view from behind.
 * Each is a direction from the car; the distance follows the shape of the screen.
 */
const STATIONS = [
  new Vector3(-6.1, 1.2, 4.5).normalize(),
  new Vector3(0.2, 0.9, 7.2).normalize(),
  new Vector3(5.8, 1.6, 4.4).normalize(),
  new Vector3(5, 5.5, 6).normalize().multiplyScalar(1.12),
]
const AIMS = [new Vector3(-0.2, 0.62, 0), new Vector3(0, 0.6, 0), new Vector3(0.3, 0.55, 0), new Vector3(0, 0.3, 0)]
/** Scroll progress at which the camera reaches each station: it lingers by each block of words. */
const AT = [0, 0.41, 0.76, 1]

const easeOut = (x: number) => 1 - (1 - x) ** 3

/** Scroll progress (0 to 1) to a position along the camera path. */
function pathAt(p: number) {
  for (let i = 1; i < AT.length; i++) {
    const end = AT[i] ?? 1
    const start = AT[i - 1] ?? 0
    if (p <= end) return (i - 1 + (p - start) / (end - start)) / (AT.length - 1)
  }
  return 1
}

export interface Pointer {
  x: number
  y: number
}

interface Props {
  /** Scroll progress through the showroom, 0 to 1, written by the page. */
  progress: RefObject<number>
  /** The pointer over the page, -1 to 1 on both axes. */
  pointer: RefObject<Pointer>
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

/** The Mercedes-Maybach, its lights coming on as the scene opens. */
function Car({ intro, onReady }: { intro: RefObject<number>; onReady: () => void }) {
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
  }, [scene, paint])

  useEffect(() => onReady(), [onReady])
  useFrame(() => lights.current?.update(easeOut(intro.current)))

  return <primitive object={scene} />
}

/**
 * Studio lighting, as reflections: a soft box overhead, long strips either side and a warm
 * gold glow behind. On larger screens one strip sweeps along the car as the visitor scrolls.
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

/** A soft round highlight, for the pool of light under the car. */
function poolTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, 'rgba(255,255,255,0.7)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.22)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 256, 256)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * The studio: a dark floor melting into a lighter horizon, with a pool of light under the car.
 * Drawn in exact colours, outside the tone mapping the car gets: tone mapping darkens the dome
 * more than the floor's haze, and the two would meet in a visible line.
 */
function Stage() {
  // Below the horizon the dome is the colour the floor fades to, so the two meet without a line.
  const dome = useMemo(() => gradientTexture([[0, '#06090e'], [0.3, '#0a0f17'], [0.5, HORIZON], [1, HORIZON]]), [])
  const pool = useMemo(() => poolTexture(), [])
  return (
    <group>
      <mesh scale={80}>
        <sphereGeometry args={[1, 48, 24]} />
        <meshBasicMaterial map={dome} side={BackSide} fog={false} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Unlit, so it fades evenly into the horizon instead of catching the studio light. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.001}>
        <circleGeometry args={[60, 64]} />
        <meshBasicMaterial color="#0b1018" toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} scale={[15, 9, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={pool} color="#efe3cb" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** The camera: along its path as the visitor scrolls, gently towards the pointer, and gliding in as the scene opens. */
class CameraRig {
  private readonly path = new CatmullRomCurve3(STATIONS, false, 'centripetal')
  private readonly aims = new CatmullRomCurve3(AIMS, false, 'centripetal')
  private readonly direction = new Vector3()
  private readonly position = new Vector3()
  private readonly target = new Vector3()
  private readonly forward = new Vector3()
  private readonly right = new Vector3()
  private readonly up = new Vector3()
  private p = 0
  private x = 0
  private y = 0

  update(state: RootState, delta: number, progress: number, pointer: Pointer, intro: number, compact: boolean) {
    const { camera, scene, size } = state
    const dt = Math.min(delta, 0.1)
    this.p = MathUtils.damp(this.p, progress, 5, dt)
    this.x = MathUtils.damp(this.x, compact ? 0 : pointer.x, 2.2, dt)
    this.y = MathUtils.damp(this.y, compact ? 0 : pointer.y, 2.2, dt)

    // How far back the camera stands: on a wide screen the car takes half the width, on a tall one nearly all of it.
    const aspect = size.width / Math.max(1, size.height)
    const wide = aspect >= 1.1
    const fov = aspect < 1 ? 44 : aspect < 1.4 ? 36 : 30
    if ('fov' in camera && camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    const halfWidthTan = Math.tan(MathUtils.degToRad(fov / 2)) * aspect
    const distance = CAR_SPAN / (2 * halfWidthTan * (wide ? 0.56 : 0.88))

    const { direction, position, target, forward, right, up } = this
    const t = pathAt(this.p)
    this.path.getPoint(t, direction)
    this.aims.getPoint(t, target)

    // Opening: the camera starts further back and lower, and the studio lights come up.
    const k = 1 - easeOut(intro)
    position.copy(target).addScaledVector(direction, distance * (1 + 0.5 * k))
    position.y -= 0.6 * k
    scene.environmentIntensity = 0.2 + 1.1 * (1 - k)
    // The haze starts behind the car, wherever the camera stands.
    if (scene.fog && 'near' in scene.fog) {
      scene.fog.near = distance * 1.05
      scene.fog.far = distance * 3
    }

    // Composition: the words sit on the left of a wide screen, above the car on a tall one.
    const halfHeight = position.distanceTo(target) * Math.tan(MathUtils.degToRad(fov / 2))
    forward.subVectors(target, position).normalize()
    right.crossVectors(forward, camera.up).normalize()
    up.crossVectors(right, forward).normalize()
    if (wide) target.addScaledVector(right, -halfHeight * aspect * 0.42)
    else target.addScaledVector(up, halfHeight * 0.38)

    // A little parallax with the pointer.
    position.addScaledVector(right, this.x * 0.6).addScaledVector(up, this.y * 0.3)

    camera.position.copy(position)
    camera.lookAt(target)
  }
}

function Rig({ progress, pointer, intro, compact }: { progress: RefObject<number>; pointer: RefObject<Pointer>; intro: RefObject<number>; compact: boolean }) {
  const rig = useRef<CameraRig | null>(null)
  useFrame((state, delta) => {
    rig.current ??= new CameraRig()
    rig.current.update(state, delta, progress.current, pointer.current, intro.current, compact)
  })
  return null
}

function Scene({ progress, pointer, compact, onReady }: Omit<Props, 'active'>) {
  const intro = useRef(0)
  useFrame((_, delta) => {
    if (intro.current < 1) intro.current = Math.min(1, intro.current + Math.min(delta, 0.1) / 2.4)
  })
  return (
    <>
      <color attach="background" args={['#080c13']} />
      <fog attach="fog" args={[HORIZON, 12, 36]} />
      <Studio progress={progress} sweep={!compact} />
      <Stage />
      <Car intro={intro} onReady={onReady} />
      <ContactShadows position={[0, 0.004, 0]} scale={12} resolution={compact ? 512 : 1024} far={1.6} blur={2.4} opacity={0.9} frames={1} color="#000000" />
      <Rig progress={progress} pointer={pointer} intro={intro} compact={compact} />
    </>
  )
}

/** The showroom's 3D view. Loaded on demand by `Showroom`, never rendered on the server. */
export default function ShowroomCanvas({ progress, pointer, active, compact, onReady }: Props) {
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
        <Scene progress={progress} pointer={pointer} compact={compact} onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload(MODEL, DRACO, false)
