// CANONICAL (client): identity of a card across set edits — mirrors server/src/lib/termKey.js; keep the two identical.
export function termKey(term) {
  return String(term ?? '').trim().toLowerCase()
}
