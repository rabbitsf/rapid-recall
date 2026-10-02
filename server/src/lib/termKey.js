// CANONICAL: identity of a card across set edits (PUT /api/sets/:id recreates cards, so ids change).
// Mirrored on the client in client/src/utils/termKey.js — keep the two identical.
export function termKey(term) {
  return String(term ?? '').trim().toLowerCase()
}
