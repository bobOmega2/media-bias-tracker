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
        const cookieIds = getAnalyzedArticles()
        console.log('Cookie IDs:', cookieIds)

        if (cookieIds.length === 0) {
          console.log('No articles in cookies')
          setLoading(false)
          return
        }

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
          .eq('user_analyzed', true)

        console.log('Supabase query result:', { data, error: fetchError })

        if (fetchError) throw fetchError

        const sortedArticles = cookieIds
          .map(id => data?.find(article => article.id === id))
          .filter(Boolean) as unknown as Article[]

        console.log('Sorted articles:', sortedArticles)
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
          <Link href="/" className="inline-flex items-center text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 mb-4 transition-colors">
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

        {/* Loading & Error & Empty states */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900 dark:border-stone-100"></div>
            <p className="mt-4 text-stone-600 dark:text-stone-400">Loading your articles...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-6 mb-8">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

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
            <Link href="/analyze" className="inline-block px-6 py-3 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 font-semibold rounded-lg hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors">
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
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
                <p className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-1">{stats.totalArticles}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">Articles Analyzed</p>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
                <p className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-1">{stats.categoriesTracked}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400">Bias Categories</p>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{balanceScore}%</p>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">Balance Score</p>
                <p className="text-xs text-stone-500 dark:text-stone-500">{getBalanceDescription(balanceScore)}</p>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1 capitalize">{mostCommonBias}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">Most Common Bias</p>
                <p className="text-xs text-stone-500 dark:text-stone-500">{mostCommonBiasCount} {mostCommonBiasCount === 1 ? 'occurrence' : 'occurrences'}</p>
              </div>
            </div>

            {/* Bias Categories Grid */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
              <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2 transition-colors duration-300">Bias Analysis Overview</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">Distribution of your analyzed articles across all bias dimensions</p>

              <div className="space-y-6">
                {allCategories.map(category => {
                  const categoryArticles = articles.filter(a =>
                    a.ai_scores.some(s => s.bias_categories?.name === category)
                  )
                  if (categoryArticles.length === 0) return null

                  const scores = categoryArticles.map(a => {
                    const s = a.ai_scores.find(score => score.bias_categories?.name === category)
                    return s ? s.score : 0
                  })
                  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length

                  return (
                    <div key={category} className="border-b border-stone-200 dark:border-stone-800 pb-6 last:border-b-0">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100 capitalize">{category}</h4>
                        <span className="text-sm text-stone-500 dark:text-stone-400">{categoryArticles.length} article{categoryArticles.length !== 1 ? 's' : ''}</span>
                      </div>

                      <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
                        <span>-1.0</span><span>0 (Neutral)</span><span>+1.0</span>
                      </div>

                      <div className="relative w-full h-6 rounded-lg overflow-hidden mb-2" style={{ background: 'linear-gradient(to right, #ef4444 0%, #9ca3af 50%, #3b82f6 100%)' }}>
                        <div className="absolute left-1/2 top-0 w-0.5 h-full bg-stone-900 dark:bg-stone-100 opacity-30"></div>
                        {categoryArticles.map((article, idx) => {
                          const s = article.ai_scores.find(score => score.bias_categories?.name === category)
                          if (!s) return null
                          const score = s.score
                          const position = ((score + 1) / 2) * 100
                          return <div key={idx} className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-stone-900 dark:bg-stone-100 rounded-full border border-white dark:border-stone-900" style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }} title={`${article.title}: ${score}`}></div>
                        })}
                        <div className="absolute top-0 w-1 h-full bg-yellow-500 dark:bg-yellow-400 opacity-70" style={{ left: `${((avgScore + 1) / 2) * 100}%` }} title={`Average: ${avgScore.toFixed(2)}`}></div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600 dark:text-stone-400">Avg: <span className="font-semibold">{avgScore.toFixed(2)}</span></span>
                        <span className="text-stone-600 dark:text-stone-400">Range: <span className="font-semibold">{Math.min(...scores).toFixed(2)}</span> to <span className="font-semibold">{Math.max(...scores).toFixed(2)}</span></span>
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

        {/* Category Filter Buttons */}
        {!loading && !error && articles.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100 mb-4">
              Filter by Category
            </h3>
            <div className="flex flex-wrap gap-3">
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
        {!loading && !error && filteredArticles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="p-6">
                  {/* Article metadata */}
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                      {article.source}
                    </span>
                    {article.published_at && (
                      <span className="text-xs text-stone-400 dark:text-stone-500">
                        {new Date(article.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Article image */}
                  {article.image_url && article.image_url.trim() !== '' && (
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                      onError={(e) => {
                        console.log('Image load error for:', article.image_url)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}

                  {/* Article title */}
                  <h3 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100 mb-2 line-clamp-2">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
                    >
                      {article.title}
                    </a>
                  </h3>

                  {/* Description */}
                  {article.description && (
                    <p className="text-sm text-stone-600 dark:text-stone-400 mb-4 line-clamp-2">
                      {article.description}
                    </p>
                  )}

                  {/* AI Score badges - Averaged */}
                  {article.ai_scores && article.ai_scores.length > 0 && (() => {
                    // Calculate average scores per category
                    const categoryAverages = new Map<string, { sum: number; count: number }>()

                    article.ai_scores.forEach(score => {
                      const categoryName = score.bias_categories?.name
                      if (categoryName) {
                        const current = categoryAverages.get(categoryName) || { sum: 0, count: 0 }
                        categoryAverages.set(categoryName, {
                          sum: current.sum + score.score,
                          count: current.count + 1
                        })
                      }
                    })

                    // Convert to array with averages
                    const averagedScores = Array.from(categoryAverages.entries()).map(([category, data]) => ({
                      category,
                      avgScore: data.sum / data.count
                    }))

                    return (
                      <div className="flex flex-wrap gap-2">
                        {averagedScores.map((score, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(score.avgScore)}`}
                          >
                            {score.category}: {score.avgScore.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )
                  })()}

                  {/* No scores indicator */}
                  {(!article.ai_scores || article.ai_scores.length === 0) && (
                    <div className="text-xs text-stone-400 dark:text-stone-500 italic">
                      Analysis in progress...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
