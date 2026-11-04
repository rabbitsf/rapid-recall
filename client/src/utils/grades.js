// CANONICAL grade groups (server validates the same list in server/src/routes/users.js)
export const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8']
export const GRADE_LABEL = { K: 'K', '1': '1st', '2': '2nd', '3': '3rd', '4': '4th', '5': '5th', '6': '6th', '7': '7th', '8': '8th' }
export const gradeName = g => g === 'K' ? 'Kindergarten' : g ? `Grade ${g}` : ''
