import { createClient } from '@/utils/supabase/server'

export default async function ArticlesPage() {
  const supabase = await createClient()

  // Fetch categories
  const { data: categories } = await supabase
    .from('news_categories')
    .select('id, name')

  // Fetch articles with ai_scores
  const { data: articlesData } = await supabase
    .from('media')
    .select(`
      *,
      ai_scores (
        score,
        model_name
      )
    `)

  const allArticles: any[] = []

  if (categories && articlesData) {
    for (const article of articlesData) {
      const category = categories.find(c => c.id === article.category_id)
      allArticles.push({
        id: article.id,
        title: article.title,
        url: article.url,
        image: article.image_url || null,
        source: article.source?.name || 'Unknown',
        category_id: article.category_id,
        category_name: category?.name || 'Uncategorized',
        ai_scores: article.ai_scores || []
      })
    }
  }

  // Remove duplicates
  const articles = Array.from(new Map(allArticles.map(a => [a.id, a])).values())

  // Group articles by category
  const groupedArticles: { [key: string]: typeof articles } = {}
  for (const article of articles) {
    const cat = article.category_name
    if (!groupedArticles[cat]) groupedArticles[cat] = []
    groupedArticles[cat].push(article)
  }

  // Helper to pick badge color based on score
  const getScoreColor = (score: number) => {
    if (score > 0) return 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
    if (score < 0) return 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
    return 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
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

        {/* Categories */}
        {Object.entries(groupedArticles).map(([categoryName, categoryArticles]) => (
          <section key={categoryName} className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100 capitalize transition-colors duration-300">
                {categoryName}
              </h2>
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {categoryArticles.length} articles
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {categoryArticles.map((article: any) => (
                <article 
                  key={article.id} 
                  className="flex-shrink-0 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden group transition-colors duration-300"
                >
                  {/* Image */}
                  {article.image && (
                    <div className="w-full h-48 overflow-hidden">
                      <img 
                        src={article.image} 
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    {/* Source */}
                    <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                      {article.source}
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-sm text-stone-900 dark:text-stone-100 mb-3 line-clamp-2 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors duration-300">
                      {article.title}
                    </h3>

                    {/* AI Score badges */}
                    <div className="flex flex-wrap gap-2">
                      {article.ai_scores.map((score: any, idx: number) => (
                        <span 
                          key={idx} 
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(parseFloat(score.score))}`}
                        >
                          {score.model_name}: {score.score}
                        </span>
                      ))}
                    </div>

                    {/* Read button */}
                    <div className="mt-3">
                      <a 
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                      >
                        Read →
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
