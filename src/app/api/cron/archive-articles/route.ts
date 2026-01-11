import { NextRequest, NextResponse } from 'next/server'
import { archiveOldArticles } from '@/lib/archiveArticles'

/**
 * Vercel Cron Job endpoint for archiving old articles
 * Runs daily at 9am ET (14:00 UTC)
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
    console.log('[Cron] Starting archival:', new Date().toISOString())

    // Use conservative batch size for cron (avoid timeouts)
    const result = await archiveOldArticles({
      batchSize: 25
    })

    const duration = Date.now() - startTime
    console.log('[Cron] Archival complete in', duration, 'ms')
    console.log('[Cron] Results:', result)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      ...result
    })

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error('[Cron] Archival failed:', errorMessage)
    console.error('[Cron] Error details:', error)

    return NextResponse.json(
      {
        error: 'Archival failed',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        duration
      },
      { status: 500 }
    )
  }
}
