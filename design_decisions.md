# Design Decisions

## Folder Structure
- `app/` contains pages, layouts, and API routes, following Next.js App Router conventions
- `lib/` contains backend logic (Supabase interactions, Python scoring functions) to keep API routes thin
- `components/` contains reusable frontend components
- `utils/` contains helper functions for data manipulation or formatting
- `types/` contains TypeScript type definitions

## API Design
- Each API route is in a separate folder under `app/api/` (e.g., `addArticle`, `updateArticle`) for clarity and maintainability
- Only export the HTTP methods needed per route (POST, GET, PUT, DELETE)
- API routes call `lib/` functions for database and AI scoring
- Unsupported methods will automatically return 405 Method Not Allowed

## Tech Stack Choices
- Next.js for frontend and routing
- Supabase for database and authentication
- Python for AI bias scoring
- TailwindCSS for styling and layout

## Supabase Integration

### Client Architecture
- **Two separate Supabase clients**: `server.ts` for Server Components, `client.ts` for Client Components
- Reasoning: Server and browser handle cookies differently; `@supabase/ssr` abstracts this complexity
- Both clients use the **Publishable Key** since they may run in the browser

### API Keys Strategy
- **Publishable Key** (`sb_publishable_...`) used in the app for all user-facing features
- **Secret Key** (`sb_secret_...`) reserved for:
  - Admin scripts
  - Backend-only operations
  - Data migrations
- Reasoning: Publishable Key + RLS provides security; Secret Key bypasses RLS and should never be exposed

### Row Level Security (RLS) Policies
- All tables have RLS **enabled** (secure by default)
- **SELECT policies only** - anyone can read data
- **No INSERT/UPDATE/DELETE policies** - writing is blocked via API
- Reasoning:
  - This is a portfolio project; users should view, not modify data
  - Data entry happens through Dashboard or admin scripts
  - Simpler security model with less attack surface

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` → Project URL (safe to expose)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Publishable Key (safe to expose)
- Future: `SUPABASE_SECRET_KEY` → Secret Key (server-only, never expose)

## Table Changes

### Renamed `articles` to `media`
- Reasoning: Supports multiple media types (articles now, films later)
- `media_type` column distinguishes between types
- Single table avoids complex joins and scales better

## AI Integration

### Model Selection
- **Gemini 2.5 Pro** over Flash or Flash-Lite
- Reasoning: Best accuracy for nuanced bias detection; 100 requests/day sufficient for portfolio project
- Trade-off: Fewer daily requests than Flash (250/day) but higher quality analysis

### SDK Choice
- Using `@google/genai` (new unified SDK)
- Reasoning: `@google/generative-ai` deprecated November 2025; new SDK is actively maintained with latest features

### API Key Strategy
- Key stored in `GEMINI_API_KEY` environment variable
- SDK reads key automatically from environment
- Key never exposed to frontend (server-side only)

### Development Approach
- **Backend-first**: Build API routes before frontend
- Reasoning: Core AI feature must work first; frontend depends on API response structure; easier to debug in isolation