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

  console.log('GNEWS_API_KEY exists:', !!apiKey)

  // Get categories from Supabase
  const { data: categories, error } = await supabase
    .from('news_categories')
    .select('id, name')

  if (error || !categories) {
    console.error('Error fetching categories:', error)
    throw new Error('Failed to fetch categories from Supabase')
  }

  console.log(`Found ${categories.length} categories:`, categories.map(c => c.name))

  const allArticles: any[] = []

  for (const category of categories) {
    // Wait 1 second between requests to avoid rate limiting
    await delay(1000)

    const url = `https://gnews.io/api/v4/top-headlines?category=${category.name}&lang=en&max=10&apikey=${apiKey}`
    console.log(`Fetching category: ${category.name}`)

    try {
      const response = await fetch(url, { cache: 'no-store' })
      const data = await response.json()

      console.log(`Response status for ${category.name}:`, response.status)

      if (data.errors) {
        console.error(`API Error for ${category.name}:`, data.errors)
      }

      if (data.articles) {
        console.log(`Found ${data.articles.length} articles for ${category.name}`)
        for (const article of data.articles) {
          allArticles.push({
            ...article,
            category_id: category.id
          })
        }
      } else {
        console.log(`No articles found for ${category.name}`)
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

  console.log(`Total articles before deduplication: ${allArticles.length}`)
  console.log(`Total articles after deduplication: ${articleMap.size}`)

  return Array.from(articleMap.values())
}

// function to insert articles from GNews into Supabase
export async function insertGNewsArticles(): Promise<any[]> {
    const supabase = supabaseAdmin
    const articles = await fetchGNewsArticles() // returns ~70 articles
    console.log(`\nAttempting to insert ${articles.length} articles into Supabase...`)
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
                console.error('Error inserting article:', article.title, error.message)
            } else {
                // else push the data to the insertedArticles array
                insertedArticles.push(data)
                console.log(`✓ Inserted: ${article.title.substring(0, 60)}...`)
            }
        } catch (e) {
            console.error('Error inserting article:', article.title, e)
        }
    }

    console.log(`\nSuccessfully inserted ${insertedArticles.length} out of ${articles.length} articles`)
    return insertedArticles // returning the array so we can perform analysis
}

