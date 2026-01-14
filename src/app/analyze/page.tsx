'use client'

import { useState } from 'react'
import Link from 'next/link'
import { addAnalyzedArticle } from '@/utils/analyzedArticles'

// Type for the analysis results
interface AnalysisResult {
  success: boolean
  media: {
    id: string
    title: string
    url: string
    source: string
  }
  analysis: {
    gemini: {
      scores: {
        category: string
        score: number
        explanation: string
      }[]
      summary: string
    } | null
    qwen: {
      scores: {
        category: string
        score: number
        explanation: string
      }[]
      summary: string
    } | null
    gptOss: {
      scores: {
        category: string
        score: number
        explanation: string
      }[]
      summary: string
    } | null
    llamaMaverick: {
      scores: {
        category: string
        score: number
        explanation: string
      }[]
      summary: string
    } | null
  }
}

export default function AnalyzePage() {
  // Form state
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<AnalysisResult | null>(null)

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    setLoading(true)
    setError('')
    setResults(null)

    try {
      const response = await fetch('/api/ai_analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, source })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setResults(data)

      // Save article ID to cookie for history tracking
      if (data.media?.id) {
        addAnalyzedArticle(data.media.id)
      }

      setUrl('')
      setTitle('')
      setSource('')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get color based on score (matching homepage)
  function getScoreColor(score: number): string {
    if (score < -0.3) return 'bg-blue-500/20 text-blue-400'
    if (score > 0.3) return 'bg-red-500/20 text-red-400'
    return 'bg-green-500/20 text-green-400'
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors duration-300 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mb-8"
        >
          ← Back to Home
        </Link>

        {/* Header */}
        <div className="mb-10 border-b-2 border-stone-900 dark:border-stone-100 pb-6">
          <p className="text-sm tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
            AI-Powered Analysis
          </p>
          <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-3">
            Analyze Article
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-lg">
            Submit a news article to analyze its bias
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 mb-10">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Article URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.bbc.com/news/article..."
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg
                         text-stone-900 dark:text-stone-100 placeholder-stone-400
                         focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100
                         disabled:opacity-50 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Article Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter the article headline"
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg
                         text-stone-900 dark:text-stone-100 placeholder-stone-400
                         focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100
                         disabled:opacity-50 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="source" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Source
            </label>
            <input
              id="source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="BBC, CNN, Fox News, etc."
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg
                         text-stone-900 dark:text-stone-100 placeholder-stone-400
                         focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100
                         disabled:opacity-50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-stone-900 dark:bg-stone-100 hover:bg-stone-700 dark:hover:bg-stone-300
                       text-stone-100 dark:text-stone-900 font-semibold rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" cy="12" r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    fill="none"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Analyzing... (15-20 seconds)
              </>
            ) : (
              'Analyze Article'
            )}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-4">
              <span className="text-xl">✓</span>
              <span className="font-medium">Analysis Complete</span>
            </div>

            {/* Article Info */}
            <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg">
              <h3 className="font-serif font-semibold text-stone-900 dark:text-stone-100 mb-1">{results.media.title}</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400">{results.media.source}</p>
            </div>

            {/* Average Scores Header */}
            <div className="p-4 bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg">
              <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-1">Average Bias Scores</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Averaged across {[results.analysis.gemini, results.analysis.qwen, results.analysis.gptOss, results.analysis.llamaMaverick].filter(Boolean).length} AI models (Google Gemini, Alibaba Qwen3, OpenAI GPT-OSS, Meta Llama 4)
              </p>
            </div>

            {/* Calculate and Display Average Scores */}
            {(() => {
              // Collect all model analyses
              const models = [
                results.analysis.gemini,
                results.analysis.qwen,
                results.analysis.gptOss,
                results.analysis.llamaMaverick
              ].filter(Boolean)

              if (models.length === 0) return null

              // Calculate average scores for each category
              const categoryAverages = new Map<string, { sum: number; count: number }>()

              models.forEach(model => {
                model.scores.forEach(score => {
                  const current = categoryAverages.get(score.category) || { sum: 0, count: 0 }
                  categoryAverages.set(score.category, {
                    sum: current.sum + score.score,
                    count: current.count + 1
                  })
                })
              })

              // Convert to array and calculate averages
              const averagedScores = Array.from(categoryAverages.entries()).map(([category, data]) => ({
                category,
                score: data.sum / data.count,
                modelCount: data.count
              }))

              return (
                <div className="space-y-3">
                  {/* Average Scores */}
                  {averagedScores.map((score, index) => (
                    <div
                      key={index}
                      className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`${getScoreColor(score.score)} text-sm px-3 py-1 rounded-full font-semibold capitalize`}>
                          {score.category}
                        </span>
                        <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                          {score.score > 0 ? '+' : ''}{score.score.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-500">
                        Average of {score.modelCount} model{score.modelCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Legend */}
            <div className="p-4 bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg text-center">
              <p className="text-xs text-stone-600 dark:text-stone-400">
                <span className="text-red-600 dark:text-red-400">-1 (left)</span> →
                <span className="text-green-600 dark:text-green-400"> 0 (neutral)</span> →
                <span className="text-blue-600 dark:text-blue-400">+1 (right)</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 py-3 border border-stone-300 dark:border-stone-700 hover:border-stone-900 dark:hover:border-stone-100
                           text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg transition-colors text-center font-medium"
              >
                View Your History →
              </Link>
              <button
                onClick={() => setResults(null)}
                className="flex-1 py-3 border border-stone-300 dark:border-stone-700 hover:border-stone-900 dark:hover:border-stone-100
                           text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg transition-colors font-medium"
              >
                Analyze Another
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}