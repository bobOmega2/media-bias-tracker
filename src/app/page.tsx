/**
 * Homepage - Displays media articles with AI-generated bias scores
 * 
 * Data flow:
 * 1. Fetches media with nested ai_scores from Supabase
 * 2. Calculates stats for the dashboard
 * 3. Renders cards with color-coded bias indicators
 */

import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  
  const { data: media } = await supabase 
    .from('media') 
    .select(`
      *,
      ai_scores ( 
        score,
        explanation,
        bias_categories (
          name
        )
      )
    `)
  
  const { data: categories } = await supabase.from('bias_categories').select()
  const { data: scores } = await supabase.from('ai_scores').select()
  
  const totalArticles = media?.length || 0 
  const totalCategories = categories?.length || 0
  const totalScores = scores?.length || 0
  const uniqueSources = new Set(media?.map(item => item.source)).size

  const getScoreColor = (score: number) => {
    if (score < -0.3) return 'bg-blue-500/20 text-blue-400'
    if (score > 0.3) return 'bg-red-500/20 text-red-400'
    return 'bg-green-500/20 text-green-400'
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6 py-16">
        
        {/* Header */}
        <header className="mb-16 border-b-2 border-stone-900 dark:border-stone-100 pb-8 transition-colors duration-300">
          <p className="text-sm tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2 transition-colors duration-300">
            Independent Analysis
          </p>
          <h1 className="text-5xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 transition-colors duration-300">
            Media Bias Tracker
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-lg max-w-xl transition-colors duration-300">
            Examining political lean, sensationalism, and framing in modern news coverage.
          </p>
        </header>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-8 mb-16 py-6 border-y border-stone-200 dark:border-stone-800 transition-colors duration-300">
          <div className="text-center">
            <p className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 transition-colors duration-300">{totalArticles}</p>
            <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mt-1 transition-colors duration-300">Articles</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 transition-colors duration-300">{uniqueSources}</p>
            <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mt-1 transition-colors duration-300">Sources</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 transition-colors duration-300">{totalCategories}</p>
            <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mt-1 transition-colors duration-300">Categories</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 transition-colors duration-300">{totalScores}</p>
            <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mt-1 transition-colors duration-300">Scores</p>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-sm tracking-widest text-stone-500 dark:text-stone-400 uppercase transition-colors duration-300">Recent Analysis</h2>
          <div className="flex-1 h-px bg-stone-300 dark:bg-stone-700 transition-colors duration-300"></div>
        </div>

        {/* Articles List */}
        <div className="space-y-0 divide-y divide-stone-200 dark:divide-stone-800 transition-colors duration-300">
          {media?.map((item) => (
            <article 
              key={item.id} 
              className="py-8 group"
            >
              <div className="flex justify-between items-start gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-medium tracking-widest text-stone-500 dark:text-stone-400 uppercase transition-colors duration-300">
                      {item.source}
                    </span>
                    <span className="text-stone-300 dark:text-stone-600 transition-colors duration-300">•</span>
                    <span className="text-xs text-stone-400 dark:text-stone-500 transition-colors duration-300">
                      {item.media_type}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 mb-4 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors duration-300">
                    {item.title}
                  </h3>
                  
                  <div className="flex flex-wrap gap-3">
                    {item.ai_scores?.map((scoreData: any, index: number) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2"
                        title={scoreData.explanation}
                      >
                        <span className="text-xs text-stone-500 dark:text-stone-400 transition-colors duration-300">
                          {scoreData.bias_categories?.name}:
                        </span>
                        <span className={`text-sm font-mono font-medium px-2 py-0.5 rounded transition-colors duration-300 ${getScoreColor(scoreData.score)}`}>
                          {scoreData.score > 0 ? '+' : ''}{scoreData.score.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {item.url && (
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors duration-300 flex items-center gap-1"
                  >
                    Read
                    <span className="text-lg">→</span>
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-stone-200 dark:border-stone-800 text-center transition-colors duration-300">
          <p className="text-xs tracking-widest text-stone-400 dark:text-stone-500 uppercase transition-colors duration-300">
            Built for transparency in media
          </p>
        </footer>
      </div>
    </main>
  )
}