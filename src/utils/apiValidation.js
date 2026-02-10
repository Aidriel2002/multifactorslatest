import { getStaffPermissions, PERMISSION_TYPES } from '../utils/rbac'

class SecureAPI {
  constructor() {
    this._supabase = null 
    this.cache = new Map()
    this._supabasePromise = null 
  }

  async getSupabase() {
    if (this._supabase) {
      return this._supabase
    }

    if (this._supabasePromise) {
      await this._supabasePromise
      return this._supabase
    }

    this._supabasePromise = import('../lib/supabase').then(module => {
      this._supabase = module.supabase
      return this._supabase
    })

    await this._supabasePromise
    return this._supabase
  }

  async getCurrentProfile(forceRefresh = false) {
    const supabase = await this.getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Not authenticated')
    }

    const cacheKey = `profile_${user.id}`
    if (!forceRefresh && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error
    
    this.cache.set(cacheKey, profile)
    setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000)
    
    return profile
  }

  clearCache() {
    this.cache.clear()
  }

 
  async isApproved() {
    const profile = await this.getCurrentProfile()
    return profile?.status === 'approved'
  }

  
  async isAdmin() {
    const profile = await this.getCurrentProfile()
    return profile?.role === 'admin' && profile?.status === 'approved'
  }

  
  async isStaff() {
    const profile = await this.getCurrentProfile()
    return profile?.role === 'staff' && profile?.status === 'approved'
  }

  async isAdminOrStaff() {
    const profile = await this.getCurrentProfile()
    return (profile?.role === 'admin' || profile?.role === 'staff') && profile?.status === 'approved'
  }

  async hasPermission(permission) {
    const profile = await this.getCurrentProfile()
    
    if (!profile || profile.status !== 'approved') return false
    if (profile.role === 'admin') return true
    
    if (profile.role === 'staff') {
      const permissions = await getStaffPermissions(profile.id)
      
      if (permissions.includes(PERMISSION_TYPES.ALL_ACCESS)) {
        return true
      }
      
      return permissions.includes(permission)
    }
    
    return false
  }

  /**
   * @param {string} table 
   * @param {object} options 
   * @param {boolean} options.requireAuth 
   * @param {string} options.requirePermission 
   */
  async select(table, options = {}) {
    const requireAuth = options.requireAuth !== false

    if (requireAuth) {
      if (!(await this.isApproved())) {
        throw new Error('User not approved')
      }

      if (options.requirePermission) {
        if (!(await this.hasPermission(options.requirePermission))) {
          throw new Error('Permission denied')
        }
      }
    }

    const supabase = await this.getSupabase()
    let query = supabase.from(table).select(options.select || '*')

    if (options.eq) {
      Object.entries(options.eq).forEach(([column, value]) => {
        query = query.eq(column, value)
      })
    }

    if (options.neq) {
      Object.entries(options.neq).forEach(([column, value]) => {
        query = query.neq(column, value)
      })
    }

    if (options.in) {
      Object.entries(options.in).forEach(([column, values]) => {
        query = query.in(column, values)
      })
    }

    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true })
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.range) {
      query = query.range(options.range.from, options.range.to)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  async insertIdempotent(table, data, uniqueFields = ['id'], options = {}) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
    }

    if (options.requirePermission) {
      if (!(await this.hasPermission(options.requirePermission))) {
        throw new Error('Permission denied')
      }
    }

    const supabase = await this.getSupabase()

    let checkQuery = supabase.from(table).select('id')
    
    uniqueFields.forEach(field => {
      if (data[field] !== undefined) {
        checkQuery = checkQuery.eq(field, data[field])
      }
    })

    const { data: existing } = await checkQuery.maybeSingle()

    if (existing) {
      return existing
    }

    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: existingRecord } = await checkQuery.single()
        return existingRecord
      }
      throw error
    }

    return result
  }

  
  async upsert(table, data, options = {}) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
    }

    if (options.requirePermission) {
      if (!(await this.hasPermission(options.requirePermission))) {
        throw new Error('Permission denied')
      }
    }

    const supabase = await this.getSupabase()
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data, {
        onConflict: options.onConflict || 'id',
        ignoreDuplicates: options.ignoreDuplicates || false
      })
      .select()

    if (error) throw error
    return result
  }

  async update(table, id, data, options = {}) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
    }

    if (options.requirePermission) {
      if (!(await this.hasPermission(options.requirePermission))) {
        throw new Error('Permission denied')
      }
    }

    const supabase = await this.getSupabase()

    const { data: current } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single()

    if (!current) {
      throw new Error(`Record not found in ${table} with id ${id}`)
    }

    const hasChanges = Object.keys(data).some(key => {
      return JSON.stringify(current[key]) !== JSON.stringify(data[key])
    })

    if (!hasChanges) {
      return current
    }

    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async conditionalUpdate(table, id, expectedState, newData, options = {}) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
    }

    if (options.requirePermission) {
      if (!(await this.hasPermission(options.requirePermission))) {
        throw new Error('Permission denied')
      }
    }

    const supabase = await this.getSupabase()
    let query = supabase
      .from(table)
      .update(newData)
      .eq('id', id)

    Object.entries(expectedState).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { data: result, error } = await query
      .select()
      .single()

    if (error && error.code === 'PGRST116') {
      throw new Error('Record state changed, update aborted (optimistic locking)')
    }

    if (error) throw error
    return result
  }

  async delete(table, id) {
    if (!(await this.isAdmin())) {
      throw new Error('Admin access required')
    }

    const supabase = await this.getSupabase()
    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return { deleted: false, reason: 'already_deleted' }
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (error) throw error
    return { deleted: true }
  }

  async softDelete(table, id) {
    if (!(await this.isAdmin())) {
      throw new Error('Admin access required')
    }

    return this.update(table, id, {
      deleted_at: new Date().toISOString(),
      deleted: true
    })
  }

  async batchUpsert(table, records, options = {}) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
    }

    if (options.requirePermission) {
      if (!(await this.hasPermission(options.requirePermission))) {
        throw new Error('Permission denied')
      }
    }

    const supabase = await this.getSupabase()
    const { data: result, error } = await supabase
      .from(table)
      .upsert(records, {
        onConflict: options.onConflict || 'id',
        ignoreDuplicates: false
      })
      .select()

    if (error) throw error
    return result
  }

  async increment(table, id, column, amount = 1, options = {}) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
    }

    if (options.requirePermission) {
      if (!(await this.hasPermission(options.requirePermission))) {
        throw new Error('Permission denied')
      }
    }

    const supabase = await this.getSupabase()
    const { data: current } = await supabase
      .from(table)
      .select(column)
      .eq('id', id)
      .single()

    const newValue = (current?.[column] || 0) + amount

    return this.update(table, id, { [column]: newValue }, options)
  }
}

export const secureAPI = new SecureAPI()

export const getCurrentProfile = (forceRefresh) => secureAPI.getCurrentProfile(forceRefresh)
export const isApproved = () => secureAPI.isApproved()
export const isAdmin = () => secureAPI.isAdmin()
export const isStaff = () => secureAPI.isStaff()
export const isAdminOrStaff = () => secureAPI.isAdminOrStaff()
export const hasPermission = (permission) => secureAPI.hasPermission(permission)
export const clearCache = () => secureAPI.clearCache()

export default secureAPI