import { NextRequest, NextResponse } from 'next/server'
import { archiveOldArticles } from '@/lib/archiveArticles'
import { runInitArticles } from '@/scripts/initArticles'

/**
 * Vercel Cron Job endpoint for archiving old articles and fetching new ones
 * Runs daily at 9am ET (14:00 UTC)
 *
 * Steps:
 * 1. Archive old articles (1+ days old)
 * 2. Fetch new articles from GNews API
 * 3. Analyze sample articles (1 per category)
 *
 * Security: Requires CRON_SECRET environment variable for authorization
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verify Vercel Cron authorization
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedAuth) {
    console.error('[Cron] Unauthorized access attempt')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Step 1: Archive old articles
    console.log('[Cron] Starting archival:', new Date().toISOString())

    const archiveResult = await archiveOldArticles()

    const archiveDuration = Date.now() - startTime
    console.log('[Cron] Archival complete in', archiveDuration, 'ms')
    console.log('[Cron] Archival results:', archiveResult)

    // Check if archival had any articles to process
    if (archiveResult.articlesProcessed === 0) {
      console.log('[Cron] No articles to archive, proceeding to fetch')
    }

    // Step 2: Fetch and analyze new articles
    // Always run fetch, even if archival had partial failures or no articles
    console.log('[Cron] Starting article fetch:', new Date().toISOString())
    const fetchStartTime = Date.now()
    let fetchResult

    try {
      fetchResult = await runInitArticles()
      const fetchDuration = Date.now() - fetchStartTime
      console.log('[Cron] Fetch complete in', fetchDuration, 'ms')
      console.log('[Cron] Fetch results:', fetchResult)
    } catch (fetchError) {
      const fetchDuration = Date.now() - fetchStartTime
      const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error'
      console.error('[Cron] Fetch failed:', fetchErrorMessage)
      console.error('[Cron] Fetch error details:', fetchError)

      fetchResult = {
        success: false,
        error: fetchErrorMessage,
        articlesFetched: 0,
        articlesAnalyzed: 0
      }
    }

    const totalDuration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      archival: {
        articlesProcessed: archiveResult.articlesProcessed,
        articlesArchived: archiveResult.articlesArchived,
        articlesFailed: archiveResult.articlesFailed,
        aiScoresArchived: archiveResult.aiScoresArchived,
        errors: archiveResult.errors
      },
      fetch: fetchResult
    })

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error('[Cron] Critical failure:', errorMessage)
    console.error('[Cron] Error details:', error)

    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        duration
      },
      { status: 500 }
    )
  }
}
