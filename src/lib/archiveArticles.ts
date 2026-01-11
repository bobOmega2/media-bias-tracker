import { supabaseAdmin } from '@/utils/supabase/admin'

export interface ArchivalResult {
  articlesProcessed: number
  articlesArchived: number
  articlesFailed: number
  aiScoresArchived: number
  errors: Array<{ articleId: string; error: string }>
}

export interface ArchivalOptions {
  batchSize?: number
  dryRun?: boolean
}

/**
 * Archives old GNews articles (1+ days old) from media and ai_scores tables
 * to archived_media and archived_ai_scores tables.
 *
 * Only archives articles where user_analyzed = false (GNews articles).
 * Deletes original records after successful archiving.
 *
 * @param options - Configuration options
 * @param options.batchSize - Number of articles to process (default: 50)
 * @param options.dryRun - If true, identifies articles but doesn't archive (default: false)
 * @returns Detailed results of the archival operation
 */
export async function archiveOldArticles(
  options: ArchivalOptions = {}
): Promise<ArchivalResult> {
  const { batchSize = 50, dryRun = false } = options

  const result: ArchivalResult = {
    articlesProcessed: 0,
    articlesArchived: 0,
    articlesFailed: 0,
    aiScoresArchived: 0,
    errors: []
  }

  try {
    // Calculate yesterday's date (articles older than 1 day)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const yesterdayISO = yesterday.toISOString()

    console.log('[Archive] Cutoff date:', yesterdayISO)
    console.log('[Archive] Batch size:', batchSize)
    console.log('[Archive] Dry run:', dryRun)

    // Query old GNews articles
    const { data: oldArticles, error: queryError } = await supabaseAdmin
      .from('media')
      .select('*')
      .eq('user_analyzed', false)
      .lt('created_at', yesterdayISO)
      .limit(batchSize)

    if (queryError) {
      console.error('[Archive] Query error:', queryError)
      throw new Error(`Failed to query old articles: ${queryError.message}`)
    }

    if (!oldArticles || oldArticles.length === 0) {
      console.log('[Archive] No articles to archive')
      return result
    }

    console.log('[Archive] Found articles to archive:', oldArticles.length)
    result.articlesProcessed = oldArticles.length

    if (dryRun) {
      console.log('[Archive] DRY RUN - Would archive:', oldArticles.map(a => a.id))
      return result
    }

    // Process each article
    for (const article of oldArticles) {
      try {
        console.log('[Archive] Processing article:', article.id)

        // Fetch related ai_scores
        const { data: aiScores, error: scoresError } = await supabaseAdmin
          .from('ai_scores')
          .select('*')
          .eq('media_id', article.id)

        if (scoresError) {
          throw new Error(`Failed to fetch ai_scores: ${scoresError.message}`)
        }

        // Insert article into archived_media (id will auto-generate)
        const archivedArticle = {
          title: article.title,
          url: article.url,
          source: article.source,
          image_url: article.image_url,
          description: article.description,
          published_at: article.published_at,
          media_type: article.media_type,
          category_id: article.category_id,
          user_analyzed: article.user_analyzed,
          on_homepage: article.on_homepage || false,
          created_at: article.created_at
        }

        const { error: archiveError } = await supabaseAdmin
          .from('archived_media')
          .insert(archivedArticle)

        if (archiveError) {
          throw new Error(`Failed to insert into archived_media: ${archiveError.message}`)
        }

        // Insert ai_scores into archived_ai_scores (id will auto-generate, media_id preserved)
        if (aiScores && aiScores.length > 0) {
          const archivedScores = aiScores.map(score => ({
            media_id: score.media_id,
            category_id: score.category_id,
            score: score.score,
            explanation: score.explanation,
            model_name: score.model_name,
            created_at: score.created_at
          }))

          const { error: scoresArchiveError } = await supabaseAdmin
            .from('archived_ai_scores')
            .insert(archivedScores)

          if (scoresArchiveError) {
            throw new Error(`Failed to insert into archived_ai_scores: ${scoresArchiveError.message}`)
          }

          result.aiScoresArchived += aiScores.length
        } else {
          console.warn('[Archive] No AI scores for article:', article.id)
        }

        // Delete from ai_scores first (child table, maintain FK integrity)
        if (aiScores && aiScores.length > 0) {
          const { error: deleteScoresError } = await supabaseAdmin
            .from('ai_scores')
            .delete()
            .eq('media_id', article.id)

          if (deleteScoresError) {
            throw new Error(`Failed to delete ai_scores: ${deleteScoresError.message}`)
          }
        }

        // Delete from media last (parent table)
        const { error: deleteMediaError } = await supabaseAdmin
          .from('media')
          .delete()
          .eq('id', article.id)

        if (deleteMediaError) {
          throw new Error(`Failed to delete media: ${deleteMediaError.message}`)
        }

        result.articlesArchived++
        console.log('[Archive] Successfully archived:', article.id)

      } catch (articleError) {
        result.articlesFailed++
        const errorMessage = articleError instanceof Error ? articleError.message : 'Unknown error'
        console.error('[Archive] Failed to archive article:', article.id, errorMessage)
        result.errors.push({
          articleId: article.id,
          error: errorMessage
        })
        // Continue processing remaining articles
      }
    }

    console.log('[Archive] Archival complete:', {
      processed: result.articlesProcessed,
      archived: result.articlesArchived,
      failed: result.articlesFailed,
      aiScoresArchived: result.aiScoresArchived
    })

    return result

  } catch (error) {
    console.error('[Archive] Fatal error:', error)
    throw error
  }
}
