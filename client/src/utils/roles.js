// CANONICAL client mirror of server/src/lib/roles.js — keep in sync
export const ROLES = ['student', 'teacher', 'admin', 'super_admin']
export const ROLE_LABEL = { student: 'student', teacher: 'teacher', admin: 'admin', super_admin: 'super admin' }
export const isSuperAdmin = role => role === 'super_admin'
export const isAdmin = role => role === 'admin' || role === 'super_admin'
export const isStaff = role => role === 'teacher' || isAdmin(role)
