/**
 * Failed sign-ins per account, on top of the per-address limit: guessing one
 * account's password from many addresses is slowed down too. Kept in memory,
 * like the other limits.
 */
const FAILED_LOGIN_LIMIT = 10
const FAILED_LOGIN_WINDOW_MS = 15 * 60_000
const failedLogins = new Map<string, { count: number; resetAt: number }>()

export function loginLocked(email: string, now = Date.now()): boolean {
  const entry = failedLogins.get(email)
  if (entry && entry.resetAt <= now) failedLogins.delete(email)
  return (failedLogins.get(email)?.count ?? 0) >= FAILED_LOGIN_LIMIT
}

export function recordFailedLogin(email: string, now = Date.now()): void {
  const entry = failedLogins.get(email)
  if (!entry || entry.resetAt <= now) failedLogins.set(email, { count: 1, resetAt: now + FAILED_LOGIN_WINDOW_MS })
  else entry.count += 1
  // Bound the memory an attacker can make us use.
  if (failedLogins.size > 10_000) failedLogins.delete(failedLogins.keys().next().value!)
}

export function clearFailedLogins(email: string): void {
  failedLogins.delete(email)
}
