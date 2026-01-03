/**
 * API Route: /api/ai_analyze
 * Analyzes an EXISTING article for bias using Gemini 2.5 Flash
 *
 * IMPORTANT:
 * - Media must already exist in the database
 * - This route ONLY runs AI analysis and stores ai_scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeArticle } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const mediaId = data.mediaId
    const url = data.url
    const title = data.title
    const source = data.source

    // Validate required fields
    if (!mediaId || !url || !title || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: mediaId, url, title, source' },
        { status: 400 }
      )
    }

    // Running AI analysis ONLY (no media insertion)
    const analysis = await analyzeArticle({
      mediaId,
      url,
      title,
      source
    })

    // Return AI result only
    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}
