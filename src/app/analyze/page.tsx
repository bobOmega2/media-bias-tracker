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
  // Form state - only URL needed now (title/source extracted automatically)
  const [url, setUrl] = useState('')

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
        body: JSON.stringify({ url })  // Only URL needed - metadata extracted automatically
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
            <div className="mb-2">
              <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">Average Bias Scores</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Averaged across {[results.analysis.gemini, results.analysis.qwen, results.analysis.gptOss, results.analysis.llamaMaverick].filter(Boolean).length} AI models (Google Gemini, Alibaba Qwen3, OpenAI GPT-OSS, Meta Llama 4)
              </p>
            </div>

            {/* Calculate and Display Average Scores */}
            {(() => {
              // Collect all model analyses (filter out nulls with type guard)
              const models = [
                results.analysis.gemini,
                results.analysis.qwen,
                results.analysis.gptOss,
                results.analysis.llamaMaverick
              ].filter((m): m is NonNullable<typeof m> => m !== null)

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

            {/* Individual Model Results */}
            <div className="mt-8">
              <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">
                Detailed Model Analysis
              </h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
                Individual bias scores and explanations from each AI model
              </p>

              {/* Model Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gemini Results */}
                {results.analysis.gemini && (
                  <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-5">
                    <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-4">
                      Google Gemini 2.5 Flash
                    </h4>
                    <div className="space-y-3 mb-4">
                      {results.analysis.gemini.scores.map((score, idx) => (
                        <div key={idx} className="bg-white/60 dark:bg-stone-900/60 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium capitalize text-stone-700 dark:text-stone-300">
                              {score.category}
                            </span>
                            <span className={`text-lg font-bold ${
                              score.score > 0.3 ? 'text-blue-600 dark:text-blue-400' :
                              score.score < -0.3 ? 'text-red-600 dark:text-red-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              {score.score > 0 ? '+' : ''}{score.score.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                            {score.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Summary</p>
                      <p className="text-sm text-stone-700 dark:text-stone-300">
                        {results.analysis.gemini.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Qwen Results */}
                {results.analysis.qwen && (
                  <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-5">
                    <h4 className="text-lg font-semibold text-orange-700 dark:text-orange-300 mb-4">
                      Alibaba Qwen3 32B
                    </h4>
                    <div className="space-y-3 mb-4">
                      {results.analysis.qwen.scores.map((score, idx) => (
                        <div key={idx} className="bg-white/60 dark:bg-stone-900/60 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium capitalize text-stone-700 dark:text-stone-300">
                              {score.category}
                            </span>
                            <span className={`text-lg font-bold ${
                              score.score > 0.3 ? 'text-blue-600 dark:text-blue-400' :
                              score.score < -0.3 ? 'text-red-600 dark:text-red-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              {score.score > 0 ? '+' : ''}{score.score.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                            {score.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-orange-200 dark:border-orange-700">
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Summary</p>
                      <p className="text-sm text-stone-700 dark:text-stone-300">
                        {results.analysis.qwen.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* GPT-OSS Results */}
                {results.analysis.gptOss && (
                  <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-5">
                    <h4 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-4">
                      OpenAI GPT-OSS 120B
                    </h4>
                    <div className="space-y-3 mb-4">
                      {results.analysis.gptOss.scores.map((score, idx) => (
                        <div key={idx} className="bg-white/60 dark:bg-stone-900/60 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium capitalize text-stone-700 dark:text-stone-300">
                              {score.category}
                            </span>
                            <span className={`text-lg font-bold ${
                              score.score > 0.3 ? 'text-blue-600 dark:text-blue-400' :
                              score.score < -0.3 ? 'text-red-600 dark:text-red-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              {score.score > 0 ? '+' : ''}{score.score.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                            {score.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-green-200 dark:border-green-700">
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Summary</p>
                      <p className="text-sm text-stone-700 dark:text-stone-300">
                        {results.analysis.gptOss.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Llama Maverick Results */}
                {results.analysis.llamaMaverick && (
                  <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-5">
                    <h4 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4">
                      Meta Llama 4 Maverick
                    </h4>
                    <div className="space-y-3 mb-4">
                      {results.analysis.llamaMaverick.scores.map((score, idx) => (
                        <div key={idx} className="bg-white/60 dark:bg-stone-900/60 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium capitalize text-stone-700 dark:text-stone-300">
                              {score.category}
                            </span>
                            <span className={`text-lg font-bold ${
                              score.score > 0.3 ? 'text-blue-600 dark:text-blue-400' :
                              score.score < -0.3 ? 'text-red-600 dark:text-red-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              {score.score > 0 ? '+' : ''}{score.score.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                            {score.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-purple-200 dark:border-purple-700">
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Summary</p>
                      <p className="text-sm text-stone-700 dark:text-stone-300">
                        {results.analysis.llamaMaverick.summary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
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