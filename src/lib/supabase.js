import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getCurrentUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

export const isUserApproved = async () => {
  const profile = await getCurrentUserProfile()
  return profile?.status === 'approved'
}

export const isAdmin = async () => {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'admin' && profile?.status === 'approved'
}

export const productAPI = {
  async getAll() {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      return await secureAPI.select('products', {
        order: { column: 'created_at', ascending: false },
        requireAuth: false 
      })
    } catch (error) {
      console.error('Error fetching products:', error)
      throw error
    }
  },

  async getById(id) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const products = await secureAPI.select('products', {
        eq: { id },
        requireAuth: false 
      })
      return products?.[0] || null
    } catch (error) {
      console.error('Error fetching product:', error)
      throw error
    }
  },

  async create(product) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const { v4: uuidv4 } = await import('uuid')
      
      if (!product.id) {
        product.id = uuidv4()
      }

      const productData = {
        ...product,
        created_at: product.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      return await secureAPI.insertIdempotent('products', productData, ['id'])
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    }
  },

  async update(id, updates) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      return await secureAPI.update('products', id, updateData)
    } catch (error) {
      console.error('Error updating product:', error)
      throw error
    }
  },

  async delete(id) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      await secureAPI.delete('products', id)
      return true
    } catch (error) {
      console.error('Error deleting product:', error)
      throw error
    }
  },

  async upsert(product) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const productData = {
        ...product,
        updated_at: new Date().toISOString()
      }

      return await secureAPI.upsert('products', productData, {
        onConflict: 'id'
      })
    } catch (error) {
      console.error('Error upserting product:', error)
      throw error
    }
  },

  subscribeToChanges(callback) {
    const subscription = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          callback(payload)
        }
      )
      .subscribe()

    return subscription
  }
}

export const quotationAPI = {
  async getAll(type = null) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const options = {
        order: { column: 'created_at', ascending: false }
      }

      if (type) {
        options.eq = { quotation_type: type }
      }

      return await secureAPI.select('quotations', options)
    } catch (error) {
      console.error('Error fetching quotations:', error)
      throw error
    }
  },

  async getById(id) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const quotations = await secureAPI.select('quotations', {
        eq: { id }
      })
      return quotations?.[0] || null
    } catch (error) {
      console.error('Error fetching quotation:', error)
      throw error
    }
  },

  async getItems(quotationId) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      return await secureAPI.select('quotation_items', {
        eq: { quotation_id: quotationId },
        order: { column: 'sort_order', ascending: true }
      })
    } catch (error) {
      console.error('Error fetching quotation items:', error)
      throw error
    }
  },

  async create(quotation, items) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const { v4: uuidv4 } = await import('uuid')
      const { data: { user } } = await supabase.auth.getUser()

      if (!quotation.id) {
        quotation.id = uuidv4()
      }

      const quotationData = {
        ...quotation,
        created_by: user?.id,
        created_at: quotation.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const newQuotation = await secureAPI.insertIdempotent(
        'quotations',
        quotationData,
        ['id']
      )

      if (items && items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          id: item.id || uuidv4(),
          quotation_id: newQuotation.id,
          ...item,
          sort_order: index,
          created_at: new Date().toISOString()
        }))

        await secureAPI.batchUpsert('quotation_items', itemsToInsert, {
          onConflict: 'id'
        })
      }

      return newQuotation
    } catch (error) {
      console.error('Error creating quotation:', error)
      throw error
    }
  },

  async update(id, quotation, items) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const { v4: uuidv4 } = await import('uuid')
      
      const quotationData = {
        ...quotation,
        updated_at: new Date().toISOString()
      }

      await secureAPI.update('quotations', id, quotationData)

      if (items) {
        const existingItems = await this.getItems(id)
        for (const item of existingItems) {
          await secureAPI.delete('quotation_items', item.id)
        }

        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            id: item.id || uuidv4(),
            quotation_id: id,
            ...item,
            sort_order: index,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))

          await secureAPI.batchUpsert('quotation_items', itemsToInsert, {
            onConflict: 'id'
          })
        }
      }

      return true
    } catch (error) {
      console.error('Error updating quotation:', error)
      throw error
    }
  },

  async delete(id) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      const items = await this.getItems(id)
      
      for (const item of items) {
        await secureAPI.delete('quotation_items', item.id)
      }

      await secureAPI.delete('quotations', id)
      return true
    } catch (error) {
      console.error('Error deleting quotation:', error)
      throw error
    }
  },

  async softDelete(id) {
    try {
      const { secureAPI } = await import('../utils/apiValidation')
      return await secureAPI.softDelete('quotations', id)
    } catch (error) {
      console.error('Error soft deleting quotation:', error)
      throw error
    }
  },

  async duplicate(id) {
    try {
      const { v4: uuidv4 } = await import('uuid')
      const original = await this.getById(id)
      
      if (!original) throw new Error('Quotation not found')

      const originalItems = await this.getItems(id)

      const newQuotation = {
        ...original,
        id: uuidv4(),
        quotation_number: `${original.quotation_number}-COPY`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      delete newQuotation.created_by

      return await this.create(
        newQuotation,
        originalItems.map(item => {
          const newItem = { ...item }
          delete newItem.id
          delete newItem.quotation_id
          delete newItem.created_at
          delete newItem.updated_at
          return newItem
        })
      )
    } catch (error) {
      console.error('Error duplicating quotation:', error)
      throw error
    }
  },

  subscribeToChanges(callback) {
    const subscription = supabase
      .channel('quotations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotations' },
        (payload) => {
          callback(payload)
        }
      )
      .subscribe()

    return subscription
  }
}

export default {
  supabase,
  getCurrentUserProfile,
  isUserApproved,
  isAdmin,
  productAPI,
  quotationAPI
}

export const projectAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('project')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('project')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(projectData) {
    const { data, error } = await supabase
      .from('project')
      .insert([projectData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, projectData) {
    const { data, error } = await supabase
      .from('project')
      .update(projectData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { data: project } = await supabase
      .from('project')
      .select('image_url')
      .eq('id', id)
      .single();

    if (project?.image_url) {
      const imagePath = project.image_url.split('/').pop();
      await supabase.storage
        .from('project-images')
        .remove([imagePath]);
    }

    const { error } = await supabase
      .from('project')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('project-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async deleteImage(imageUrl) {
    const imagePath = imageUrl.split('/').pop();
    const { error } = await supabase.storage
      .from('project-images')
      .remove([imagePath]);

    if (error) throw error;
  },

  subscribeToChanges(callback) {
    return supabase
      .channel('project-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'project' },
        callback
      )
      .subscribe();
  }
};