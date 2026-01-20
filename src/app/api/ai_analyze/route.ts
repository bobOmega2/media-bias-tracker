/**
 * API Route: /api/ai_analyze
 * Analyzes articles for bias using 4 AI models
 *
 * Handles both:
 * - User-submitted articles (extracts metadata from URL, inserts to database with user_analyzed=true)
 * - Existing articles (analyzes directly with provided mediaId)
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeArticle } from '@/lib/ai'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { extract } from '@extractus/article-extractor'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const mediaId = data.mediaId
    const url = data.url
    const supabase = await createClient()

    // Validate URL is provided
    if (!url) {
      return NextResponse.json(
        { error: 'Missing required field: url' },
        { status: 400 }
      )
    }

    // Handle user-submitted articles (no mediaId provided)
    let finalMediaId = mediaId
    let mediaRecord = null
    let title = data.title
    let source = data.source

    if (!mediaId) {
      // Extract article metadata from URL
      try {
        const extractedArticle = await extract(url)

        if (!extractedArticle) {
          return NextResponse.json(
            { error: 'Could not extract article content from URL. Please check the URL is valid.' },
            { status: 400 }
          )
        }

        // Use extracted data, fallback to provided data or defaults
        title = extractedArticle.title || title || 'Untitled Article'
        source = extractedArticle.source || new URL(url).hostname.replace('www.', '')

        const description = extractedArticle.description || null
        const imageUrl = extractedArticle.image || null

        // Insert new article into database with user_analyzed flag
        const { data: newMedia, error: insertError } = await supabase
          .from('media')
          .insert({
            title,
            url,
            source,
            description,
            image_url: imageUrl,
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

      } catch (extractError) {
        console.error('Error extracting article:', extractError)
        return NextResponse.json(
          { error: 'Failed to extract article from URL. Please check the URL is accessible.' },
          { status: 400 }
        )
      }
    }

    // Run AI analysis on the article
    // Use supabaseAdmin to bypass RLS for inserting AI scores
    const analysis = await analyzeArticle({
      mediaId: finalMediaId,
      url,
      title,
      source,
      supabaseClient: supabaseAdmin
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
