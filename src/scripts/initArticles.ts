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
  const startTime = Date.now()

  console.log('[InitArticles] ========================================')
  console.log('[InitArticles] STARTING ARTICLE FETCH & ANALYSIS')
  console.log('[InitArticles] ========================================')
  console.log(`[InitArticles] Start time: ${new Date().toISOString()}`)

  try {
    // Step 1: Fetch articles from GNews
    console.log('[InitArticles] ')
    console.log('[InitArticles] --- Step 1: Fetching articles from GNews ---')
    const fetchStartTime = Date.now()

    const insertedArticles = await insertGNewsArticles()

    const fetchDuration = Date.now() - fetchStartTime
    console.log(`[InitArticles] ✓ GNews fetch complete in ${fetchDuration}ms`)
    console.log(`[InitArticles] Total articles inserted: ${insertedArticles.length}`)

    if (insertedArticles.length === 0) {
      console.warn('[InitArticles] ⚠ No articles were inserted. Check GNews API or duplicates.')
      return {
        articlesFetched: 0,
        articlesAnalyzed: 0,
        success: true,
        warning: 'No articles inserted'
      }
    }

    // Log sample of inserted articles
    console.log('[InitArticles] Sample of inserted articles:')
    insertedArticles.slice(0, 3).forEach((a, i) => {
      console.log(`[InitArticles]   ${i + 1}. ${a.title.substring(0, 50)}... (${a.source})`)
    })

    // Step 2: Select articles for analysis
    console.log('[InitArticles] ')
    console.log('[InitArticles] --- Step 2: Selecting articles for analysis ---')

    // Analyze first 18 articles (fits within 5-minute timeout with 15s delays)
    const testArticles = insertedArticles.slice(0, 18)
    console.log(`[InitArticles] Selected ${testArticles.length} articles for analysis`)
    console.log(`[InitArticles] Estimated analysis time: ${((testArticles.length * 15) / 60).toFixed(1)} minutes`)

    // Map articles to required format for analyzeArticlesBatch() function
    const articlesToAnalyze = testArticles.map(a => ({
      mediaId: a.id,
      title: a.title,
      url: a.url,
      source: a.source
    }))

    // Step 3: Run AI analysis
    console.log('[InitArticles] ')
    console.log('[InitArticles] --- Step 3: Running AI analysis on articles ---')
    const analysisStartTime = Date.now()

    const analysisResults = await analyzeArticlesBatch(articlesToAnalyze)

    const analysisDuration = Date.now() - analysisStartTime
    console.log(`[InitArticles] ✓ Analysis complete in ${(analysisDuration / 1000 / 60).toFixed(2)} minutes`)

    // Calculate success metrics
    const successfulAnalyses = analysisResults.filter(r =>
      r.gemini || r.qwen || r.gptOss || r.llamaMaverick
    ).length

    const fullSuccessAnalyses = analysisResults.filter(r =>
      r.gemini && r.qwen && r.gptOss && r.llamaMaverick
    ).length

    // Summary
    const totalDuration = Date.now() - startTime
    console.log('[InitArticles] ')
    console.log('[InitArticles] ========================================')
    console.log('[InitArticles] SUMMARY')
    console.log('[InitArticles] ========================================')
    console.log(`[InitArticles] Total articles fetched from GNews: ${insertedArticles.length}`)
    console.log(`[InitArticles] Articles sent for analysis: ${testArticles.length}`)
    console.log(`[InitArticles] Successful analyses (at least 1 model): ${successfulAnalyses}`)
    console.log(`[InitArticles] Full analyses (all 4 models): ${fullSuccessAnalyses}`)
    console.log(`[InitArticles] Failed analyses: ${testArticles.length - successfulAnalyses}`)
    console.log(`[InitArticles] Total duration: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`)
    console.log(`[InitArticles] End time: ${new Date().toISOString()}`)
    console.log('[InitArticles] ========================================')

    return {
      articlesFetched: insertedArticles.length,
      articlesAnalyzed: successfulAnalyses,
      fullAnalyses: fullSuccessAnalyses,
      failedAnalyses: testArticles.length - successfulAnalyses,
      durationMs: totalDuration,
      success: true
    }
  } catch (error) {
    const totalDuration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : 'No stack trace'

    console.error('[InitArticles] ')
    console.error('[InitArticles] ========================================')
    console.error('[InitArticles] ❌ CRITICAL ERROR')
    console.error('[InitArticles] ========================================')
    console.error(`[InitArticles] Error message: ${errorMessage}`)
    console.error(`[InitArticles] Stack trace: ${errorStack}`)
    console.error(`[InitArticles] Duration before error: ${(totalDuration / 1000).toFixed(1)}s`)
    console.error('[InitArticles] ========================================')

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
