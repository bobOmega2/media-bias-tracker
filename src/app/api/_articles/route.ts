/**
 * API Route: /api/articles
 * Fetches news articles from GNews using lib function
 */
import { NextResponse } from "next/server"
import { fetchGNewsArticles } from '@/lib/gnews'

export async function GET() {
  try {
    const articles = await fetchGNewsArticles()
    return NextResponse.json({ articles })
  } catch (error: any) {
    console.error('Error fetching articles:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch articles' }, { status: 500 })
  }
}
