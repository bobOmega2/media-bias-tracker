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
  
  // Fetch media with their scores and category names
  // single nested query as it is more efficient and cleaner 
  // also, non nested queries would result in having to combine them later
  // overcomplicating things.
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
  
// These queries below get all of the categories and scores, used for homescreen data 
  const { data: categories } = await supabase.from('bias_categories').select()
  const { data: scores } = await supabase.from('ai_scores').select()
  
  // Calculate stats
  const totalArticles = media?.length || 0 
  const totalCategories = categories?.length || 0
  const totalScores = scores?.length || 0
  // mapping public.media.source as a set (so only unique elements)
  const uniqueSources = new Set(media?.map(item => item.source)).size

  // Helper function to get color based on score
  const getScoreColor = (score: number) => {
    if (score < -0.3) return 'bg-blue-500/20 text-blue-400'    // Left leaning
    if (score > 0.3) return 'bg-red-500/20 text-red-400'       // Right leaning
    return 'bg-green-500/20 text-green-400'                     // Neutral
  }

// returning the homepage 
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Media Bias Tracker
          </h1>
          <p className="text-slate-400 text-lg">
            Analyzing bias in news and media using AI
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          <div className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700">
            <p className="text-3xl font-bold text-white">{totalArticles}</p>
            <p className="text-slate-400 text-sm">Articles Analyzed</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700">
            <p className="text-3xl font-bold text-emerald-400">{uniqueSources}</p>
            <p className="text-slate-400 text-sm">News Sources</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700">
            <p className="text-3xl font-bold text-blue-400">{totalCategories}</p>
            <p className="text-slate-400 text-sm">Bias Categories</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700">
            <p className="text-3xl font-bold text-purple-400">{totalScores}</p>
            <p className="text-slate-400 text-sm">AI Scores</p>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid gap-5">
          {media?.map((item) => (
            <div 
              key={item.id} 
              className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all duration-200"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1 rounded-full border border-blue-500/30">
                      {item.media_type}
                    </span>
                    <span className="text-slate-500 text-sm">
                      {item.source}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {item.title}
                  </h2>
                  
                  {/* Real bias scores from database */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {item.ai_scores?.map((scoreData: any, index: number) => (
                      <div 
                        key={index}
                        className={`${getScoreColor(scoreData.score)} text-xs px-2 py-1 rounded`}
                        title={scoreData.explanation}
                      >
                        {scoreData.bias_categories?.name}: {scoreData.score > 0 ? '+' : ''}{scoreData.score}
                      </div>
                    ))}
                  </div>
                </div>

                {item.url && (
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    View →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-500 text-sm">
          Built with Next.js, Supabase, and AI
        </div>
      </div>
    </main>
  )
}