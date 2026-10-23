import { eq } from 'drizzle-orm'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client.js'
import { bookings, sessions, users } from '../db/schema.js'
import { hashPassword } from '../lib/password.js'
import { bookRide, buildApp, registerAgent, resetDatabase } from './helpers.js'

const app = buildApp()
const PASSWORD = 'staff-password-1'

beforeEach(resetDatabase)

/** An account with the given role, signed in. */
async function staff(role: 'admin' | 'superadmin', emailAddress = `${role}@example.com`) {
  const [user] = await db.insert(users).values({ email: emailAddress, name: role, role, passwordHash: await hashPassword(PASSWORD) }).returning()
  const agent = request.agent(app)
  expect((await agent.post('/api/auth/login').send({ email: emailAddress, password: PASSWORD })).status).toBe(200)
  return { agent, user: user! }
}

const userByEmail = async (address: string) => (await db.select().from(users).where(eq(users.email, address)))[0]

describe('admin users list', () => {
  it('is for staff only and never exposes password hashes', async () => {
    expect((await request(app).get('/api/admin/users')).status).toBe(401)
    expect((await (await registerAgent(app)).get('/api/admin/users')).status).toBe(403)

    const { agent } = await staff('admin')
    const response = await agent.get('/api/admin/users').query({ q: 'client' })
    expect(response.status).toBe(200)
    expect(response.body.users).toHaveLength(1)
    expect(response.body.users[0]).toMatchObject({ email: 'client@example.com', role: 'customer', bookings: 0 })
    expect(JSON.stringify(response.body)).not.toMatch(/scrypt|passwordHash/)
    expect(response.body.roles).toMatchObject({ admin: 1, customer: 1 })
  })

  it('counts each account’s bookings', async () => {
    const customer = await registerAgent(app)
    await bookRide(app, { agent: customer })
    const { agent } = await staff('admin')
    const response = await agent.get('/api/admin/users').query({ role: 'customer' })
    expect(response.body.users[0].bookings).toBe(1)
  })
})

describe('editing users', () => {
  it('lets an admin edit a customer, and asks for their password to change a role', async () => {
    await registerAgent(app)
    const target = (await userByEmail('client@example.com'))!
    const { agent } = await staff('admin')

    const renamed = await agent.patch(`/api/admin/users/${target.id}`).send({ name: 'Carla Ruiz Díaz', phone: '' })
    expect(renamed.body.user).toMatchObject({ name: 'Carla Ruiz Díaz', phone: null })

    const withoutPassword = await agent.patch(`/api/admin/users/${target.id}`).send({ role: 'admin' })
    expect(withoutPassword.status).toBe(403)
    expect(withoutPassword.body.error).toMatchObject({ code: 'WRONG_PASSWORD', fields: { password: 'required' } })
    expect((await agent.patch(`/api/admin/users/${target.id}`).send({ role: 'admin', password: 'not-it' })).body.error.fields).toEqual({ password: 'wrong_password' })

    const promoted = await agent.patch(`/api/admin/users/${target.id}`).send({ role: 'admin', password: PASSWORD })
    expect(promoted.body.user.role).toBe('admin')
    // The new permissions apply everywhere at once: existing sessions end.
    expect(await db.select().from(sessions).where(eq(sessions.userId, target.id))).toHaveLength(0)
  })

  it('only lets a super admin appoint or change a super admin', async () => {
    await registerAgent(app)
    const target = (await userByEmail('client@example.com'))!
    const { agent: admin } = await staff('admin')
    const { agent: superAdmin, user: superUser } = await staff('superadmin')

    const attempt = await admin.patch(`/api/admin/users/${target.id}`).send({ role: 'superadmin', password: PASSWORD })
    expect(attempt.body.error.code).toBe('SUPERADMIN_ONLY')
    expect((await admin.patch(`/api/admin/users/${superUser.id}`).send({ name: 'Renamed' })).body.error.code).toBe('SUPERADMIN_ONLY')

    const appointed = await superAdmin.patch(`/api/admin/users/${target.id}`).send({ role: 'superadmin', password: PASSWORD })
    expect(appointed.body.user.role).toBe('superadmin')
    const demoted = await superAdmin.patch(`/api/admin/users/${target.id}`).send({ role: 'customer', password: PASSWORD })
    expect(demoted.body.user.role).toBe('customer')
  })

  it('keeps people from changing their own role and always keeps a super admin', async () => {
    const { agent, user } = await staff('superadmin')
    expect((await agent.patch(`/api/admin/users/${user.id}`).send({ role: 'admin', password: PASSWORD })).body.error.code).toBe('OWN_ROLE')
    // Editing their own name is fine.
    expect((await agent.patch(`/api/admin/users/${user.id}`).send({ name: 'Ali Hamza' })).body.user.name).toBe('Ali Hamza')

    const { user: second } = await staff('superadmin', 'second@example.com')
    expect((await agent.patch(`/api/admin/users/${second.id}`).send({ role: 'admin', password: PASSWORD })).body.user.role).toBe('admin')
  })

  it('needs the password to change an email address, and refuses one already in use', async () => {
    await registerAgent(app)
    const target = (await userByEmail('client@example.com'))!
    const { agent } = await staff('admin')
    expect((await agent.patch(`/api/admin/users/${target.id}`).send({ email: 'new@example.com' })).body.error.code).toBe('WRONG_PASSWORD')
    expect((await agent.patch(`/api/admin/users/${target.id}`).send({ email: 'admin@example.com', password: PASSWORD })).body.error.fields).toEqual({ email: 'taken' })
    expect((await agent.patch(`/api/admin/users/${target.id}`).send({ email: 'New@Example.com', password: PASSWORD })).body.user.email).toBe('new@example.com')
  })

  it('rejects unknown accounts and empty changes', async () => {
    const { agent } = await staff('admin')
    expect((await agent.patch('/api/admin/users/not-an-id').send({ name: 'X Y' })).status).toBe(404)
    expect((await agent.patch('/api/admin/users/00000000-0000-4000-8000-000000000000').send({ name: 'X Y' })).status).toBe(404)
    const { user } = await staff('superadmin')
    expect((await agent.patch(`/api/admin/users/${user.id}`).send({ password: PASSWORD })).status).toBe(400)
  })
})

describe('deleting users', () => {
  it('needs the typed email and the password, and keeps the bookings as guest bookings', async () => {
    const customer = await registerAgent(app)
    const reference = (await bookRide(app, { agent: customer })).response.body.booking.reference as string
    const target = (await userByEmail('client@example.com'))!
    const { agent } = await staff('admin')
    const remove = (body: Record<string, unknown>) => agent.delete(`/api/admin/users/${target.id}`).send(body)

    expect((await remove({ confirmEmail: 'someone@example.com', password: PASSWORD })).body.error.fields).toEqual({ confirmEmail: 'mismatch' })
    expect((await remove({ confirmEmail: 'client@example.com', password: 'wrong' })).body.error.code).toBe('WRONG_PASSWORD')
    expect(await userByEmail('client@example.com')).toBeDefined()

    expect((await remove({ confirmEmail: 'CLIENT@example.com ', password: PASSWORD })).body).toEqual({ deleted: true })
    expect(await userByEmail('client@example.com')).toBeUndefined()
    const [booking] = await db.select().from(bookings).where(eq(bookings.reference, reference))
    expect(booking).toMatchObject({ userId: null, contactEmail: 'elena@example.com' })
    // The deleted account's session no longer works.
    expect((await customer.get('/api/auth/me')).body.user).toBeNull()
  })

  it('protects super admins, the last super admin and the admin’s own account', async () => {
    const { agent: admin, user: adminUser } = await staff('admin')
    const { agent: superAdmin, user: superUser } = await staff('superadmin')

    expect((await admin.delete(`/api/admin/users/${superUser.id}`).send({ confirmEmail: superUser.email, password: PASSWORD })).body.error.code).toBe('SUPERADMIN_ONLY')
    expect((await admin.delete(`/api/admin/users/${adminUser.id}`).send({ confirmEmail: adminUser.email, password: PASSWORD })).body.error.code).toBe('OWN_ACCOUNT')
    expect((await superAdmin.delete(`/api/admin/users/${superUser.id}`).send({ confirmEmail: superUser.email, password: PASSWORD })).body.error.code).toBe('OWN_ACCOUNT')

    const { user: other } = await staff('superadmin', 'other@example.com')
    expect((await superAdmin.delete(`/api/admin/users/${other.id}`).send({ confirmEmail: other.email, password: PASSWORD })).body).toEqual({ deleted: true })
    expect((await superAdmin.delete(`/api/admin/users/${adminUser.id}`).send({ confirmEmail: adminUser.email, password: PASSWORD })).body).toEqual({ deleted: true })
  })
})
