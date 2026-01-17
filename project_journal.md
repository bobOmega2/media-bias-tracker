# Project Journal

# NOTE: I am often using AI to learn about concepts and reason, so I simply ask it to generate an entry after I finish each work session, so later I can simply copy and paste this file and tell it to summarize my decisions / thought process along the way 
# This makes tracking my progress a lot quicker and simpler


## 2025-12-17

* Organized the `app/` folder with pages for articles, collection, and dashboard
* Added README files for `app/` and `app/api/` so it’s easier to understand what’s inside
* Created API route folders: `addArticle`, `getArticles`, `getArticle`, `updateArticle`, and `deleteArticle`
* Looked at how Next.js App Router works for API routes and dynamic pages
* Decided to make one API folder per action instead of putting many methods in one folder
* Started planning the project journal and design decisions files to track what I do and why

---

## 2025-12-25

### Database & Backend Architecture Decisions

Today I focused mainly on **understanding and designing the backend + database layer**, especially how Supabase, PostgreSQL, and API routes fit together. A big goal today was to make sure the project is **designed in a way that reflects real-world industry practices**, since this is meant to be a portfolio project.

#### Supabase & PostgreSQL

* Decided to use **Supabase as a hosted PostgreSQL database** instead of running a database locally.
* Reasoning:

  * In real-world apps, databases are almost always hosted (cloud-based) so they are available 24/7 and accessible from anywhere.
  * Supabase gives a real PostgreSQL instance, not a toy database, which makes this experience closer to what companies use.
  * Using Supabase also adds authentication, security, and API layers without needing to build everything from scratch.

#### Backend vs Database API

* Clarified the difference between:

  * **My backend code (Next.js API routes)** → controls business logic, validation, and security
  * **Supabase’s API (Data API / connection string)** → the actual way the database is accessed
* Decided that:

  * The frontend should **never talk directly to the database**
  * Frontend → API routes → Supabase → PostgreSQL
* This improves security and keeps secrets (API keys, logic) off the client.

#### Tables vs Schemas (Big Concept)

* Learned that:

  * A **schema** is like a folder or namespace inside a database
  * A **table** is where the actual data lives
* Supabase provides many built-in schemas (`auth`, `storage`, `realtime`, etc.), but for my app:

  * I will store application data in the **`public` schema**
  * Built-in schemas are managed by Supabase and should generally not be modified

#### Core Table Design Decisions

##### Articles Table

* Decided to use **one `articles` table** instead of separate tables for current vs archived articles.
* Reasoning:

  * Moving rows between tables adds unnecessary complexity
  * A single table with status flags scales better
* Key decisions:

  * Use a boolean field (`on_homepage`) instead of a text `status`
  * Keep both:

    * `created_at` → when the row is created in the database
    * `published_at` (planned) → when the article was actually published

##### Primary Keys (PK)

* Understood that:

  * A **primary key** uniquely identifies each row
  * Every table should have exactly one primary key
* Chose:

  * A single `id` column (UUID) as the primary key for all main tables
* Avoided composite primary keys for now to keep queries and relationships simpler.

##### Foreign Keys (FK)

* Learned that:

  * Foreign keys connect tables and enforce valid relationships
  * They prevent invalid data (e.g., scores pointing to non-existent articles)
* Planned relationships:

  * `ai_scores.article_id` → references `articles.id`
  * This allows one article to have many AI scores

#### Flexible Bias Scoring Design

* Faced a key design question:

  * Should bias scores be fixed (same categories for every article) or flexible?
* Decided on a **flexible but structured approach** using a lookup table:

##### Bias Categories (Lookup Table)

* Introduced a new table: `bias_categories`
* Purpose:

  * Store allowed bias dimensions (political, economic, social, cultural, etc.)
  * Avoid hard-coded strings or enums
* Benefits:

  * Articles can have only the bias categories that apply
  * New categories can be added without changing the database schema or breaking old data

##### AI Scores Table

* Design allows:

  * One article to have many bias scores
  * Each score belongs to exactly one category
* Enforced data integrity by planning a **unique constraint** on:

  * `(article_id, category_id)`
* This ensures one AI score per article per category, preventing duplicates.

#### Column Rules & Data Integrity

* Established clear rules for columns:

  * IDs: not nullable, primary keys
  * Foreign keys: not nullable, not unique
  * Optional text (e.g., explanations): nullable
  * Arrays: avoided entirely to keep queries simple and relational

#### Row Level Security (RLS)

* Learned that RLS:

  * Is enforced at the database level
  * Controls who can read or write rows
* Important realization:

  * RLS applies **even if I use API routes**
  * Supabase will return empty results unless policies allow access
* Decided to:

  * Keep RLS enabled
  * Use policies intentionally instead of turning it off

#### Overall Thought Process

* Prioritized:

  * Real-world patterns over shortcuts
  * Data integrity over convenience
  * Flexibility without sacrificing structure
* This session helped me understand not just *what* to build, but *why* systems are designed this way in industry.

---

### TODO / Next Steps

* Finish creating `articles` table with finalized columns
* Create `bias_categories` table
* Create `ai_scores` table with foreign keys and constraints
* Define basic RLS policies for read access
* Connect Supabase to Next.js using a client in `lib/supabaseClient.ts`
- Plan the database tables: `articles`, `ai_scores`, `user_ratings`, and maybe `users`
- Start building backend API routes using these tables so the frontend can get and send data


---

## 2025-12-27

### Supabase + Next.js Integration

Today I focused on **connecting Supabase to my Next.js app** and understanding how authentication, API keys, and Row Level Security work together.

#### Project Structure Cleanup

* Discovered I had **two Next.js projects nested** (one inside `src/`, one outside)
* Cleaned up by:
  * Moving `.env.local` into `src/` where `package.json` lives
  * Deleting duplicate `node_modules/` and `.next/` from outer folder
  * Now working entirely from the `src/` folder

#### Supabase Client Setup

* Created two Supabase client files:
  * `utils/supabase/server.ts` → For Server Components (runs on server)
  * `utils/supabase/client.ts` → For Client Components (runs in browser)
* Learned why two clients are needed:
  * Server and browser handle cookies differently
  * `@supabase/ssr` package handles this complexity

#### Next.js 15 Async Cookies Issue

* Encountered errors because Next.js 15 changed how `cookies()` works
* Old way: `cookies()` returned cookies directly
* New way: `cookies()` returns a Promise, must use `await`
* Fixed `server.ts` to use `async function createClient()` with `await cookies()`

#### API Keys (New Supabase System)

* Learned Supabase introduced new API keys in 2025:
  * **Publishable Key** (`sb_publishable_...`) → Safe to expose in browser
  * **Secret Key** (`sb_secret_...`) → Never expose, for backend only
* Understood the difference between:
  * **API Keys** = How you connect (like a password)
  * **Postgres Roles** = Who you are inside the database (`anon`, `authenticated`)

#### Row Level Security (RLS) Policies

* RLS was enabled but had no policies → returned empty data
* Learned that:
  * RLS enabled + No policy = No access (secure by default)
  * Must explicitly allow access with policies
* Created SELECT policies for all three tables:
  * `media` → Anyone can read
  * `bias_categories` → Anyone can read
  * `ai_scores` → Anyone can read
* No INSERT/UPDATE/DELETE policies needed because:
  * No policy = Blocked automatically
  * I'll add data through Dashboard or scripts with Secret Key

#### Environment Variables

* Fixed mismatch between `.env.local` variable names and code
* `.env.local` had: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
* Code expected: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* Aligned them to use consistent naming

#### Key Learnings

* `NEXT_PUBLIC_` prefix = Variable is sent to browser (visible to users)
* Variables without prefix = Stay on server (hidden)
* Publishable Key is safe to expose because RLS protects the data
* Secret Key bypasses RLS, so never expose it

---

## December 28, 2025

### What I Built
- Created /api/ai_analyze/route.ts
- POST function that receives article URL, title, source
- fetchArticleContent() function to get webpage text
- Error handling for missing fields and failed fetches

### Design Decisions
1. Backend-first development
   - Build API before frontend
   - Easier to test and debug in isolation
   - Frontend depends on knowing what API returns

2. Gemini 2.5 Pro over Flash
   - Pro: Better accuracy for bias analysis (100/day free)
   - Flash: Faster but less accurate (250/day free)
   - Can switch later with one line change

3. @google/genai over @google/generative-ai
   - Old package deprecated (ends Nov 2025)
   - New package is official, maintained

4. Helper functions outside POST
   - Reusable and cleaner code
   - fetchArticleContent() can be used elsewhere

### Concepts Learned
- API routes: endpoints that handle backend logic
- POST/GET/PUT/DELETE: types of requests
- NextRequest: incoming envelope (user's data)
- NextResponse: outgoing envelope (your reply)
- fetch().text() needs await (body streams in chunks)
- Error handling: always check for null after async calls


### December 30, 2025
What I Built

    Completed full AI analysis pipeline in /api/ai_analyze/route.ts
    analyzeWithGemini() function that sends article content to Gemini and returns bias scores
    Database integration: saves articles to media table and scores to ai_scores table
    Tested complete flow successfully via browser console

Problems Encountered & Solved

    429 Rate Limit Error
        Gemini 2.5 Pro had 0 quota for my account
        Solution: Switched to gemini-2.5-flash
    JSON Parse Error (Markdown Wrapping)
        Gemini returned ```json {...} ``` instead of raw JSON
        Solution: Strip markdown before parsing + ask for "no markdown" in prompt
        Lesson: Don't trust external APIs 100% - add defensive code
    RLS Blocking INSERT
        Had SELECT policies but no INSERT policies
        Solution: Added INSERT/UPDATE policies for all tables
    Missing model_name Column
        ai_scores table required model_name but we weren't providing it
        Solution: Added model_name: 'gemini-2.5-flash' to insert
        Lesson: Add console.error logs to see actual database errors
    [object Object] in Console
        Used + instead of , in console.log
        Solution: console.log("text:", data) not console.log("text" + data)

Design Decisions

    Open INSERT Policies (For Now): Get it working first, restrict when auth is added
    Prompt AND Code for JSON: Tell Gemini "no markdown" but also strip it in code as backup
    Track Model Name: Useful for comparing models or upgrading later

Concepts Learned

    await only works inside async functions (can't pause file loading)
    { data: categories } renames variables in destructuring
    .map(c => c.name) extracts one field from array of objects
    .find(c => c.name === score.category) matches by value to get full object

TODO Next Session

Maybe add a field in ai_scores table called 'title' which contains the article's title so its easy to spot when debugging
Add API route for api/media which will update the media table
Pull articles from external API
Add user authentication (Phase 2)

## December 31, 2025

### What I Built

**Frontend - UI Redesign**
- Redesigned homepage from dark AI-looking theme to clean editorial style
- Implemented dark/light mode toggle with smooth transitions
- Created theme context in `app/theme.tsx`
- Updated Navbar with theme toggle (sun/moon icons)
- Configured Tailwind v4 dark mode with `@custom-variant dark`

**External API Integration - GNews**
- Built `/api/articles/route.ts` to fetch from GNews API
- Fetches from 7 categories: world, business, technology, entertainment, sports, science, health
- Added 1-second delay between requests to avoid rate limiting
- Implemented duplicate removal using Map (by article ID)
- Created `news_categories` table in Supabase
- Returns ~70 unique articles with category_id

**Articles Discovery Page**
- Built `/articles/page.tsx` with Netflix-style horizontal carousels
- Groups articles by category
- Each card shows: image, source, title, Read/Analyze links
- Analyze link pre-fills the analyze form

### Problems Solved

| Problem | Solution |
|---------|----------|
| Dark mode not working | Added `@custom-variant dark` to globals.css (Tailwind v4) |
| GNews returning 0 articles | Added 1-second delay between category fetches |
| `localhost` fetch error | Called GNews directly in page instead of via API route |
| Duplicate articles (same ID) | Used Map to deduplicate by article ID |

### Design Decisions

- **Editorial Style**: Cleaner, less "AI-generated" looking for recruiters
- **Dark Mode Default**: Persists in localStorage
- **Categories in Supabase**: Enables future data analysis
- **Carousel Layout**: Better UX for 70 articles than a long list
- **1-Second Delay**: Prevents GNews rate limiting

### Concepts Learned

- Tailwind v4 uses `@custom-variant` for dark mode
- React Context for sharing theme state
- Map for deduplication: `Map.set(id, item)` overwrites duplicates
- Server Components can't fetch from `localhost`

### Files Created/Modified

- `app/theme.tsx` - dark/light mode context
- `app/layout.tsx` - added ThemeProvider
- `components/Navbar.tsx` - theme toggle
- `styles/globals.css` - dark mode variant
- `app/page.tsx` - editorial redesign + dark mode
- `app/analyze/page.tsx` - matching theme
- `app/api/articles/route.ts` - GNews fetching
- `app/articles/page.tsx` - carousel display
- Supabase: `news_categories` table

---

### TODO Next Session

**High Priority**
- [ ] Speed up articles page (slow due to 7-second GNews fetch)
- [ ] Filter duplicate articles by URL (same article from different sources)
- [ ] Pre-analyze articles daily (script to run AI on all 70)
- [ ] Save GNews articles to Supabase `media` table
- [ ] Add caching to prevent API quota drain

**Phase 2**
- [ ] User authentication
- [ ] User dashboard
- [ ] User stats and data analysis
- [ ] Recommendation algorithm
```
2026-01-03
Background Scripts vs Next.js Request Context (Big Architecture Lesson)

Today I worked on batch-processing articles: fetching ~70 articles from GNews, inserting them into Supabase, and running AI bias analysis on each article using Gemini models.

This session led to an important real-world architecture realization about how scripts differ from Next.js request-based code.

What I Built

Created a standalone script: scripts/initArticles.ts

Fetches articles from GNews

Inserts them into the media table

Runs AI analysis on each article via analyzeArticlesBatch()

Limited analysis to a small subset (1 article) for safe testing

Confirmed batch logic runs sequentially (not all 70 at once)

Verified AI model fallback logic (tries models in order until one succeeds)

Problem Encountered: Cookies Error

While running the script with npx tsx, I hit this error:

cookies() was called outside a request scope

This was confusing at first because similar Supabase code worked previously inside API routes.

Key Realization (Important Industry Concept)

I learned that:

Next.js API routes and Server Components run inside an HTTP request

Cookies, headers, and sessions exist

Scripts run in plain Node.js

No request

No cookies

No browser context

Because of this:

Supabase clients that rely on cookies() cannot be used in scripts

This is expected behavior, not a bug

Design Decision: Separate Supabase Clients by Context

I understood that real-world apps intentionally separate:

Request-scoped clients

Used in API routes / server components

Use cookies + RLS

Admin / system clients

Used in scripts, cron jobs, and background tasks

Use Supabase service role key

Bypass RLS intentionally

This is a standard industry pattern, not overengineering.

AI Model Cycling Logic (Clarified)

Models are tried in order per article

If one model fails (rate limit, error, bad response), the next model is tried

If a model succeeds:

The loop exits immediately

No other models are called for that article

For the next article, the cycle starts again from the first model

This ensures:

Maximum usage of preferred models

Graceful fallback without wasting quota

Concepts Learned

Scripts ≠ Next.js runtime

Cookies only exist inside request lifecycles

Background jobs always use admin credentials

Sequential processing + delays prevent rate-limit issues

continue inside loops skips to the next model cleanly

Real apps separate user context from system context

Overall Reflection

This session felt like crossing from “framework-level usage” into real system design thinking.

Understanding why scripts need different authentication than request-based code made the architecture feel much more intentional and professional. This is the same pattern used for cron jobs, ETL pipelines, and AI batch processing in production systems.

Next Steps

Create a Supabase admin client specifically for scripts

Use it only in scripts/ and batch jobs

Finish full 70-article batch run once setup is clean

Later: automate this via cron / scheduled jobs


### January 4, 2026
What I Built

Supabase + Next.js Article Pipeline
    - Fixed initArticles.ts script to run properly on new computer
    - Used Supabase Service Role key in admin.ts for scripts and cron jobs
    - Kept request-scoped client separate for API routes
    - Adjusted imports to work with ts-node and removed path alias issues

AI Bias Analysis Integration
    - Added category_id to articles inserted into Supabase
    - Updated ArticlesPage to fetch articles from database instead of GNews API
    - Grouped articles by category_name
    - Display AI bias scores on frontend if they exist

Deployment & Testing
    - Verified script runs via npx ts-node -r tsconfig-paths/register
    - Verified categories are correctly attached to articles
    - Removed duplicates and ensured articles flow through the full pipeline
    - Sample log data:
        Found 6 categories: World, Technology, Sports, Science, Business, Entertainment
        Fetching category: World
        Response status for World: 200
        Found 10 articles for World
        ...
        Total articles before deduplication: 72
        Total articles after deduplication: 68
        Successfully inserted 68 out of 68 articles

Problems Encountered & Solved

ts-node import errors with path aliases
    - '@/*' imports didn’t resolve outside Next.js
    - Solution: Use relative imports in scripts or tsconfig-paths with proper registration
    - Lesson: Scripts outside of Next.js dev server need explicit path resolution

Articles showed as uncategorized
    - media table lacked category_id column
    - Solution: Added category_id when inserting, fetched category names from news_categories
    - Lesson: Always verify database schema matches code expectations

Environment variable issues
    - Scripts weren’t picking up SUPABASE_SECRET_KEY or API keys
    - Solution: Added proper .env.local keys and loaded service/admin client
    - Lesson: Backend scripts need separate credentials from frontend

Sequential fetch performance
    - Fetching each category with delay is slow (~1 second per category)
    - Lesson: Could consider batching / parallel requests in the future

Design Decisions

Separate Admin & Request Clients
    - Admin client with full privileges for scripts
    - Request-scoped client for Next.js pages and API routes
    - Lesson: This prevents accidental exposure of secrets

Category Handling
    - Added category_id to media table insert
    - ArticlesPage maps category_id → category_name
    - Lesson: Linking tables simplifies frontend grouping

AI Score Display
    - Fetch bias scores from ai_scores table if they exist
    - Show on frontend only when available
    - Lesson: Don’t assume every article has scores yet

Concepts Learned

Async/Await
    - Await works only inside async functions
    - Looping with await ensures ordered fetches, prevents rate limit errors

Map & Deduplication
    - Used Map() to remove duplicate articles by id
    - Lesson: Simple and performant for small batches

Database Relationships
    - category_id foreign key to news_categories
    - Lesson: Maintain schema consistency, consider ON DELETE / ON UPDATE actions

Thought Process

- Focused on end-to-end pipeline correctness: GNews API → Supabase → frontend
- Avoided breaking changes while updating schema and script behavior
- Learned how scripts differ from Next.js routes in module resolution and env loading
- Reflected on potential improvements: threading AI requests, multi-API support
- Verified that AI scores can now display dynamically if present
- Ensured deduplication and category mapping are working correctly

Next Steps

Enable Gemini to Search the Web
    - Adjust prompts and API calls so Gemini can optionally ground answers in live web search
    - Include citations / grounding metadata when possible

Daily Archival Script
    - Move all current articles from media → archived_media table
    - Run before fetching new articles daily
    - Preserve historical data while keeping media table clean

Expand AI Analysis Options
    - Research multiple AI APIs (Claude, Perplexity, etc.)
    - Compare accuracy, cost, and speed for bias scoring

Improve AI Batch Performance
    - Investigate threading / parallelism for batch AI analysis
    - Measure impact on processing time vs rate limit handling

---

## January 8, 2026

### What I Built

**Cookie-Based Article History System**
- Implemented personal article tracking without authentication
- Created `utils/analyzedArticles.ts` with cookie management utilities
  - `getAnalyzedArticles()` - reads article IDs from browser cookies
  - `addAnalyzedArticle(id)` - saves new article to cookie history
  - Max 50 articles stored, 90-day expiration
  - Automatic deduplication and oldest-article removal

**User Dashboard Page**
- Built `/dashboard/page.tsx` as Client Component
- Fetches articles based on cookie IDs
- Displays user's analyzed articles in grid layout
- Shows AI bias scores with color-coded badges
- Empty state for new users with "Analyze Your First Article" CTA
- Preserves cookie order (most recent first)

**API Route Updates**
- Modified `/api/ai_analyze/route.ts` to handle user submissions
- Made `mediaId` optional (generates new article if not provided)
- Inserts articles with `user_analyzed = true` flag
- Returns both media record and analysis results
- Frontend saves article ID to cookies after successful analysis

**Articles Page Filtering**
- Updated `/articles/page.tsx` to exclude user-submitted articles
- Added `.eq('user_analyzed', false)` filter to Supabase query
- Only displays curated GNews articles publicly

**Database Schema Fix**
- Added `user_analyzed = false` to GNews insertion script (`lib/gnews.ts`)
- Fixed bug where existing articles had NULL instead of FALSE
- Resolved issue where articles weren't displaying (NULL ≠ FALSE in SQL)

**Navigation Enhancement**
- Added Dashboard link to navbar (`components/Navbar.tsx`)
- Navigation now shows: Home → Discover → Analyze → Dashboard → Theme Toggle

**UI Consistency**
- Restyled analyze page to match stone/newspaper aesthetic
- Consistent color scheme across all pages
- Dark mode support with smooth transitions

### Problems Encountered & Solutions

#### 1. Articles Not Displaying on Articles Page

**Problem**: After adding `user_analyzed` field, articles page showed 0 articles even though database had records.

**Root Cause**:
- GNews script didn't set `user_analyzed` field → defaulted to NULL
- Articles page filtered for `user_analyzed = false`
- In PostgreSQL, `NULL ≠ FALSE`, so query excluded all existing articles

**Solution**:
```typescript
// Added to gnews.ts insertion
.insert({
  ...
  user_analyzed: false  // Explicitly set for GNews articles
})
```

**Fixed existing data**: Ran SQL UPDATE to change NULL → FALSE for existing articles

**Key Learning**:
- Always set explicit defaults in insertion code, don't rely on database defaults
- NULL vs FALSE are semantically different in SQL
- `.eq()` in Supabase excludes NULL values

#### 2. TypeScript Type Mismatch for Nested Queries

**Problem**: Dashboard crashed with "Cannot read property 'name' of undefined"

**Root Cause**:
- Expected `bias_categories` to be an object (1:1 relationship)
- Supabase returns ALL nested relationships as arrays
- Even 1:1 joins return `[{object}]` not `{object}`

**Solution**:
```typescript
// Changed interface
interface Article {
  ai_scores: {
    bias_categories: { name: string }[]  // Array, not object
  }[]
}

// Access with optional chaining
const category = score.bias_categories?.[0]
```

**Key Learning**:
- Never assume Supabase nested structure based on relationship cardinality
- Always use arrays + optional chaining for nested data
- Test with real data, not just types

#### 3. Dashboard Empty Despite Analyzed Articles

**Problem**: Dashboard showed empty state even after analyzing articles.

**Debugging Process**:
1. Checked if cookie was being saved → ✓ Working
2. Checked if cookie was being read → ✓ Working
3. Checked Supabase query → Found double-filter issue

**Root Cause**: Query used both `.in('id', cookieIds)` AND `.eq('user_analyzed', true)`, but cookies could contain IDs from before the field existed.

**Solution**: Query already filters by cookie IDs (inherently user's articles), so `user_analyzed` check is redundant but kept for data integrity.

**Key Learning**:
- Debug systematically: cookie → read → query → data
- Consider data migration when adding new fields
- Multiple filters can interact unexpectedly

### Design Decisions

#### Cookie Storage Strategy

**Why cookies over localStorage?**
- Cookies auto-expire (90 days) → natural cleanup
- Can be server-side if needed (future enhancement)
- Standard for tracking without auth

**Why 50 article limit?**
- Cookie size limit: 4KB total
- 50 UUIDs (36 chars each) ≈ 1.8KB → safe margin
- Most users won't analyze 50+ articles
- Keeps UI performant

**Why JSON array over comma-separated?**
- Type safety when parsing
- Native JavaScript methods (filter, map)
- Easier to add metadata later (timestamps, etc.)

#### Separation of Public vs User Content

**Why `user_analyzed` boolean instead of separate tables?**
- Single source of truth
- No data duplication
- Simpler joins (all articles in one table)
- Easy to query: "show me all public articles"

**Trade-offs considered**:
- **Separate tables** → harder to maintain, complex migrations
- **Status enum** → more states than needed (overkill)
- **Boolean flag** → simplest, most flexible ✓

#### Dashboard as Client Component

**Why not Server Component?**
- Needs to read browser cookies (`document.cookie`)
- Dynamic per-user (can't pre-render)
- Requires `useState` for loading states

**Architecture**:
```
Dashboard (Client)
  → reads cookies (browser)
  → calls Supabase (server)
  → renders articles (browser)
```

### Supabase Nested Query Insights

**Key Pattern Learned**:
```typescript
// This single query replaces 3 separate queries
const { data } = await supabase
  .from('media')
  .select(`
    *,
    ai_scores (
      score,
      explanation,
      bias_categories (name)
    )
  `)
```

**How it works**:
1. Supabase uses PostgREST API
2. Foreign keys define relationships
3. Nested `select()` follows FK chains
4. Returns JSON with nested objects/arrays

**Performance benefit**:
- 1 network request instead of 3
- Database handles joins efficiently
- Reduces data transfer (only selected fields)

**Interview talking point**: "This is why I chose Supabase - automatic nested queries via FK relationships reduce N+1 query problems and improve performance without manual SQL joins."

### Thought Process & Architecture Reasoning

**Problem-Solving Approach**:
1. **Define requirements** → Personal history without auth
2. **Research patterns** → Cookies vs localStorage vs database
3. **Design hybrid solution** → Cookies for IDs + database for content
4. **Plan data flow** → Analyze → Cookie → Dashboard
5. **Implement incrementally** → Cookie utils → API → Dashboard → Filters
6. **Debug systematically** → Cookie → Query → Data → UI

**Why this architecture scales**:
- **Add authentication later**: Move cookie IDs to `user_articles` table
- **Add sharing**: Articles exist in DB with stable UUIDs
- **Add analytics**: Track which articles users analyze most
- **Add recommendations**: Use history for personalization

**Trade-offs made**:
- **Cookie limit (50)** vs **Unlimited history** → Chose limit for performance
- **Client-side tracking** vs **Database tracking** → Chose client for privacy + speed
- **Separate tables** vs **Boolean flag** → Chose flag for simplicity

### Technical Concepts Demonstrated

**Frontend**:
- React Client Components vs Server Components
- Cookie management in browser
- `useState`, `useEffect` for data fetching
- Conditional rendering (loading, empty, error states)
- TailwindCSS responsive grid layouts

**Backend**:
- Next.js API routes (POST handlers)
- Supabase nested queries with FK relationships
- Database schema design (boolean flags for categorization)
- SQL NULL vs FALSE behavior

**Full Stack**:
- Cookie-based state management
- Hybrid client/server data flow
- Type safety with TypeScript interfaces
- Error handling and defensive programming

### Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `utils/analyzedArticles.ts` | Created | Cookie management utilities |
| `app/dashboard/page.tsx` | Created | User history dashboard |
| `app/api/ai_analyze/route.ts` | Modified | Handle user submissions, set `user_analyzed` flag |
| `app/analyze/page.tsx` | Modified | Save article ID to cookie after analysis |
| `app/articles/page.tsx` | Modified | Filter to exclude `user_analyzed = true` |
| `lib/gnews.ts` | Modified | Set `user_analyzed = false` for GNews articles |
| `components/Navbar.tsx` | Modified | Added Dashboard navigation link |
| `design_decisions.md` | Updated | Documented cookie architecture decisions |

### Interview Preparation Notes

**Key talking points**:

1. **Cookie Architecture**:
   - "I used a hybrid approach: cookies for tracking IDs, database for content"
   - "This allows personal history without authentication complexity"
   - "Easy migration path when adding user accounts later"

2. **Database Design**:
   - "Used a boolean flag instead of separate tables for simplicity"
   - "Learned that NULL ≠ FALSE in SQL - had to explicitly set defaults"
   - "This is defensive programming - don't rely on implicit behavior"

3. **Supabase Nested Queries**:
   - "Supabase uses foreign keys to enable automatic nested queries"
   - "One request replaces 3 queries - solves N+1 query problems"
   - "Returns arrays for ALL nested data - learned to handle this with TypeScript"

4. **Debugging Process**:
   - "Systematically traced data flow: cookie → read → query → display"
   - "Used console.logs to verify each step before moving to next"
   - "Found NULL vs FALSE bug by checking actual database values"

5. **Scalability Thinking**:
   - "Designed with future authentication in mind"
   - "Cookie IDs can migrate to user table when auth added"
   - "Articles already have stable UUIDs for sharing/linking"

### What I Learned Today

**Technical**:
- Cookie management in JavaScript (creation, parsing, expiration)
- PostgreSQL NULL vs FALSE behavior in equality checks
- Supabase nested query structure (always returns arrays)
- TypeScript optional chaining for nested data (`?.[0]`)

**Architectural**:
- Hybrid client/server state management patterns
- When to use cookies vs database for tracking
- Designing for future features (auth migration path)
- Separation of concerns (public vs user content)

**Debugging**:
- Systematic data flow tracing
- Checking actual database values vs expected values
- TypeScript type mismatches with real data structures
- SQL query behavior with NULL values

**Best Practices**:
- Always set explicit defaults in insertion code
- Use optional chaining for nested data access
- Test with real data, not just happy path
- Document design decisions for future reference

### Next Steps

**High Priority**:
- [ ] Test full user flow: Analyze → Dashboard → View Article
- [ ] Verify cookie expiration behavior (90 days)
- [ ] Test cookie limit (51st article should remove oldest)
- [ ] Add loading skeleton for dashboard

**Phase 2**:
- [ ] Add "Clear History" button to dashboard
- [ ] Add sort options (date, score, category)
- [ ] Add export history as JSON/CSV
- [ ] User authentication (migrate cookies to database)

**Polish**:
- [ ] Add animations to dashboard grid
- [ ] Improve empty state design
- [ ] Add tooltips explaining bias scores
- [ ] Mobile responsiveness testing

### Date
January 11, 2026

### What I Worked On Today
- Implemented and tested the Vercel cron job for daily article fetching and archival.
- Verified that the cron job correctly archives old articles (1+ days old) and fetches new articles from the GNews API.
- Monitored logs from today’s cron run: successfully fetched 50 new articles across 7 categories; analyzed a sample of 4–5 articles for bias using Google Gemini API.
- Observed API rate limits for certain categories (technology, entertainment, sports, health) and confirmed the system handles retries and continues fetching remaining articles.
- Reviewed `initArticles.ts` script structure: clarified difference between exported `runInitArticles()` function (used by cron) and top-level `main()` function for standalone execution.

### What I Learned
- Batch analysis works as expected; Gemini API provides political, economic, and sensationalism scores with explanations.
- Some articles fail to fetch content occasionally (e.g., “Eoin McGee: 'The accident gave me a wake-up call…'”). Need to investigate retry or error-handling strategy.
- Learned that top-level code in scripts runs automatically when importing, which is why the cron job only uses exported functions.

### Next Steps
- Consider implementing better rate-limit handling or scheduling to avoid GNews 429 errors.
- Expand sample analysis from 1 article per category to more for testing.
- Explore adding more AI APIs (OpenRouter, others) to reduce reliance on Gemini credits.
- Update project journal and notes for resume/project.

---

## January 13, 2026

### What I Worked On Today

**Multi-Model AI Integration - Groq + Gemini Parallel Analysis**

- Implemented dual-model AI bias analysis using both Google Gemini and Meta Llama (via Groq)
- Both models analyze the same articles **in parallel** using `Promise.all()` to avoid doubling execution time
- Increased article analysis from 1 per category to 18 articles total per cron run
- Updated cron job to stay within 5-minute Vercel timeout constraint

**Backend Implementation**
- Added Groq SDK (`groq-sdk`) and initialized Groq client in `lib/ai.ts`
- Created `analyzeWithGroq()` function mirroring `analyzeWithGemini()` structure
- Updated `analyzeArticle()` to run both models simultaneously:
  - Uses `Promise.all([analyzeWithGemini(), analyzeWithGroq()])`
  - Saves scores from both models to `ai_scores` table
  - Distinguishes models via `model_name` field: `'gemini-2.5-flash'` vs `'llama-3.3-70b-versatile'`
- Changed return type from single `AIAnalysis` to `{ gemini: AIAnalysis | null, groq: AIAnalysis | null }`
- Updated `analyzeArticlesBatch()` return type to match

**API Updates**
- Modified `/api/ai_analyze/route.ts` to return both model results:
  ```typescript
  {
    success: true,
    media: {...},
    analysis: {
      gemini: {...},
      groq: {...}
    }
  }
  ```

**Frontend Updates**
- Updated `/analyze/page.tsx` TypeScript interface to handle dual-model results
- Redesigned results display to show both models side-by-side:
  - **Google Gemini** section with blue badge
  - **Meta Llama (Groq)** section with purple badge
  - Each shows separate summary and bias scores
  - Added "Multi-Model AI Analysis" header explaining the approach
- Maintained existing color-coded score system for both models

**Cron Job Configuration**
- Updated from 1 article per category (7-8 articles) to **18 articles total**
- Timeline calculation with parallel execution:
  - 18 articles × 15s delay = 270s (4.5 minutes)
  - Gemini + Groq run in parallel (not sequential)
  - Total time: ~4.5-4.8 minutes (safely under 5-minute timeout)
- Database impact: ~90 rows/day → ~180 rows/day in `ai_scores` table

**Configuration**
- Groq API key already present in `.env.local`
- `groq-sdk` package already installed

### Problems Encountered & Solutions

**Parallel vs Sequential Execution Decision**
- **Problem**: Initial approach would double execution time (18 × 2 models × 15s = 9 minutes)
- **Solution**: Used `Promise.all()` to run both models simultaneously per article
- **Result**: Maintains original ~4.5 minute execution time

**Return Type Complexity**
- **Problem**: Changing return type affects multiple callers (API route, batch function, frontend)
- **Solution**:
  - Updated return type systematically from innermost function outward
  - Changed `analyzeArticle()`, `analyzeArticlesBatch()`, API route, and frontend interface
  - Used TypeScript to catch all required updates
- **Lesson**: Type system helps ensure consistency across full stack

**Frontend Display Architecture**
- **Problem**: Need to show two model results clearly without cluttering UI
- **Solution**:
  - Separate sections with distinct color badges (blue for Gemini, purple for Groq)
  - Maintained consistent card layout for scores
  - Added explanatory header about multi-model approach
- **Result**: Clean, professional UI that highlights the technical sophistication

### Design Decisions

**Why Parallel Execution?**
- **Performance**: No timeout issues, same execution time as single model
- **Data Quality**: Two independent AI perspectives reduce individual model bias
- **Fault Tolerance**: If one model fails, the other can still succeed
- **Cost Efficiency**: Both APIs well within free tier limits

**Why Groq + Gemini?**
- **Diversity**: Google's Gemini vs Meta's Llama - different training data, different biases
- **Speed**: Groq provides extremely fast inference (free tier: 14,400 requests/day)
- **Comparison**: Can analyze how different models interpret same content
- **Resume Value**: "Multi-model AI comparison" demonstrates sophisticated thinking

**Why 18 Articles?**
- **Timeout Constraint**: 18 × 15s = 270s (4.5 min) stays under 5-minute limit
- **Analysis Quality**: More articles (18 vs 7-8) = better data diversity
- **API Quotas**: Well within limits:
  - Gemini: 18/day (limit: 1500/day)
  - Groq: 18/day (limit: 14,400/day)

**Database Schema (Unchanged)**
- No schema changes needed - `model_name` field already supports multiple models
- Each article now has 2× bias categories × 2 models = 2× database rows
- Keeps data normalized and queryable

### Technical Concepts Demonstrated

**Asynchronous Programming**
- `Promise.all()` for concurrent operations
- Understanding JavaScript event loop and parallelism
- Proper error handling for parallel promises

**Type Safety**
- TypeScript interfaces updated across full stack
- Return type changes propagated systematically
- Optional chaining for nullable nested data

**API Integration**
- Multiple AI provider integration (Gemini, Groq)
- Fallback model logic (primary + backup models)
- Rate limiting with delays

**Full Stack Coordination**
- Backend changes (return type) require frontend updates (interface)
- API response structure changes affect UI rendering
- Maintained backward compatibility where possible

### Architecture Improvements

**Scalability**
- Easy to add more AI models (OpenAI, Claude, etc.)
- Model comparison infrastructure in place
- Database ready for model performance tracking

**Code Maintainability**
- `analyzeWithGroq()` mirrors `analyzeWithGemini()` - consistent patterns
- Parallel execution encapsulated in single `Promise.all()` call
- Clear separation: analysis logic vs database storage vs API response

**User Experience**
- Users see multiple AI perspectives on same article
- Can compare how different models interpret bias
- More trustworthy than single model opinion

### What I Learned Today

**Technical**
- `Promise.all()` enables true parallelism in JavaScript
- Parallel execution doesn't double API quota usage (both run simultaneously)
- TypeScript return type changes cascade through full stack
- Groq SDK structure similar to OpenAI (chat completions pattern)

**Architectural**
- Multi-model AI analysis is a professional approach to reducing bias
- Parallel execution solves timeout constraints without sacrificing features
- Return type design affects API contracts and frontend contracts
- Database schema flexibility (model_name field) enables easy expansion

**Best Practices**
- Start with single model, expand to multi-model incrementally
- Use `Promise.all()` for independent async operations
- Update TypeScript types systematically to catch breaking changes
- Document timing constraints (5-minute timeout) in comments

### Interview Talking Points

1. **Multi-Model Strategy**
   - "I implemented parallel AI analysis to reduce individual model bias"
   - "Used Google Gemini and Meta Llama via Groq for diverse perspectives"
   - "Promise.all() ensures no performance penalty for dual analysis"

2. **Timeout Optimization**
   - "Analyzed parallelism vs sequencing to stay within 5-minute constraint"
   - "Calculated: 18 articles × 15s delay = 270s, well under limit"
   - "Increased analysis from 7-8 to 18 articles while maintaining timeout safety"

3. **Type Safety**
   - "Updated return types systematically from backend to frontend"
   - "TypeScript caught all required interface changes automatically"
   - "Demonstrates full-stack type safety understanding"

4. **Scalable Design**
   - "Database schema supports unlimited models via model_name field"
   - "Easy to add OpenAI, Claude, etc. using same pattern"
   - "Built for future model comparison and analysis"

### Files Created/Modified

| File | Action | Changes |
|------|--------|---------|
| `lib/ai.ts` | Modified | Added Groq client, `analyzeWithGroq()`, parallel execution in `analyzeArticle()` |
| `app/api/ai_analyze/route.ts` | Modified | Return both Gemini and Groq results |
| `app/analyze/page.tsx` | Modified | Updated interface, dual-model results display |
| `app/api/cron/archive-articles/route.ts` | Modified | Updated comment to reflect "18 with Gemini + Groq" |
| `scripts/initArticles.ts` | No changes | Already calls updated functions, works automatically |
| `.env.local` | No changes | Groq API key already configured |

### Metrics & Performance

**Before (Single Model)**
- Articles analyzed: 7-8 per day (1 per category)
- AI API calls: 7-8 per day
- Database rows: ~40-50 per day
- Execution time: ~2 minutes

**After (Dual Model, Parallel)**
- Articles analyzed: 18 per day
- AI API calls: 36 per day (18 × 2 models in parallel)
- Database rows: ~180 per day
- Execution time: ~4.5 minutes

**Key Insight**: 2.3× more articles analyzed with 2× model diversity in 2.25× time (not 4× if sequential).

### Next Steps

**Testing**
- [ ] Test frontend with real article analysis (both models)
- [ ] Verify database shows both model_name values
- [ ] Monitor cron job logs for "Gemini Analysis Success" and "Groq Analysis Success"
- [ ] Confirm execution stays under 5 minutes

**Future Enhancements**
- [ ] Add model comparison metrics (agreement score between models)
- [ ] Visualize model differences in UI
- [ ] Add more models (OpenAI GPT-4, Anthropic Claude)
- [ ] Track model performance/accuracy over time

**Polish**
- [ ] Add loading states indicating "Analyzing with 2 AI models..."
- [ ] Add badges showing which models succeeded/failed
- [ ] Consider average score across models for overall bias rating

---

## January 15, 2026

### What I Built

**4-Model Parallel AI Analysis System**

Expanded from 2 models (Gemini + Llama 3.3) to **4 models running in parallel**:
1. **Google Gemini 2.5 Flash** - Primary model (via Google AI)
2. **Alibaba Qwen3 32B** - Replaced Llama 3.3 (via Groq)
3. **OpenAI GPT-OSS 120B** - New addition (via Groq)
4. **Meta Llama 4 Maverick** - New addition (via Groq)

All 4 models analyze each article **simultaneously** using `Promise.all()` to avoid timeout issues.

**Dynamic Database-Driven AI Prompts**

Major architectural improvement - prompts are now fully dynamic:
- Fetched `description` column from `bias_categories` table
- AI prompt instructions now built dynamically from database content
- Changed function signatures to accept full category objects: `Array<{ name: string; description: string }>`
- Eliminates "Category not found" warnings caused by hardcoded prompt definitions

Before: Hardcoded category definitions in code
```typescript
// Old (brittle)
const categoryNames = categories.map(c => c.name)  // Just names
```

After: Dynamic from database
```typescript
// New (database-driven)
const categoryInstructions = biasCategories
  .map((cat, index) => `${index + 1}. ${cat.name.toUpperCase()}:\n${cat.description}`)
  .join('\n\n')
```

**URL-Only Analyze Page (Simplified UX)**

- Removed title and source input fields from analyze page
- API route now uses `@extractus/article-extractor` to extract metadata automatically
- Extracts: title, source, description, image_url from just the URL
- Better data quality: captures article images for dashboard display
- Faster UX: one field instead of three

**Detailed Results Display**

- Added "Detailed Model Analysis" section showing individual model scores
- Each model displays: category scores, explanations, and summary
- Color-coded cards: Blue (Gemini), Orange (Qwen), Green (GPT-OSS), Purple (Llama Maverick)
- Shows which models succeeded/failed per article

**Consistent UI Styling Across Pages**

Standardized styling across homepage, dashboard, and analyze page:
- Unified Tailwind patterns: `bg-blue-100 dark:bg-blue-900/30`
- Consistent grid layouts: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Same typography: `text-2xl font-serif font-bold` for headers
- Maintained distinct model colors for visual differentiation

**Comprehensive Cron Job Logging**

Added extensive debugging output for tomorrow's cron run monitoring:
- **Unique run ID**: `cron-${Date.now()}` for tracing requests
- **Environment checks**: Verifies all API keys present at startup
- **Step markers**: Clear visual separation of archival vs fetch phases
- **Duration tracking**: Milliseconds for each operation
- **Success/failure indicators**: Checkmarks and X marks for clarity
- **Progress updates**: Estimated time remaining during batch

Log format example:
```
[Cron cron-1736956800000] ========== CRON JOB STARTED ==========
[Cron cron-1736956800000] Environment check:
[Cron cron-1736956800000]   - CRON_SECRET exists: true
[Cron cron-1736956800000]   - GEMINI_API_KEY exists: true
[Cron cron-1736956800000]   - GROQ_API_KEY exists: true
```

### Problems Encountered & Solutions

#### 1. Model Name Mismatch in Database Saves

**Problem**: Qwen, GPT-OSS, and Llama Maverick models weren't being saved correctly to database.

**Root Cause**: The helper function was expecting specific model name formats that didn't match the Groq model IDs.

**Solution**:
- Ensured `model_name` field uses exact Groq model strings
- `'gemini-2.5-flash'`, `'qwen/qwen3-32b'`, `'openai/gpt-oss-120b'`, `'meta-llama/llama-4-maverick-17b-128e-instruct'`
- Updated `saveModelScores` calls to use consistent naming

**Lesson**: When integrating multiple external APIs, maintain exact naming conventions they use.

#### 2. "Category not found" Warnings in Logs

**Problem**: AI models would return categories that didn't exist in database, causing warnings.

**Root Cause**: Hardcoded prompt had category definitions that didn't match database exactly.

**Solution**:
- Made prompts fully dynamic by fetching `description` column
- AI can only score categories that exist in `bias_categories` table
- Add/modify categories in database, prompts auto-update

**Lesson**: Database-driven configurations are more maintainable than hardcoded values.

#### 3. Qwen Returning `<think>` Tags in JSON

**Problem**: Qwen model sometimes wraps responses in `<think>` XML tags, breaking JSON parsing.

**Solution**:
```typescript
if (jsonText.includes('<think>')) {
  jsonText = jsonText.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}
```

**Lesson**: Different AI models have different output quirks. Always clean/normalize responses.

#### 4. Article Extraction for User-Submitted URLs

**Problem**: User had to manually enter title and source, which was error-prone and tedious.

**Root Cause**: Original design assumed users would provide metadata, but `@extractus/article-extractor` already extracts everything.

**Solution**:
- Import and use `extract()` function in API route
- Extract title, source, description, image automatically
- Only require URL from user
- Fallback to hostname if source not extracted

**Lesson**: Use existing libraries fully - we were already importing article-extractor but not leveraging its metadata extraction.

#### 5. Inconsistent Styling Across Pages

**Problem**: AI model displays looked different on homepage, dashboard, and analyze page.

**Root Cause**: Pages were built at different times with slightly different Tailwind classes.

**Solution**:
- Standardized to consistent pattern: `bg-{color}-100 dark:bg-{color}-900/30`
- Same grid structure everywhere: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Unified padding (`p-5`), border-radius (`rounded-lg`), typography

**Lesson**: Create design tokens or component library earlier to avoid consistency drift.

### Design Decisions

#### Why 4 Models Instead of 2?

**Diversity of Training Data**:
- Google Gemini: Trained on Google's data
- Alibaba Qwen: Chinese company, different data sources
- OpenAI GPT-OSS: OpenAI architecture, open-source
- Meta Llama: Facebook's research team

**Reduces Individual Model Bias**: More perspectives = more reliable consensus.

**Still Within Free Tier**: All 4 models well under quota limits:
| Model | Daily Limit | Usage (18 articles) | % Used |
|-------|------------|---------------------|--------|
| Gemini 2.5 Flash | 1,500/day | 18/day | 1.2% |
| Qwen3 32B | 14,400/day | 18/day | 0.125% |
| GPT-OSS 120B | 14,400/day | 18/day | 0.125% |
| Llama 4 Maverick | 14,400/day | 18/day | 0.125% |

#### Why Database-Driven Prompts?

**Flexibility**: Can experiment with different bias categories without code changes.

**Consistency**: AI can only score what exists in database (no mismatches).

**Maintainability**: Business logic (which categories to score) lives in database, not codebase.

**Future-Proof**: Easy to A/B test different category definitions.

#### Why URL-Only Input?

**UX Simplicity**: One field vs three fields = faster submission.

**Data Quality**: `article-extractor` extracts accurately from HTML.

**Additional Data**: Now captures description and image_url for richer display.

**Error Reduction**: Users can't mistype title or source.

#### Why Color-Coded Model Cards?

**Visual Differentiation**: Instant recognition of which model produced which analysis.

**Consistent Mental Model**: Blue always = Gemini, Orange always = Qwen, etc.

**Professional Look**: Distinct but harmonious color palette.

### Technical Concepts Demonstrated

**Asynchronous Programming**
- `Promise.all()` for 4-way parallel execution
- Understanding that parallel doesn't increase timeout
- Graceful degradation when some promises fail

**Database-Driven Architecture**
- Using database as source of truth for configuration
- Dynamic SQL queries to build application behavior
- Schema design that supports flexibility (model_name field)

**Full-Stack Type Safety**
- TypeScript interfaces updated across all layers
- Return type changes cascade from backend → API → frontend
- Optional chaining for nullable model results

**API Integration Patterns**
- Multiple provider integration (Google AI, Groq)
- Response cleaning/normalization for different AI outputs
- Rate limiting with delays between operations

**Observability & Debugging**
- Structured logging with consistent prefixes
- Duration tracking for performance monitoring
- Environment validation at startup

### Thought Process & Architecture Reasoning

**Problem-Solving Approach for 4-Model System**:
1. **Identify constraint**: 5-minute Vercel timeout
2. **Calculate timing**: 18 articles × 15s = 270s ✓
3. **Verify parallel works**: Models independent, no data dependencies
4. **Design return type**: `{ gemini, qwen, gptOss, llamaMaverick }`
5. **Update all layers**: Backend → API → Frontend systematically
6. **Add observability**: Logging for debugging production runs

**Why Logging Matters**:
- Production debugging is hard without good logs
- Cron jobs run unattended - need visibility into failures
- Performance metrics help identify optimization opportunities
- Unique run IDs enable tracing across distributed logs

### Files Created/Modified

| File | Action | Changes |
|------|--------|---------|
| `lib/ai.ts` | Modified | 4-model parallel execution, dynamic prompts from DB, detailed logging |
| `app/api/ai_analyze/route.ts` | Modified | URL-only input, auto-extract metadata, returns 4 model results |
| `app/analyze/page.tsx` | Modified | Removed title/source fields, added detailed model results display |
| `app/page.tsx` | Modified | Standardized AI Model Tendencies styling |
| `app/dashboard/page.tsx` | Modified | Standardized AI Model Tendencies styling |
| `app/api/cron/archive-articles/route.ts` | Modified | Added comprehensive logging with runId |
| `scripts/initArticles.ts` | Modified | Added step-by-step logging with metrics |

### Interview Talking Points

1. **Multi-Model AI Architecture**:
   - "I expanded from 2 to 4 AI models analyzing in parallel"
   - "Each model has different training data, reducing systemic bias"
   - "Promise.all() enables true parallelism without timeout issues"

2. **Database-Driven Configuration**:
   - "AI prompts are dynamically built from database content"
   - "Adding a new bias category requires only a database insert, no code changes"
   - "This is defensive programming - prevents hardcoded values from drifting"

3. **Observability-First Design**:
   - "Added comprehensive logging before issues occur"
   - "Each cron run has unique ID for tracing"
   - "Duration tracking identifies performance bottlenecks"

4. **UX Simplification**:
   - "Reduced analyze form from 3 fields to 1"
   - "Used existing library for metadata extraction instead of asking users"
   - "Better data quality from automated extraction vs manual entry"

5. **Systematic Refactoring**:
   - "Changed return types from innermost function outward"
   - "TypeScript caught all required updates across full stack"
   - "Maintained backward compatibility where possible"

### What I Learned Today

**Technical**:
- Article extraction libraries provide more than just content (title, source, image, description)
- Different AI models have different output quirks (`<think>` tags in Qwen)
- Logging with unique IDs is essential for distributed system debugging
- 4-way `Promise.all()` has same timeout as 2-way (parallel, not sequential)

**Architectural**:
- Database-driven prompts are more maintainable than hardcoded
- UI consistency requires discipline across multiple pages
- Observability should be built in from the start, not retrofitted

**Debugging**:
- "Category not found" warnings point to prompt/database mismatches
- AI model responses need cleaning/normalization
- Good logs make tomorrow's debugging much easier

### Metrics & Performance

**Before (2 Models)**:
- Models: Gemini + Llama 3.3
- AI API calls: 36/day (18 × 2)
- Database rows: ~180/day (18 × 2 × ~5 categories)

**After (4 Models)**:
- Models: Gemini + Qwen + GPT-OSS + Llama Maverick
- AI API calls: 72/day (18 × 4)
- Database rows: ~360/day (18 × 4 × ~5 categories)

**Key Insight**: 2× model diversity with same execution time (parallel).

### Next Steps

**Immediate**:
- [ ] Monitor cron job logs tomorrow morning
- [ ] Verify all 4 models produce valid scores
- [ ] Check for any "Category not found" warnings (should be eliminated)
- [ ] Verify article images appear on dashboard

**Future Enhancements**:
- [ ] Add model agreement/disagreement metrics
- [ ] Visualize consensus vs divergent scores
- [ ] Add average score display across all 4 models
- [ ] Consider 5th model (Anthropic Claude) if needed

**Polish**:
- [ ] Add "Analyzed by 4 AI Models" badge on articles
- [ ] Show model success/failure indicators
- [ ] Add tooltips explaining each model's background

---

## January 17, 2026

### What I Built

**Content Truncation for Groq Models**
- Implemented smart truncation system to handle long articles that exceed Groq's token limits
- Created `truncateContent()` helper function in `lib/ai.ts`:
  - Limits content to 12,000 characters (~3,000 tokens)
  - Intelligently ends at sentence boundaries for cleaner cuts
  - Only truncates within last 20% to avoid cutting too much content
- Groq models (Qwen, GPT-OSS, Llama) now analyze first ~12k chars of long articles
- Gemini continues to analyze full article content (1M token context window)
- Added logging to track when/how much content is truncated

**Global Inter-Model Disagreement Metric**
- Added new homepage statistic measuring AI model consensus
- Calculates average absolute deviation between model scores for same article-category pairs
- Formula: For each article-category, measure how far each model deviates from 4-model average, then average across all pairs
- Displays as percentage (13.6% = models typically differ by 0.136 from group average)
- Shows data quality: lower disagreement = higher confidence in ensemble scores
- Positioned prominently above variance reduction metric on homepage

**UI Improvements**
- Changed AI model display from vertical list to 2-column grid on article detail pages
- Updated from `space-y-8` to `grid md:grid-cols-2 gap-6`
- Improved visual balance and reduced scrolling on desktop
- Maintains responsive single-column layout on mobile

**Cron Job Optimization**
- Reduced wait time between articles from 15s to 5s
- Analysis time (~10-15s per article) already provides natural spacing
- 18 articles × ~17s total = ~5 minutes (well under rate limits)
- Math: 4 articles/minute per model × 4 models = 16 requests/minute, safely under 5 requests/minute/model limit

### Problems Encountered & Solutions

#### 1. Groq Token Limit Exceeded (413 Errors)

**Problem**: Long articles (23,911 chars) failed on all Groq models with 413 errors:
- Qwen3-32B: Limit 6,000 TPM, Requested 10,873
- GPT-OSS-120B: Limit 8,000 TPM, Requested 9,066
- Llama Maverick: Limit 6,000 TPM, Requested 8,950

**Root Cause**:
- Article content + prompt instructions exceeded Groq's token-per-minute (TPM) limits
- Groq free tier has much stricter limits than Gemini (6K-8K vs 1M tokens)

**Solution**:
```typescript
function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content

  let truncated = content.substring(0, maxChars)

  // Try to end at sentence boundary
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )

  if (lastSentenceEnd > maxChars * 0.8) {
    truncated = truncated.substring(0, lastSentenceEnd + 1)
  }

  return truncated
}
```

Applied to Groq models only (12,000 char limit), keeping Gemini with full content.

**Result**: All 4 models successfully analyzed the same long article:
- Gemini: 23,911 chars (full)
- Qwen: 9,904 chars (truncated at sentence)
- GPT-OSS: 9,904 chars (truncated at sentence)
- Llama: 9,904 chars (truncated at sentence)

**Key Learning**: Conservative character-to-token estimation (~4 chars per token) with buffer room prevents edge cases.

#### 2. Understanding Inter-Model Disagreement Calculation

**Concept Clarification Request**: User wanted detailed explanation of the disagreement metric math and TypeScript syntax.

**Educational Approach**: Broke down both mathematical formula and code line-by-line:
- Mathematical steps with concrete example (scores 0.6, 0.4, 0.5, 0.3 → ensemble 0.45 → deviations)
- Syntax explanations:
  - Arrow functions: `s => s.category`
  - Array methods: `.map()`, `.filter()`, `.reduce()`
  - Destructuring: `([mediaId, scores]) => { }`
  - Set deduplication: `new Set(...)`
  - Ternary operator: `condition ? valueIfTrue : valueIfFalse`

**Result**: User understood both the statistics and the JavaScript patterns used to implement them.

### Design Decisions

#### Why Truncate Only Groq Models?

**Diversity over consistency**:
- Gemini's 1M token window enables full-content analysis
- Groq models provide "quick scan" perspective on key sections
- Having one full-context model is valuable for comparison
- Different input lengths don't invalidate ensemble averaging (still same article)

**Alternative considered**: Truncate all 4 models to same length for fairness
**Rejected because**: Loses Gemini's strength; ensemble benefits from diverse approaches

#### Why 12,000 Character Limit?

**Token math**:
- ~4 characters per token (conservative estimate)
- 12,000 chars ≈ 3,000 tokens for content
- Prompt + response ≈ 2,000-2,500 tokens
- Total: ~5,000-5,500 tokens per request

**Safety margin**: Well under limits:
- Qwen/Llama: 6,000 TPM limit → 83% safety margin
- GPT-OSS: 8,000 TPM limit → 31% safety margin

**Why not higher**: Leaves buffer for prompt variations and response size

#### Why Sentence Boundary Truncation?

**Coherence**: Avoids mid-sentence cuts that could mislead AI analysis

**Algorithm**: Only use sentence boundary if found within last 20% of limit
- Prevents losing too much content (e.g., 5,000 chars cut to 2,000)
- Balances coherence vs completeness

#### Why 5-Second Wait Instead of 15?

**Rate limit analysis**:
```
Groq limit: 5 requests/minute per model
Our usage: 4 articles/minute (with 5s wait + 10s analysis)
Per model: ~4 requests/minute < 5 limit ✓
```

**Time savings**: 18 articles × 10s saved = 180s (3 minutes faster)

**Risk**: None - analysis time already provides spacing

### Technical Concepts Demonstrated

**String Manipulation**
- `.substring()` for truncation
- `.lastIndexOf()` for reverse search
- Regex-free sentence detection using multiple character checks

**Mathematical Statistics**
- Mean Absolute Deviation (MAD) as disagreement metric
- Ensemble averaging across models
- Percentage conversion for interpretability

**Defensive Programming**
- Token limit estimation with safety margins
- Graceful degradation (truncate vs fail)
- Per-model logging for debugging

**Educational Code Documentation**
- Inline comments explaining "why" not just "what"
- Step-by-step walkthroughs for complex logic
- Real-world examples with actual data

### Files Created/Modified

| File | Action | Changes |
|------|--------|---------|
| `lib/ai.ts` | Modified | Added `truncateContent()`, applied to Groq models only, logging |
| `app/page.tsx` | Modified | Added Global Inter-Model Disagreement calculation and display |
| `app/articles/[id]/page.tsx` | Modified | Changed model display to 2-column grid |
| `scripts/initArticles.ts` | Modified | Updated article count from 18 to 15, adjusted timing comments |

### Interview Talking Points

1. **Problem-Solving Under Constraints**:
   - "Hit 413 token limit errors on production cron job"
   - "Diagnosed by analyzing error messages: 10,873 requested vs 6,000 limit"
   - "Implemented smart truncation with sentence boundaries for coherence"

2. **Trade-Off Analysis**:
   - "Chose to truncate Groq models but keep Gemini at full length"
   - "Values diversity over consistency - one full-context model + three quick-scan models"
   - "Demonstrates understanding that different approaches can complement each other"

3. **Statistical Rigor**:
   - "Added inter-model disagreement metric to quantify AI consensus"
   - "13.6% disagreement means models typically differ by 0.136 on -1 to +1 scale"
   - "This is a standard measure of ensemble reliability in ML"

4. **Educational Code**:
   - "When explaining complex code, I break down both the math and the syntax"
   - "Provided real examples with actual numbers to make concepts concrete"
   - "This mirrors how I'd explain technical decisions to stakeholders"

5. **Performance Optimization**:
   - "Reduced cron job wait time from 15s to 5s after rate limit analysis"
   - "Math: 4 requests/min/model < 5 limit with built-in analysis time buffer"
   - "Saved 3 minutes per run while maintaining safety margins"

### What I Learned Today

**Technical**:
- Token limits vary drastically by provider (6K vs 1M)
- Character-to-token estimation: ~4 chars/token is conservative
- Sentence boundary detection without regex: check for `. `, `! `, `? `
- Mean Absolute Deviation as interpretable disagreement metric

**Architectural**:
- Truncation strategy can be model-specific (don't always apply uniformly)
- Logging truncation helps debug content-length issues
- Inter-model disagreement is valuable metadata for ensemble systems

**Communication**:
- Breaking down syntax helps non-experts understand implementation
- Real examples (0.6, 0.4, 0.5, 0.3) are clearer than abstract formulas
- "Why" matters more than "what" in explanations

**Debugging**:
- 413 errors often indicate payload too large, not auth issues
- Error messages contain diagnostic info (10,873 requested vs 6,000 limit)
- Conservative estimates prevent edge cases better than exact calculations

### Metrics & Impact

**Before Truncation**:
- Long articles: 3/4 models failed (only Gemini succeeded)
- Cron job: Partial analysis (missing Groq perspectives)

**After Truncation**:
- Long articles: 4/4 models succeed
- Cron job: Complete analysis for all articles
- Example: 23,911 char article analyzed by all models (Gemini full, Groq truncated)

**Performance**:
- 5s wait vs 15s wait: 3 minutes saved per cron run
- Rate limit utilization: 80% (4/5 requests per minute per model)
- Safety margin: 20% buffer for variability

### Next Steps

**Immediate**:
- [x] Test truncation with various article lengths
- [x] Monitor cron job for token errors
- [x] Verify inter-model disagreement displays correctly

**Future**:
- [ ] Add per-article disagreement score (not just global)
- [ ] Visualize which categories have highest model disagreement
- [ ] Consider adaptive truncation based on model limits
- [ ] Add "content truncated" indicator in UI for transparency
