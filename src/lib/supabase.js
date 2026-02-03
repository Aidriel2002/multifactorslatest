import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://btdssviozjizppcogwbl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0ZHNzdmlvemppenBwY29nd2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzE0MjMsImV4cCI6MjA4MzMwNzQyM30.7Qd1EgRdQy8KflZnzp1gdwr4GUBTpITbnfDa7hEjEas'

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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(product) {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  subscribeToChanges(callback) {
    const subscription = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return subscription;
  }
};


export const quotationAPI = {
  async getAll(type = null) {
    let query = supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (type) {
      query = query.eq('quotation_type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getItems(quotationId) {
    const { data, error } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async create(quotation, items) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: newQuotation, error: quotationError } = await supabase
      .from('quotations')
      .insert([{ ...quotation, created_by: user?.id }])
      .select()
      .single();

    if (quotationError) throw quotationError;

    if (items && items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        quotation_id: newQuotation.id,
        ...item,
        sort_order: index
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return newQuotation;
  },

  async update(id, quotation, items) {
    const { error: quotationError } = await supabase
      .from('quotations')
      .update(quotation)
      .eq('id', id);

    if (quotationError) throw quotationError;

    if (items) {
      await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', id);

      const itemsToInsert = items.map((item, index) => ({
        quotation_id: id,
        ...item,
        sort_order: index
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return true;
  },

  async delete(id) {
    const { error } = await supabase
      .from('quotations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  subscribeToChanges(callback) {
    const subscription = supabase
      .channel('quotations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotations' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return subscription;
  }
};