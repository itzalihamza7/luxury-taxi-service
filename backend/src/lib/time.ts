/**
 * Wall-clock <-> UTC conversion for the business time zone.
 *
 * Customers pick a local date and time ("14:30 in Madrid"). Bookings are stored
 * as UTC instants, so the conversion has to respect daylight saving time.
 */

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatters.set(timeZone, formatter)
  }
  return formatter
}

/** Offset of `timeZone` from UTC, in milliseconds, at the given instant. */
export function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts: Record<string, number> = {}
  for (const part of formatterFor(timeZone).formatToParts(new Date(instantMs))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
  }
  const wallAsUtc = Date.UTC(
    parts.year ?? 0,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  )
  return wallAsUtc - Math.floor(instantMs / 1000) * 1000
}

/**
 * Convert a local date (`YYYY-MM-DD`) and time (`HH:mm`) in `timeZone` to a UTC Date.
 *
 * Returns `null` when the input is malformed, the calendar date does not exist,
 * or the local time falls into a daylight-saving gap (a time that never occurs).
 */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) return null

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null

  const wall = Date.UTC(year, month - 1, day, hour, minute)
  // Reject dates like 31 February, which Date.UTC silently rolls over.
  const check = new Date(wall)
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null

  // Two passes: the first guess may land on the wrong side of a DST change.
  let utc = wall - zoneOffsetMs(wall, timeZone)
  utc = wall - zoneOffsetMs(utc, timeZone)

  // A wall time inside a DST gap does not round-trip.
  if (utc + zoneOffsetMs(utc, timeZone) !== wall) return null
  return new Date(utc)
}
