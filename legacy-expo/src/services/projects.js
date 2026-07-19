import api from '../api/api'

export const getProjects       = (params = {})         => api.get('/projects', { params })
export const createProject     = (data)                => api.post('/projects', data)
export const getProject        = (id)                  => api.get(`/projects/${id}`)
export const updateProject     = (id, data)            => api.patch(`/projects/${id}`, data)
export const deleteProject     = (id)                  => api.delete(`/projects/${id}`)

export const addMember         = (projectId, userId)   => api.post(`/projects/${projectId}/members`, { user_id: userId })
export const removeMember      = (projectId, userId)   => api.delete(`/projects/${projectId}/members/${userId}`)

export const addInvoice        = (projectId, data)     => api.post(`/projects/${projectId}/invoices`, data)
export const removeInvoice     = (projectId, invoiceId)=> api.delete(`/projects/${projectId}/invoices/${invoiceId}`)
export const getProjectInvoice = (projectId, invoiceId)=> api.get(`/projects/${projectId}/invoices/${invoiceId}`)
