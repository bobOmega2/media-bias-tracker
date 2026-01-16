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

---

## Cookie-Based User History System

### Architecture Decision: Cookies vs Database for Personal History

**Problem**: Need to track which articles users have analyzed without requiring authentication.

**Solution**: Hybrid approach combining cookies and database flags.

**Design Rationale**:
- **Cookies store article IDs only** (not full article data)
  - Fast lookup without database queries
  - No authentication required
  - Privacy-first (data stays in browser)
  - Max 50 articles tracked (prevent 4KB cookie limit)
  - 90-day expiration with automatic cleanup

- **Database stores `user_analyzed` boolean flag**
  - Separates curated GNews articles from user submissions
  - Enables quality control on public pages
  - Clean separation: `user_analyzed = false` for articles page, `true` for dashboard
  - Future-proof for authentication migration

**Key Implementation Details**:
- Cookie name: `analyzed_articles`
- Value: JSON array of UUIDs: `["id1", "id2", "id3"]`
- Security: SameSite=Lax, no HttpOnly (need JS access)
- Utility functions in `utils/analyzedArticles.ts` centralize logic

**Why This Works**:
- Personal tracking without authentication complexity
- Enables dashboard without user accounts
- Clean separation of public vs user content
- Easy migration path: move cookie IDs to user table when auth added

### Database Schema: user_analyzed Field

**Table**: `media`
**Field**: `user_analyzed` BOOLEAN DEFAULT false

**Purpose**: Distinguish between:
- **Curated articles** (`user_analyzed = false`): GNews articles displayed publicly
- **User submissions** (`user_analyzed = true`): Articles analyzed via /analyze page

**Query Patterns**:
```sql
-- Public articles page
SELECT * FROM media WHERE user_analyzed = false

-- User dashboard
SELECT * FROM media WHERE id IN (cookie_ids) AND user_analyzed = true
```

**Critical Fix**: GNews insertion script must explicitly set `user_analyzed = false` (not NULL).
**Reason**: `.eq('user_analyzed', false)` excludes NULL values in Postgres.

**Interview Talking Points**:
- Defensive programming: NULL vs FALSE are different
- SQL query behavior with nullable booleans
- Importance of explicit defaults in insertion scripts

### Data Flow: Analyze Page → Cookie → Dashboard

1. **User submits article** (`/analyze` page)
2. **API inserts to database** with `user_analyzed = true` flag
3. **API returns new article ID** after successful analysis
4. **Frontend saves ID to cookie** using `addAnalyzedArticle(id)`
5. **User visits dashboard** → reads cookie IDs → fetches articles from Supabase
6. **Dashboard displays** only user's analyzed articles

**Key Advantage**: Article exists in database (sharable, permanent) but personal history tracked client-side (no auth needed).

### Supabase Nested Queries

**Pattern Used**: Foreign key relationships for efficient joins

```typescript
// Single query fetches article + scores + categories
await supabase
  .from('media')
  .select(`
    *,
    ai_scores (
      score,
      explanation,
      bias_categories (
        name
      )
    )
  `)
```

**Why This Works**:
- `ai_scores.media_id` → `media.id` (foreign key)
- `ai_scores.category_id` → `bias_categories.id` (foreign key)
- Supabase automatically joins related tables
- Returns nested JSON structure (no manual joins needed)

**Interview Insight**: PostgreSQL foreign keys + PostgREST API = automatic nested queries. This is a key Supabase advantage over raw SQL.

### TypeScript Type Safety for Nested Data

**Challenge**: Supabase returns `bias_categories` as array (1:1 relationship still returns array)

**Solution**:
```typescript
interface Article {
  ai_scores: {
    bias_categories: { name: string }[]  // Array, not object
  }[]
}

// Access first element
const category = score.bias_categories?.[0]
```

**Lesson**: Don't assume Supabase nested queries return objects for 1:1 relationships. Always use arrays and optional chaining.

---

## Multi-Model AI Analysis Architecture

### Date: January 13, 2026

### Decision: Implement Parallel Dual-Model Bias Analysis

**Problem**: Single AI model bias detection can inherit the model's own biases. Need multiple perspectives without doubling execution time.

**Solution**: Parallel analysis using both Google Gemini and Meta Llama (via Groq).

### Implementation Strategy

**Parallel Execution Pattern**:
```typescript
const [geminiAnalysis, groqAnalysis] = await Promise.all([
  analyzeWithGemini(articleContent, categoryNames),
  analyzeWithGroq(articleContent, categoryNames)
])
```

**Why This Works**:
- Both API calls execute simultaneously (not sequential)
- Total time = max(gemini_time, groq_time) + delay, not sum
- If one model fails, other can still succeed
- No API quota penalty (both count as 1 request per article, not 2)

### Model Selection Rationale

**Google Gemini (gemini-2.5-flash)**
- Pros: High accuracy, good at nuanced text analysis
- Cons: 1500 requests/day limit
- Use case: Primary bias detection model

**Meta Llama 3.3 (via Groq - llama-3.3-70b-versatile)**
- Pros: 14,400 requests/day, extremely fast inference, different training corpus
- Cons: Slightly less accurate than GPT-4/Gemini for complex analysis
- Use case: Second perspective, diversity in model architecture

**Fallback Models**:
- Gemini: `gemini-2.5-flash-lite` (if primary rate-limited)
- Groq: `llama-3.1-8b-instant` (if primary rate-limited)

### Database Schema Integration

**No Schema Changes Required**
- Existing `model_name` field in `ai_scores` table supports unlimited models
- Each article now generates 2× rows (one per model per category)
- Query pattern remains unchanged: filter by `model_name` to compare models

**Data Structure**:
```sql
-- Before (single model)
article_id | category_id | score | model_name
abc123     | political   | 0.5   | gemini-2.5-flash

-- After (dual model)
article_id | category_id | score | model_name
abc123     | political   | 0.5   | gemini-2.5-flash
abc123     | political   | 0.3   | llama-3.3-70b-versatile
```

### API Response Structure

**Changed Return Type**:
```typescript
// Before
interface AnalysisResult {
  analysis: {
    scores: AIScore[]
    summary: string
  }
}

// After
interface AnalysisResult {
  analysis: {
    gemini: {
      scores: AIScore[]
      summary: string
    } | null
    groq: {
      scores: AIScore[]
      summary: string
    } | null
  }
}
```

**Why This Design**:
- Explicit model separation (not merged)
- Frontend can display both perspectives
- Nullable types handle model failures gracefully
- Future: add more models without breaking changes

### Frontend Display Strategy

**UI Layout**: Side-by-side model comparison
- **Gemini section**: Blue badge, shows Gemini results
- **Groq section**: Purple badge, shows Llama results
- **Header**: Explains multi-model approach to users
- **Benefit**: Users can see model agreement/disagreement

**Color Coding**:
- Blue (`bg-blue-100`) = Google Gemini
- Purple (`bg-purple-100`) = Meta Llama (Groq)
- Maintains existing score colors (red/green/blue for bias direction)

### Performance Optimization

**Timeout Constraint**: 5 minutes (Vercel serverless limit)

**Calculation**:
- 18 articles × 2 models in parallel = 18 parallel API call pairs
- 18 × 15s delay = 270s (4.5 minutes)
- API call time (~10-20s) happens during delay period
- **Total: ~4.5-4.8 minutes** ✓ Under limit

**Why 18 Articles?**
- Maximum articles that fit in timeout with dual models
- More than previous 7-8 articles (1 per category)
- Enough for statistical significance in bias analysis

### Rate Limiting Strategy

**Delay Between Articles**: 15 seconds
- Prevents rate limit errors on both APIs
- Allows parallel execution without exceeding quotas
- Conservative approach (both APIs allow much higher rates)

**API Quotas**:
| Model | Daily Limit | Usage | % Used |
|-------|------------|-------|--------|
| Gemini 2.5 Flash | 1,500/day | 18/day | 1.2% |
| Groq Llama 3.3 | 14,400/day | 18/day | 0.125% |

### Type Safety Implementation

**Cascading Type Updates**:
1. `analyzeArticle()` return type changed
2. `analyzeArticlesBatch()` return type updated to match
3. `/api/ai_analyze` response type updated
4. Frontend `AnalysisResult` interface updated
5. Component rendering logic updated

**Benefit**: TypeScript ensures no breaking changes missed.

### Error Handling Strategy

**Graceful Degradation**:
- If **both models fail**: Throw error (analysis failed)
- If **Gemini fails, Groq succeeds**: Save Groq scores only
- If **Groq fails, Gemini succeeds**: Save Gemini scores only
- Frontend displays whichever models succeeded

**Code Pattern**:
```typescript
if (!geminiAnalysis && !groqAnalysis) {
  throw new Error('All AI models failed')
}

if (geminiAnalysis) {
  // Save Gemini scores
}

if (groqAnalysis) {
  // Save Groq scores
}
```

### Scalability Considerations

**Adding More Models (Future)**:
- Pattern established: add new `analyzeWithX()` function
- Add to `Promise.all()` array
- Update return type to include new model
- Frontend automatically shows new section

**Example (3 models)**:
```typescript
const [gemini, groq, openai] = await Promise.all([
  analyzeWithGemini(...),
  analyzeWithGroq(...),
  analyzeWithOpenAI(...)
])

return { gemini, groq, openai }
```

**Database Scales Automatically**: `model_name` field handles any number of models.

### Trade-Offs Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Sequential** | Simple logic | 9+ min execution | ❌ Rejected (timeout) |
| **Parallel** | Fast, dual perspective | Complex type handling | ✅ **Chosen** |
| **Single model** | Simplest | Single point of bias | ❌ Rejected (bias concern) |
| **More articles** | More data | Timeout risk | ⚠️ Limited to 18 |

### Interview Talking Points

1. **Parallel Execution**:
   - "I used `Promise.all()` to run multiple AI models simultaneously"
   - "This prevented timeout issues while doubling the data quality"
   - "Demonstrates understanding of async programming and performance optimization"

2. **Multi-Model Strategy**:
   - "Different AI models have different training biases"
   - "Google's Gemini vs Meta's Llama provides diverse perspectives"
   - "Users can see model agreement/disagreement on bias scores"

3. **Type Safety**:
   - "Changed return types systematically across full stack"
   - "TypeScript caught all required interface updates"
   - "Shows rigorous approach to refactoring in typed languages"

4. **Scalable Architecture**:
   - "Database schema supports unlimited models via model_name field"
   - "Easy to add OpenAI, Claude, or other providers"
   - "Demonstrates forward-thinking design"

### Lessons Learned

**Technical**:
- `Promise.all()` is the correct pattern for independent parallel operations
- Return type changes cascade through full stack (backend → API → frontend)
- Optional types (`| null`) handle model failures gracefully

**Architectural**:
- Multi-model analysis is industry best practice for bias detection
- Parallel execution can solve timeout constraints elegantly
- Database schema should be designed for flexibility (model_name vs hardcoded fields)

**Best Practices**:
- Always calculate timing constraints before implementing (18 × 15s = 4.5 min)
- Use TypeScript to enforce consistency during refactoring
- Document why decisions were made (future you will thank you)

---

## 4-Model Parallel AI Analysis Architecture

### Date: January 15, 2026

### Decision: Expand from 2 Models to 4 Models

**Problem**: Two models (Gemini + Llama 3.3) still represent limited diversity. Both are primarily trained on Western/English data. Need broader perspectives.

**Solution**: Expand to 4 models from different providers/architectures:
1. **Google Gemini 2.5 Flash** - Primary model (via Google AI)
2. **Alibaba Qwen3 32B** - Chinese provider, different training data (via Groq)
3. **OpenAI GPT-OSS 120B** - OpenAI architecture, open weights (via Groq)
4. **Meta Llama 4 Maverick** - Meta's latest, instruction-tuned (via Groq)

### Why These Specific Models?

**Diversity of Training Sources**:
| Model | Provider | Training Data Origin | Architecture |
|-------|----------|---------------------|--------------|
| Gemini 2.5 Flash | Google | Google's crawl + licensed data | Multimodal transformer |
| Qwen3 32B | Alibaba | Chinese web + multilingual corpus | Decoder-only |
| GPT-OSS 120B | OpenAI | OpenAI's curated datasets | GPT-style decoder |
| Llama 4 Maverick | Meta | Public web + curated sources | Mixture-of-experts |

**Key Insight**: Each model has **different systematic biases** based on:
- Who collected the training data (Google vs Alibaba vs Meta)
- What regions/languages were prioritized
- What content was filtered out
- How the model was fine-tuned

**Result**: Consensus across 4 different models is more trustworthy than any single model.

### Implementation: Parallel Execution

**Pattern**:
```typescript
const [geminiAnalysis, qwenAnalysis, gptOssAnalysis, llamaMaverickAnalysis] = await Promise.all([
  analyzeWithGemini(content, biasCategories),
  analyzeWithGroq(content, biasCategories, 'qwen/qwen3-32b'),
  analyzeWithGroq(content, biasCategories, 'openai/gpt-oss-120b'),
  analyzeWithGroq(content, biasCategories, 'meta-llama/llama-4-maverick-17b-128e-instruct')
])
```

**Why Promise.all() Still Works**:
- 4 promises ≈ same wall-clock time as 2 promises (parallel, not sequential)
- Each Groq API call ~2-5 seconds, Gemini ~3-8 seconds
- All 4 complete within the 15-second inter-article delay
- Total execution time unchanged from 2-model version

### API Response Structure Evolution

**Before (2 models)**:
```typescript
{
  analysis: {
    gemini: AIAnalysis | null
    groq: AIAnalysis | null
  }
}
```

**After (4 models)**:
```typescript
{
  analysis: {
    gemini: AIAnalysis | null      // Google Gemini 2.5 Flash
    qwen: AIAnalysis | null        // Alibaba Qwen3 32B
    gptOss: AIAnalysis | null      // OpenAI GPT-OSS 120B
    llamaMaverick: AIAnalysis | null // Meta Llama 4 Maverick
  }
}
```

**Design Rationale**:
- Explicit keys for each model (not array) for type safety
- Nullable for graceful degradation
- Frontend can easily access specific model results
- Easy to add 5th model without breaking changes

### Rate Limiting Analysis

**API Quotas - All Well Under Limits**:
| Model | Provider | Daily Limit | Usage (18 articles) | Headroom |
|-------|----------|------------|---------------------|----------|
| Gemini 2.5 Flash | Google AI | 1,500/day | 18/day | 98.8% unused |
| Qwen3 32B | Groq | 14,400/day | 18/day | 99.9% unused |
| GPT-OSS 120B | Groq | 14,400/day | 18/day | 99.9% unused |
| Llama 4 Maverick | Groq | 14,400/day | 18/day | 99.9% unused |

**Total API Calls**: 72/day (18 articles × 4 models)
**Combined Quota**: ~44,700/day
**Usage**: 0.16% of available quota

**Conclusion**: Significant room to scale article count if needed.

### Database Schema - No Changes Required

**Existing `ai_scores` table structure**:
```sql
id          | uuid (PK)
media_id    | uuid (FK → media)
category_id | uuid (FK → bias_categories)
score       | float
explanation | text
summary     | text
model_name  | varchar  -- Key field: stores any model identifier
created_at  | timestamp
```

**New model_name values**:
- `'gemini-2.5-flash'`
- `'qwen/qwen3-32b'`
- `'openai/gpt-oss-120b'`
- `'meta-llama/llama-4-maverick-17b-128e-instruct'`

**Data Growth**:
- Before: ~180 rows/day (18 articles × 2 models × 5 categories)
- After: ~360 rows/day (18 articles × 4 models × 5 categories)
- Monthly: ~10,800 rows (acceptable for Supabase free tier)

---

## Database-Driven AI Prompts

### Date: January 15, 2026

### Decision: Move Prompt Definitions from Code to Database

**Problem**: Hardcoded bias category definitions in code caused "Category not found" warnings. Adding/modifying categories required code changes and redeployment.

**Before (Hardcoded)**:
```typescript
// In ai.ts - brittle
const prompt = `
Analyze for these bias categories:
1. POLITICAL: Measures left-right political leaning...
2. ECONOMIC: Measures free-market vs regulation stance...
// etc.
`
```

**After (Database-Driven)**:
```typescript
// Fetch from Supabase
const { data: categories } = await supabase
  .from('bias_categories')
  .select('name, description')

// Build prompt dynamically
const categoryInstructions = categories
  .map((cat, i) => `${i + 1}. ${cat.name.toUpperCase()}:\n${cat.description}`)
  .join('\n\n')
```

### Schema Change: Added `description` Column

**New `bias_categories` table structure**:
```sql
id          | uuid (PK)
name        | varchar UNIQUE
description | text  -- NEW: Full scoring instructions for AI
created_at  | timestamp
```

**Example Row**:
```sql
INSERT INTO bias_categories (name, description) VALUES (
  'political',
  'Measures political bias on a scale from -1 (strongly left/liberal) to +1 (strongly right/conservative). Consider: party affiliations mentioned, policy framing, word choice for political figures, coverage balance of political perspectives.'
);
```

### Benefits of Database-Driven Prompts

1. **No Code Changes for Category Updates**:
   - Add new category: INSERT into database
   - Modify scoring criteria: UPDATE description
   - Remove category: DELETE from database
   - No deployment required

2. **Single Source of Truth**:
   - AI prompts always match database exactly
   - No risk of code/database drift
   - "Category not found" warnings eliminated

3. **A/B Testing Ready**:
   - Could add `version` column for prompt versioning
   - Test different scoring criteria
   - Track which prompt version produced which scores

4. **Audit Trail**:
   - Database tracks when categories added/modified
   - Can correlate score changes with prompt changes
   - Important for bias research integrity

### Function Signature Changes

**Before**:
```typescript
function analyzeWithGemini(
  content: string,
  categoryNames: string[]  // Just names
): Promise<AIAnalysis>
```

**After**:
```typescript
function analyzeWithGemini(
  content: string,
  biasCategories: Array<{ name: string; description: string }>  // Full objects
): Promise<AIAnalysis>
```

**Impact**: All analyze functions updated to accept category objects, not just names.

### Interview Talking Point

"I refactored from hardcoded AI prompts to database-driven configuration. This is a common industry pattern - storing business logic in the database where it can be modified without code deployment. It eliminated category mismatch bugs and made the system more maintainable. This is similar to feature flags or A/B testing infrastructure used at companies like Netflix or Airbnb."

---

## URL-Only Article Analysis

### Date: January 15, 2026

### Decision: Simplify Analyze Form from 3 Fields to 1 Field

**Problem**: Users had to manually enter:
1. URL (required)
2. Title (required)
3. Source (required)

This was error-prone (typos in titles) and tedious (copying metadata).

**Solution**: Only require URL. Extract metadata automatically.

### Implementation

**Using `@extractus/article-extractor`**:
```typescript
import { extract } from '@extractus/article-extractor'

const article = await extract(url)

// Extracted automatically:
// - article.title
// - article.source (or derive from hostname)
// - article.description
// - article.image (thumbnail URL)
// - article.content (full text)
```

### Data Quality Improvement

**Before (User-Entered)**:
```javascript
{
  title: "Artcile About Poltical Stuff",  // Typo
  source: "nytimes",                       // Informal
  image_url: null                          // Not captured
}
```

**After (Auto-Extracted)**:
```javascript
{
  title: "Article About Political Developments in Congress",
  source: "The New York Times",
  description: "A comprehensive look at...",
  image_url: "https://nytimes.com/images/..."
}
```

### Frontend Changes

**Before (3 inputs)**:
```tsx
<input placeholder="Article URL" />
<input placeholder="Article Title" />
<input placeholder="Source (e.g., CNN, BBC)" />
```

**After (1 input)**:
```tsx
<input placeholder="Paste article URL here..." />
```

**UX Benefits**:
- 3x faster to submit an article
- No cognitive load deciding how to format title/source
- Consistent data quality across all user submissions
- Captures article images for richer dashboard display

### Error Handling

**Fallback Strategy**:
```typescript
const metadata = await extract(url)

const title = metadata?.title || 'Untitled Article'
const source = metadata?.source || new URL(url).hostname
const image = metadata?.image || null
```

**Graceful Degradation**: If extraction partially fails, use sensible defaults rather than failing entirely.

### Trade-Offs Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| User enters all fields | Full control | Error-prone, tedious | ❌ Rejected |
| Auto-extract only | Simple UX | Less user control | ✅ Chosen |
| Auto-extract with override | Best of both | Complex UI | ⚠️ Future option |

**Note**: Could add "Edit metadata" toggle in future if users need to correct extraction errors.

---

## Consistent UI Styling System

### Date: January 15, 2026

### Decision: Standardize AI Model Display Across All Pages

**Problem**: Homepage, dashboard, and analyze page had slightly different styles for AI model displays. This created visual inconsistency and made maintenance harder.

**Solution**: Define consistent patterns and apply everywhere.

### Color System for Models

**Model Color Mapping** (consistently applied):
| Model | Background | Border | Text |
|-------|------------|--------|------|
| Gemini | `bg-blue-100 dark:bg-blue-900/30` | `border-blue-200 dark:border-blue-800` | `text-blue-700 dark:text-blue-300` |
| Qwen | `bg-orange-100 dark:bg-orange-900/30` | `border-orange-200 dark:border-orange-800` | `text-orange-700 dark:text-orange-300` |
| GPT-OSS | `bg-green-100 dark:bg-green-900/30` | `border-green-200 dark:border-green-800` | `text-green-700 dark:text-green-300` |
| Llama Maverick | `bg-purple-100 dark:bg-purple-900/30` | `border-purple-200 dark:border-purple-800` | `text-purple-700 dark:text-purple-300` |

### Layout Patterns

**Grid Structure** (all pages):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Model cards */}
</div>
```

**Card Structure** (all model cards):
```tsx
<div className="bg-{color}-100 dark:bg-{color}-900/30 border border-{color}-200 dark:border-{color}-800 rounded-lg p-5">
  <h4 className="text-lg font-semibold text-{color}-700 dark:text-{color}-300 mb-4">
    {modelName}
  </h4>
  {/* Content */}
</div>
```

### Typography Hierarchy

**Section Headers**:
```tsx
<h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
```

**Model Names**:
```tsx
<h4 className="text-lg font-semibold">
```

**Body Text**:
```tsx
<p className="text-sm text-stone-600 dark:text-stone-400">
```

### Files Updated

1. **`app/page.tsx`** - Homepage AI Model Tendencies section
2. **`app/dashboard/page.tsx`** - Dashboard AI Model Tendencies section
3. **`app/analyze/page.tsx`** - Detailed Model Analysis section

### Benefits

- **Visual Consistency**: Users recognize model colors instantly
- **Maintenance**: Change style in one place, apply everywhere
- **Dark Mode**: Consistent light/dark patterns work across all pages
- **Accessibility**: Sufficient color contrast in both modes

### Future Consideration: Component Extraction

Could extract to reusable component:
```tsx
// components/ModelCard.tsx
interface ModelCardProps {
  model: 'gemini' | 'qwen' | 'gptOss' | 'llamaMaverick'
  children: React.ReactNode
}

export function ModelCard({ model, children }: ModelCardProps) {
  const colors = modelColorMap[model]
  return (
    <div className={`${colors.bg} ${colors.border} rounded-lg p-5`}>
      {children}
    </div>
  )
}
```

**Not implemented yet** because current usage is manageable, but documented for future refactoring if pattern appears more than 3 times.

---

## Production Observability Strategy

### Date: January 15, 2026

### Decision: Add Comprehensive Logging Before Issues Occur

**Problem**: Cron jobs run unattended. Without good logs, debugging production issues requires guesswork. Need visibility into what happened, when, and why.

**Solution**: Structured logging with consistent format across all components.

### Log Format Standards

**Prefix Convention**:
```
[Component] message
[Component:SubComponent] message
```

**Examples**:
```
[Cron cron-1736956800000] ========== CRON JOB STARTED ==========
[AI] Starting analysis for article: abc-123
[Gemini] API call completed in 3420ms
[Groq:qwen] Analysis SUCCESS with 5 scores
[Batch] Progress: 5/18 (4 success, 1 failed)
```

### Unique Run IDs

**Implementation**:
```typescript
const runId = `cron-${Date.now()}`
console.log(`[Cron ${runId}] Starting...`)
```

**Benefits**:
- Trace all logs from single cron run
- Distinguish between overlapping runs (shouldn't happen, but detectable)
- Searchable in Vercel logs: "cron-1736956800000"

### Environment Validation at Startup

**Pattern**:
```typescript
console.log(`[Cron ${runId}] Environment check:`)
console.log(`[Cron ${runId}]   - CRON_SECRET exists: ${!!process.env.CRON_SECRET}`)
console.log(`[Cron ${runId}]   - GNEWS_API_KEY exists: ${!!process.env.GNEWS_API_KEY}`)
console.log(`[Cron ${runId}]   - GEMINI_API_KEY exists: ${!!process.env.GEMINI_API_KEY}`)
console.log(`[Cron ${runId}]   - GROQ_API_KEY exists: ${!!process.env.GROQ_API_KEY}`)
```

**Why**: If API key is missing, immediately obvious in logs before any API calls fail.

### Duration Tracking

**Pattern**:
```typescript
const startTime = Date.now()
// ... operation ...
const duration = Date.now() - startTime
console.log(`[Gemini] Completed in ${duration}ms`)
```

**Tracked Operations**:
- Individual API calls (Gemini, each Groq model)
- Article fetch + extraction
- Database operations
- Full batch completion

**Benefits**:
- Identify slow operations
- Detect performance degradation over time
- Optimize bottlenecks with data

### Progress Indicators

**Batch Processing**:
```typescript
console.log(`[Batch] Progress: ${i + 1}/${total} (${successCount} success, ${failCount} failed)`)
console.log(`[Batch] Elapsed: ${elapsedMin}min, Est. remaining: ${remainingMin}min`)
```

**Benefits**:
- Know if job is progressing or stuck
- Estimate completion time
- Track success/failure rates

### Success/Failure Indicators

**Visual Markers**:
```typescript
console.log(`[Gemini] ✓ Analysis SUCCESS`)
console.log(`[Groq:qwen] ❌ Analysis FAILED: Rate limit exceeded`)
```

**Benefits**:
- Scannable logs (find failures quickly)
- Clear status at a glance
- Unicode characters work in Vercel logs

### Log Levels (Informal)

**Current Approach** (console.log for everything):
- INFO: Normal operations
- ERROR: console.error for failures
- No separate DEBUG level (all logs are useful in production)

**Future Consideration**: Structured JSON logging for log aggregation services (DataDog, Splunk).

### Interview Talking Point

"I implemented observability-first design by adding comprehensive logging before issues occurred. Each cron run has a unique ID for tracing, environment validation catches missing config early, and duration tracking helps identify performance bottlenecks. This is proactive debugging - I don't wait for something to break to add visibility."

---

## Trade-Offs Summary (January 15, 2026)

| Decision | Trade-Off | Rationale |
|----------|-----------|-----------|
| 4 models vs 2 models | 2× database rows | More perspectives outweighs storage cost |
| Database-driven prompts | Extra DB query per analysis | Flexibility > minor latency |
| URL-only input | Less user control | Better UX > edge case control |
| Comprehensive logging | Larger log volume | Debuggability > storage cost |
| Parallel execution | Complex error handling | Performance > simplicity |

### Key Principle

"Prefer flexibility and observability over premature optimization. Storage is cheap, debugging production issues is expensive."