import { supabase } from '../lib/supabase'
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user'
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

    if (error) {
      console.error('Error fetching staff permissions:', error)
      return []
    }

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
    permissionsCache.delete(`permissions_${userId}`)
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

export const isAdmin = (profile) =>
  hasRole(profile, [ROLES.ADMIN])

export const isStaff = (profile) =>
  hasRole(profile, [ROLES.STAFF])

export const isAdminOrStaff = (profile) =>
  hasRole(profile, [ROLES.ADMIN, ROLES.STAFF])

export const isApproved = (profile) =>
  profile?.status === STATUS.APPROVED

const moduleAccess = async (profile, permissionType) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false

  if (profile.role === ROLES.ADMIN) return true

  if (profile.role === ROLES.STAFF) {
    return await hasStaffPermission(profile.id, permissionType)
  }

  return false
}

export const canAccessBilling = async (profile) =>
  await moduleAccess(profile, PERMISSION_TYPES.BILLING)

export const canAccessContacts = async (profile) =>
  await moduleAccess(profile, PERMISSION_TYPES.CONTACTS)

export const canAccessQuotations = async (profile) =>
  await moduleAccess(profile, PERMISSION_TYPES.QUOTATIONS)

export const canAccessReports = async (profile) =>
  await moduleAccess(profile, PERMISSION_TYPES.REPORTS)
export const canAccessProducts = async (profile) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  if (profile.role === ROLES.ADMIN) return true

  if (profile.role === ROLES.STAFF) {
    const permissions = await getStaffPermissions(profile.id)

    if (permissions.includes(PERMISSION_TYPES.ALL_ACCESS)) return true

    return (
      permissions.includes(PERMISSION_TYPES.PRODUCTS) &&
      permissions.includes(PERMISSION_TYPES.PROJECTS)
    )
  }

  return false
}

export const canAccessProjects = canAccessProducts


export const canAccessExpenses = async (profile) =>
  await moduleAccess(profile, PERMISSION_TYPES.EXPENSES)

export const canAccessKanban = async (profile) =>
  await moduleAccess(profile, PERMISSION_TYPES.KANBAN)

export const canManageProducts = canAccessProducts
export const canManageProjects = canAccessProducts

export const canManageKanban = async (profile) =>
  await canAccessKanban(profile)


export const canDeleteRecords = (profile) =>
  isAdmin(profile)

export const canApproveUsers = (profile) =>
  isAdmin(profile)

export const canAccessAdminPanel = (profile) =>
  isAdmin(profile)

export const canDeleteKanbanTask = (user) =>
  user?.role === ROLES.ADMIN

export const canEditKanbanTask = (user, task) => {
  if (user?.role === ROLES.ADMIN) return true

  if (user?.role === ROLES.STAFF) {
    return (
      task?.assigned_to === user?.id ||
      task?.created_by === user?.id
    )
  }

  return false
}

export const canCommentOnTask = (user) =>
  user?.role === ROLES.ADMIN ||
  user?.role === ROLES.STAFF

export const canDeleteComment = (user, comment) => {
  if (user?.role === ROLES.ADMIN) return true
  return comment?.user_id === user?.id
}

export const permissions = {
  // Billing
  viewBilling: canAccessBilling,
  createBilling: canAccessBilling,
  updateBilling: canAccessBilling,
  deleteBilling: isAdmin,

  // Contacts
  viewContacts: canAccessContacts,
  createContact: canAccessContacts,
  updateContact: canAccessContacts,
  deleteContact: isAdmin,

  // Products
  viewProducts: canAccessProducts,
  createProduct: canManageProducts,
  updateProduct: canManageProducts,
  deleteProduct: isAdmin,

  // Projects
  viewProjects: canAccessProjects,
  createProject: canManageProjects,
  updateProject: canManageProjects,
  deleteProject: isAdmin,

  // Quotations
  viewQuotations: canAccessQuotations,
  createQuotation: canAccessQuotations,
  updateQuotation: canAccessQuotations,
  deleteQuotation: isAdmin,

  // Reports
  viewReports: canAccessReports,
  exportReports: canAccessReports,

  // Expenses
  viewExpenses: canAccessExpenses,
  createExpense: canAccessExpenses,
  updateExpense: canAccessExpenses,
  deleteExpense: isAdmin,

  // Kanban
  viewKanban: canAccessKanban,
  createKanban: isAdmin,
  updateKanban: canManageKanban,
  deleteKanban: isAdmin,

  // Users
  viewUsers: isAdmin,
  approveUsers: canApproveUsers,
  deleteUsers: isAdmin,
  managePermissions: isAdmin
}

export const checkPermission = async (profile, permissionFn) => {
  if (typeof permissionFn === 'function') {
    const result = permissionFn(profile)
    return result instanceof Promise ? await result : result
  }
  return false
}

export const canManageLandingPage = async (profile) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  
  if (profile.role === ROLES.ADMIN) return true
  
  if (profile.role === ROLES.STAFF) {
    const permissions = await getStaffPermissions(profile.id)
    
    if (permissions.includes(PERMISSION_TYPES.ALL_ACCESS)) return true
    
    return permissions.includes(PERMISSION_TYPES.PRODUCTS) &&
           permissions.includes(PERMISSION_TYPES.PROJECTS)
  }
  
  return false
}