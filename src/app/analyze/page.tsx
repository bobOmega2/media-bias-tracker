'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    scores: {
      category: string
      score: number
      explanation: string
    }[]
    summary: string
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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          ← Back to Home
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            Analyze Article
          </h1>
          <p className="text-slate-400 text-lg">
            Submit a news article to analyze its bias
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 mb-10">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-2">
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
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl 
                         text-white placeholder-slate-500
                         focus:outline-none focus:border-blue-500
                         disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
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
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl 
                         text-white placeholder-slate-500
                         focus:outline-none focus:border-blue-500
                         disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="source" className="block text-sm font-medium text-slate-300 mb-2">
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
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl 
                         text-white placeholder-slate-500
                         focus:outline-none focus:border-blue-500
                         disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 
                       text-white font-medium rounded-xl
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
          <div className="mb-8 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-green-400 mb-4">
              <span className="text-xl">✓</span>
              <span className="font-medium">Analysis Complete</span>
            </div>

            {/* Article Info */}
            <div className="p-5 bg-slate-800 border border-slate-700 rounded-xl">
              <h3 className="font-semibold text-white mb-1">{results.media.title}</h3>
              <p className="text-sm text-slate-400">{results.media.source}</p>
            </div>

            {/* Summary */}
            <div className="p-5 bg-slate-800 border border-slate-700 rounded-xl">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Summary</h3>
              <p className="text-white">{results.analysis.summary}</p>
            </div>

            {/* Scores */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400">Bias Scores</h3>
              
              {results.analysis.scores.map((score, index) => (
                <div 
                  key={index}
                  className="p-5 bg-slate-800 border border-slate-700 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`${getScoreColor(score.score)} text-sm px-3 py-1 rounded-full`}>
                      {score.category}
                    </span>
                    <span className="text-2xl font-bold text-white">
                      {score.score > 0 ? '+' : ''}{score.score.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {score.explanation}
                  </p>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
              <p className="text-xs text-slate-500">
                <span className="text-blue-400">-1 (left)</span> → 
                <span className="text-green-400"> 0 (neutral)</span> → 
                <span className="text-red-400">+1 (right)</span>
              </p>
            </div>

            {/* Analyze Another */}
            <button
              onClick={() => setResults(null)}
              className="w-full py-3 border border-slate-700 hover:border-slate-600 
                         text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Analyze Another Article
            </button>
          </div>
        )}
      </div>
    </main>
  )
}