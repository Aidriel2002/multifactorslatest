import { supabase } from '../lib/supabase'

/* =============================
   CONSTANTS
============================= */

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

/* =============================
   PERMISSION CACHE
============================= */

const permissionsCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
    permissionsCache.delete(`permissions_${userId}`)
  } else {
    permissionsCache.clear()
  }
}

/* =============================
   CORE PERMISSION HELPERS
============================= */

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

/* =============================
   MODULE ACCESS CONTROLS
============================= */

const moduleAccess = async (profile, permissionType) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false

  if (profile.role === ROLES.ADMIN) return true

  if (profile.role === ROLES.STAFF) {
    return await hasStaffPermission(profile.id, permissionType)
  }

  return false
}

export const canAccessBilling = (profile) =>
  moduleAccess(profile, PERMISSION_TYPES.BILLING)

export const canAccessContacts = (profile) =>
  moduleAccess(profile, PERMISSION_TYPES.CONTACTS)

export const canAccessQuotations = (profile) =>
  moduleAccess(profile, PERMISSION_TYPES.QUOTATIONS)

export const canAccessReports = (profile) =>
  moduleAccess(profile, PERMISSION_TYPES.REPORTS)

export const canAccessProducts = (profile) =>
  moduleAccess(profile, PERMISSION_TYPES.PRODUCTS)

export const canAccessProjects = (profile) =>
  moduleAccess(profile, PERMISSION_TYPES.PROJECTS)

export const canAccessExpenses = (profile) =>
  moduleAccess(profile, PERMISSION_TYPES.EXPENSES)

export const canAccessKanban = (profile) =>
  moduleAccess(profile, PERMISSION_TYPES.KANBAN)

/* =============================
   MANAGEMENT CONTROLS
============================= */

export const canManageProducts = async (profile) =>
  await canAccessProducts(profile)

export const canManageProjects = async (profile) =>
  await canAccessProjects(profile)

export const canManageKanban = async (profile) =>
  await canAccessKanban(profile)

/* =============================
   ADMIN-ONLY CONTROLS
============================= */

export const canDeleteRecords = (profile) =>
  isAdmin(profile)

export const canApproveUsers = (profile) =>
  isAdmin(profile)

export const canAccessAdminPanel = (profile) =>
  isAdmin(profile)

/* =============================
   KANBAN TASK-LEVEL RULES
============================= */

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

/* =============================
   PERMISSION MAP (For UI Use)
============================= */

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

/* =============================
   GENERIC PERMISSION CHECKER
============================= */

export const checkPermission = async (profile, permissionFn) => {
  if (typeof permissionFn === 'function') {
    const result = permissionFn(profile)
    return result instanceof Promise ? await result : result
  }
  return false
}
