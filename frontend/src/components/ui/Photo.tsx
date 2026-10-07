import Image from 'next/image'

/**
 * A photograph that fills its parent, which must be positioned (`relative`) and
 * have a size. The server resizes and re-encodes it for each screen, whether it
 * ships with the site (`/images/...`) or was uploaded in the console
 * (`/api/media/...`).
 *
 * `sizes` says how wide the photo is shown, e.g. `(min-width: 1024px) 33vw, 100vw`.
 */
export function Photo({
  src,
  alt,
  sizes,
  eager,
  className = '',
}: {
  src: string
  alt: string
  sizes: string
  /** For the one photo at the top of a page: loaded first instead of when it scrolls into view. */
  eager?: boolean
  className?: string
}) {
  return <Image src={src} alt={alt} fill sizes={sizes} preload={eager} className={`object-cover ${className}`} />
}
