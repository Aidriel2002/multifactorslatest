export const ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
}

export const STATUS = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected'
}

/**
 * Check if user has required role
 */
export const hasRole = (profile, allowedRoles) => {
  if (!profile || profile.status !== STATUS.APPROVED) return false
  return allowedRoles.includes(profile.role)
}

/**
 * Check if user is admin
 */
export const isAdmin = (profile) => {
  return hasRole(profile, [ROLES.ADMIN])
}

/**
 * Check if user is approved (any role)
 */
export const isApproved = (profile) => {
  return profile?.status === STATUS.APPROVED
}

/**
 * Page-specific permission checks
 */
export const canAccessBilling = (profile) => {
  return hasRole(profile, [ROLES.ADMIN, ROLES.EMPLOYEE])
}

export const canAccessContacts = (profile) => {
  return hasRole(profile, [ROLES.ADMIN, ROLES.EMPLOYEE])
}

export const canAccessQuotations = (profile) => {
  return hasRole(profile, [ROLES.ADMIN, ROLES.EMPLOYEE])
}

export const canAccessReports = (profile) => {
  return hasRole(profile, [ROLES.ADMIN, ROLES.EMPLOYEE])
}

export const canAccessProducts = (profile) => {
  return hasRole(profile, [ROLES.ADMIN, ROLES.EMPLOYEE])
}

export const canManageProducts = (profile) => {
  return isAdmin(profile) // Only admins can manage
}

export const canDeleteRecords = (profile) => {
  return isAdmin(profile) // Only admins can delete
}

export const canApproveUsers = (profile) => {
  return isAdmin(profile) // Only admins can approve users
}

export const canAccessAdminPanel = (profile) => {
  return isAdmin(profile)
}

/**
 * Feature-based permissions
 */
export const permissions = {
  // Billing permissions
  viewBilling: (profile) => canAccessBilling(profile),
  createBilling: (profile) => canAccessBilling(profile),
  updateBilling: (profile) => canAccessBilling(profile),
  deleteBilling: (profile) => isAdmin(profile),
  
  // Contact permissions
  viewContacts: (profile) => canAccessContacts(profile),
  createContact: (profile) => canAccessContacts(profile),
  updateContact: (profile) => canAccessContacts(profile),
  deleteContact: (profile) => isAdmin(profile),
  
  // Product permissions
  viewProducts: (profile) => canAccessProducts(profile),
  createProduct: (profile) => canManageProducts(profile),
  updateProduct: (profile) => canManageProducts(profile),
  deleteProduct: (profile) => isAdmin(profile),
  
  // Quotation permissions
  viewQuotations: (profile) => canAccessQuotations(profile),
  createQuotation: (profile) => canAccessQuotations(profile),
  updateQuotation: (profile) => canAccessQuotations(profile),
  deleteQuotation: (profile) => isAdmin(profile),
  
  // Report permissions
  viewReports: (profile) => canAccessReports(profile),
  exportReports: (profile) => canAccessReports(profile),
  
  // User management permissions
  viewUsers: (profile) => isAdmin(profile),
  approveUsers: (profile) => canApproveUsers(profile),
  deleteUsers: (profile) => isAdmin(profile)
}