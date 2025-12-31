/**
 * API Route: /api/articles
 * Fetches news articles from GNews external API
 * 
 * GET - Returns list of articles from GNews
 */
import { NextResponse } from "next/server"

export async function GET() {
  const url = process.env.TOP_HEADLINES_URL
  
  if (!url) {
    return NextResponse.json(
      { error: 'Missing GNEWS URL' },
      { status: 400 }
    )
  }
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching from GNews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}