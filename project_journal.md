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

### TODO / Next Steps

* Connect to external APIs to get articles and films data.
* Verify data displays correctly on the frontend
* Build out the homepage to display media items with bias scores
* Create an admin workflow for adding new articles (using Secret Key)
* Connect the Python AI scoring script to generate bias scores