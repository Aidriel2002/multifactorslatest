/**
 * Secure API wrapper with idempotent operations
 * Uses lazy initialization to avoid circular dependencies
 */
class SecureAPI {
  constructor() {
    this._supabase = null // Lazy initialization
    this.cache = new Map()
    this._supabasePromise = null // Cache the import promise
  }

  /**
   * Get supabase client (lazy loading to avoid circular dependency)
   */
  async getSupabase() {
    if (this._supabase) {
      return this._supabase
    }

    // If import is already in progress, wait for it
    if (this._supabasePromise) {
      await this._supabasePromise
      return this._supabase
    }

    // Start the import
    this._supabasePromise = import('../lib/supabase').then(module => {
      this._supabase = module.supabase
      return this._supabase
    })

    await this._supabasePromise
    return this._supabase
  }

  /**
   * Get current user profile with role and status (cached)
   */
  async getCurrentProfile(forceRefresh = false) {
    const supabase = await this.getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Check cache first
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
    
    // Cache for 5 minutes
    this.cache.set(cacheKey, profile)
    setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000)
    
    return profile
  }

  /**
   * Clear profile cache
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Check if user is approved
   */
  async isApproved() {
    const profile = await this.getCurrentProfile()
    return profile?.status === 'approved'
  }

  /**
   * Check if user is admin
   */
  async isAdmin() {
    const profile = await this.getCurrentProfile()
    return profile?.role === 'admin' && profile?.status === 'approved'
  }

  /**
   * Idempotent SELECT query (safe to retry)
   */
  async select(table, options = {}) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
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

  /**
   * Idempotent INSERT (upsert with unique constraint)
   */
  async insertIdempotent(table, data, uniqueFields = ['id']) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
    }

    const supabase = await this.getSupabase()

    // Build query to check if record exists
    let checkQuery = supabase.from(table).select('id')
    
    uniqueFields.forEach(field => {
      if (data[field] !== undefined) {
        checkQuery = checkQuery.eq(field, data[field])
      }
    })

    const { data: existing } = await checkQuery.maybeSingle()

    // If exists, return existing record (idempotent)
    if (existing) {
      console.log(`Record already exists in ${table}, skipping insert`)
      return existing
    }

    // Insert new record
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single()

    if (error) {
      // Handle race condition
      if (error.code === '23505') {
        console.log(`Duplicate detected during insert, fetching existing record`)
        const { data: existingRecord } = await checkQuery.single()
        return existingRecord
      }
      throw error
    }

    return result
  }

  /**
   * Idempotent UPSERT
   */
  async upsert(table, data, options = {}) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
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

  /**
   * Idempotent UPDATE by ID
   */
  async update(table, id, data) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
    }

    const supabase = await this.getSupabase()

    // Fetch current record
    const { data: current } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single()

    if (!current) {
      throw new Error(`Record not found in ${table} with id ${id}`)
    }

    // Check if any values actually changed
    const hasChanges = Object.keys(data).some(key => {
      return JSON.stringify(current[key]) !== JSON.stringify(data[key])
    })

    if (!hasChanges) {
      console.log(`No changes detected for ${table}:${id}, skipping update`)
      return current
    }

    // Perform update
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return result
  }

  /**
   * Idempotent conditional UPDATE
   */
  async conditionalUpdate(table, id, expectedState, newData) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
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

  /**
   * Idempotent DELETE
   */
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
      console.log(`Record ${id} not found in ${table}, already deleted`)
      return { deleted: false, reason: 'already_deleted' }
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (error) throw error
    return { deleted: true }
  }

  /**
   * Idempotent soft DELETE
   */
  async softDelete(table, id) {
    if (!(await this.isAdmin())) {
      throw new Error('Admin access required')
    }

    return this.update(table, id, {
      deleted_at: new Date().toISOString(),
      deleted: true
    })
  }

  /**
   * Batch operations
   */
  async batchUpsert(table, records, options = {}) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
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

  /**
   * Safe increment
   */
  async increment(table, id, column, amount = 1) {
    if (!(await this.isApproved())) {
      throw new Error('User not approved')
    }

    const supabase = await this.getSupabase()
    const { data: current } = await supabase
      .from(table)
      .select(column)
      .eq('id', id)
      .single()

    const newValue = (current?.[column] || 0) + amount

    return this.update(table, id, { [column]: newValue })
  }
}

// Export singleton instance (created immediately)
export const secureAPI = new SecureAPI()

// Export helper functions
export const getCurrentProfile = (forceRefresh) => secureAPI.getCurrentProfile(forceRefresh)
export const isApproved = () => secureAPI.isApproved()
export const isAdmin = () => secureAPI.isAdmin()
export const clearCache = () => secureAPI.clearCache()

export default secureAPI