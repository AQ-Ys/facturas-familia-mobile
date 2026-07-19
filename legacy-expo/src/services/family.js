import api from '../api/api'

export const getFamily        = ()      => api.get('/family')
export const inviteMember     = (email) => api.post('/family/invite', { email })

// NOTE: as of the latest backend contract, this no longer returns
// `{ token, user }` directly — it responds like /auth/register with
// `{ message, email, confirmation_token, requires_confirmation: true }`.
// The invitee still needs to confirm via auth.js#confirm() before they can
// log in. `data` is expected to carry `{ token, name, password }` (the
// invitation token, not a JWT).
export const acceptInvitation = (data)  => api.post('/family/accept_invitation', data)

// Deletes the entire family group (members, invoices, invitations, alerts,
// categories). Only the family's `owner` may call this; the backend
// responds 403 otherwise.
export const deleteFamily = () => api.delete('/family')
