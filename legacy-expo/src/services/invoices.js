import api from '../api/api'

export const getInvoices    = (params = {}) => api.get('/invoices', { params })
export const getInvoice     = (id)           => api.get(`/invoices/${id}`)
export const createInvoice  = (cufe)         => api.post('/invoices', { cufe })
export const updateCategory = (id, category) => api.patch(`/invoices/${id}/category`, { category })

/**
 * Export CSV — mobile version.
 * Returns the raw CSV text. The caller is responsible for saving/sharing
 * using expo-sharing or expo-file-system (no browser APIs).
 */
export const exportCsv = (params = {}) =>
  api.get('/invoices/export_csv', { params, responseType: 'text' })
