import api from '../api/api'

export const getCategories  = ()     => api.get('/categories')
export const createCategory = (name) => api.post('/categories', { name })
export const deleteCategory = (id)   => api.delete(`/categories/${id}`)
