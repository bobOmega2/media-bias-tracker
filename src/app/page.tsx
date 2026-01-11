/**
 * Homepage - Media Bias Tracker Landing Page
 *
 * Features:
 * - Hero section with mission and CTAs
 * - How it works visual explanation
 * - Featured analyzed articles
 * - Bias categories overview
 * - Live statistics dashboard
 */

import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function Page() {
  const supabase = await createClient()

  // Fetch stats from both active and archived tables
  const { count: activeArticles } = await supabase
    .from('media')
    .select('*', { count: 'exact', head: true })

  const { count: archivedArticles } = await supabase
    .from('archived_media')
    .select('*', { count: 'exact', head: true })

  const totalArticles = (activeArticles || 0) + (archivedArticles || 0)

  const { count: totalCategories } = await supabase
    .from('bias_categories')
    .select('*', { count: 'exact', head: true })

  const { count: activeScores } = await supabase
    .from('ai_scores')
    .select('*', { count: 'exact', head: true })

  const { count: archivedScores } = await supabase
    .from('archived_ai_scores')
    .select('*', { count: 'exact', head: true })

  const totalScores = (activeScores || 0) + (archivedScores || 0)

  // Fetch bias categories for display
  const { data: biasCategories } = await supabase
    .from('bias_categories')
    .select('id, name, description')
    .limit(6)

  // Fetch featured analyzed articles (top 6 with scores)
  const { data: featuredArticles } = await supabase
    .from('media')
    .select(`
      *,
      ai_scores (
        score,
        model_name,
        bias_categories (
          name
        )
      )
    `)
    .eq('user_analyzed', false)
    .not('ai_scores', 'is', null)
    .limit(6)

  // Helper to pick badge color based on score
  const getScoreColor = (score: number) => {
    if (score > 0) return 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
    if (score < 0) return 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
    return 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors duration-300">

      {/* Hero Section */}
      <section className="border-b-2 border-stone-900 dark:border-stone-100 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-4">
              Independent Analysis
            </p>
            <h1 className="text-6xl md:text-7xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-6 transition-colors duration-300">
              Media Bias Tracker
            </h1>
            <p className="text-xl text-stone-600 dark:text-stone-400 mb-8 leading-relaxed transition-colors duration-300">
              AI-powered analysis to showcase different perspectives, challenge assumptions,
              and help you engage more critically with the media you consume.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/analyze"
                className="px-8 py-4 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-semibold rounded-lg hover:bg-stone-700 dark:hover:bg-stone-300 transition-all duration-300 text-center min-w-[200px]"
              >
                Analyze an Article
              </Link>
              <Link
                href="/articles"
                className="px-8 py-4 border-2 border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 transition-all duration-300 text-center min-w-[200px]"
              >
                Explore Articles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-b border-stone-200 dark:border-stone-800 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 transition-colors duration-300">
              How It Works
            </h2>
            <p className="text-stone-600 dark:text-stone-400 text-lg transition-colors duration-300">
              Three simple steps to understand media bias
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 transition-colors duration-300">
                1
              </div>
              <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100 mb-3 transition-colors duration-300">
                Submit or Discover
              </h3>
              <p className="text-stone-600 dark:text-stone-400 transition-colors duration-300">
                Paste any article URL or browse our curated collection from trusted news sources.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 transition-colors duration-300">
                2
              </div>
              <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100 mb-3 transition-colors duration-300">
                AI Analysis
              </h3>
              <p className="text-stone-600 dark:text-stone-400 transition-colors duration-300">
                Our AI examines the article across multiple bias dimensions including political, economic, and sensationalism.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 transition-colors duration-300">
                3
              </div>
              <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100 mb-3 transition-colors duration-300">
                Review Insights
              </h3>
              <p className="text-stone-600 dark:text-stone-400 transition-colors duration-300">
                Get detailed breakdowns with bias scores and explanations to inform your perspective.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Articles Section */}
      {featuredArticles && featuredArticles.length > 0 && (
        <section className="border-b border-stone-200 dark:border-stone-800 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2 transition-colors duration-300">
                  Recently Analyzed
                </h2>
                <p className="text-stone-600 dark:text-stone-400 transition-colors duration-300">
                  Explore our latest bias analyses
                </p>
              </div>
              <Link
                href="/articles"
                className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-semibold transition-colors duration-300"
              >
                View All →
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredArticles.map((article: any) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden hover:border-stone-400 dark:hover:border-stone-600 transition-all duration-300 group"
                >
                  {article.image_url && (
                    <div className="w-full h-48 overflow-hidden">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                      {article.source || 'Unknown Source'}
                    </div>

                    <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3 line-clamp-2 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors duration-300">
                      {article.title}
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {article.ai_scores?.slice(0, 3).map((score: any, idx: number) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(parseFloat(score.score))}`}
                        >
                          {score.bias_categories?.name}: {score.score}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bias Categories Section */}
      {biasCategories && biasCategories.length > 0 && (
        <section className="border-b border-stone-200 dark:border-stone-800 transition-colors duration-300">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 transition-colors duration-300">
                What We Analyze
              </h2>
              <p className="text-stone-600 dark:text-stone-400 text-lg transition-colors duration-300">
                Understanding bias across multiple dimensions
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {biasCategories.map((category: any) => (
                <div
                  key={category.id}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300"
                >
                  <h3 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100 mb-2 capitalize transition-colors duration-300">
                    {category.name}
                  </h3>
                  <p className="text-stone-600 dark:text-stone-400 text-sm transition-colors duration-300">
                    {category.description || `Analyzing ${category.name} bias indicators in media content.`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats Dashboard Section */}
      <section className="bg-stone-100 dark:bg-stone-900 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 transition-colors duration-300">
              By The Numbers
            </h2>
            <p className="text-stone-600 dark:text-stone-400 text-lg transition-colors duration-300">
              Our growing database of analyzed media
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center bg-white dark:bg-stone-950 rounded-lg p-8 border border-stone-200 dark:border-stone-800 transition-colors duration-300">
              <p className="text-5xl font-bold text-stone-900 dark:text-stone-100 mb-2 transition-colors duration-300">
                {totalArticles ?? 0}
              </p>
              <p className="text-sm uppercase tracking-wide text-stone-600 dark:text-stone-400 mb-1 transition-colors duration-300">
                Articles Analyzed
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-500 transition-colors duration-300">
                From trusted news sources
              </p>
            </div>

            <div className="text-center bg-white dark:bg-stone-950 rounded-lg p-8 border border-stone-200 dark:border-stone-800 transition-colors duration-300">
              <p className="text-5xl font-bold text-stone-900 dark:text-stone-100 mb-2 transition-colors duration-300">
                {totalCategories ?? 0}
              </p>
              <p className="text-sm uppercase tracking-wide text-stone-600 dark:text-stone-400 mb-1 transition-colors duration-300">
                Bias Categories
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-500 transition-colors duration-300">
                Multi-dimensional analysis
              </p>
            </div>

            <div className="text-center bg-white dark:bg-stone-950 rounded-lg p-8 border border-stone-200 dark:border-stone-800 transition-colors duration-300">
              <p className="text-5xl font-bold text-stone-900 dark:text-stone-100 mb-2 transition-colors duration-300">
                {totalScores ?? 0}
              </p>
              <p className="text-sm uppercase tracking-wide text-stone-600 dark:text-stone-400 mb-1 transition-colors duration-300">
                Bias Scores Generated
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-500 transition-colors duration-300">
                Detailed insights provided
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Statement / CTA Section */}
      <section>
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-6 transition-colors duration-300">
            Question What You Read
          </h2>
          <p className="text-lg text-stone-600 dark:text-stone-400 mb-8 leading-relaxed transition-colors duration-300">
            Every article carries perspective. Our mission is to help you identify bias,
            understand context, and form your own informed opinions. Start analyzing articles
            today and join others in reading more critically.
          </p>
          <Link
            href="/analyze"
            className="inline-block px-8 py-4 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 font-semibold rounded-lg hover:bg-stone-700 dark:hover:bg-stone-300 transition-all duration-300"
          >
            Get Started
          </Link>
        </div>
      </section>

    </main>
  )
}