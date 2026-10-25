import { getImageProps } from 'next/image'

/**
 * The showroom's opening frame, rendered from the 3D scene: wide on landscape screens, tall on
 * portrait ones, framed as the 3D view frames the car. It is the first thing on the page, and it
 * stays where the 3D view does not run (less motion, no WebGL, data saver).
 */
export function ShowroomStill() {
  const common = { alt: '', sizes: '100vw', loading: 'eager' as const }
  const {
    props: { srcSet: wide },
  } = getImageProps({ ...common, src: '/images/site/showroom.jpg', width: 1920, height: 1080 })
  const {
    props: { srcSet: tall, ...image },
  } = getImageProps({ ...common, src: '/images/site/showroom-tall.jpg', width: 780, height: 1688 })
  return (
    <picture>
      {/* The same switch as the 3D camera's: wider than 11:10 is a landscape screen. */}
      <source media="(min-aspect-ratio: 11/10)" srcSet={wide} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- the alt (empty: the picture is decorative) comes in the spread from getImageProps */}
      <img {...image} srcSet={tall} fetchPriority="high" className="absolute inset-0 size-full object-cover" />
    </picture>
  )
}
