import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch article with AI scores and bias categories
  const { data: article, error } = await supabase
    .from('media')
    .select(`
      *,
      ai_scores (
        score,
        model_name,
        explanation,
        bias_categories (
          id,
          name
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !article) {
    notFound()
  }

  // Helper to pick badge color based on score
  const getScoreColor = (score: number) => {
    if (score > 0) return 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
    if (score < 0) return 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
    return 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }

  // Get bias interpretation
  const getBiasInterpretation = (score: number) => {
    const absScore = Math.abs(score)
    if (absScore === 0) return 'Neutral'
    if (absScore <= 0.3) return 'Slight bias'
    if (absScore <= 0.6) return 'Moderate bias'
    return 'Strong bias'
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Back button */}
        <Link
          href="/articles"
          className="inline-flex items-center text-sm text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 mb-8 transition-colors"
        >
          ← Back to Articles
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          {article.image_url && (
            <div className="w-full h-96 overflow-hidden rounded-lg mb-6">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-center gap-3 text-sm text-stone-500 dark:text-stone-400 mb-3">
            <span className="font-semibold">{article.source}</span>
            <span>•</span>
            <span>{formatDate(article.published_at)}</span>
          </div>

          <h1 className="text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 transition-colors duration-300">
            {article.title}
          </h1>

          {article.description && (
            <p className="text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
              {article.description}
            </p>
          )}
        </header>

        {/* Read Full Article Button */}
        <div className="mb-12">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 font-semibold rounded-lg hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
          >
            Read Full Article →
          </a>
        </div>

        {/* Bias Analysis Section */}
        {article.ai_scores && article.ai_scores.length > 0 ? (
          <section className="border-t border-stone-200 dark:border-stone-800 pt-12">
            <div className="mb-8">
              <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">
                Bias Analysis
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                AI-powered analysis across multiple bias categories
              </p>
            </div>

            {/* Bias Scores Grid */}
            <div className="space-y-6">
              {article.ai_scores.map((score: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 capitalize">
                        {score.bias_categories?.name || 'Unknown Category'}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(parseFloat(score.score))}`}
                      >
                        {score.score > 0 ? '+' : ''}{score.score}
                      </span>
                    </div>
                    <span className="text-sm text-stone-500 dark:text-stone-400">
                      {getBiasInterpretation(parseFloat(score.score))}
                    </span>
                  </div>

                  {/* Score Bar */}
                  <div className="mb-4">
                    <div className="w-full h-3 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          parseFloat(score.score) > 0
                            ? 'bg-green-500'
                            : parseFloat(score.score) < 0
                            ? 'bg-red-500'
                            : 'bg-gray-500'
                        }`}
                        style={{
                          width: `${Math.abs(parseFloat(score.score)) * 100}%`,
                          marginLeft: parseFloat(score.score) < 0 ? `${(1 - Math.abs(parseFloat(score.score))) * 100}%` : '0'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-stone-400 mt-1">
                      <span>-1 (Strong Left/Negative)</span>
                      <span>0 (Neutral)</span>
                      <span>+1 (Strong Right/Positive)</span>
                    </div>
                  </div>

                  {/* Explanation */}
                  {score.explanation && (
                    <div className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                      <p className="font-semibold text-stone-700 dark:text-stone-300 mb-2">
                        Analysis:
                      </p>
                      <p>{score.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Model Attribution */}
            {article.ai_scores[0]?.model_name && (
              <div className="mt-8 p-4 bg-stone-100 dark:bg-stone-800 rounded-lg">
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Analysis generated by <span className="font-semibold">{article.ai_scores[0].model_name}</span>
                </p>
              </div>
            )}
          </section>
        ) : (
          <section className="border-t border-stone-200 dark:border-stone-800 pt-12">
            <div className="text-center text-stone-500 dark:text-stone-400">
              <p className="text-lg mb-2">No bias analysis available yet</p>
              <p className="text-sm">This article hasn't been analyzed by our AI models.</p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
