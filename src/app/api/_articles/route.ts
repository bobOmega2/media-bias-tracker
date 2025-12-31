/**
 * API Route: /api/articles
 * Fetches news articles from GNews external API
 * 
 * GET - Returns list of articles from GNews
 */
import { NextResponse } from "next/server"
import { createClient } from '@/utils/supabase/server'

// Helper to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function GET() {
  const apiKey = process.env.GNEWS_API_KEY
  const supabase = await createClient()
  
  const { data: categories, error } = await supabase
    .from('news_categories')
    .select('id, name')
  
  if (error || !categories) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }

  const allArticles: any[] = []
  
  for (const category of categories) {
    // Wait 1 second between requests to avoid rate limiting
    await delay(1000)
    
    const url = `https://gnews.io/api/v4/top-headlines?category=${category.name}&lang=en&max=10&apikey=${apiKey}`
    
    try {
      const response = await fetch(url, { cache: 'no-store' })
      const data = await response.json()
      
      if (data.articles) {
        for (const article of data.articles) {
          allArticles.push({
            ...article,
            category_name: category.name
          })
        }
      }
    } catch (error) {
      console.error('Error fetching from category:', category.name, error)
    }
  }
  
  if (allArticles.length === 0) {
    return NextResponse.json({ error: 'Failed to fetch any articles' }, { status: 500 })
  }
  
  const articleMap = new Map()
  for (const article of allArticles) {
    articleMap.set(article.id, article)
  }
  const uniqueArticles = Array.from(articleMap.values())
  
  return NextResponse.json({ articles: uniqueArticles })
}