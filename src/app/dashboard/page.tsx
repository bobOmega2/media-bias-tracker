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
    } | null
  }[]
}

export default function DashboardPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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

        console.log('Fetched articles:', sortedArticles)
        console.log('Sample article:', sortedArticles[0])
        console.log('Sample article image_url:', sortedArticles[0]?.image_url)
        console.log('Sample article ai_scores:', sortedArticles[0]?.ai_scores)

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

  // Calculate stats from existing data
  const stats = {
    totalArticles: articles.length,
    categoriesTracked: Array.from(new Set(
      articles.flatMap(a =>
        a.ai_scores?.map(s => s.bias_categories?.name).filter(Boolean) || []
      )
    )).length,
  }

  // Calculate Balance Score (0-100%) based on variance across all scores
  const allScores = articles.flatMap(a =>
    a.ai_scores?.map(s => parseFloat(s.score.toString())) || []
  )
  const calculateVariance = (scores: number[]) => {
    if (scores.length === 0) return 0
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2))
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length
    return Math.sqrt(variance) // Standard deviation
  }
  const variance = calculateVariance(allScores)
  const balanceScore = Math.min(100, Math.round(variance * 100)) // Higher variance = more balanced

  // Find Most Common Bias Type
  const biasCounts: { [key: string]: number } = {}
  articles.forEach(a => {
    a.ai_scores?.forEach(s => {
      const cat = s.bias_categories?.name
      if (cat) {
        biasCounts[cat] = (biasCounts[cat] || 0) + 1
      }
    })
  })
  const mostCommonBiasEntry = Object.entries(biasCounts).sort((a, b) => b[1] - a[1])[0]
  const mostCommonBias = mostCommonBiasEntry ? mostCommonBiasEntry[0] : 'None'
  const mostCommonBiasCount = mostCommonBiasEntry ? mostCommonBiasEntry[1] : 0

  // Determine balance description
  const getBalanceDescription = (score: number) => {
    if (score >= 70) return 'Your articles span a wide range of viewpoints'
    if (score >= 40) return 'Your articles show moderate perspective diversity'
    return 'Your articles show consistent perspectives'
  }

  // Determine variance level
  const getVarianceLevel = (score: number) => {
    if (score >= 70) return 'High'
    if (score >= 40) return 'Medium'
    return 'Low'
  }

  // Get unique categories for filter buttons
  const allCategories = Array.from(new Set(
    articles.flatMap(a =>
      a.ai_scores?.map(s => s.bias_categories?.name).filter(Boolean) || []
    )
  ))

  // Debug logging
  console.log('All categories found:', allCategories)
  console.log('Total articles:', articles.length)
  console.log('Sample article ai_scores structure:', articles[0]?.ai_scores)
  console.log('Sample bias_categories:', articles[0]?.ai_scores?.[0]?.bias_categories)

  // Filter articles by selected category
  const filteredArticles = selectedCategory
    ? articles.filter(a =>
        a.ai_scores?.some(s => s.bias_categories?.name === selectedCategory)
      )
    : articles

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-12 border-b-2 border-stone-900 dark:border-stone-100 pb-8 transition-colors duration-300">
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
            Track your media consumption patterns and bias awareness
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

        {/* Stats Overview */}
        {!loading && !error && articles.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-6 transition-colors duration-300">
              Your Reading Insights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Articles */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
                <p className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-1">
                  {stats.totalArticles}
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Articles Analyzed
                </p>
              </div>

              {/* Categories Tracked */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
                <p className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-1">
                  {stats.categoriesTracked}
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Bias Categories
                </p>
              </div>

              {/* Balance Score */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  {balanceScore}%
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">
                  Balance Score
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-500">
                  {getBalanceDescription(balanceScore)}
                </p>
              </div>

              {/* Most Common Bias */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1 capitalize">
                  {mostCommonBias}
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">
                  Most Common Bias
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-500">
                  {mostCommonBiasCount} {mostCommonBiasCount === 1 ? 'occurrence' : 'occurrences'}
                </p>
              </div>
            </div>

            {/* Bias Distribution Visual - All Categories */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
              <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2 transition-colors duration-300">
                Bias Analysis Overview
              </h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
                Distribution of your analyzed articles across all bias dimensions
              </p>

              {/* Grid of all bias categories */}
              <div className="space-y-6">
                {allCategories.map((category) => {
                  // Get all articles with this bias category
                  const categoryArticles = articles.filter(a =>
                    a.ai_scores?.some(s => s.bias_categories?.name === category)
                  )

                  if (categoryArticles.length === 0) return null

                  // Calculate average score for this category
                  const scores = categoryArticles.map(a => {
                    const score = a.ai_scores?.find(s => s.bias_categories?.name === category)
                    return score ? parseFloat(score.score.toString()) : 0
                  })
                  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length

                  return (
                    <div key={category} className="border-b border-stone-200 dark:border-stone-800 pb-6 last:border-b-0">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100 capitalize">
                          {category}
                        </h4>
                        <span className="text-sm text-stone-500 dark:text-stone-400">
                          {categoryArticles.length} article{categoryArticles.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Scale labels */}
                      <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
                        <span>-1.0</span>
                        <span>0 (Neutral)</span>
                        <span>+1.0</span>
                      </div>

                      {/* Distribution bar */}
                      <div className="relative w-full h-6 rounded-lg overflow-hidden mb-2" style={{ background: 'linear-gradient(to right, #ef4444 0%, #9ca3af 50%, #3b82f6 100%)' }}>
                        {/* Center line marker */}
                        <div className="absolute left-1/2 top-0 w-0.5 h-full bg-stone-900 dark:bg-stone-100 opacity-30"></div>

                        {/* Article markers */}
                        {categoryArticles.map((article, idx) => {
                          const scoreData = article.ai_scores?.find(s => s.bias_categories?.name === category)
                          if (!scoreData) return null

                          const score = parseFloat(scoreData.score.toString())
                          const position = ((score + 1) / 2) * 100

                          return (
                            <div
                              key={idx}
                              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-stone-900 dark:bg-stone-100 rounded-full border border-white dark:border-stone-900"
                              style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
                              title={`${article.title}: ${score}`}
                            ></div>
                          )
                        })}

                        {/* Average marker */}
                        <div
                          className="absolute top-0 w-1 h-full bg-yellow-500 dark:bg-yellow-400 opacity-70"
                          style={{ left: `${((avgScore + 1) / 2) * 100}%` }}
                          title={`Average: ${avgScore.toFixed(2)}`}
                        ></div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600 dark:text-stone-400">
                          Avg: <span className="font-semibold">{avgScore.toFixed(2)}</span>
                        </span>
                        <span className="text-stone-600 dark:text-stone-400">
                          Range: <span className="font-semibold">{Math.min(...scores).toFixed(2)}</span> to <span className="font-semibold">{Math.max(...scores).toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-500 mt-6 italic text-center">
                Each dot represents an article's score. Yellow line shows the average across all your articles.
              </p>
            </div>
          </div>
        )}

        {/* Category Filter */}
        {!loading && !error && articles.length > 0 && allCategories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 transition-colors duration-300">
              Filter by Category
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  selectedCategory === null
                    ? 'bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-700'
                }`}
              >
                All ({articles.length})
              </button>
              {allCategories.map((category) => {
                const count = articles.filter(a =>
                  a.ai_scores?.some(s => s.bias_categories?.name === category)
                ).length
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category || null)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm capitalize transition-all duration-300 ${
                      selectedCategory === category
                        ? 'bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-700'
                    }`}
                  >
                    {category} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Articles Grid */}
        {!loading && !error && articles.length > 0 && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
                {selectedCategory ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Articles` : 'All Articles'}
              </h2>
              <Link
                href="/analyze"
                className="text-sm text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-semibold"
              >
                Analyze Another →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden group transition-all duration-300 hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-lg cursor-pointer"
                >
                  {/* Image */}
                  {article.image_url && article.image_url.trim() !== '' && (
                    <div className="w-full h-48 overflow-hidden bg-stone-100 dark:bg-stone-800">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          console.log('Image load error for:', article.image_url)
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  <div className="p-5">
                    {/* Source */}
                    <div className="text-xs text-stone-500 dark:text-stone-400 mb-2 uppercase tracking-wide">
                      {article.source}
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3 line-clamp-2 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors duration-300">
                      {article.title}
                    </h3>

                    {/* Description */}
                    {article.description && (
                      <p className="text-sm text-stone-600 dark:text-stone-400 mb-4 line-clamp-2">
                        {article.description}
                      </p>
                    )}

                    {/* AI Score badges */}
                    {article.ai_scores && article.ai_scores.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {article.ai_scores.map((score, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(score.score)}`}
                          >
                            {score.bias_categories?.name || 'Unknown'}: {score.score}
                          </span>
                        ))}
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

            {/* No results from filter */}
            {filteredArticles.length === 0 && selectedCategory && (
              <div className="text-center py-12 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
                <p className="text-stone-600 dark:text-stone-400">
                  No articles found in the "{selectedCategory}" category
                </p>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="mt-4 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
                >
                  View All Articles
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
