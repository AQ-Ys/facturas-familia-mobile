import api from '../api/api'

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

// Registering no longer logs the user in — the backend creates the account
// unconfirmed and responds with `{ message, email, confirmation_token,
// requires_confirmation: true }` (no `token`/`user`). The account must be
// confirmed via `confirm()` before a session can start.
export const register = (name, email, password, family_name) =>
  api.post('/auth/register', { name, email, password, family_name })

// Confirms a pending account with the token issued at registration (or
// family invitation acceptance). This is the call that actually returns
// `{ token, user }` and starts the session.
export const confirm = (token) =>
  api.post('/auth/confirm', { token })

// Invalidates the current JWT server-side immediately (token_version bump).
// No body required; the token is attached by the request interceptor.
export const logout = () =>
  api.post('/auth/logout')

// Permanently deletes the current user's own account (their invoices, the
// projects they own, and their memberships). Does not affect other family
// members or shared family data.
export const deleteAccount = () =>
  api.delete('/account')
