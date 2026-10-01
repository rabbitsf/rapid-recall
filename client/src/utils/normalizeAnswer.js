// Lenient compare for typed answers (case, punctuation, extra whitespace ignored)
export const normalizeAnswer = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()
