'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { getAnalyzedArticles } from '@/utils/analyzedArticles'

interface Article {
  id: string
  title: string
  url: string
  source: string
  image_url: string | null
  description: string | null
  published_at: string | null
  ai_scores: {
    score: number
    explanation: string
    bias_categories: {
      name: string
    }[]
  }[]
}

export default function DashboardPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserArticles() {
      try {
        // Step 1: Get article IDs from cookie
        const cookieIds = getAnalyzedArticles()

        if (cookieIds.length === 0) {
          setLoading(false)
          return // No articles analyzed yet
        }

        // Step 2: Fetch articles from Supabase
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('media')
          .select(`
            id,
            title,
            url,
            source,
            image_url,
            description,
            published_at,
            ai_scores (
              score,
              explanation,
              bias_categories (
                name
              )
            )
          `)
          .in('id', cookieIds)
          .eq('user_analyzed', true)  // Double-check it's user's article

        if (fetchError) {
          throw fetchError
        }

        // Step 3: Sort by cookie order (most recent first)
        const sortedArticles = cookieIds
          .map(id => data?.find(article => article.id === id))
          .filter(article => article !== undefined) as Article[]

        setArticles(sortedArticles)
      } catch (err) {
        console.error('Error fetching user articles:', err)
        setError('Failed to load your analyzed articles')
      } finally {
        setLoading(false)
      }
    }

    fetchUserArticles()
  }, [])

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
          <Link
            href="/"
            className="inline-flex items-center text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 mb-4 transition-colors"
          >
            ← Back to Home
          </Link>
          <p className="text-sm tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
            Your Analysis History
          </p>
          <h1 className="text-5xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 transition-colors duration-300">
            Dashboard
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-lg">
            View all articles you've analyzed for bias
          </p>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 dark:border-stone-100"></div>
            <p className="mt-4 text-stone-600 dark:text-stone-400">Loading your articles...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-6 mb-8">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100 mb-2">
              No Articles Analyzed Yet
            </h3>
            <p className="text-stone-600 dark:text-stone-400 mb-6">
              Start analyzing articles to build your personal history
            </p>
            <Link
              href="/analyze"
              className="inline-block px-6 py-3 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 font-semibold rounded-lg hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
            >
              Analyze Your First Article
            </Link>
          </div>
        )}

        {/* Articles Grid */}
        {!loading && !error && articles.length > 0 && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Showing {articles.length} analyzed article{articles.length !== 1 ? 's' : ''}
              </p>
              <Link
                href="/analyze"
                className="text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Analyze Another →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden group transition-colors duration-300 hover:border-stone-400 dark:hover:border-stone-600 cursor-pointer"
                >
                  {/* Image */}
                  {article.image_url && (
                    <div className="w-full h-48 overflow-hidden">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="p-4">
                    {/* Source */}
                    <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                      {article.source}
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-base text-stone-900 dark:text-stone-100 mb-3 line-clamp-2 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors duration-300">
                      {article.title}
                    </h3>

                    {/* Description */}
                    {article.description && (
                      <p className="text-sm text-stone-600 dark:text-stone-400 mb-3 line-clamp-2">
                        {article.description}
                      </p>
                    )}

                    {/* AI Score badges */}
                    {article.ai_scores && article.ai_scores.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {article.ai_scores.map((score, idx) => {
                          const category = score.bias_categories?.[0]
                          return category ? (
                            <span
                              key={idx}
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(score.score)}`}
                            >
                              {category.name}: {score.score}
                            </span>
                          ) : null
                        })}
                      </div>
                    )}

                    {/* No scores indicator */}
                    {(!article.ai_scores || article.ai_scores.length === 0) && (
                      <div className="text-xs text-stone-400 dark:text-stone-500 italic">
                        Analysis in progress...
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
