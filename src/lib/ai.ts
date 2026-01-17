// lib/ai.ts
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/utils/supabase/server'
import { extract } from '@extractus/article-extractor'
import { SupabaseClient } from '@supabase/supabase-js' // for typescript
import { supabaseAdmin } from '@/utils/supabase/admin'
import Groq from 'groq-sdk'

// The AI client automatically uses GEMINI_API_KEY from .env
export const ai = new GoogleGenAI({})

// Groq client for Llama models
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]

// Groq models are now passed as parameters to analyzeWithGroq()

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface AIScore {
  category: string
  score: number
  explanation: string
}

export interface AIAnalysis {
  scores: AIScore[]
  summary: string
}

/**
 * Helper function to save AI model scores to database
 */
async function saveModelScores(
  analysis: AIAnalysis | null,
  modelName: string,
  mediaId: string,
  categories: Array<{ id: string; name: string }>,
  supabaseClient: SupabaseClient
) {
  if (!analysis || !analysis.scores || analysis.scores.length === 0) return

  for (const score of analysis.scores) {
    const category = categories.find(c => c.name === score.category)
    if (!category) {
      console.warn(`Category not found for score: ${score.category}`)
      continue
    }

    const { error: scoreError } = await supabaseClient
      .from('ai_scores')
      .insert({
        media_id: mediaId,
        category_id: category.id,
        score: score.score,
        explanation: score.explanation,
        model_name: modelName
      })

    if (scoreError) {
      console.error(`Error saving ${modelName} score:`, scoreError)
    }
  }
}

/**
 * Analyze an article for bias and save scores to Supabase
 * NOTE: Takes in mediaId to avoid inserting media here (separation of concerns)
 * Returns results from 4 AI models: Gemini, Qwen, GPT-OSS, and Llama Maverick
 */
export async function analyzeArticle({
  mediaId,
  url,
  title,
  source,
  supabaseClient
}: {
  mediaId: string
  url: string
  title: string
  source: string
  supabaseClient: SupabaseClient
}): Promise<{
  gemini: AIAnalysis | null
  qwen: AIAnalysis | null
  gptOss: AIAnalysis | null
  llamaMaverick: AIAnalysis | null
}> {
  const analysisStartTime = Date.now()
  console.log(`[AI] ---- Starting analysis for article: ${mediaId} ----`)
  console.log(`[AI] Title: ${title.substring(0, 80)}...`)
  console.log(`[AI] Source: ${source}`)
  console.log(`[AI] URL: ${url}`)

  // Validate input
  if (!mediaId || !url || !title || !source) {
    console.error(`[AI] ❌ Missing required fields for article ${mediaId}`)
    throw new Error('Missing required fields: mediaId, url, title, source')
  }

  // Fetch article content
  console.log(`[AI] Fetching article content...`)
  const fetchStartTime = Date.now()
  const articleContent = await fetchArticleContent(url)
  const fetchDuration = Date.now() - fetchStartTime

  if (!articleContent) {
    console.error(`[AI] ❌ Could not fetch article content after ${fetchDuration}ms`)
    throw new Error('Could not fetch article content')
  }
  console.log(`[AI] ✓ Article content fetched in ${fetchDuration}ms (${articleContent.length} chars)`)

  // Get bias categories from database (including descriptions for dynamic prompts)
  console.log(`[AI] Fetching bias categories from database...`)
  const { data: categories, error: categoriesError } = await supabaseClient
    .from('bias_categories')
    .select('id, name, description')

  if (categoriesError || !categories) {
    console.error(`[AI] ❌ Could not fetch bias categories:`, categoriesError)
    throw new Error('Could not fetch bias categories')
  }
  console.log(`[AI] ✓ Found ${categories.length} bias categories: ${categories.map(c => c.name).join(', ')}`)

  // Run ALL 4 models in parallel (pass full category objects with descriptions)
  console.log(`[AI] Starting parallel analysis with 4 models...`)
  const parallelStartTime = Date.now()

  const [geminiAnalysis, qwenAnalysis, gptOssAnalysis, llamaMaverickAnalysis] = await Promise.all([
    analyzeWithGemini(articleContent, categories),
    analyzeWithGroq(articleContent, categories, 'qwen/qwen3-32b'),
    analyzeWithGroq(articleContent, categories, 'openai/gpt-oss-120b'),
    analyzeWithGroq(articleContent, categories, 'meta-llama/llama-4-maverick-17b-128e-instruct')
  ])

  const parallelDuration = Date.now() - parallelStartTime
  console.log(`[AI] Parallel analysis completed in ${parallelDuration}ms`)
  console.log(`[AI] Model results:`)
  console.log(`[AI]   - Gemini: ${geminiAnalysis ? '✓ SUCCESS' : '❌ FAILED'}`)
  console.log(`[AI]   - Qwen: ${qwenAnalysis ? '✓ SUCCESS' : '❌ FAILED'}`)
  console.log(`[AI]   - GPT-OSS: ${gptOssAnalysis ? '✓ SUCCESS' : '❌ FAILED'}`)
  console.log(`[AI]   - Llama Maverick: ${llamaMaverickAnalysis ? '✓ SUCCESS' : '❌ FAILED'}`)

  // Check if at least one succeeded
  const successCount = [geminiAnalysis, qwenAnalysis, gptOssAnalysis, llamaMaverickAnalysis].filter(Boolean).length
  console.log(`[AI] ${successCount}/4 models succeeded`)

  if (successCount === 0) {
    console.error(`[AI] ❌ All AI models failed to analyze article ${mediaId}`)
    throw new Error('All AI models failed to analyze')
  }

  // Save all model scores in parallel
  console.log(`[AI] Saving scores to database...`)
  const saveStartTime = Date.now()

  await Promise.all([
    saveModelScores(geminiAnalysis, 'gemini-2.5-flash', mediaId, categories, supabaseClient),
    saveModelScores(qwenAnalysis, 'qwen/qwen3-32b', mediaId, categories, supabaseClient),
    saveModelScores(gptOssAnalysis, 'openai/gpt-oss-120b', mediaId, categories, supabaseClient),
    saveModelScores(llamaMaverickAnalysis, 'meta-llama/llama-4-maverick-17b-128e-instruct', mediaId, categories, supabaseClient)
  ])

  const saveDuration = Date.now() - saveStartTime
  console.log(`[AI] ✓ Scores saved in ${saveDuration}ms`)

  const totalDuration = Date.now() - analysisStartTime
  console.log(`[AI] ---- Analysis complete for ${mediaId} in ${totalDuration}ms ----`)

  // Return ALL 4 analyses
  return {
    gemini: geminiAnalysis,
    qwen: qwenAnalysis,
    gptOss: gptOssAnalysis,
    llamaMaverick: llamaMaverickAnalysis
  }
}

// function to fetch article content from internet based on a URL
async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    // Using extract() to get clean article text (no ads, nav, etc.)
    const article = await extract(url)

    if (!article?.content) {
      return null
    }

    return article.content
  } catch (error) {
    console.error('Error fetching article content:', error)
    return null
  }
}

// function to analyze with Gemini Flash
export async function analyzeWithGemini(
  content: string,
  biasCategories: Array<{ name: string; description: string }>
): Promise<AIAnalysis | null> {
  const startTime = Date.now()
  console.log(`[Gemini] Starting analysis...`)
  console.log(`[Gemini] Content length: ${content.length} chars`)
  console.log(`[Gemini] Categories: ${biasCategories.map(c => c.name).join(', ')}`)

  // Build dynamic prompt from database category descriptions
  const categoryInstructions = biasCategories
    .map((cat, index) => `${index + 1}. ${cat.name.toUpperCase()}:\n${cat.description}`)
    .join('\n\n')

  const categoryList = biasCategories.map(c => c.name).join(', ')

  const exampleScores = biasCategories
    .map(cat => `    { "category": "${cat.name}", "score": 0.0, "explanation": "Brief explanation referencing specific article content" }`)
    .join(',\n')

  for (const model of MODELS) {
    const modelStartTime = Date.now()
    console.log(`[Gemini] Trying model: ${model}`)

    try {
      const response = await ai.models.generateContent({
        model,
        contents: `
You are an expert media bias analyst. Analyze this article for bias across multiple categories.

Article content:
${content}

SCORING INSTRUCTIONS:
Score each bias category from -1 to +1 using the scales defined below.

${categoryInstructions}

Categories to score: ${categoryList}

IMPORTANT:
- You MUST score ALL categories listed above: ${categoryList}
- Be precise with scores (use decimals like 0.3, -0.7, etc.)
- Each category should be scored independently
- Provide a brief, specific explanation for each score
- Base your analysis ONLY on the article content provided

Return ONLY valid JSON with no markdown, no code blocks, no extra text.
Format:
{
  "scores": [
${exampleScores}
  ],
  "summary": "One sentence summary of overall bias"
}
        `
      })

      const modelDuration = Date.now() - modelStartTime

      if (!response.text) {
        console.error(`[Gemini] ❌ Model ${model} returned no text after ${modelDuration}ms`)
        continue // skip to the next ai model
      }

      console.log(`[Gemini] Response received in ${modelDuration}ms, length: ${response.text.length} chars`)

      let jsonText = response.text
      if (jsonText.startsWith('```')) {
        console.log(`[Gemini] Cleaning markdown code blocks from response`)
        jsonText = jsonText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
      }

      const data: AIAnalysis = JSON.parse(jsonText)
      const totalDuration = Date.now() - startTime
      console.log(`[Gemini] ✓ Analysis SUCCESS with ${model} in ${totalDuration}ms`)
      console.log(`[Gemini] Scores: ${data.scores.map(s => `${s.category}=${s.score}`).join(', ')}`)
      console.log(`[Gemini] Summary: ${data.summary}`)
      return data
    } catch (error) {
      const modelDuration = Date.now() - modelStartTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Gemini] ❌ Error with ${model} after ${modelDuration}ms: ${errorMessage}`)
      if (error instanceof Error && error.stack) {
        console.error(`[Gemini] Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`)
      }
    }
  }

  const totalDuration = Date.now() - startTime
  console.error(`[Gemini] ❌ All models failed after ${totalDuration}ms`)
  return null
}

/**
 * Truncate content to fit within token limits while preserving meaning
 * Uses character-based estimation: ~4 chars per token
 */
function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content
  }

  // Truncate to max length
  let truncated = content.substring(0, maxChars)

  // Try to end at a sentence boundary (., !, ?)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  )

  if (lastSentenceEnd > maxChars * 0.8) {
    // If we found a sentence within the last 20%, use it
    truncated = truncated.substring(0, lastSentenceEnd + 1)
  }

  return truncated
}

// function to analyze with Groq (supports multiple Groq models)
export async function analyzeWithGroq(
  content: string,
  biasCategories: Array<{ name: string; description: string }>,
  modelName: string
): Promise<AIAnalysis | null> {
  const startTime = Date.now()
  const shortModelName = modelName.split('/').pop() || modelName
  console.log(`[Groq:${shortModelName}] Starting analysis...`)
  console.log(`[Groq:${shortModelName}] Original content length: ${content.length} chars`)

  // Truncate content to fit token limits
  // Conservative limits: ~4 chars per token, leaving room for prompt overhead
  const MAX_CONTENT_CHARS = 12000 // ~3000 tokens for content, rest for prompt/response
  const truncatedContent = truncateContent(content, MAX_CONTENT_CHARS)

  if (truncatedContent.length < content.length) {
    console.log(`[Groq:${shortModelName}] ⚠️ Content truncated from ${content.length} to ${truncatedContent.length} chars`)
  }

  console.log(`[Groq:${shortModelName}] Analysis content length: ${truncatedContent.length} chars`)

  // Build dynamic prompt from database category descriptions
  const categoryInstructions = biasCategories
    .map((cat, index) => `${index + 1}. ${cat.name.toUpperCase()}:\n${cat.description}`)
    .join('\n\n')

  const categoryList = biasCategories.map(c => c.name).join(', ')

  const exampleScores = biasCategories
    .map(cat => `    { "category": "${cat.name}", "score": 0.0, "explanation": "Brief explanation referencing specific article content" }`)
    .join(',\n')

  try {
    console.log(`[Groq:${shortModelName}] Sending request to Groq API...`)
    const apiStartTime = Date.now()

    const response = await groq.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: `
You are an expert media bias analyst. Analyze this article for bias across multiple categories.

Article content:
${truncatedContent}

SCORING INSTRUCTIONS:
Score each bias category from -1 to +1 using the scales defined below.

${categoryInstructions}

Categories to score: ${categoryList}

IMPORTANT:
- You MUST score ALL categories listed above: ${categoryList}
- Be precise with scores (use decimals like 0.3, -0.7, etc.)
- Each category should be scored independently
- Provide a brief, specific explanation for each score
- Base your analysis ONLY on the article content provided

Return ONLY valid JSON with no markdown, no code blocks, no extra text, no XML tags.
DO NOT include <think> tags or reasoning - output ONLY the JSON object.
Format:
{
  "scores": [
${exampleScores}
  ],
  "summary": "One sentence summary of overall bias"
}
          `
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })

    const apiDuration = Date.now() - apiStartTime
    console.log(`[Groq:${shortModelName}] API response received in ${apiDuration}ms`)

    const text = response.choices[0]?.message?.content
    if (!text) {
      console.error(`[Groq:${shortModelName}] ❌ Returned no text`)
      return null
    }

    console.log(`[Groq:${shortModelName}] Response length: ${text.length} chars`)

    // Clean up markdown and XML tags if present
    let jsonText = text

    // Remove markdown code blocks
    if (jsonText.startsWith('```')) {
      console.log(`[Groq:${shortModelName}] Cleaning markdown code blocks`)
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
    }

    // Remove <think> tags (Qwen sometimes includes these)
    if (jsonText.includes('<think>')) {
      console.log(`[Groq:${shortModelName}] Removing <think> tags from response`)
      jsonText = jsonText.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    }

    // Extract JSON if there's extra text before/after
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      if (jsonMatch[0].length !== jsonText.length) {
        console.log(`[Groq:${shortModelName}] Extracted JSON from surrounding text`)
      }
      jsonText = jsonMatch[0]
    }

    const data: AIAnalysis = JSON.parse(jsonText)
    const totalDuration = Date.now() - startTime
    console.log(`[Groq:${shortModelName}] ✓ Analysis SUCCESS in ${totalDuration}ms`)
    console.log(`[Groq:${shortModelName}] Scores: ${data.scores.map(s => `${s.category}=${s.score}`).join(', ')}`)
    console.log(`[Groq:${shortModelName}] Summary: ${data.summary}`)
    return data
  } catch (error) {
    const totalDuration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Groq:${shortModelName}] ❌ FAILED after ${totalDuration}ms: ${errorMessage}`)
    if (error instanceof Error && error.stack) {
      console.error(`[Groq:${shortModelName}] Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`)
    }
    return null
  }
}

// Function to batch analyze multiple articles
export async function analyzeArticlesBatch(
  articles: {
    mediaId: string
    title: string
    url: string
    source: string
  }[]
): Promise<Array<{
  gemini: AIAnalysis | null
  qwen: AIAnalysis | null
  gptOss: AIAnalysis | null
  llamaMaverick: AIAnalysis | null
}>> {
  const batchStartTime = Date.now()
  console.log(`[Batch] ========== STARTING BATCH ANALYSIS ==========`)
  console.log(`[Batch] Total articles to analyze: ${articles.length}`)
  console.log(`[Batch] Estimated time: ${((articles.length * 15) / 60).toFixed(1)} minutes (15s delay between articles)`)
  console.log(`[Batch] Start time: ${new Date().toISOString()}`)

  // typescript setup for results
  const results: Array<{
    gemini: AIAnalysis | null
    qwen: AIAnalysis | null
    gptOss: AIAnalysis | null
    llamaMaverick: AIAnalysis | null
  }> = []

  let successCount = 0
  let failCount = 0

  // Track per-model success rates
  const modelStats = {
    gemini: { success: 0, fail: 0 },
    qwen: { success: 0, fail: 0 },
    gptOss: { success: 0, fail: 0 },
    llamaMaverick: { success: 0, fail: 0 }
  }

  // looping through the array of articles, analyzing each
  // NOTE: analyzeArticle ONLY saves AI scores, media is already inserted
  // This function will only be used by scripts/initArticles.ts
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]
    const articleStartTime = Date.now()

    console.log(`[Batch] `)
    console.log(`[Batch] ----- Article ${i + 1}/${articles.length} -----`)
    console.log(`[Batch] ID: ${article.mediaId}`)
    console.log(`[Batch] Title: ${article.title.substring(0, 60)}...`)

    try {
      const analysis = await analyzeArticle({
        mediaId: article.mediaId,
        title: article.title,
        url: article.url,
        source: article.source,
        supabaseClient: supabaseAdmin
      })

      results.push(analysis)
      successCount++

      // Track per-model success/failure
      analysis.gemini ? modelStats.gemini.success++ : modelStats.gemini.fail++
      analysis.qwen ? modelStats.qwen.success++ : modelStats.qwen.fail++
      analysis.gptOss ? modelStats.gptOss.success++ : modelStats.gptOss.fail++
      analysis.llamaMaverick ? modelStats.llamaMaverick.success++ : modelStats.llamaMaverick.fail++

      const modelsSucceeded = [analysis.gemini, analysis.qwen, analysis.gptOss, analysis.llamaMaverick].filter(Boolean).length
      const articleDuration = Date.now() - articleStartTime
      console.log(`[Batch] ✓ Article ${i + 1} analyzed in ${articleDuration}ms (${modelsSucceeded}/4 models succeeded)`)

    } catch (error) {
      failCount++
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const articleDuration = Date.now() - articleStartTime
      console.error(`[Batch] ❌ Article ${i + 1} FAILED after ${articleDuration}ms: ${errorMessage}`)
    }

    // Progress update
    const elapsed = Date.now() - batchStartTime
    const avgPerArticle = elapsed / (i + 1)
    const remaining = articles.length - (i + 1)
    const estimatedRemaining = (avgPerArticle * remaining) / 1000 / 60

    console.log(`[Batch] Progress: ${i + 1}/${articles.length} (${successCount} success, ${failCount} failed)`)
    console.log(`[Batch] Elapsed: ${(elapsed / 1000 / 60).toFixed(1)}min, Est. remaining: ${estimatedRemaining.toFixed(1)}min`)

    // Wait between articles (rate limiting)
    if (i < articles.length - 1) {
      console.log(`[Batch] Waiting 5s seconds before next article...`)
      await sleep(5000) // 5s
    }
  }

  const totalDuration = Date.now() - batchStartTime
  console.log(`[Batch] `)
  console.log(`[Batch] ========== BATCH ANALYSIS COMPLETE ==========`)
  console.log(`[Batch] Total time: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`)
  console.log(`[Batch] Results: ${successCount} success, ${failCount} failed out of ${articles.length}`)
  console.log(`[Batch] `)
  console.log(`[Batch] ========== PER-MODEL SUCCESS RATES ==========`)
  console.log(`[Batch]   Gemini 2.5 Flash:    ${modelStats.gemini.success}/${modelStats.gemini.success + modelStats.gemini.fail} (${modelStats.gemini.fail} failed)`)
  console.log(`[Batch]   Qwen3 32B:           ${modelStats.qwen.success}/${modelStats.qwen.success + modelStats.qwen.fail} (${modelStats.qwen.fail} failed)`)
  console.log(`[Batch]   GPT-OSS 120B:        ${modelStats.gptOss.success}/${modelStats.gptOss.success + modelStats.gptOss.fail} (${modelStats.gptOss.fail} failed)`)
  console.log(`[Batch]   Llama 4 Maverick:    ${modelStats.llamaMaverick.success}/${modelStats.llamaMaverick.success + modelStats.llamaMaverick.fail} (${modelStats.llamaMaverick.fail} failed)`)
  console.log(`[Batch] `)
  console.log(`[Batch] End time: ${new Date().toISOString()}`)

  return results
}
