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

  // Validate input
  if (!mediaId || !url || !title || !source) {
    throw new Error('Missing required fields: mediaId, url, title, source')
  }

  // Fetch article content
  const articleContent = await fetchArticleContent(url)
  if (!articleContent) {
    throw new Error('Could not fetch article content')
  }

  // Get bias categories from database (including descriptions for dynamic prompts)
  const { data: categories, error: categoriesError } = await supabaseClient
    .from('bias_categories')
    .select('id, name, description')

  if (categoriesError || !categories) {
    throw new Error('Could not fetch bias categories')
  }

  // Run ALL 4 models in parallel (pass full category objects with descriptions)
  const [geminiAnalysis, qwenAnalysis, gptOssAnalysis, llamaMaverickAnalysis] = await Promise.all([
    analyzeWithGemini(articleContent, categories),
    analyzeWithGroq(articleContent, categories, 'qwen/qwen3-32b'),
    analyzeWithGroq(articleContent, categories, 'openai/gpt-oss-120b'),
    analyzeWithGroq(articleContent, categories, 'meta-llama/llama-4-maverick-17b-128e-instruct')
  ])

  // Check if at least one succeeded
  if (!geminiAnalysis && !qwenAnalysis && !gptOssAnalysis && !llamaMaverickAnalysis) {
    throw new Error('All AI models failed to analyze')
  }

  // Save all model scores in parallel
  await Promise.all([
    saveModelScores(geminiAnalysis, 'gemini-2.5-flash', mediaId, categories, supabaseClient),
    saveModelScores(qwenAnalysis, 'qwen/qwen3-32b', mediaId, categories, supabaseClient),
    saveModelScores(gptOssAnalysis, 'openai/gpt-oss-120b', mediaId, categories, supabaseClient),
    saveModelScores(llamaMaverickAnalysis, 'meta-llama/llama-4-maverick-17b-128e-instruct', mediaId, categories, supabaseClient)
  ])

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
  // Build dynamic prompt from database category descriptions
  const categoryInstructions = biasCategories
    .map((cat, index) => `${index + 1}. ${cat.name.toUpperCase()}:\n${cat.description}`)
    .join('\n\n')

  const categoryList = biasCategories.map(c => c.name).join(', ')

  const exampleScores = biasCategories
    .map(cat => `    { "category": "${cat.name}", "score": 0.0, "explanation": "Brief explanation referencing specific article content" }`)
    .join(',\n')

  for (const model of MODELS) {
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

      if (!response.text) {
        console.error('Gemini returned no text')
        continue // skip to the next ai model
      }

      let jsonText = response.text
      if (jsonText.startsWith('```')) {
        jsonText = jsonText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
      }

      const data: AIAnalysis = JSON.parse(jsonText)
      console.log('Gemini Analysis Success:', data)
      return data
    } catch (error) {
      console.error('Gemini analysis error:', error)
    }
  }

  return null
}

// function to analyze with Groq (supports multiple Groq models)
export async function analyzeWithGroq(
  content: string,
  biasCategories: Array<{ name: string; description: string }>,
  modelName: string
): Promise<AIAnalysis | null> {
  // Build dynamic prompt from database category descriptions
  const categoryInstructions = biasCategories
    .map((cat, index) => `${index + 1}. ${cat.name.toUpperCase()}:\n${cat.description}`)
    .join('\n\n')

  const categoryList = biasCategories.map(c => c.name).join(', ')

  const exampleScores = biasCategories
    .map(cat => `    { "category": "${cat.name}", "score": 0.0, "explanation": "Brief explanation referencing specific article content" }`)
    .join(',\n')

  try {
    const response = await groq.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: `
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

    const text = response.choices[0]?.message?.content
    if (!text) {
      console.error(`Groq (${modelName}) returned no text`)
      return null
    }

    // Clean up markdown and XML tags if present
    let jsonText = text

    // Remove markdown code blocks
    if (jsonText.startsWith('```')) {
      jsonText = jsonText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
    }

    // Remove <think> tags (Qwen sometimes includes these)
    jsonText = jsonText.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

    // Extract JSON if there's extra text before/after
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const data: AIAnalysis = JSON.parse(jsonText)
    console.log(`Groq (${modelName}) Analysis Success:`, data)
    return data
  } catch (error) {
    console.error(`Groq analysis error with ${modelName}:`, error)
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
  // typescript setup for results
  const results: Array<{
    gemini: AIAnalysis | null
    qwen: AIAnalysis | null
    gptOss: AIAnalysis | null
    llamaMaverick: AIAnalysis | null
  }> = []

  // looping through the array of articles, analyzing each
  // NOTE: analyzeArticle ONLY saves AI scores, media is already inserted
  // This function will only be used by scripts/initArticles.ts
  for (const article of articles) {
    try {
      const analysis = await analyzeArticle({
        mediaId: article.mediaId,
        title: article.title,
        url: article.url,
        source: article.source,
        supabaseClient: supabaseAdmin
      })

      results.push(analysis)
    } catch (error) {
      console.error('Error analyzing article:', article.title, error)
    }
    await sleep(15000) // 15s
  }

  return results
}
