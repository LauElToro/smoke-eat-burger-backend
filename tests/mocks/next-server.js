export const NextResponse = {
  json(body, init = {}) {
    const status = init.status ?? 200
    const headers = new Headers(init.headers || {})
    if (!headers.has('content-type')) headers.set('content-type', 'application/json')
    return new Response(JSON.stringify(body), { status, headers })
  },
  redirect(url, status = 307) {
    const location = typeof url === 'string' ? url : url?.toString?.() ?? String(url)
    return new Response(null, { status, headers: { Location: location } })
  },
}