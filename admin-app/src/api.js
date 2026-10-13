const TOKEN_KEY = 'azmoon_admin_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'content-type': 'application/json' }
  const t = getToken()
  if (t) headers.authorization = `Bearer ${t}`
  const r = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new ApiError(data.error || `خطای ${r.status}`, r.status)
  return data
}
