/** Device, system and browser of a visitor, read from the User-Agent header. Deliberately coarse. */
export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  os: string | null
  browser: string | null
}

export const isBot = (userAgent: string): boolean => /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(userAgent)

function version(userAgent: string, pattern: RegExp): string {
  const match = userAgent.match(pattern)
  return match?.[1] ? ` ${match[1].replace(/_/g, '.').split('.').slice(0, 2).join('.')}` : ''
}

function operatingSystem(ua: string): string | null {
  if (/iPhone|iPad|iPod/.test(ua)) return `iOS${version(ua, /OS (\d+[_.]\d+)/)}`
  if (/Android/.test(ua)) return `Android${version(ua, /Android (\d+(?:\.\d+)?)/)}`
  if (/CrOS/.test(ua)) return 'ChromeOS'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Macintosh|Mac OS X/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return null
}

function browserName(ua: string): string | null {
  if (/FBAN|FBAV|FB_IAB/.test(ua)) return 'Facebook app'
  if (/Instagram/.test(ua)) return 'Instagram app'
  if (/Edg(?:A|iOS)?\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet'
  if (/Firefox|FxiOS/.test(ua)) return 'Firefox'
  if (/Chrome|CriOS/.test(ua)) return 'Chrome'
  if (/Safari/.test(ua)) return 'Safari'
  return null
}

/**
 * `touch` comes from the page: iPads report themselves as a Mac, and only the
 * touch screen gives them away.
 */
export function parseUserAgent(userAgent: string, touch = false): DeviceInfo {
  const ua = userAgent
  const ipadAsMac = touch && /Macintosh/.test(ua)
  const tablet = ipadAsMac || /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))
  const mobile = !tablet && /Mobi|iPhone|iPod|Android/.test(ua)
  return {
    deviceType: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop',
    os: ipadAsMac ? 'iPadOS' : operatingSystem(ua),
    browser: browserName(ua),
  }
}
