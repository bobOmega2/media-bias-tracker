/**
 * Cookie Management for User-Analyzed Articles
 *
 * This utility manages browser cookies to track which articles
 * a user has analyzed. Stores only article IDs, not full data.
 *
 * Cookie name: "analyzed_articles"
 * Cookie value: JSON array of article IDs
 * Max articles: 50 (prevents cookie size issues)
 * Expiration: 90 days
 */

const COOKIE_NAME = 'analyzed_articles'
const MAX_ARTICLES = 50
const EXPIRATION_DAYS = 90

/**
 * Get array of analyzed article IDs from cookie
 *
 * How it works:
 * 1. Reads browser cookie string
 * 2. Finds our cookie by name
 * 3. Parses JSON string to array
 * 4. Returns array of IDs (or empty array if cookie doesn't exist)
 *
 * @returns Array of article IDs that user has analyzed
 */
export function getAnalyzedArticles(): string[] {
  // Check if we're in browser (not server-side rendering)
  if (typeof document === 'undefined') {
    return []
  }

  try {
    // Get all cookies as string: "cookie1=value1; cookie2=value2"
    const cookies = document.cookie.split('; ')

    // Find our specific cookie
    const analyzedArticlesCookie = cookies.find(cookie =>
      cookie.startsWith(`${COOKIE_NAME}=`)
    )

    if (!analyzedArticlesCookie) {
      return [] // Cookie doesn't exist yet
    }

    // Extract value after "analyzed_articles="
    const cookieValue = analyzedArticlesCookie.split('=')[1]

    // Parse JSON string to array
    // Example: "['id1','id2']" → ['id1', 'id2']
    const articleIds = JSON.parse(decodeURIComponent(cookieValue))

    return Array.isArray(articleIds) ? articleIds : []
  } catch (error) {
    console.error('Error reading analyzed articles cookie:', error)
    return []
  }
}

/**
 * Add new article ID to cookie
 *
 * How it works:
 * 1. Get current array of IDs from cookie
 * 2. Add new ID to beginning (most recent first)
 * 3. Remove duplicates (if article was analyzed before)
 * 4. Keep only last 50 articles (prevent cookie overflow)
 * 5. Save back to cookie with 90-day expiration
 *
 * @param articleId - UUID of article to add to history
 */
export function addAnalyzedArticle(articleId: string): void {
  // Check if we're in browser
  if (typeof document === 'undefined') {
    return
  }

  try {
    // Get current list
    const currentIds = getAnalyzedArticles()

    // Add new ID to beginning, remove duplicates
    const updatedIds = [
      articleId,
      ...currentIds.filter(id => id !== articleId)
    ]

    // Keep only last 50 articles
    const trimmedIds = updatedIds.slice(0, MAX_ARTICLES)

    // Convert array to JSON string
    const cookieValue = encodeURIComponent(JSON.stringify(trimmedIds))

    // Calculate expiration date
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + EXPIRATION_DAYS)

    // Set cookie with proper attributes
    // - SameSite=Lax: CSRF protection
    // - path=/: Available on all pages
    // - expires: Auto-delete after 90 days
    document.cookie = `${COOKIE_NAME}=${cookieValue}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`

    console.log(`Added article ${articleId} to history (total: ${trimmedIds.length})`)
  } catch (error) {
    console.error('Error saving article to cookie:', error)
  }
}

/**
 * Clear all analyzed articles from cookie (optional utility)
 * Useful for testing or if user wants to reset history
 */
export function clearAnalyzedArticles(): void {
  if (typeof document === 'undefined') {
    return
  }

  // Set cookie with past expiration date to delete it
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  console.log('Cleared analyzed articles history')
}
