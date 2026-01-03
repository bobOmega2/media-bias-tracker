// scripts/initArticles.ts
/**
 * Script to fetch latest articles from GNews, insert them into Supabase,
 * and run AI bias analysis on each article.
 *
 * Designed for initial setup or testing.
 *  */

import { insertGNewsArticles } from '@/lib/gnews'
import { analyzeArticlesBatch } from '@/lib/ai'

async function main() {
  try {
    console.log('Fetching and inserting articles...')

    // Fetch articles from GNews and insert into Supabase
    const insertedArticles = await insertGNewsArticles()
    console.log(`Inserted ${insertedArticles.length} articles.`)

    // For testing: limit the number of articles to analyze
    const testArticles = insertedArticles.slice(0, 1)
    console.log(`Analyzing ${testArticles.length} articles for testing...`)

    // Map articles to required format for analyzeArticlesBatch() function
    const articlesToAnalyze = testArticles.map(a => ({
      mediaId: a.id,
      title: a.title,
      url: a.url,
      source: a.source
    }))

    // Run batch analysis
    const analysisResults = await analyzeArticlesBatch(articlesToAnalyze)

    console.log('Batch analysis complete.')
    console.log('Sample results:', analysisResults.slice(0, 2)) // show first 2 for sanity check
  } catch (error) {
    console.error('Error in script:', error)
  }
}

// Run the script
main().then(() => console.log('Script finished.'))
