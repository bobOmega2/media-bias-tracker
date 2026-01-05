// lib/gnews.ts
import { supabaseAdmin } from '@/utils/supabase/admin'

// Helper to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch top headlines from all categories in Supabase
 * Removes duplicate articles by their ID
 */
export async function fetchGNewsArticles(): Promise<any[]> {
  const apiKey = process.env.GNEWS_API_KEY
  const supabase = supabaseAdmin 

  // Get categories from Supabase
  const { data: categories, error } = await supabase
    .from('news_categories')
    .select('id, name')

  if (error || !categories) {
    throw new Error('Failed to fetch categories from Supabase')
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
            category_id: category.id
          })
        }
      }
    } catch (error) {
      console.error('Error fetching from category:', category.name, error)
    }
  }

  // Remove duplicates by article ID
  const articleMap = new Map()
  for (const article of allArticles) {
    if (article.id) {
      articleMap.set(article.id, article)
    }
  }

  return Array.from(articleMap.values())
}

// function to insert articles from GNews into Supabase
export async function insertGNewsArticles(): Promise<any[]> {
    const supabase = supabaseAdmin
    const articles = await fetchGNewsArticles() // returns ~70 articles
    const insertedArticles: any[] = []
    // looping through each article, and inserting it into supabase 
    for (const article of articles) {
        try {
            const { data, error } = await supabase
                .from('media')
                .insert({
                    title: article.title,
                    url: article.url,
                    source: article.source,
                    media_type: 'article'
                })
                .select()
                .single()
            // if supabase returns and error, console.log it 
            if (error) {
                console.error('Error inserting article:', article.title, error)
            } else {
                // else push the data to the insertedArticles array
                insertedArticles.push(data)
            }
        } catch (e) {
            console.error('Error inserting article:', article.title, e)
        }
    }

    return insertedArticles // returning the array so we can perform analysis 
}

