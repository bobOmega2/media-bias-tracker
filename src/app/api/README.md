# API Folder

This folder contains Next.js App Router API routes for backend operations.

## Subfolders
- `addArticle/` — POST: add a new article
- `getAllArticles/` — GET: fetch all articles
- `getArticle/` — GET: fetch a single article by id
- `updateArticle/` — PUT: update article data (e.g., ratings)
- `deleteArticle/` — DELETE: remove an article

## Notes
- Each `route.ts` file exports only the HTTP methods needed for that action
- Frontend pages/components call these routes to read or modify data
- Backend logic (Supabase, AI scoring) should be in `lib/` functions
- Unsupported methods automatically return 405 Method Not Allowed
