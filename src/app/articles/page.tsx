/**
 * Articles page - displays news from GNews
 * Users can browse and analyze articles
 */

export default async function ArticlesPage() {
  // Fetch from our API route
  const response = await fetch('http://localhost:3000/api/articles', {
    cache: 'no-store' // Always get fresh articles
  })
  const data = await response.json()
  const articles = data.articles || []

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6 py-16">
        
        {/* Header */}
        <header className="mb-16 border-b-2 border-stone-900 dark:border-stone-100 pb-8 transition-colors duration-300">
          <p className="text-sm tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2 transition-colors duration-300">
            Latest News
          </p>
          <h1 className="text-5xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 transition-colors duration-300">
            Discover Articles
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-lg max-w-xl transition-colors duration-300">
            Browse top headlines and analyze them for bias.
          </p>
        </header>

        {/* Articles List */}
        <div className="space-y-0 divide-y divide-stone-200 dark:divide-stone-800 transition-colors duration-300">
          {articles.map((article: any) => (
            <article 
              key={article.id} 
              className="py-8 group"
            >
              <div className="flex justify-between items-start gap-8">
                <div className="flex-1">
                  {/* Source */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-medium tracking-widest text-stone-500 dark:text-stone-400 uppercase transition-colors duration-300">
                      {article.source?.name}
                    </span>
                    <span className="text-stone-300 dark:text-stone-600 transition-colors duration-300">•</span>
                    <span className="text-xs text-stone-400 dark:text-stone-500 transition-colors duration-300">
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 mb-3 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors duration-300">
                    {article.title}
                  </h3>

                  {/* Description */}
                  <p className="text-stone-600 dark:text-stone-400 text-sm mb-4 transition-colors duration-300">
                    {article.description}
                  </p>

                  {/* Image */}
                  {article.image && (
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <a 
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors duration-300"
                  >
                    Read →
                  </a>
                  <a 
                    href={`/analyze?url=${encodeURIComponent(article.url)}&title=${encodeURIComponent(article.title)}&source=${encodeURIComponent(article.source?.name || '')}`}
                    className="text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-300"
                  >
                    Analyze →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Empty State */}
        {articles.length === 0 && (
          <div className="text-center py-16">
            <p className="text-stone-500 dark:text-stone-400">No articles found.</p>
          </div>
        )}

      </div>
    </main>
  )
}