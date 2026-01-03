/**
 * API Route: /api/ai_analyze
 * Analyzes article content for bias using Gemini 2.5 Flash
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeArticle } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const url = data.url
    const title = data.title
    const source = data.source

    if (!url || !title || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: url, title, source' },
        { status: 400 }
      )
    }

    // Call the lib function that does everything, fetch, AI analyze, and save
    const result = await analyzeArticle({ url, title, source })

    // returning values 
    return NextResponse.json({
      success: true,
      media: result.media,
      analysis: result.analysis
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}
