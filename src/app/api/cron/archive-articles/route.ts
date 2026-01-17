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
 * 3. Analyze sample articles (first 18 with 4 models: Gemini, Qwen, GPT-OSS, Llama Maverick)
 *
 * Security: Requires CRON_SECRET environment variable for authorization
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const runId = `cron-${Date.now()}`

  console.log('='.repeat(80))
  console.log(`[Cron ${runId}] ========== CRON JOB STARTED ==========`)
  console.log(`[Cron ${runId}] Timestamp: ${new Date().toISOString()}`)
  console.log(`[Cron ${runId}] Environment check:`)
  console.log(`[Cron ${runId}]   - CRON_SECRET exists: ${!!process.env.CRON_SECRET}`)
  console.log(`[Cron ${runId}]   - GNEWS_API_KEY exists: ${!!process.env.GNEWS_API_KEY}`)
  console.log(`[Cron ${runId}]   - GEMINI_API_KEY exists: ${!!process.env.GEMINI_API_KEY}`)
  console.log(`[Cron ${runId}]   - GROQ_API_KEY exists: ${!!process.env.GROQ_API_KEY}`)
  console.log(`[Cron ${runId}]   - SUPABASE_URL exists: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log('='.repeat(80))

  // Verify Vercel Cron authorization
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedAuth) {
    console.error(`[Cron ${runId}] ❌ UNAUTHORIZED access attempt`)
    console.error(`[Cron ${runId}] Auth header present: ${!!authHeader}`)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  console.log(`[Cron ${runId}] ✓ Authorization verified`)

  try {
    // Step 1: Archive old articles
    console.log(`[Cron ${runId}] `)
    console.log(`[Cron ${runId}] ========== STEP 1: ARCHIVING OLD ARTICLES ==========`)
    console.log(`[Cron ${runId}] Starting archival: ${new Date().toISOString()}`)

    const archiveResult = await archiveOldArticles()

    const archiveDuration = Date.now() - startTime
    console.log(`[Cron ${runId}] ✓ Archival complete in ${archiveDuration}ms`)
    console.log(`[Cron ${runId}] Archival results:`)
    console.log(`[Cron ${runId}]   - Articles processed: ${archiveResult.articlesProcessed}`)
    console.log(`[Cron ${runId}]   - Articles archived: ${archiveResult.articlesArchived}`)
    console.log(`[Cron ${runId}]   - Articles failed: ${archiveResult.articlesFailed}`)
    console.log(`[Cron ${runId}]   - AI scores archived: ${archiveResult.aiScoresArchived}`)
    if (archiveResult.errors.length > 0) {
      console.log(`[Cron ${runId}]   - Errors: ${JSON.stringify(archiveResult.errors)}`)
    }

    // Check if archival had any articles to process
    if (archiveResult.articlesProcessed === 0) {
      console.log(`[Cron ${runId}] ℹ No articles to archive, proceeding to fetch`)
    }

    // Step 2: Fetch and analyze new articles
    console.log(`[Cron ${runId}] `)
    console.log(`[Cron ${runId}] ========== STEP 2: FETCHING & ANALYZING NEW ARTICLES ==========`)
    console.log(`[Cron ${runId}] Starting article fetch: ${new Date().toISOString()}`)
    const fetchStartTime = Date.now()
    let fetchResult

    try {
      fetchResult = await runInitArticles()
      const fetchDuration = Date.now() - fetchStartTime
      console.log(`[Cron ${runId}] ✓ Fetch & analysis complete in ${fetchDuration}ms (${(fetchDuration / 1000 / 60).toFixed(2)} minutes)`)
      console.log(`[Cron ${runId}] Fetch results:`)
      console.log(`[Cron ${runId}]   - Articles fetched: ${fetchResult.articlesFetched}`)
      console.log(`[Cron ${runId}]   - Articles analyzed (at least 1 model): ${fetchResult.articlesAnalyzed}`)
      console.log(`[Cron ${runId}]   - Full analyses (all 4 models): ${fetchResult.fullAnalyses || 'N/A'}`)
      console.log(`[Cron ${runId}]   - Failed analyses: ${fetchResult.failedAnalyses || 'N/A'}`)
      console.log(`[Cron ${runId}]   - Success: ${fetchResult.success}`)
    } catch (fetchError) {
      const fetchDuration = Date.now() - fetchStartTime
      const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error'
      console.error(`[Cron ${runId}] ❌ Fetch FAILED after ${fetchDuration}ms`)
      console.error(`[Cron ${runId}] Error message: ${fetchErrorMessage}`)
      console.error(`[Cron ${runId}] Error stack:`, fetchError)

      fetchResult = {
        success: false,
        error: fetchErrorMessage,
        articlesFetched: 0,
        articlesAnalyzed: 0
      }
    }

    const totalDuration = Date.now() - startTime

    console.log(`[Cron ${runId}] `)
    console.log(`[Cron ${runId}] ========== CRON JOB COMPLETED ==========`)
    console.log(`[Cron ${runId}] Total duration: ${totalDuration}ms (${(totalDuration / 1000 / 60).toFixed(2)} minutes)`)
    console.log(`[Cron ${runId}] End timestamp: ${new Date().toISOString()}`)
    console.log('='.repeat(80))

    return NextResponse.json({
      success: true,
      runId,
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
    const errorStack = error instanceof Error ? error.stack : 'No stack trace'

    console.error(`[Cron ${runId}] `)
    console.error(`[Cron ${runId}] ========== CRON JOB CRITICAL FAILURE ==========`)
    console.error(`[Cron ${runId}] ❌ Critical failure after ${duration}ms`)
    console.error(`[Cron ${runId}] Error message: ${errorMessage}`)
    console.error(`[Cron ${runId}] Error stack: ${errorStack}`)
    console.error(`[Cron ${runId}] Full error object:`, error)
    console.error('='.repeat(80))

    return NextResponse.json(
      {
        error: 'Cron job failed',
        runId,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        duration
      },
      { status: 500 }
    )
  }
}
