/**
 * The Experience page's film: the same ten seconds at 24 fps in two versions, a
 * light one that lets the page start quickly and the full-quality one that takes
 * over once it has arrived. How they are encoded is in the README.
 */
export const FILM = {
  preview: '/video/maybach-preview.mp4',
  hd: '/video/maybach-hd.mp4',
  /** The first frame at full sharpness, shown until the film moves. */
  poster: '/video/maybach-poster.jpg',
  /** The moment the film ends on: the rear seats. */
  interior: '/video/maybach-interior.jpg',
  fps: 24,
} as const
