import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── In-memory request cache ───────────────────────────────────────────────────
const memCache = new Map()
const CACHE_TTL_MS      = 10 * 60 * 1000
const CACHE_TTL_CATS_MS = 30 * 60 * 1000
const CACHE_TTL_HP_MS   = 10 * 60 * 1000

function cacheGet(key, ttl = CACHE_TTL_MS) {
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > ttl) { memCache.delete(key); return null }
  return entry.value
}
function cacheSet(key, value) { memCache.set(key, { value, ts: Date.now() }) }
function cacheInvalidate(prefix) {
  for (const k of memCache.keys()) { if (k.startsWith(prefix)) memCache.delete(k) }
}
function cacheInvalidateAll() {
  cacheInvalidate('products:')
  cacheInvalidate('cats:')
}

// ─── Image URL cache ──────────────────────────────────────────────────────────
const imageUrlCache = new Map()
export function getCachedImageUrl(supabaseUrl, bucket, path, fallback = '') {
  if (!path) return fallback
  const key = `${bucket}::${path}`
  if (imageUrlCache.has(key)) return imageUrlCache.get(key)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  const url = data?.publicUrl || fallback
  imageUrlCache.set(key, url)
  return url
}

function extractStoragePath(publicUrl, bucket) {
  if (!publicUrl) return null
  try {
    const marker = `/${bucket}/`
    const idx = publicUrl.indexOf(marker)
    return idx !== -1 ? publicUrl.slice(idx + marker.length) : null
  } catch { return null }
}

// ─── Auth helpers ──────────────────────────────────────────────────────────────
// These are ONLY used as a last resort when no profile is available from context.
// In React components, always use `profile` from useAuth() instead.

export const getCurrentUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle()
  if (error) { console.error('Error fetching user profile:', error); return null }
  if (!data) {
    const { data: newProfile, error: insertError } = await supabase
      .from('users')
      .insert({ id: user.id, email: user.email, role: 'staff', status: 'pending' })
      .select().single()
    if (insertError) { console.error('Error creating user profile:', insertError); return null }
    return newProfile
  }
  return data
}

// ─── Sync profile checks — use these everywhere instead of async isAdmin() ────
// Pass the profile from AuthContext: isAdminProfile(profile)
export const isAdminProfile     = (p) => p?.role === 'admin'  && p?.status === 'approved'
export const isStaffProfile     = (p) => p?.role === 'staff'  && p?.status === 'approved'
export const isApprovedProfile  = (p) => p?.status === 'approved'
export const isAdminOrStaff     = (p) => (p?.role === 'admin' || p?.role === 'staff') && p?.status === 'approved'

// Legacy async versions — kept only for non-React call sites (avoid in components)
export const isUserApproved = async () => { const p = await getCurrentUserProfile(); return isApprovedProfile(p) }
export const isAdmin        = async () => { const p = await getCurrentUserProfile(); return isAdminProfile(p) }

// ─── Pagination defaults ───────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 6
export const ADMIN_PAGE_SIZE   = 6

// ─────────────────────────────────────────────────────────────────────────────
// productAPI
// ─────────────────────────────────────────────────────────────────────────────
export const productAPI = {

  async getAllPaginated({ page = 1, pageSize = ADMIN_PAGE_SIZE, category, search } = {}) {
    return this.getPaginated({ page, pageSize, category, search })
  },

  async getAll() {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      return await secureAPI.select('products', { order: { column: 'created_at', ascending: false }, requireAuth: false })
    } catch (error) { console.error('Error fetching products:', error); throw error }
  },

  async getById(id) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const products = await secureAPI.select('products', { eq: { id }, requireAuth: false })
      return products?.[0] || null
    } catch (error) { console.error('Error fetching product:', error); throw error }
  },

  async create(product) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const { v4: uuidv4 } = await import('uuid')
      if (!product.id) product.id = uuidv4()
      const productData = { ...product, created_at: product.created_at || new Date().toISOString(), updated_at: new Date().toISOString() }
      const result = await secureAPI.insertIdempotent('products', productData, ['id'])
      cacheInvalidateAll()
      return result
    } catch (error) { console.error('Error creating product:', error); throw error }
  },

  async update(id, updates) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const result = await secureAPI.update('products', id, { ...updates, updated_at: new Date().toISOString() })
      cacheInvalidateAll()
      return result
    } catch (error) { console.error('Error updating product:', error); throw error }
  },

  async delete(id) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      await secureAPI.delete('products', id)
      cacheInvalidateAll()
      return true
    } catch (error) { console.error('Error deleting product:', error); throw error }
  },

  async upsert(product) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const result = await secureAPI.upsert('products', { ...product, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      cacheInvalidateAll()
      return result
    } catch (error) { console.error('Error upserting product:', error); throw error }
  },

  subscribeToChanges(callback) {
    const channelName = `products-changes-${Date.now()}-${Math.random().toString(36).slice(2)}`
    return supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, callback)
      .subscribe()
  },

  async getPaginated({ page = 1, pageSize = DEFAULT_PAGE_SIZE, category, search, homepageOnly } = {}) {
    const hpKey = homepageOnly === true ? 'hp1' : homepageOnly === false ? 'hp0' : 'hpX'
    const cacheKey = `products:page:${page}:size:${pageSize}:cat:${category || ''}:q:${search || ''}:${hpKey}`
    const cached = cacheGet(cacheKey)
    if (cached) return cached

    try {
      const from = (page - 1) * pageSize
      const to   = from + pageSize - 1
      let query = supabase.from('products').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)
      if (category && category !== 'all') query = query.eq('category', category)
      if (homepageOnly === true)  query = query.eq('display_on_homepage', true)
      if (homepageOnly === false) query = query.eq('display_on_homepage', false)
      if (search?.trim()) {
        const s = search.trim()
        query = query.or(`title.ilike.%${s}%,model.ilike.%${s}%,series.ilike.%${s}%,category.ilike.%${s}%`)
      }
      const { data, error, count } = await query
      if (error) throw error
      const result = { data: data || [], count: count || 0, totalPages: Math.ceil((count || 0) / pageSize) }
      cacheSet(cacheKey, result)
      return result
    } catch (error) { console.error('Error fetching paginated products:', error); throw error }
  },

  async getCategories() {
    const cacheKey = 'cats:products'
    const cached = cacheGet(cacheKey, CACHE_TTL_CATS_MS)
    if (cached) return cached
    try {
      const { data, error } = await supabase.from('products').select('category').not('category', 'is', null).neq('category', '')
      if (error) throw error
      const categories = [...new Set((data || []).map(r => r.category).filter(Boolean))].sort()
      cacheSet(cacheKey, categories)
      return categories
    } catch (error) { console.error('Error fetching categories:', error); return [] }
  },

  async getHomepage() {
    const cacheKey = 'products:homepage'
    const cached = cacheGet(cacheKey, CACHE_TTL_HP_MS)
    if (cached) return cached
    try {
      const { data, error } = await supabase.from('products').select('*').eq('display_on_homepage', true).order('display_order', { ascending: true, nullsFirst: false }).limit(5)
      if (error) throw error
      const result = data || []
      cacheSet(cacheKey, result)
      return result
    } catch (error) { console.error('Error fetching homepage products:', error); throw error }
  },

  // ── Pass `profile` from useAuth() to skip the auth.getUser() call ─────────
  async uploadImage(file, profile) {
    const allowed = profile
      ? isAdminOrStaff(profile)
      : await isAdmin() // fallback for non-React callers only
    if (!allowed) throw new Error('Access denied. Admins only.')

    const fileExt = file.name.split('.').pop().toLowerCase()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { cacheControl: '31536000', upsert: false, contentType: file.type })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
    imageUrlCache.set(`product-images::${fileName}`, data.publicUrl)
    return data.publicUrl
  },

  async deleteImage(imageUrl) {
    if (!imageUrl) return
    try {
      const path = extractStoragePath(imageUrl, 'product-images')
      if (path) {
        const { error } = await supabase.storage.from('product-images').remove([path])
        if (error) console.warn('Could not delete product image:', error)
        imageUrlCache.delete(`product-images::${path}`)
      }
    } catch (err) { console.warn('Error parsing product image path:', err) }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// quotationAPI
// ─────────────────────────────────────────────────────────────────────────────
export const quotationAPI = {
  async getAll(type = null) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const options = { order: { column: 'created_at', ascending: false } }
      if (type) options.eq = { quotation_type: type }
      return await secureAPI.select('quotations', options)
    } catch (error) { console.error('Error fetching quotations:', error); throw error }
  },

  async getById(id) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const quotations = await secureAPI.select('quotations', { eq: { id } })
      return quotations?.[0] || null
    } catch (error) { console.error('Error fetching quotation:', error); throw error }
  },

  async getItems(quotationId) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      return await secureAPI.select('quotation_items', { eq: { quotation_id: quotationId }, order: { column: 'sort_order', ascending: true } })
    } catch (error) { console.error('Error fetching quotation items:', error); throw error }
  },

  async create(quotation, items) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const { v4: uuidv4 } = await import('uuid')
      // Use cached session user — no getUser() call needed
      const { data: { session } } = await supabase.auth.getSession()
      if (!quotation.id) quotation.id = uuidv4()
      const quotationData = { ...quotation, created_by: session?.user?.id, created_at: quotation.created_at || new Date().toISOString(), updated_at: new Date().toISOString() }
      const newQuotation = await secureAPI.insertIdempotent('quotations', quotationData, ['id'])
      if (items?.length > 0) {
        const itemsToInsert = items.map((item, index) => ({ id: item.id || uuidv4(), quotation_id: newQuotation.id, ...item, sort_order: index, created_at: new Date().toISOString() }))
        await secureAPI.batchUpsert('quotation_items', itemsToInsert, { onConflict: 'id' })
      }
      return newQuotation
    } catch (error) { console.error('Error creating quotation:', error); throw error }
  },

  async update(id, quotation, items) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const { v4: uuidv4 } = await import('uuid')
      await secureAPI.update('quotations', id, { ...quotation, updated_at: new Date().toISOString() })
      if (items) {
        const existingItems = await this.getItems(id)
        for (const item of existingItems) await secureAPI.delete('quotation_items', item.id)
        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({ id: item.id || uuidv4(), quotation_id: id, ...item, sort_order: index, created_at: item.created_at || new Date().toISOString(), updated_at: new Date().toISOString() }))
          await secureAPI.batchUpsert('quotation_items', itemsToInsert, { onConflict: 'id' })
        }
      }
      return true
    } catch (error) { console.error('Error updating quotation:', error); throw error }
  },

  async delete(id) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const items = await this.getItems(id)
      for (const item of items) await secureAPI.delete('quotation_items', item.id)
      await secureAPI.delete('quotations', id)
      return true
    } catch (error) { console.error('Error deleting quotation:', error); throw error }
  },

  async softDelete(id) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      return await secureAPI.softDelete('quotations', id)
    } catch (error) { console.error('Error soft deleting quotation:', error); throw error }
  },

  async duplicate(id) {
    try {
      const { v4: uuidv4 } = await import('uuid')
      const original = await this.getById(id)
      if (!original) throw new Error('Quotation not found')
      const originalItems = await this.getItems(id)
      const newQuotation = { ...original, id: uuidv4(), quotation_number: `${original.quotation_number}-COPY`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      delete newQuotation.created_by
      return await this.create(newQuotation, originalItems.map(item => {
        const newItem = { ...item }
        delete newItem.id; delete newItem.quotation_id; delete newItem.created_at; delete newItem.updated_at
        return newItem
      }))
    } catch (error) { console.error('Error duplicating quotation:', error); throw error }
  },

  subscribeToChanges(callback) {
    return supabase.channel('quotations-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'quotations' }, callback).subscribe()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// projectAPI
// ─────────────────────────────────────────────────────────────────────────────
export const projectAPI = {
  async getAll() {
    const { data, error } = await supabase.from('project').select('*').order('created_at', { ascending: false })
    if (error) { console.error('Error fetching projects:', error); throw error }
    return data || []
  },

  async getById(id) {
    const { data, error } = await supabase.from('project').select('*').eq('id', id).single()
    if (error) { console.error('Error fetching project:', error); throw error }
    return data
  },

  // ── Pass `profile` from useAuth() to avoid getUser() calls ───────────────
  async create(projectData, profile) {
    if (!isAdminOrStaff(profile)) throw new Error('Access denied. Admins only.')
    const { data, error } = await supabase.from('project').insert([projectData]).select('*').single()
    if (error) { console.error('Error creating project:', error); throw error }
    cacheInvalidate('projects:')
    return data
  },

  async update(id, projectData, profile) {
    if (!isAdminOrStaff(profile)) throw new Error('Access denied. Admins only.')
    const { data, error } = await supabase.from('project').update(projectData).eq('id', id).select('*').single()
    if (error) { console.error('Error updating project:', error); throw error }
    cacheInvalidate('projects:')
    return data
  },

  async delete(id, profile) {
    if (!isAdminOrStaff(profile)) throw new Error('Access denied. Admins only.')
    const { data: project } = await supabase.from('project').select('image_url').eq('id', id).single()
    if (project?.image_url) {
      try {
        const path = extractStoragePath(project.image_url, 'project-images')
        if (path) await supabase.storage.from('project-images').remove([path])
      } catch (err) { console.error('Error deleting image:', err) }
    }
    const { error } = await supabase.from('project').delete().eq('id', id)
    if (error) { console.error('Error deleting project:', error); throw error }
    cacheInvalidate('projects:')
  },

  async uploadImage(file, profile) {
    if (!isAdminOrStaff(profile)) throw new Error('Access denied. Admins only.')
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('project-images').upload(fileName, file, { cacheControl: '31536000', upsert: false })
    if (uploadError) { console.error('Error uploading image:', uploadError); throw uploadError }
    const { data } = supabase.storage.from('project-images').getPublicUrl(fileName)
    return data.publicUrl
  },

  async deleteImage(imageUrl, profile) {
    if (!isAdminOrStaff(profile)) throw new Error('Access denied. Admins only.')
    try {
      const path = extractStoragePath(imageUrl, 'project-images')
      if (path) {
        const { error } = await supabase.storage.from('project-images').remove([path])
        if (error) { console.error('Error deleting image:', error); throw error }
      }
    } catch (err) { console.error('Error parsing image path:', err); throw err }
  },

  subscribeToChanges(callback) {
    return supabase.channel('project-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'project' }, callback).subscribe()
  },

  async getHomepage() {
    const cacheKey = 'projects:homepage'
    const cached = cacheGet(cacheKey)
    if (cached) return cached
    const { data, error } = await supabase.from('project').select('*').order('display_order', { ascending: true, nullsFirst: false }).order('date', { ascending: false }).limit(5)
    if (error) { console.error('Error fetching homepage projects:', error); throw error }
    cacheSet(cacheKey, data || [])
    return data || []
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// kanbanAPI
// ─────────────────────────────────────────────────────────────────────────────
export const kanbanAPI = {
  async getAllTasks() {
    const { data, error } = await supabase.from('kanban_tasks').select(`*, assigned_user:users!kanban_tasks_assigned_to_fkey(id, name, email), created_user:users!kanban_tasks_created_by_fkey(id, name, email)`).order('display_order', { ascending: true })
    if (error) { console.error('Error fetching tasks:', error); throw error }
    return data || []
  },

  async getTaskById(id) {
    const { data, error } = await supabase.from('kanban_tasks').select(`*, assigned_user:users!kanban_tasks_assigned_to_fkey(id, name, email), created_user:users!kanban_tasks_created_by_fkey(id, name, email)`).eq('id', id).single()
    if (error) { console.error('Error fetching task:', error); throw error }
    return data
  },

  // Uses getSession() instead of getUser() — reads from local cache, no network call
  async createTask(taskData) {
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase.from('kanban_tasks').insert([{ ...taskData, created_by: session?.user?.id }]).select(`*, assigned_user:users!kanban_tasks_assigned_to_fkey(id, name, email), created_user:users!kanban_tasks_created_by_fkey(id, name, email)`).single()
    if (error) { console.error('Error creating task:', error); throw error }
    return data
  },

  async updateTask(id, updates) {
    const { data, error } = await supabase.from('kanban_tasks').update(updates).eq('id', id).select(`*, assigned_user:users!kanban_tasks_assigned_to_fkey(id, name, email), created_user:users!kanban_tasks_created_by_fkey(id, name, email)`).single()
    if (error) { console.error('Error updating task:', error); throw error }
    return data
  },

  async deleteTask(id) {
    const { error } = await supabase.from('kanban_tasks').delete().eq('id', id)
    if (error) { console.error('Error deleting task:', error); throw error }
  },

  async updateTaskStatus(id, status, displayOrder) {
    const updates = { status }
    if (displayOrder !== undefined) updates.display_order = displayOrder
    return await this.updateTask(id, updates)
  },

  async getComments(taskId) {
    const { data, error } = await supabase.from('kanban_comments').select(`*, user:users(id, name, email)`).eq('task_id', taskId).order('created_at', { ascending: true })
    if (error) { console.error('Error fetching comments:', error); throw error }
    return data || []
  },

  async addComment(taskId, comment) {
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase.from('kanban_comments').insert([{ task_id: taskId, user_id: session?.user?.id, comment }]).select('*, user:users(id, name, email)').single()
    if (error) { console.error('Error adding comment:', error); throw error }
    return data
  },

  async updateComment(id, comment) {
    const { data, error } = await supabase.from('kanban_comments').update({ comment }).eq('id', id).select('*, user:users(id, name, email)').single()
    if (error) { console.error('Error updating comment:', error); throw error }
    return data
  },

  async deleteComment(id) {
    const { error } = await supabase.from('kanban_comments').delete().eq('id', id)
    if (error) { console.error('Error deleting comment:', error); throw error }
  },

  async getAllUsers() {
    const { data, error } = await supabase.from('users').select('id, name, email, role').eq('status', 'approved').in('role', ['admin', 'staff']).order('name')
    if (error) { console.error('Error fetching users:', error); throw error }
    return data || []
  },

  subscribeToTasks(callback) {
    return supabase.channel('kanban-tasks-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_tasks' }, callback).subscribe()
  },

  subscribeToComments(taskId, callback) {
    return supabase.channel(`kanban-comments-${taskId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_comments', filter: `task_id=eq.${taskId}` }, callback).subscribe()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// taskAPI
// ─────────────────────────────────────────────────────────────────────────────
export const taskAPI = {
  async createTask(taskData) {
    const { data: { session } } = await supabase.auth.getSession()
    const assignedUsers = Array.isArray(taskData.assigned_to) ? taskData.assigned_to : taskData.assigned_to ? [taskData.assigned_to] : []
    const { assigned_to, ...taskDataWithoutAssignment } = taskData
    const taskToInsert = { ...taskDataWithoutAssignment, assigned_to: assignedUsers[0] || null, created_by: session?.user?.id }
    const { data, error } = await supabase.from('tasks').insert([taskToInsert]).select('*').single()
    if (error) { console.error('Error inserting task:', error); return { data: null, error } }
    if (assignedUsers.length > 0) {
      const { error: assignError } = await supabase.rpc('assign_users_to_task', { task_uuid: data.id, user_ids: assignedUsers })
      if (assignError) console.error('Error assigning users:', assignError)
    }
    return { data: await this._enrichTask(data), error: null }
  },

  async updateTask(taskId, updates) {
    const assignedUsers = updates.assigned_to
    const taskUpdates = { ...updates }
    if (assignedUsers !== undefined) {
      const userArray = Array.isArray(assignedUsers) ? assignedUsers : assignedUsers ? [assignedUsers] : []
      taskUpdates.assigned_to = userArray[0] || null
      if (userArray.length > 0 || assignedUsers === null) {
        const { error: assignError } = await supabase.rpc('assign_users_to_task', { task_uuid: taskId, user_ids: userArray })
        if (assignError) console.error('Error assigning users:', assignError)
      }
    }
    const { data, error } = await supabase.from('tasks').update(taskUpdates).eq('id', taskId).select('*').single()
    if (error) return { data: null, error }
    return { data: await this._enrichTask(data), error: null }
  },

  async updateTaskStatus(taskId, newStatus, currentUser) {
    const updates = { status: newStatus, updated_by: currentUser.id }
    const now = new Date().toISOString()
    if (newStatus === 'in-progress') {
      const { data: task } = await supabase.from('tasks').select('started_at').eq('id', taskId).single()
      if (!task?.started_at) updates.started_at = now
      updates.in_progress_at = now
    } else if (newStatus === 'validating') {
      updates.validating_at = now
    } else if (newStatus === 'completed') {
      updates.completed_at = now
      updates.is_confirmed = false
    }
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select('*').single()
    if (error) return { data: null, error }
    return { data: await this._enrichTask(data), error: null }
  },

  // ── Internal helper — enriches a task row with related data ──────────────
  async _enrichTask(task) {
    const { data: assignedUsers } = await supabase.rpc('get_task_assigned_users', { task_uuid: task.id })
    task.assigned_users = assignedUsers || []
    if (task.created_by) {
      const { data: d } = await supabase.from('users').select('id, full_name').eq('id', task.created_by).single()
      task.created_user = d
    }
    if (task.branch_id) {
      const { data: d } = await supabase.from('branches').select('id, name').eq('id', task.branch_id).single()
      task.branches = d
    }
    if (task.board_id) {
      const { data: d } = await supabase.from('boards').select('id, name').eq('id', task.board_id).single()
      task.boards = d
    }
    return task
  },

  async confirmAndArchiveTask(taskId, confirmingUserId) {
    try {
      const { error } = await supabase.rpc('archive_task_to_history', { task_uuid: taskId, confirming_user_id: confirmingUserId })
      if (error) throw error
      return { success: true }
    } catch (error) { console.error('Error confirming task:', error); return { success: false, error } }
  },

  async getPendingReviewTasks() {
    const { data, error } = await supabase.from('tasks').select(`*, created_user:users!tasks_created_by_fkey(id, full_name), branches(id, name), boards(id, name)`).eq('status', 'completed').eq('is_confirmed', false).order('completed_at', { ascending: true })
    if (error) return { data: null, error }
    for (const task of data) {
      const { data: assignedUsers } = await supabase.rpc('get_task_assigned_users', { task_uuid: task.id })
      task.assigned_users = assignedUsers || []
    }
    return { data, error }
  },

  async getTaskHistory(userId, isAdminUser) {
    let query = supabase.from('task_history').select('*').order('confirmed_at', { ascending: false })
    if (!isAdminUser) query = query.eq('assigned_to', userId)
    return await query
  },

  async getPendingReviewCount() {
    const { count, error } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('is_confirmed', false)
    return { count: count || 0, error }
  },

  async getAllTasksForBoard(boardId) {
    const { data, error } = await supabase.from('tasks').select('*').eq('board_id', boardId).order('created_at', { ascending: false })
    if (error) { console.error('Error fetching tasks for board:', error); throw error }
    return await Promise.all((data || []).map(task => this._enrichTask({ ...task })))
  },

  async getAllUsers() {
    const { data, error } = await supabase.from('users').select('id, full_name, name, email, role').eq('status', 'approved').in('role', ['admin', 'staff']).order('full_name')
    if (error) { console.error('Error fetching users:', error); throw error }
    return data || []
  }
}

export default { supabase, getCurrentUserProfile, isUserApproved, isAdmin, productAPI, quotationAPI, projectAPI, kanbanAPI, taskAPI }