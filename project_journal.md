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