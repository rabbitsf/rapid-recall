// CANONICAL: role groupings (client mirror: client/src/utils/roles.js — keep in sync)
// super_admin = every admin power + view/edit/delete any set; only a super_admin may grant or change super_admin.
export const ROLES = ['student', 'teacher', 'admin', 'super_admin']
export const isSuperAdmin = role => role === 'super_admin'
export const isAdmin = role => role === 'admin' || role === 'super_admin'
export const isStaff = role => role === 'teacher' || isAdmin(role)
export const STAFF_ROLES = ['teacher', 'admin', 'super_admin']
export const ADMIN_ROLES = ['admin', 'super_admin']
