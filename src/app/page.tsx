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

  const { count: totalArticles } = await supabase
    .from('media')
    .select('*', { count: 'exact', head: true })

  const { count: totalCategories } = await supabase
    .from('bias_categories')
    .select('*', { count: 'exact', head: true })

  const { count: totalScores } = await supabase
    .from('ai_scores')
    .select('*', { count: 'exact', head: true })

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="max-w-4xl mx-auto px-6 py-16">

        <header className="mb-16 border-b pb-8">
          <p className="text-sm tracking-widest text-stone-500 uppercase mb-2">
            Independent Analysis
          </p>
          <h1 className="text-5xl font-serif font-bold mb-4">
            Media Bias Tracker
          </h1>
          <p className="text-stone-600 text-lg max-w-xl">
            Daily AI-powered analysis of media bias.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-8 mb-16 py-6 border-y">
          <div className="text-center">
            <p className="text-4xl font-bold">{totalArticles ?? 0}</p>
            <p className="text-xs uppercase mt-1">Articles</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">{totalCategories ?? 0}</p>
            <p className="text-xs uppercase mt-1">Categories</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">{totalScores ?? 0}</p>
            <p className="text-xs uppercase mt-1">Scores</p>
          </div>
        </div>

        <div className="text-center text-stone-500 text-sm">
          Articles are processed in the background.
          <br />
          Detailed listings coming soon.
        </div>

      </div>
    </main>
  )
}