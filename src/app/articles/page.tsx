import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function ArticlesPage() {
  const supabase = await createClient()

  // Fetch categories
  const { data: categories } = await supabase
    .from('news_categories')
    .select('id, name')

  // Fetch articles with AI scores (exclude user-analyzed articles)
  const { data: articlesData } = await supabase
    .from('media')
    .select(`
      *,
      ai_scores (
        score,
        model_name,
        explanation,
        bias_categories (
          name
        )
      )
    `)
    .eq('user_analyzed', false)  // Only show curated GNews articles

  if (!articlesData || !categories) {
    return <div className="p-6">No articles found.</div>
  }

  // Helper to pick badge color based on score
  const getScoreColor = (score: number) => {
    if (score > 0.3) return 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
    if (score < -0.3) return 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
    return 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
  }

  // Helper to compute averaged scores per category (across all models)
  const getAveragedScores = (aiScores: any[]) => {
    if (!aiScores || aiScores.length === 0) return []

    // Group scores by category
    const categoryScores: { [key: string]: number[] } = {}
    for (const score of aiScores) {
      const categoryName = score.bias_categories?.[0]?.name || score.bias_categories?.name
      if (!categoryName) continue
      if (!categoryScores[categoryName]) categoryScores[categoryName] = []
      categoryScores[categoryName].push(parseFloat(score.score))
    }

    // Calculate average for each category
    return Object.entries(categoryScores).map(([category, scores]) => ({
      category,
      avgScore: scores.reduce((sum, s) => sum + s, 0) / scores.length
    }))
  }

  // Separate promo articles (top 20 with AI scores) and others
  const analyzedArticles: any[] = []
  const otherArticles: any[] = []

  articlesData.forEach(article => {
    if (article.ai_scores && article.ai_scores.length > 0 && analyzedArticles.length <= 7) {
      analyzedArticles.push(article)
    } else {
      otherArticles.push(article)
    }
  })

  // Map articles for display
  const mapArticle = (article: any) => {
    const category = categories.find(c => c.id === article.category_id)
    return {
      id: article.id,
      title: article.title,
      url: article.url,
      image: article.image_url || null,
      source: article.source || 'Unknown',
      category_id: article.category_id,
      category_name: category?.name || 'Uncategorized',
      ai_scores: article.ai_scores || []
    }
  }

  const promoArticles = analyzedArticles.map(mapArticle)
  const remainingArticles = otherArticles.map(mapArticle)

  // Group remaining articles by category
  const groupedArticles: { [key: string]: typeof remainingArticles } = {}
  for (const article of remainingArticles) {
    const cat = article.category_name
    if (!groupedArticles[cat]) groupedArticles[cat] = []
    groupedArticles[cat].push(article)
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
            Browse {articlesData.length} articles across {Object.keys(groupedArticles).length} categories.
          </p>
        </header>

        {/* Promo Section: Top 20 Analyzed Articles */}
        {promoArticles.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100 capitalize transition-colors duration-300">
                Top Analyzed Articles
              </h2>
              <a
                href="/analyze"
                className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Analyze Your Own →
              </a>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {promoArticles.map((article: any) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="flex-shrink-0 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden group transition-colors duration-300 hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer"
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

                    {/* AI Score badges - averaged across models */}
                    <div className="flex flex-wrap gap-2">
                      {getAveragedScores(article.ai_scores).map((avgScore, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(avgScore.avgScore)}`}
                        >
                          {avgScore.category}: {avgScore.avgScore > 0 ? '+' : ''}{avgScore.avgScore.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Remaining Articles by Category */}
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
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="flex-shrink-0 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden group transition-colors duration-300 hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer"
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

                    {/* AI Score badges - averaged across models */}
                    <div className="flex flex-wrap gap-2">
                      {getAveragedScores(article.ai_scores).map((avgScore, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(avgScore.avgScore)}`}
                        >
                          {avgScore.category}: {avgScore.avgScore > 0 ? '+' : ''}{avgScore.avgScore.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

      </div>
    </main>
  )
}
