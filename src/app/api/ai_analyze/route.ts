/**
 * API Route: /api/ai_analyze
 * Analyzes article content for bias using Gemini 2.5 Pro
 */

import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// The client gets the API key from .env.local variable `GEMINI_API_KEY`
const ai = new GoogleGenAI({});

// function to POST AI analyzed data to public.ai_scores 
// note that request: NextRequest is what the client sends the server (in this case the article title, url, source)
export async function POST(request: NextRequest) {
  try {
    // supabase client to interact with the database 
    const supabase = await createClient()
    const data = await request.json()
    // extracting data recieved from the user (the NextRequest)
    const url = data.url
    const title = data.title
    const source = data.source

    if (!url || !title || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: url, title, source' },
        { status: 400 }
      )
    }

    // fetching article content 
    const articleContent = await fetchArticleContent(url)
    // error handling if there are no article contents 
    if (!articleContent){
          return NextResponse.json({ error: 'Could not fetch article' }, { status: 400 })
    }

    // Get bias categories from database
    const { data: categories, error: categoriesError } = await supabase
    .from('bias_categories')
    .select('id, name')

    if (categoriesError || !categories) {
      return NextResponse.json({ error: 'Could not fetch categories' }, { status: 500 })
    }
    
    // Get just the category names for Gemini
  const categoryNames = categories.map(c => c.name)

  // Analyze with Gemini
  const analysis = await analyzeWithGemini(articleContent, categoryNames)

  if (!analysis) {
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
  }

    // saving it to the database 
  // Save article to media table
const { data: media, error: mediaError } = await supabase
  .from('media')
  .insert({
    title: title,
    url: url,
    source: source,
    media_type: 'article'
  })
  .select()
  .single()

if (mediaError || !media) {
  console.error('Error saving to media table:', mediaError)
  return NextResponse.json({ error: 'Could not save article' }, { status: 500 })
}

// Save each score to ai_scores table
for (const score of analysis.scores) {
  console.log('Processing score:', score.category)
  
  // Find the category id that matches this score's category name
  const category = categories.find(c => c.name === score.category)
  console.log('Found category:', category)
  
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
    } else {
      console.log('Saved score for:', score.category)
    }
  } else {
    console.log('Category not found for:', score.category)
  }
}

// if we are succesful, we can return the media and the analysis 
    return NextResponse.json({ 
  success: true, 
  media: media,
  analysis: analysis 
})

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    )
  }
}

// function to fetch the article's content from a URL 
async function fetchArticleContent(url: string) {
  try{
    const response = await fetch(url)
    const html = await response.text()
   return html
 } catch(error) {
    console.error('Error in fetching data from url:', error) 
    return null
}}

// function which analyzes the article contents with Gemini 
async function analyzeWithGemini(content: string, bias_categories: string[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
       Analyze this article for bias.
  
  Article content:
  ${content}
  
  Score each of these bias categories from -1 to 1:
  ${bias_categories.join(", ")}
  
  Return ONLY valid JSON with no markdown, no code blocks
  Format:
  {
    "scores": [
      {"category": "political", "score": 0.0, "explanation": "Brief explanation"}
    ],
    "summary": "One sentence summary of overall bias"
  }
      `
    });

  // Check if we got a response
  if (!response.text) {
    console.error('Gemini returned no text')
    return null
  }

  // Remove markdown code blocks if Gemini added them
  let jsonText = response.text
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  }

// Parse it to become a JSON object 
const data = JSON.parse(jsonText)

  console.log("Gemini Analysis Success! Here is the output:", data)
  return data
 
} catch (error) {
  console.error('Gemini analysis error:', error)
  return null
}}