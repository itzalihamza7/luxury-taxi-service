import { and, count, desc, eq, ilike, ne, or, type SQL } from 'drizzle-orm'
import { Router, type Request } from 'express'
import { z } from 'zod'
import type { AppContext } from '../../context.js'
import { db } from '../../db/client.js'
import { bookings, sessions, USER_ROLES, users, type User, type UserRole } from '../../db/schema.js'
import { badRequest, conflict, forbidden, HttpError, notFound } from '../../lib/errors.js'
import { verifyPassword } from '../../lib/password.js'
import { blankAsMissing, email, isUuid, parse, personName, phone } from '../../lib/validate.js'

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

/** The signed-in admin's own password, asked again before anything that cannot be undone. */
const confirmation = z.string().min(1).max(200)

const updateSchema = z
  .object({
    name: personName.optional(),
    email: email.optional(),
    phone: z.preprocess((value) => (value === '' ? null : value), phone.nullable().optional()),
    role: z.enum(USER_ROLES).optional(),
    password: blankAsMissing(confirmation),
  })
  .refine((value) => Object.keys(value).some((key) => key !== 'password'), { message: 'required', path: ['name'] })

const deleteSchema = z.object({
  /** The account's email, typed out, so the wrong row is not deleted by a slip. */
  confirmEmail: z.string().trim().toLowerCase().max(254),
  password: confirmation,
})

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (character) => `\\${character}`)

const serialize = (user: User & { bookings?: number }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  bookings: user.bookings ?? 0,
  createdAt: user.createdAt.toISOString(),
})

async function findUser(id: string): Promise<User> {
  const [user] = isUuid(id) ? await db.select().from(users).where(eq(users.id, id)) : []
  if (!user) throw notFound('USER_NOT_FOUND', 'This account no longer exists.')
  return user
}

/** Critical changes need the acting admin's password, so an unattended session cannot be used for them. */
async function requirePassword(req: Request, password: string | undefined): Promise<void> {
  const [actor] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, req.user!.id))
  if (!password || !actor || !(await verifyPassword(password, actor.passwordHash))) {
    throw new HttpError(403, 'WRONG_PASSWORD', 'Your password is not correct.', { password: password ? 'wrong_password' : 'required' })
  }
}

async function superAdminCount(): Promise<number> {
  const [row] = await db.select({ total: count() }).from(users).where(eq(users.role, 'superadmin'))
  return row?.total ?? 0
}

/**
 * The rules, enforced here whatever the screen shows:
 * - admins manage customers and admins; only a super admin touches a super admin,
 *   or makes someone one;
 * - nobody changes their own role or deletes their own account here;
 * - there is always at least one super admin.
 */
function checkAllowed(actor: { id: string; role: UserRole }, target: User, newRole?: UserRole): void {
  const touchesSuperAdmin = target.role === 'superadmin' || newRole === 'superadmin'
  if (touchesSuperAdmin && actor.role !== 'superadmin') {
    throw forbidden('SUPERADMIN_ONLY', 'Only a super admin can change super admin accounts.')
  }
}

function audit(req: Request, action: string, target: User, details: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV === 'test') return
  console.log(`[audit] ${req.user!.email} ${action} ${target.email} ${JSON.stringify(details)}`)
}

export function usersAdminRouter({ rateLimit }: AppContext): Router {
  const router = Router()
  // Password confirmations are guesses too: keep them slow.
  const critical = rateLimit({ name: 'admin-users', windowMs: 60_000, limit: 10 })

  router.get('/users', async (req, res) => {
    const { q, role, page, pageSize } = parse(listSchema, req.query)
    const filters: SQL[] = []
    if (role) filters.push(eq(users.role, role))
    if (q) {
      const pattern = `%${escapeLike(q)}%`
      const match = or(ilike(users.name, pattern), ilike(users.email, pattern), ilike(users.phone, pattern))
      if (match) filters.push(match)
    }
    const where = filters.length ? and(...filters) : undefined

    const [[totals], rows, roles] = await Promise.all([
      db.select({ total: count() }).from(users).where(where),
      db
        .select({ user: users, bookings: count(bookings.id) })
        .from(users)
        .leftJoin(bookings, eq(bookings.userId, users.id))
        .where(where)
        .groupBy(users.id)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ role: users.role, total: count() }).from(users).groupBy(users.role),
    ])

    res.json({
      users: rows.map((row) => serialize({ ...row.user, bookings: row.bookings })),
      total: totals?.total ?? 0,
      roles: Object.fromEntries(roles.map((row) => [row.role, row.total])),
      page,
      pageSize,
    })
  })

  router.patch('/users/:id', critical, async (req, res) => {
    const input = parse(updateSchema, req.body)
    const target = await findUser(String(req.params.id))
    const actor = req.user!
    const roleChange = input.role !== undefined && input.role !== target.role

    checkAllowed(actor, target, input.role)
    if (roleChange) {
      if (target.id === actor.id) throw forbidden('OWN_ROLE', 'You cannot change your own role.')
      if (target.role === 'superadmin' && (await superAdminCount()) <= 1) throw conflict('LAST_SUPERADMIN', 'There must always be a super admin.')
      await requirePassword(req, input.password)
    }
    // Changing where someone signs in is as sensitive as changing what they may do.
    const emailChange = input.email !== undefined && input.email !== target.email
    if (emailChange && !roleChange) await requirePassword(req, input.password)

    if (emailChange) {
      const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, input.email!), ne(users.id, target.id)))
      if (taken) throw badRequest('VALIDATION', 'Another account uses this email.', { email: 'taken' })
    }

    const [updated] = await db
      .update(users)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, target.id))
      .returning()
    if (!updated) throw notFound('USER_NOT_FOUND', 'This account no longer exists.')

    // New permissions, or a new sign-in address, take effect on every device at once.
    if ((roleChange || emailChange) && target.id !== actor.id) await db.delete(sessions).where(eq(sessions.userId, target.id))
    audit(req, 'updated', target, { role: roleChange ? `${target.role}->${updated.role}` : undefined, email: emailChange ? updated.email : undefined })

    res.json({ user: serialize(updated) })
  })

  router.delete('/users/:id', critical, async (req, res) => {
    const input = parse(deleteSchema, req.body ?? {})
    const target = await findUser(String(req.params.id))
    const actor = req.user!

    checkAllowed(actor, target)
    if (target.id === actor.id) throw forbidden('OWN_ACCOUNT', 'You cannot delete your own account.')
    if (input.confirmEmail !== target.email) throw badRequest('VALIDATION', 'Type the account’s email to confirm.', { confirmEmail: 'mismatch' })
    if (target.role === 'superadmin' && (await superAdminCount()) <= 1) throw conflict('LAST_SUPERADMIN', 'There must always be a super admin.')
    await requirePassword(req, input.password)

    // Sessions go with the account; bookings stay, as guest bookings with their contact details.
    await db.delete(users).where(eq(users.id, target.id))
    audit(req, 'deleted', target, { role: target.role })
    res.json({ deleted: true })
  })

  return router
}
