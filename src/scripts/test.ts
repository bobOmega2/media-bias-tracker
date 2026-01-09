/**
 * test.ts
 * Test script to analyze a single article from media with all Gemini AI models.
 */

import { ai } from '../lib/ai.js' // your Gemini wrapper / client
import { supabaseAdmin } from '@/utils/supabase/admin.js'

// Type for AI analysis result
interface AIScore {
  category: string
  score: number
  explanation: string
}

interface AIAnalysis {
  scores: AIScore[]
  summary: string
}
const MODELS = ["gemma-3-1b", "gemma-3-27b", "gemma-3-2b", "gemma-3-4b"]

// Function to analyze with all Gemini models
export async function analyzeWithAllModels(
  content: string,
  biasCategories: string[]
): Promise<{ model: string; data: AIAnalysis | null }[]> {
  const results: { model: string; data: AIAnalysis | null }[] = []

  for (const model of MODELS) {
    console.log(`\n--- Testing model: ${model} ---`)
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `
Analyze this article for bias.

Article content:
${content}

Score each of these bias categories from -1 to 1:
${biasCategories.join(', ')}

Return ONLY valid JSON, no markdown or code blocks.
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
        console.error(`Model ${model} returned no text.`)
        results.push({ model, data: null })
        continue
      }

      let jsonText = response.text
      if (jsonText.startsWith('```')) {
        jsonText = jsonText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
      }

      const data: AIAnalysis = JSON.parse(jsonText)
      console.log(`Model ${model} Success!`)
      results.push({ model, data })
    } catch (error) {
      console.error(`Error with model ${model}:`, error)
      results.push({ model, data: null })
    }
  }

  return results
}

// Main test function
async function main() {
  const supabase = supabaseAdmin

  // Fetch the most recent single article from media
  const { data: articles, error } = await supabase
    .from('media')
    .select('*')
    .limit(1)
    .order('published_at', { ascending: false })

  if (error || !articles || articles.length === 0) {
    console.error('No articles found or error fetching:', error)
    return
  }

  const article = articles[0]
  console.log('Testing article:', article.title)
  console.log('URL:', article.url)
  console.log('Content snippet:', article.description?.slice(0, 200), '...')

  // Define your bias categories
  const biasCategories = ['political', 'economic', 'social', 'cultural']

  // Analyze article with all models
  const allResults = await analyzeWithAllModels(article.description || '', biasCategories)

  // Print nicely
  console.log('\n=== All Model Analysis Results ===')
  for (const { model, data } of allResults) {
    console.log(`\nModel: ${model}`)
    if (!data) {
      console.log('No valid output from this model.')
      continue
    }
    console.log('Summary:', data.summary)
    console.log('Scores:')
    for (const score of data.scores) {
      console.log(`  ${score.category}: ${score.score}`)
    }
  }
}

// Run the test
main().then(() => console.log('\nTest complete.'))
