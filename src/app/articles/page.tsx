/**
 * Articles page - displays news in horizontal carousels by category
 */
import { createClient } from '@/utils/supabase/server'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default async function ArticlesPage() {
  const apiKey = process.env.GNEWS_API_KEY
  const supabase = await createClient()
  
  // Get categories from database
  const { data: categories } = await supabase
    .from('news_categories')
    .select('id, name')
  
  const allArticles: any[] = []
  
  if (categories) {
    for (const category of categories) {
      await delay(1000)
      
      const url = `https://gnews.io/api/v4/top-headlines?category=${category.name}&lang=en&max=10&apikey=${apiKey}`
      
      try {
        const response = await fetch(url, { cache: 'no-store' })
        const data = await response.json()
        
        if (data.articles) {
          for (const article of data.articles) {
            allArticles.push({
              ...article,
              category_id: category.id,
              category_name: category.name
            })
          }
        }
      } catch (error) {
        console.error('Error fetching category:', category.name, error)
      }
    }
  }
  
  // Remove duplicates
  const articleMap = new Map()
  for (const article of allArticles) {
    articleMap.set(article.id, article)
  }
  const articles = Array.from(articleMap.values())

  // Group articles by category_name
  const groupedArticles: { [key: string]: any[] } = {}
  
  for (const article of articles) {
    const category = article.category_name || 'uncategorized'
    if (!groupedArticles[category]) {
      groupedArticles[category] = []
    }
    groupedArticles[category].push(article)
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 py-16">
        
        {/* Header */}
        <header className="mb-16 border-b-2 border-stone-900 dark:border-stone-100 pb-8 transition-colors duration-300">
          <p className="text-sm tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
            Latest News
          </p>
          <h1 className="text-5xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 transition-colors duration-300">
            Discover Articles
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-lg">
            Browse {articles.length} articles across {Object.keys(groupedArticles).length} categories.
          </p>
        </header>

        {/* Categories with Carousels */}
        {Object.entries(groupedArticles).map(([categoryName, categoryArticles]) => (
          <section key={categoryName} className="mb-12">
            {/* Category Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100 capitalize transition-colors duration-300">
                {categoryName}
              </h2>
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {categoryArticles.length} articles
              </span>
            </div>

            {/* Horizontal Scroll Carousel */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {categoryArticles.map((article: any) => (
                <article 
                  key={article.id} 
                  className="flex-shrink-0 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden group transition-colors duration-300"
                >
                  {article.image && (
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-36 object-cover"
                    />
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        {article.source?.name}
                      </span>
                    </div>
                    
                    <h3 className="font-serif text-sm text-stone-900 dark:text-stone-100 mb-3 line-clamp-2 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors duration-300">
                      {article.title}
                    </h3>
                    
                    <div className="flex gap-3">
                      <a 
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                      >
                        Read →
                      </a>
                      <a 
                        href={`/analyze?url=${encodeURIComponent(article.url)}&title=${encodeURIComponent(article.title)}&source=${encodeURIComponent(article.source?.name || '')}`}
                        className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        Analyze
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

      </div>
    </main>
  )
}