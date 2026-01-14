/**
 * API Route: /api/ai_analyze
 * Analyzes articles for bias using Gemini 2.5 Flash
 *
 * Handles both:
 * - User-submitted articles (inserts to database first with user_analyzed=true)
 * - Existing articles (analyzes directly with provided mediaId)
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeArticle } from '@/lib/ai'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const mediaId = data.mediaId
    const url = data.url
    const title = data.title
    const source = data.source
    const supabase = await createClient()

    // Validate required fields (mediaId is now optional)
    if (!url || !title || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: url, title, source' },
        { status: 400 }
      )
    }

    // Handle user-submitted articles (no mediaId provided)
    let finalMediaId = mediaId
    let mediaRecord = null

    if (!mediaId) {
      // Insert new article into database with user_analyzed flag
      const { data: newMedia, error: insertError } = await supabase
        .from('media')
        .insert({
          title,
          url,
          source,
          media_type: 'article',
          user_analyzed: true  // Mark as user submission
        })
        .select()
        .single()

      if (insertError || !newMedia) {
        console.error('Error inserting article:', insertError)
        return NextResponse.json(
          { error: 'Failed to save article to database' },
          { status: 500 }
        )
      }

      finalMediaId = newMedia.id
      mediaRecord = newMedia
      console.log(`Inserted user article: ${title} (ID: ${finalMediaId})`)
    }

    // Run AI analysis on the article
    const analysis = await analyzeArticle({
      mediaId: finalMediaId,
      url,
      title,
      source,
      supabaseClient: supabase
    })

    // Return media record and analysis from all 4 models
    return NextResponse.json({
      success: true,
      media: mediaRecord || { id: finalMediaId, title, url, source },
      analysis: {
        gemini: analysis.gemini,
        qwen: analysis.qwen,
        gptOss: analysis.gptOss,
        llamaMaverick: analysis.llamaMaverick
      }
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}
