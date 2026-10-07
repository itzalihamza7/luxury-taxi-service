import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { apiFetch, CONTENT_TAG, failureReason, FLEET_TAG } from '@/lib/server-api'

/**
 * Same-origin gateway to the backend API.
 *
 * The browser only ever talks to this site, so the session cookie is
 * first-party and no CORS setup is needed. `API_URL` is read on each request,
 * which lets one built image run in any environment.
 */

const REQUEST_HEADERS = ['accept', 'accept-language', 'content-type', 'cookie', 'user-agent', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host']
const RESPONSE_HEADERS = ['content-type', 'cache-control', 'retry-after']

async function forward(request: NextRequest, context: RouteContext<'/api/[...path]'>): Promise<Response> {
  const { path } = await context.params
  const base = (process.env.API_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '')
  const target = `${base}/api/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`

  const headers = new Headers()
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  let upstream: Response
  try {
    upstream = await apiFetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    })
  } catch (error) {
    console.error(`[api-proxy] ${request.method} ${target} failed:`, failureReason(error))
    return Response.json(
      { error: { code: 'API_UNAVAILABLE', message: 'The booking service is temporarily unavailable.' } },
      { status: 502 },
    )
  }

  // What an operator saves in the console must show on the website straight away,
  // so the copies this server keeps of the fleet and the content are dropped.
  if (hasBody && upstream.ok && path[0] === 'admin') {
    if (path[1] === 'vehicles') revalidateTag(FLEET_TAG, { expire: 0 })
    if (path[1] === 'content' || path[1] === 'settings') revalidateTag(CONTENT_TAG, { expire: 0 })
  }

  const responseHeaders = new Headers()
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append('set-cookie', cookie)
  }
  // API answers are per-user; never let an intermediary cache them.
  if (!responseHeaders.has('cache-control')) responseHeaders.set('cache-control', 'no-store')

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
}

export { forward as DELETE, forward as GET, forward as PATCH, forward as POST, forward as PUT }
