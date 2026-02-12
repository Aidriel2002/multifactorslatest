import { supabase } from '../lib/supabase'

export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  EMPLOYEE: 'employee'
}

export const STATUS = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected'
}

export const PERMISSION_TYPES = {
  BILLING: 'billing',
  CONTACTS: 'contacts',
  QUOTATIONS: 'quotations',
  REPORTS: 'reports',
  PRODUCTS: 'products',
  PROJECTS: 'projects',
  EXPENSES: 'expenses',
  KANBAN: 'kanban',
  ALL_ACCESS: 'all_access'
}

const permissionsCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 

export const getStaffPermissions = async (userId) => {
  const cacheKey = `permissions_${userId}`
  const cached = permissionsCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.permissions
  }

  try {
    const { data, error } = await supabase
      .from('staff_permissions')
      .select('permission')
      .eq('user_id', userId)

    if (error) throw error

    const permissions = data?.map(p => p.permission) || []
    
    permissionsCache.set(cacheKey, {
      permissions,
      timestamp: Date.now()
    })

    return permissions
  } catch (error) {
    console.error('❌ Error fetching staff permissions:', error)
    return []
  }
}

export const clearPermissionsCache = (userId) => {
  if (userId) {
    const cacheKey = `permissions_${userId}`
    permissionsCache.delete(cacheKey)
  } else {
    permissionsCache.clear()
  }
}

export const hasStaffPermission = async (userId, permission) => {
  const permissions = await getStaffPermissions(userId)
  
  if (permissions.includes(PERMISSION_TYPES.ALL_ACCESS)) {
    return true
  }
  
  return permissions.includes(permission)
}

export const hasRole = (profile, allowedRoles) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  return allowedRoles.includes(profile.role)
}

export const isAdmin = (profile) => {
  return hasRole(profile, [ROLES.ADMIN])
}

export const isStaff = (profile) => {
  return hasRole(profile, [ROLES.STAFF])
}

export const isAdminOrStaff = (profile) => {
  return hasRole(profile, [ROLES.ADMIN, ROLES.STAFF])
}

export const isApproved = (profile) => {
  return profile?.status === STATUS.APPROVED
}

export const canAccessBilling = async (profile) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  
  if (profile.role === ROLES.ADMIN) return true
  
  if (profile.role === ROLES.STAFF) {
    return await hasStaffPermission(profile.id, PERMISSION_TYPES.BILLING)
  }
  
  return false
}

export const canAccessContacts = async (profile) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  
  if (profile.role === ROLES.ADMIN) return true
  
  if (profile.role === ROLES.STAFF) {
    return await hasStaffPermission(profile.id, PERMISSION_TYPES.CONTACTS)
  }
  
  return false
}

export const canAccessQuotations = async (profile) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  
  if (profile.role === ROLES.ADMIN) return true
  
  if (profile.role === ROLES.STAFF) {
    return await hasStaffPermission(profile.id, PERMISSION_TYPES.QUOTATIONS)
  }
  
  return false
}

export const canAccessReports = async (profile) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  
  if (profile.role === ROLES.ADMIN) return true
  
  if (profile.role === ROLES.STAFF) {
    return await hasStaffPermission(profile.id, PERMISSION_TYPES.REPORTS)
  }
  
  return false
}

export const canAccessProducts = async (profile) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  
  if (profile.role === ROLES.ADMIN) return true
  
  if (profile.role === ROLES.STAFF) {
    return await hasStaffPermission(profile.id, PERMISSION_TYPES.PRODUCTS)
  }
  
  return false
}

export const canManageProducts = async (profile) => {
  return await canAccessProducts(profile)
}

export const canManageProjects = async (profile) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  
  if (profile.role === ROLES.ADMIN) return true
  
  if (profile.role === ROLES.STAFF) {
    return await hasStaffPermission(profile.id, PERMISSION_TYPES.PRODUCTS)
  }
  
  return false
}

export const canAccessExpenses = async (profile) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  
  if (profile.role === ROLES.ADMIN) return true
  
  if (profile.role === ROLES.STAFF) {
    return await hasStaffPermission(profile.id, PERMISSION_TYPES.EXPENSES)
  }
  
  return false
}

export const canAccessKanban = async (profile) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  
  if (profile.role === ROLES.ADMIN) return true
  
  if (profile.role === ROLES.STAFF) {
    return await hasStaffPermission(profile.id, PERMISSION_TYPES.KANBAN)
  }
  
  return false
}

export const canManageKanban = async (profile) => {
  return await canAccessKanban(profile)
}

export const canDeleteRecords = (profile) => {
  return isAdmin(profile) 
}

export const canApproveUsers = (profile) => {
  return isAdmin(profile) 
}

export const canAccessAdminPanel = (profile) => {
  return isAdmin(profile)
}

export const permissions = {
  viewBilling: canAccessBilling,
  createBilling: canAccessBilling,
  updateBilling: canAccessBilling,
  deleteBilling: (profile) => isAdmin(profile),
  
  viewContacts: canAccessContacts,
  createContact: canAccessContacts,
  updateContact: canAccessContacts,
  deleteContact: (profile) => isAdmin(profile),
  
  viewProducts: canAccessProducts,
  createProduct: canManageProducts,
  updateProduct: canManageProducts,
  deleteProduct: (profile) => isAdmin(profile),
  
  viewProjects: canManageProjects,
  createProject: canManageProjects,
  updateProject: canManageProjects,
  deleteProject: (profile) => isAdmin(profile),
  
  viewQuotations: canAccessQuotations,
  createQuotation: canAccessQuotations,
  updateQuotation: canAccessQuotations,
  deleteQuotation: (profile) => isAdmin(profile),
  
  viewReports: canAccessReports,
  exportReports: canAccessReports,
  
  viewExpenses: canAccessExpenses,
  createExpense: canAccessExpenses,
  updateExpense: canAccessExpenses,
  deleteExpense: (profile) => isAdmin(profile),
  
  viewKanban: canAccessKanban,
  createKanban: (profile) => isAdmin(profile),
  updateKanban: canManageKanban,
  deleteKanban: (profile) => isAdmin(profile),
  
  viewUsers: (profile) => isAdmin(profile),
  approveUsers: (profile) => canApproveUsers(profile),
  deleteUsers: (profile) => isAdmin(profile),
  managePermissions: (profile) => isAdmin(profile)
}

export const checkPermission = async (profile, permissionFn) => {
  if (typeof permissionFn === 'function') {
    const result = permissionFn(profile)
    return result instanceof Promise ? await result : result
  }
  return false
}