# AI-Powered Features (Flashcards + Applications Mode) — Implementation Plan
# Progress: 14/14 tasks complete. DONE.
# Last updated: 2026-04-23
# Project: quizlet (Rapid Recall)

## Tasks
- [x] Task 1:  schema.prisma — add hint, imageUrl, exampleSentence nullable fields to Card model
- [x] Task 2:  prisma migration — create migration file for new Card columns
- [x] Task 3:  server — install @google/generative-ai npm package
- [x] Task 4:  server/src/routes/ai.js — create AI route (Gemini hint, Gemini sentence, Pexels image)
- [x] Task 5:  server/src/index.js — mount /api/ai router + update CSP for external image domains
- [x] Task 6:  server/src/routes/sets.js — preserve hint/imageUrl/exampleSentence when cards are recreated on PUT
- [x] Task 7:  client/src/components/games/FlashcardsMode.jsx — add audio button (Web Speech API)
- [x] Task 8:  client/src/components/games/FlashcardsMode.jsx — add "Get a hint" button (calls /api/ai/hint/:cardId, shows result)
- [x] Task 9:  client/src/components/games/FlashcardsMode.jsx — add image display (calls /api/ai/image/:cardId, shown on card front)
- [x] Task 10: client/src/components/games/ApplicationsMode.jsx — new file: fill-in-the-blank game (Gemini sentences, full term bank)
- [x] Task 11: client/src/components/StudyMenu.jsx — import ApplicationsMode, add to GAMES list, wire render branch
- [x] Task 12: docs/PROJECT_GUIDE.md — update Section 4 canonical table with new implementations
- [x] Task 13: Integration smoke test (dev server): hint, image, sentence generation, Applications game flow
- [x] Task 14: docs/CHANGELOG_AI.md — append final changelog entry

---

## Task 1: schema.prisma — add AI fields to Card model

File: `prisma/schema.prisma`

Add three nullable fields to the `Card` model (after `position`):

```
hint            String?   @map("hint")
imageUrl        String?   @map("image_url")
exampleSentence String?   @map("example_sentence")
```

All three are nullable so existing cards are unaffected and no migration default is needed.

---

## Task 2: Prisma migration — new Card columns

Run from repo root:
```
npm run prisma:migrate
```
This creates `prisma/migrations/<timestamp>_add_ai_fields_to_cards/migration.sql` with:
```sql
ALTER TABLE "cards" ADD COLUMN "hint" TEXT;
ALTER TABLE "cards" ADD COLUMN "image_url" TEXT;
ALTER TABLE "cards" ADD COLUMN "example_sentence" TEXT;
```
Then regenerate client: `npm run prisma:generate`

---

## Task 3: Install @google/generative-ai

From `server/`:
```
npm install @google/generative-ai
```
Add `GEMINI_API_KEY` and `PEXELS_API_KEY` to `.env` (server). Document in README or .env.example.

---

## Task 4: server/src/routes/ai.js — AI route file

Three endpoints, all require `requireAuth`. Import `prisma` from `../db.js` only.

### GET /api/ai/hint/:cardId
- Look up card by id; verify card's set is accessible to req.user (owner, or set is public, or user is in a class that has the set).
- If `card.hint` is already set → return it immediately (cache hit).
- Otherwise: call Gemini with prompt: `"Give a brief contextual clue (1–2 sentences) for the term: '<term>'. Do not use the term itself in the clue."`
- Save result to `card.hint` via `prisma.card.update`.
- Return `{ hint }`.

### GET /api/ai/image/:cardId
- Same access check.
- If `card.imageUrl` is already set → return it (cache hit).
- Call Pexels API `GET https://api.pexels.com/v1/search?query=<term>&per_page=1` with `Authorization: <PEXELS_API_KEY>` header.
- Extract `photos[0].src.medium` URL (or `null` if no results).
- Save to `card.imageUrl`.
- Return `{ imageUrl }`.

### POST /api/ai/sentences/:setId
- Verify set ownership or access.
- Fetch all cards for the set.
- For each card where `exampleSentence` is null: call Gemini with prompt: `"Write one fill-in-the-blank sentence using the term '<term>' from the category '<set title>'. Replace the term with _____. Return only the sentence."`
- Batch-update each card via `prisma.card.update`.
- Return `{ cards: [{ id, exampleSentence }] }` for all cards in the set.

Rate-limit note: calls are per-card, fire sequentially (not parallel) to avoid Gemini quota errors.

Access control pattern: same helper used by all three endpoints — verify `card.set.ownerId === req.user.id || card.set.isPublic || [class membership check]`.

---

## Task 5: server/src/index.js — mount router + update CSP

Mount:
```js
import aiRouter from './routes/ai.js'
app.use('/api/ai', requireAuth, aiRouter)
```

CSP update — add to `img-src` directive:
```
images.pexels.com
```
(Helmet `contentSecurityPolicy` `directives.imgSrc` array already has `'self'`; append `'images.pexels.com'`.)

---

## Task 6: server/src/routes/sets.js — preserve AI fields on PUT

Current PUT logic: deletes all cards then re-creates from request body (losing AI fields).

Fix: when mapping cards on PUT, look up existing card by `(setId, position)` or by matching term, and carry forward `hint`, `imageUrl`, `exampleSentence` from the existing record if the client did not supply them.

Simpler approach: before the delete+recreate, fetch existing cards and build a lookup map by term. On recreate, spread AI fields from the map if found.

```js
const existing = await prisma.card.findMany({ where: { setId: set.id } })
const aiByTerm = Object.fromEntries(existing.map(c => [c.term, {
  hint: c.hint, imageUrl: c.imageUrl, exampleSentence: c.exampleSentence
}]))
// then in create mapping:
cards.map((c, i) => ({
  term: c.term.trim(),
  definition: c.definition.trim(),
  position: i,
  ...(aiByTerm[c.term.trim()] ?? {}),
}))
```

---

## Task 7: FlashcardsMode.jsx — audio button (Web Speech API)

No API call needed. Browser built-in.

```js
function speakTerm(term) {
  const utt = new SpeechSynthesisUtterance(term)
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utt)
}
```

Add a speaker icon button on the card front (near the term). Guard with `if ('speechSynthesis' in window)` before rendering the button.

---

## Task 8: FlashcardsMode.jsx — "Get a hint" button

On card front:
- Button: "Get a hint" (only show when card is in front/term-side view).
- On click: fetch `/api/ai/hint/${card.id}`, show returned hint text below term.
- State: `hintText` (string | null), `hintLoading` (bool) — reset when card changes.
- If hint already came back once, show it without re-fetching (the DB caches it server-side, but the client can also cache it in component state per card index).

---

## Task 9: FlashcardsMode.jsx — image display

On card front, above or alongside the term:
- On component mount (or when card index changes): fetch `/api/ai/image/${card.id}`.
- State: `imageUrl` (string | null), `imageLoading` (bool).
- If `imageUrl` is non-null: show `<img src={imageUrl} alt={card.term} className="..." />` in the card front area.
- If null/error: show nothing (graceful degradation).
- Keep image small enough to leave room for the term text (e.g. max-h-40 rounded).

---

## Task 10: client/src/components/games/ApplicationsMode.jsx — new file

Game flow:
1. On mount: POST `/api/ai/sentences/${set.id}` to batch-generate sentences. Show loading spinner.
2. Once sentences arrive, build game state: shuffle card order. Build full term bank from all cards in set (always all terms, already shuffled).
3. Show one sentence at a time with `_____` for the missing term.
4. Below sentence: show all terms as clickable buttons (full term bank each round — same as a word bank).
5. On correct pick: green feedback, advance to next card.
6. On wrong pick: red flash, try again (no penalty — educational).
7. After all cards answered correctly: show score screen. Call `saveGameResult({ setId, game: 'applications', score, timeSpent })`.

Imports required:
- `shuffleArray` from `../../utils/shuffleArray.js`
- `launchConfetti` from `../../utils/confetti.js`
- `useGameResults` (passed as prop `onSaveResult` from StudyMenu, same pattern as other games)

Prop interface (match existing game components):
```jsx
function ApplicationsMode({ set, onBack, onCreateMissedSet }) { ... }
```

`saveGameResult` is called via the same prop pattern — check how other games receive it from StudyMenu.

---

## Task 11: StudyMenu.jsx — add Applications mode

1. Import `ApplicationsMode` from `./games/ApplicationsMode.jsx`.
2. Add to `GAMES` array:
   ```js
   { id: 'applications', title: 'Applications', icon: Lightbulb, color: 'violet',
     desc: 'Fill in the blank with the right term.' }
   ```
   Import `Lightbulb` from `lucide-react` (or another appropriate icon).
3. Add render branch:
   ```js
   if (game === 'applications') return <ApplicationsMode set={set} onBack={handleBack} onCreateMissedSet={handleCreateMissedSet} />
   ```

---

## Task 12: docs/PROJECT_GUIDE.md — Section 4 update

Add rows:
| AI hint generation + caching | `server/src/routes/ai.js` | GET /api/ai/hint/:cardId; Gemini; cached to Card.hint |
| AI image lookup + caching | `server/src/routes/ai.js` | GET /api/ai/image/:cardId; Pexels API; cached to Card.imageUrl |
| AI sentence generation + caching | `server/src/routes/ai.js` | POST /api/ai/sentences/:setId; Gemini batch; cached to Card.exampleSentence |
| Flashcard audio | `client/src/components/games/FlashcardsMode.jsx:speakTerm` | Web Speech API; browser built-in |
| Applications game mode | `client/src/components/games/ApplicationsMode.jsx` | Fill-in-the-blank; AI sentences; full term bank |

Also add to Section 6 (Duplication Hotspots):
- AI API calls: all Gemini and Pexels calls go through `server/src/routes/ai.js` only. Client never calls Gemini or Pexels directly. API keys stay server-side.

---

## Task 13: Integration smoke test

Verify in dev (Express :3001 + Vite :5173):
- [ ] Flashcards mode: audio button speaks term
- [ ] Flashcards mode: "Get a hint" returns and displays a Gemini hint
- [ ] Flashcards mode: image loads from Pexels on card front
- [ ] Second visit to same card: hint/image served from DB (no new API call — check server logs)
- [ ] Edit set (PUT): re-open flashcards, confirm hint/image still present on cards with unchanged terms
- [ ] Applications mode: loading spinner appears, sentences generate, term bank shown, correct pick advances, completion triggers confetti + score save

---

## Task 14: docs/CHANGELOG_AI.md — changelog entry

Append entry documenting all three features, files affected, and new canonical locations.
