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

export const projectAPI = {
  async getAll() {
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      throw new Error('Access denied. Admins only.');
    }

    const { data, error } = await supabase
      .from('project')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id) {
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      throw new Error('Access denied. Admins only.');
    }

    const { data, error } = await supabase
      .from('project')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      throw error;
    }

    return data;
  },

  async create(projectData) {
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      throw new Error('Access denied. Admins only.');
    }

    const { data, error } = await supabase
      .from('project')
      .insert([projectData])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw error;
    }

    return data;
  },

  async update(id, projectData) {
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      throw new Error('Access denied. Admins only.');
    }

    const { data, error } = await supabase
      .from('project')
      .update(projectData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw error;
    }

    return data;
  },

  async delete(id) {
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      throw new Error('Access denied. Admins only.');
    }

    const { data: project } = await supabase
      .from('project')
      .select('image_url')
      .eq('id', id)
      .single();

    if (project?.image_url) {
      try {
        const path = project.image_url.split('/project-images/')[1];
        if (path) {
          await supabase.storage
            .from('project-images')
            .remove([path]);
        }
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    const { error } = await supabase
      .from('project')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  async uploadImage(file) {
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      throw new Error('Access denied. Admins only.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('project-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async deleteImage(imageUrl) {
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      throw new Error('Access denied. Admins only.');
    }

    try {
      const path = imageUrl.split('/project-images/')[1];
      if (path) {
        const { error } = await supabase.storage
          .from('project-images')
          .remove([path]);

        if (error) {
          console.error('Error deleting image:', error);
          throw error;
        }
      }
    } catch (err) {
      console.error('Error parsing image path:', err);
      throw err;
    }
  },

  subscribeToChanges(callback) {
    return supabase
      .channel('project-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project' },
        callback
      )
      .subscribe();
  }
};


export const kanbanAPI = {
  async getAllTasks() {
    const { data, error } = await supabase
      .from('kanban_tasks')
      .select(`
        *,
        assigned_user:users!kanban_tasks_assigned_to_fkey(id, name, email),
        created_user:users!kanban_tasks_created_by_fkey(id, name, email)
      `)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }

    return data || [];
  },

  async getTaskById(id) {
    const { data, error } = await supabase
      .from('kanban_tasks')
      .select(`
        *,
        assigned_user:users!kanban_tasks_assigned_to_fkey(id, name, email),
        created_user:users!kanban_tasks_created_by_fkey(id, name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching task:', error);
      throw error;
    }

    return data;
  },

  async createTask(taskData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('kanban_tasks')
      .insert([{
        ...taskData,
        created_by: user.id
      }])
      .select(`
        *,
        assigned_user:users!kanban_tasks_assigned_to_fkey(id, name, email),
        created_user:users!kanban_tasks_created_by_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }

    return data;
  },

  async updateTask(id, updates) {
    const { data, error } = await supabase
      .from('kanban_tasks')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        assigned_user:users!kanban_tasks_assigned_to_fkey(id, name, email),
        created_user:users!kanban_tasks_created_by_fkey(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating task:', error);
      throw error;
    }

    return data;
  },

  async deleteTask(id) {
    const { error } = await supabase
      .from('kanban_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },

  async updateTaskStatus(id, status, displayOrder) {
    const updates = { status };
    if (displayOrder !== undefined) {
      updates.display_order = displayOrder;
    }

    return await this.updateTask(id, updates);
  },

  async getComments(taskId) {
    const { data, error } = await supabase
      .from('kanban_comments')
      .select(`
        *,
        user:users(id, name, email)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }

    return data || [];
  },

  async addComment(taskId, comment) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('kanban_comments')
      .insert([{
        task_id: taskId,
        user_id: user.id,
        comment
      }])
      .select(`
        *,
        user:users(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }

    return data;
  },

  async updateComment(id, comment) {
    const { data, error } = await supabase
      .from('kanban_comments')
      .update({ comment })
      .eq('id', id)
      .select(`
        *,
        user:users(id, name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      throw error;
    }

    return data;
  },

  async deleteComment(id) {
    const { error } = await supabase
      .from('kanban_comments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  },

  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('status', 'approved')
      .in('role', ['admin', 'staff'])
      .order('name');

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    return data || [];
  },

  subscribeToTasks(callback) {
    return supabase
      .channel('kanban-tasks-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'kanban_tasks' },
        callback
      )
      .subscribe();
  },

  subscribeToComments(taskId, callback) {
    return supabase
      .channel(`kanban-comments-${taskId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'kanban_comments',
          filter: `task_id=eq.${taskId}`
        },
        callback
      )
      .subscribe();
  }
};

export const taskAPI = {
  async createTask(taskData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    
    const assignedUsers = Array.isArray(taskData.assigned_to) 
      ? taskData.assigned_to 
      : taskData.assigned_to 
        ? [taskData.assigned_to] 
        : [];
    
    
    const { assigned_to, ...taskDataWithoutAssignment } = taskData;
    
    const taskToInsert = {
      ...taskDataWithoutAssignment,
      assigned_to: assignedUsers.length > 0 ? assignedUsers[0] : null,
      created_by: user.id
    };
    
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskToInsert])
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting task:', error);
      return { data: null, error };
    }


    if (assignedUsers.length > 0) {
      
      const { error: assignError } = await supabase
        .rpc('assign_users_to_task', {
          task_uuid: data.id,
          user_ids: assignedUsers
        });
      
      if (assignError) console.error('Error assigning users:', assignError);
    }

    const { data: assignedUsersData } = await supabase
      .rpc('get_task_assigned_users', { task_uuid: data.id });
    
    data.assigned_users = assignedUsersData || [];
    
    if (data.created_by) {
      const { data: createdUser } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', data.created_by)
        .single();
      
      data.created_user = createdUser;
    }
    
    if (data.branch_id) {
      const { data: branch } = await supabase
        .from('branches')
        .select('id, name')
        .eq('id', data.branch_id)
        .single();
      
      data.branches = branch;
    }
    
    if (data.board_id) {
      const { data: board } = await supabase
        .from('boards')
        .select('id, name')
        .eq('id', data.board_id)
        .single();
      
      data.boards = board;
    }

    return { data, error: null };
  },

  async updateTask(taskId, updates) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const assignedUsers = updates.assigned_to;
    const taskUpdates = { ...updates };
    
    if (assignedUsers !== undefined) {
      const userArray = Array.isArray(assignedUsers) 
        ? assignedUsers 
        : assignedUsers 
          ? [assignedUsers] 
          : [];
      
      taskUpdates.assigned_to = userArray[0] || null;
      
      if (userArray.length > 0 || assignedUsers === null) {
        const { error: assignError } = await supabase
          .rpc('assign_users_to_task', {
            task_uuid: taskId,
            user_ids: userArray
          });
        
        if (assignError) console.error('Error assigning users:', assignError);
      }
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update(taskUpdates)
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) return { data: null, error };

    const { data: assignedUsersData } = await supabase
      .rpc('get_task_assigned_users', { task_uuid: data.id });
    
    data.assigned_users = assignedUsersData || [];
    
    if (data.created_by) {
      const { data: createdUser } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', data.created_by)
        .single();
      
      data.created_user = createdUser;
    }
    
    if (data.branch_id) {
      const { data: branch } = await supabase
        .from('branches')
        .select('id, name')
        .eq('id', data.branch_id)
        .single();
      
      data.branches = branch;
    }
    
    if (data.board_id) {
      const { data: board } = await supabase
        .from('boards')
        .select('id, name')
        .eq('id', data.board_id)
        .single();
      
      data.boards = board;
    }

    return { data, error: null };
  },

  async updateTaskStatus(taskId, newStatus, currentUser) {
    const updates = {
      status: newStatus,
      updated_by: currentUser.id
    };
    
    const now = new Date().toISOString();
    
    if (newStatus === 'in-progress') {
      const { data: task } = await supabase
        .from('tasks')
        .select('started_at')
        .eq('id', taskId)
        .single();
      
      if (!task?.started_at) {
        updates.started_at = now;
      }
      updates.in_progress_at = now;
    } else if (newStatus === 'validating') {
      updates.validating_at = now;
    } else if (newStatus === 'completed') {
      updates.completed_at = now;
      updates.is_confirmed = false;
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) return { data: null, error };

    const { data: assignedUsers } = await supabase
      .rpc('get_task_assigned_users', { task_uuid: data.id });
    
    data.assigned_users = assignedUsers || [];
    
    if (data.created_by) {
      const { data: createdUser } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', data.created_by)
        .single();
      
      data.created_user = createdUser;
    }
    
    if (data.branch_id) {
      const { data: branch } = await supabase
        .from('branches')
        .select('id, name')
        .eq('id', data.branch_id)
        .single();
      
      data.branches = branch;
    }
    
    if (data.board_id) {
      const { data: board } = await supabase
        .from('boards')
        .select('id, name')
        .eq('id', data.board_id)
        .single();
      
      data.boards = board;
    }
      
    return { data, error: null };
  },

  async confirmAndArchiveTask(taskId, confirmingUserId) {
    try {
      const { data, error } = await supabase
        .rpc('archive_task_to_history', {
          task_uuid: taskId,
          confirming_user_id: confirmingUserId
        });
        
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error confirming task:', error);
      return { success: false, error };
    }
  },

  async getPendingReviewTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        created_user:users!tasks_created_by_fkey(id, full_name),
        branches(id, name),
        boards(id, name)
      `)
      .eq('status', 'completed')
      .eq('is_confirmed', false)
      .order('completed_at', { ascending: true });
    
    if (error) return { data: null, error };

    for (const task of data) {
      const { data: assignedUsers } = await supabase
        .rpc('get_task_assigned_users', { task_uuid: task.id });
      
      task.assigned_users = assignedUsers || [];
    }
      
    return { data, error };
  },

  async getTaskHistory(userId, isAdmin) {
    let query = supabase
      .from('task_history')
      .select('*')
      .order('confirmed_at', { ascending: false });
      
    if (!isAdmin) {
      query = query.eq('assigned_to', userId);
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  async getPendingReviewCount() {
    const { count, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .eq('is_confirmed', false);
      
    return { count: count || 0, error };
  },

  async getAllTasksForBoard(boardId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks for board:', error);
      throw error;
    }

    const tasksWithDetails = await Promise.all(
      (data || []).map(async (task) => {
        const { data: assignedUsers } = await supabase
          .rpc('get_task_assigned_users', { task_uuid: task.id });
        
        let created_user = null;
        if (task.created_by) {
          const { data: createdUserData } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('id', task.created_by)
            .single();
          created_user = createdUserData;
        }
        
        let branches = null;
        if (task.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('id, name')
            .eq('id', task.branch_id)
            .single();
          branches = branchData;
        }
        
        let boards = null;
        if (task.board_id) {
          const { data: boardData } = await supabase
            .from('boards')
            .select('id, name')
            .eq('id', task.board_id)
            .single();
          boards = boardData;
        }
        
        return {
          ...task,
          branch_name: branches?.name,
          assigned_users: assignedUsers || [],
          created_user,
          branches,
          boards
        };
      })
    );

    return tasksWithDetails;
  },

  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, name, email, role')
      .eq('status', 'approved')
      .in('role', ['admin', 'staff'])
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    return data || [];
  }
};

export default {
  supabase,
  getCurrentUserProfile,
  isUserApproved,
  isAdmin,
  productAPI,
  quotationAPI,
  projectAPI,
  kanbanAPI,
  taskAPI
}