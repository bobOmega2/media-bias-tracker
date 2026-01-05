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

## Dark Mode Implementation
### Theme Strategy
- **Class-based dark mode** using Tailwind v4's `@custom-variant`
- Theme state managed via React Context (`app/theme.tsx`)
- User preference saved to `localStorage` for persistence
- Dark mode set as default

### Tailwind v4 Configuration
- Uses `@custom-variant dark (&:where(.dark, .dark *))` in globals.css
- No `tailwind.config.ts` needed for dark mode (different from v3)

### Transitions
- All color changes use `transition-colors duration-300`
- Provides smooth visual feedback when toggling themes

## External API Integration
### GNews API
- **Free tier**: 100 requests/day, 10 articles per request
- Fetches from 7 categories: world, business, technology, entertainment, sports, science, health
- **Rate limiting solution**: 1-second delay between category requests
- Duplicate removal using `Map` by article ID

### Categories Storage
- `news_categories` table in Supabase stores category names and IDs
- Enables future data analysis (bias by category, user reading patterns)
- API fetches category list from Supabase, not hardcoded

## Frontend Architecture
### Articles Page
- Netflix-style horizontal carousels grouped by category
- Server Component fetches directly from GNews (not via API route)
- Reasoning: Server Components can't fetch from `localhost`

### UI Style
- Editorial/newspaper style over dark gradients
- Reasoning: Avoids "AI-generated" look that recruiters notice
- Light stone colors, serif fonts, clean dividers

AI Bias Scoring Considerations

Score Storage: AI scores stored in ai_scores table with article_id, model_name, and category_scores.

Optional Scores: Some articles may not have scores yet due to API limits or errors.

Error Handling: Gemini API errors (404 / 429) are logged; partial analyses are acceptable.

Batch Processing: Scripts like initArticles.ts batch articles to avoid hitting API rate limits.

Future Performance: Consider threading or Promise.allSettled for concurrent analysis; track batch completion time as a performance metric.

Data Archiving Strategy

Archived Articles: Articles can be moved from media → archived_media table.

Reasoning: Keeps active dataset lean; maintains history for auditing or retraining AI.

Script: A simple migration script should:

Select old articles (e.g., >90 days)

Insert into archived_media

Delete from media

Frontend Improvements

Bias Score Display: Articles on frontend show AI scores if they exist (political, economic, sensationalism) and a summary line.

Optional Sorting: Could sort articles by score magnitude, category, or recency for experimentation.

Accessibility: Add alt text, semantic HTML, and focus states for screen readers.

Testing & Logging

API Testing: Use Postman / Insomnia to test routes individually.

Logging: Log Gemini API success/failure with timestamps and article ID.

Debugging: Keep verbose logging in dev; limit in production.

Security Considerations

Secrets Management: GEMINI_API_KEY never exposed; SUPABASE_SECRET_KEY only in server scripts.

RLS Enforcement: API routes respect RLS; even server scripts should consider WHERE clauses to avoid accidental exposure.

Future Enhancements

Multiple AI APIs: Add other bias models (e.g., OpenAI, Anthropic) and store results for model comparison.

Web Scraping for Fresh Data: Optionally fetch full articles from web if GNews is insufficient.

Threading / Parallelization: For large batches, improve processing speed; record time as a project metric.

Analytics Dashboard: Track number of articles, analyzed vs pending, and average bias scores per category.

User Preferences: Let users filter articles by bias score thresholds or category.