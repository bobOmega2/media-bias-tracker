// lib/ai.ts
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/utils/supabase/server'
import { extract } from '@extractus/article-extractor'

// The AI client automatically uses GEMINI_API_KEY from .env
const ai = new GoogleGenAI({})

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
 * Analyze an article for bias and save it + scores to Supabase
 */
export async function analyzeArticle({
  url,
  title,
  source
}: {
  url: string
  title: string
  source: string
}): Promise<{ media: any; analysis: AIAnalysis }> {
  const supabase = await createClient()

  // Validate input
  if (!url || !title || !source) {
    throw new Error('Missing required fields: url, title, source')
  }

  // Fetch article content
  const articleContent = await fetchArticleContent(url)
  if (!articleContent) {
    throw new Error('Could not fetch article content')
  }

  // Get bias categories from database
  const { data: categories, error: categoriesError } = await supabase
    .from('bias_categories')
    .select('id, name')

  if (categoriesError || !categories) {
    throw new Error('Could not fetch bias categories')
  }

  const categoryNames = categories.map(c => c.name)

  // Analyze with Gemini Flash
  const analysis = await analyzeWithGemini(articleContent, categoryNames)
  if (!analysis) {
    throw new Error('AI analysis failed')
  }

  // Save article to media table
  const { data: media, error: mediaError } = await supabase
    .from('media')
    .insert({
      title,
      url,
      source,
      media_type: 'article'
    })
    .select()
    .single()

  if (mediaError || !media) {
    console.error('Error saving to media table:', mediaError)
    throw new Error('Could not save article')
  }

  // Save each score to ai_scores table
  for (const score of analysis.scores) {
    const category = categories.find(c => c.name === score.category)
    if (category) {
      const { error: scoreError } = await supabase
        .from('ai_scores')
        .insert({
          media_id: media.id,
          category_id: category.id,
          score: score.score,
          explanation: score.explanation,
          model_name: 'gemini-2.5-flash'
        })

      if (scoreError) {
        console.error('Error saving score:', scoreError)
      }
    } else {
      console.warn('Category not found for score:', score.category)
    }
  }

  // Return result
  return { media, analysis }
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
async function analyzeWithGemini(
  content: string,
  biasCategories: string[]
): Promise<AIAnalysis | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
Analyze this article for bias.

Article content:
${content}

Score each of these bias categories from -1 to 1:
${biasCategories.join(', ')}

Return ONLY valid JSON with no markdown, no code blocks.
Format:
{
  "scores": [
    { "category": "political", "score": 0.0, "explanation": "Brief explanation" }
  ],
  "summary": "One sentence summary of overall bias"
}
      `
    })

    if (!response.text) {
      console.error('Gemini returned no text')
      return null
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
    return null
  }
}

// Function to Batch analyze multiple articles
export async function analyzeArticlesBatch(
  articles: { title: string; url: string; source: string }[]
): Promise<{ media: any; analysis: AIAnalysis }[]> {
    // typescript setup for results
  const results: { media: any; analysis: AIAnalysis }[] = []
// looping through the array of articles, analyzing each
// NOTE: analyzeArticle pushes article and bias scores to supabase, so no 
// need to add any extra handling here
  for (const article of articles) {
    try {
      const result = await analyzeArticle({
        title: article.title,
        url: article.url,
        source: article.source
      })
      
      results.push(result)
    } catch (error) {
      console.error('Error analyzing article:', article.title, error)
    }
  }

  return results
}
