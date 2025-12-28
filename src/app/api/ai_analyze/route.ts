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

    // fetching article content 
    const articleContent = await fetchArticleContent(url)
    // error handling if there are no article contents 
    if (!articleContent){
          return NextResponse.json({ error: 'Could not fetch article' }, { status: 400 })
    }
    // saving it to the database 

    return NextResponse.json({ success: true })

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

// function which analyzes the article contents with Gemeni 
async function analyzeWithGemini(content: string) {
  // TODO
}
