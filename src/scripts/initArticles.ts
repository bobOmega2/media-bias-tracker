// scripts/initArticles.ts
/**
 * Script to fetch latest articles from GNews, insert them into Supabase,
 * and run AI bias analysis on each article.
 *
 * Designed for initial setup or testing.
 * Can be run standalone or imported by cron jobs.
 */

//import { insertGNewsArticles } from '@/lib/gnews'
//import { analyzeArticlesBatch } from '@/lib/ai'
import { insertGNewsArticles } from '../lib/gnews'
import { analyzeArticlesBatch } from '../lib/ai'

/**
 * Exported function for cron job usage
 * Fetches articles from GNews and analyzes one article per category
 */
export async function runInitArticles() {
  try {
    console.log('[InitArticles] Fetching and inserting articles...')

    // Fetch articles from GNews and insert into Supabase
    const insertedArticles = await insertGNewsArticles()
    console.log(`[InitArticles] Inserted ${insertedArticles.length} articles.`)

    // For testing: pick one article per category
    const articlesByCategory: Record<string, any> = {}
    for (const article of insertedArticles) {
      if (!articlesByCategory[article.category_id]) {
        articlesByCategory[article.category_id] = article
      }
    }

    // Get an array of one article per category
    const testArticles = Object.values(articlesByCategory)

    console.log(`[InitArticles] Analyzing ${testArticles.length} articles...`)

    // Map articles to required format for analyzeArticlesBatch() function
    const articlesToAnalyze = testArticles.map(a => ({
      mediaId: a.id,
      title: a.title,
      url: a.url,
      source: a.source
    }))

    // Run batch analysis
    const analysisResults = await analyzeArticlesBatch(articlesToAnalyze)

    console.log('[InitArticles] Batch analysis complete.')
    console.log('[InitArticles] Sample results:', analysisResults.slice(0, 20))

    return {
      articlesFetched: insertedArticles.length,
      articlesAnalyzed: analysisResults.length,
      success: true
    }
  } catch (error) {
    console.error('[InitArticles] Error:', error)
    throw error
  }
}

// Standalone main function for manual script usage
async function main() {
  try {
    await runInitArticles()
  } catch (error) {
    console.error('Error in script:', error)
  }
}

// Run the script when executed directly
// main().then(() => console.log('Script finished.'))
