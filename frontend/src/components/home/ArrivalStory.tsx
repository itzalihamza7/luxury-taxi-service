'use client'

import { getImageProps } from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { Photo } from '@/components/ui/Photo'
import type { PageMessages } from '@/i18n/messages/pages'
import { CAR_VIEWBOX, CarBody, DOOR_BOX, RearDoor } from './LuxuryCar'

type Story = PageMessages['home']['story']

interface Props {
  story: Story
  book: string
  fleet: string
}

const CABIN = '/images/journal/cabin.jpg'

const clamp = (value: number) => Math.min(1, Math.max(0, value))
/** Progress of `p` between `from` and `to`, 0 before and 1 after. */
const span = (p: number, from: number, to: number) => clamp((p - from) / (to - from))
const easeOut = (x: number) => 1 - (1 - x) ** 3
const easeInOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)
const easeIn = (x: number) => x ** 2.2
/** Visible between `start` and `end`, fading over `fade` at either side. */
const visible = (p: number, start: number, end: number, fade = 0.04) => Math.min(span(p, start, start + fade), 1 - span(p, end - fade, end))

const pct = (value: number, of: number) => `${(value / of) * 100}%`
/** The middle of the doorway, which the camera moves through. */
const DOORWAY = { x: pct(DOOR_BOX.x + DOOR_BOX.width / 2, CAR_VIEWBOX.width), y: pct(DOOR_BOX.y + DOOR_BOX.height / 2, CAR_VIEWBOX.height) }

/**
 * The scene for a given scroll progress (0 at the top of the section, 1 when
 * it has been scrolled through): the car arrives, the rear door opens, the
 * camera moves into the cabin.
 */
function scene(p: number, carWidth: number, travel: number) {
  const drive = easeOut(span(p, 0.02, 0.34))
  const door = easeInOut(span(p, 0.4, 0.6))
  const zoom = easeIn(span(p, 0.62, 0.84))
  // Rolling without slipping: the distance covered, over the wheel's circumference.
  const wheelRadius = (64 / CAR_VIEWBOX.width) * carWidth
  const spin = ((drive * travel) / (2 * Math.PI * wheelRadius)) * 360
  return {
    '--drive': drive.toFixed(4),
    '--door': door.toFixed(4),
    '--zoom': zoom.toFixed(4),
    '--spin': `${spin.toFixed(1)}deg`,
    '--cabin': span(p, 0.75, 0.85).toFixed(4),
    // The first caption is there from the start, so the scene never opens on an empty screen.
    '--act1': Math.min(1, 1 - span(p, 0.33, 0.37)).toFixed(3),
    '--act2': visible(p, 0.41, 0.64).toFixed(3),
    '--final': span(p, 0.82, 0.9).toFixed(3),
    '--hint': (1 - span(p, 0, 0.06)).toFixed(3),
  }
}

/**
 * The home page's arrival: pinned while it is scrolled through, it plays a
 * short scene driven by the scroll position. Only transforms and opacity
 * change, so it stays smooth; visitors who prefer reduced motion see the
 * last frame as a still picture.
 */
export function ArrivalStory({ story, book, fleet }: Props) {
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const rig = useRef<HTMLDivElement>(null)
  const [cabin, setCabin] = useState<string | undefined>()
  const [still, setStill] = useState(false)
  const [interactive, setInteractive] = useState(false)

  // The cabin picture is only fetched as the section approaches, to keep the first load light.
  useEffect(() => {
    const element = section.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setCabin(getImageProps({ src: CABIN, alt: '', width: 1200, height: 900, quality: 70 }).props.src)
        observer.disconnect()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = section.current
    const target = stage.current
    if (!element || !target) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    let frame = 0
    const apply = (values: Record<string, string>) => {
      for (const [name, value] of Object.entries(values)) target.style.setProperty(name, value)
    }
    const update = () => {
      frame = 0
      if (reduced.matches) {
        setStill(true)
        apply(scene(0.62, 1, 0))
        target.style.setProperty('--act2', '0')
        target.style.setProperty('--final', '1')
        setInteractive(true)
        return
      }
      setStill(false)
      const rect = element.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      const p = scrollable > 0 ? clamp(-rect.top / scrollable) : 0
      const carWidth = rig.current?.offsetWidth ?? 1000
      apply(scene(p, carWidth, window.innerWidth * 1.15))
      setInteractive(p > 0.86)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    reduced.addEventListener('change', schedule)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      reduced.removeEventListener('change', schedule)
    }
  }, [])

  const act = 'absolute inset-x-0 top-[13svh] sm:top-[16svh]'

  return (
    <section ref={section} aria-label={story.label} className={`on-dark relative bg-ink-950 text-bone-100 ${still ? '' : 'h-[340svh] sm:h-[380svh]'}`}>
      <div className={`${still ? 'relative h-[100svh] min-h-[38rem]' : 'sticky top-0 h-[100svh]'} overflow-hidden`}>
        <div
          ref={stage}
          className="absolute inset-0 [--act1:0] [--act2:0] [--cabin:0] [--door:0] [--drive:0] [--final:0] [--hint:1] [--spin:0deg] [--zoom:0]"
          style={{ perspective: '1100px', perspectiveOrigin: `50% 62%` }}
        >
          {/* A showroom: a pool of light on a dark floor. */}
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_68%,#1c222c_0%,#0b0e13_55%,#06070a_100%)]" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-b from-transparent via-black/30 to-black/70" />
          <div aria-hidden className="absolute inset-x-[8%] top-[71%] h-px bg-gradient-to-r from-transparent via-gold-300/25 to-transparent sm:top-[70%]" />

          {/* The car: drives in, stops, opens its rear door, then the camera goes through the doorway. */}
          <div className={`absolute inset-x-0 flex justify-center ${still ? 'top-[58%] sm:top-[46%]' : 'top-[44%] sm:top-[38%]'}`}>
            <div
              ref={rig}
              className="relative aspect-[1200/420] w-[min(1180px,118vw)] will-change-transform [transform-style:preserve-3d] sm:w-[min(1180px,92vw)]"
              style={{
                transformOrigin: `${DOORWAY.x} ${DOORWAY.y}`,
                transform: 'translate3d(calc((var(--drive) - 1) * 115vw), 0, 0) rotateY(calc(var(--door) * -7deg)) scale(calc(1 + var(--zoom) * 11))',
              }}
            >
              {/* Its reflection in the polished floor. */}
              <div aria-hidden className="absolute inset-x-0 top-[84%] h-full -scale-y-100 opacity-[0.13] [mask-image:linear-gradient(to_bottom,black,transparent_45%)]">
                <CarBody className="size-full" />
              </div>
              <CarBody cabin={cabin} className="absolute inset-0 size-full [&_.car-wheel]:[transform:rotate(var(--spin))]" />
              {/* Warm light from the cabin as the door opens. */}
              <div
                aria-hidden
                className="pointer-events-none absolute rounded-full bg-[radial-gradient(closest-side,rgba(255,214,150,0.35),transparent)] blur-2xl"
                style={{ left: pct(DOOR_BOX.x - 60, CAR_VIEWBOX.width), top: pct(DOOR_BOX.y - 20, CAR_VIEWBOX.height), width: pct(DOOR_BOX.width + 120, CAR_VIEWBOX.width), height: pct(DOOR_BOX.height + 60, CAR_VIEWBOX.height), opacity: 'var(--door)' }}
              />
              <div
                className="absolute will-change-transform"
                style={{
                  left: pct(DOOR_BOX.x, CAR_VIEWBOX.width),
                  top: pct(DOOR_BOX.y, CAR_VIEWBOX.height),
                  width: pct(DOOR_BOX.width, CAR_VIEWBOX.width),
                  height: pct(DOOR_BOX.height, CAR_VIEWBOX.height),
                  transformOrigin: '100% 50%',
                  transform: 'rotateY(calc(var(--door) * 74deg))',
                }}
              >
                <RearDoor className="size-full overflow-visible drop-shadow-[-18px_0_24px_rgba(0,0,0,0.55)]" />
              </div>
            </div>
          </div>

          {/* Through the door: the cabin fills the screen. */}
          <div aria-hidden className="absolute inset-0" style={{ opacity: 'var(--cabin)' }}>
            {cabin ? <Photo src={CABIN} alt="" sizes="100vw" className="object-[50%_60%]" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/45 to-ink-950/30" />
          </div>

          {/* Captions, one per act. */}
          <div className="relative h-full">
            {story.acts.map((item, index) => {
              const opacity = `var(--act${index + 1})`
              return (
                <div key={item.title} className={act} style={{ opacity, transform: `translateY(calc((1 - ${opacity}) * 14px))` }}>
                  <div className="container-page">
                    <p className="eyebrow text-gold-300">{item.eyebrow}</p>
                    <h2 className="display mt-4 max-w-xl text-4xl text-bone-50 sm:text-6xl">{item.title}</h2>
                    <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-bone-100/70">{item.text}</p>
                  </div>
                </div>
              )
            })}
            {/* Not reachable (by pointer or keyboard) until it has faded in. */}
            <div className={`container-page absolute inset-x-0 text-center ${still ? 'top-[12svh]' : 'bottom-[14svh]'}`} inert={!interactive} style={{ opacity: 'var(--final)', transform: 'translateY(calc((1 - var(--final)) * 18px))' }}>
              <p className="eyebrow text-gold-300">{story.final.eyebrow}</p>
              <h2 className="display mx-auto mt-4 max-w-3xl text-5xl text-bone-50 sm:text-7xl">{story.final.title}</h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-bone-100/75">{story.final.text}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/booking" arrow>
                  {book}
                </ButtonLink>
                <ButtonLink href="/fleet" variant="outline-light">
                  {fleet}
                </ButtonLink>
              </div>
            </div>
          </div>

          {/* A quiet cue to keep scrolling, gone once the car starts moving. */}
          <div aria-hidden className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 text-[0.625rem] font-semibold tracking-[0.32em] text-bone-100/55 uppercase" style={{ opacity: 'var(--hint)' }}>
            {story.scroll}
            <span className="h-10 w-px animate-[scroll-cue_2.2s_ease-in-out_infinite] bg-gradient-to-b from-gold-300/0 via-gold-300/70 to-gold-300/0" />
          </div>
        </div>
      </div>
    </section>
  )
}
