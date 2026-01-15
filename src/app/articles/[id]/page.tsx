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
            {/* Calculate averaged scores */}
            {(() => {
              // Group scores by category and calculate averages
              const categoryAverages = new Map<string, { sum: number; count: number; scores: any[] }>()

              article.ai_scores.forEach((score: any) => {
                const categoryName = score.bias_categories?.name
                if (categoryName) {
                  const current = categoryAverages.get(categoryName) || { sum: 0, count: 0, scores: [] }
                  categoryAverages.set(categoryName, {
                    sum: current.sum + parseFloat(score.score),
                    count: current.count + 1,
                    scores: [...current.scores, score]
                  })
                }
              })

              const averagedScores = Array.from(categoryAverages.entries()).map(([category, data]) => ({
                category,
                avgScore: data.sum / data.count,
                modelCount: data.count
              }))

              // Group scores by model
              const modelScores = new Map<string, any[]>()
              article.ai_scores.forEach((score: any) => {
                const modelName = score.model_name || 'Unknown Model'
                const current = modelScores.get(modelName) || []
                modelScores.set(modelName, [...current, score])
              })

              // Get unique models count
              const uniqueModels = Array.from(modelScores.keys())

              // Model display names
              const getModelDisplayName = (modelName: string) => {
                if (modelName.includes('gemini')) return 'Google Gemini'
                if (modelName.includes('qwen')) return 'Alibaba Qwen3'
                if (modelName.includes('gpt-oss')) return 'OpenAI GPT-OSS'
                if (modelName.includes('llama') || modelName.includes('maverick')) return 'Meta Llama 4 Maverick'
                return modelName
              }

              // Model badge colors
              const getModelBadgeColor = (modelName: string) => {
                if (modelName.includes('gemini')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                if (modelName.includes('qwen')) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                if (modelName.includes('gpt-oss')) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                if (modelName.includes('llama') || modelName.includes('maverick')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
              }

              return (
                <>
                  {/* Average Scores Section */}
                  <div className="mb-12">
                    <div className="mb-6">
                      <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">
                        Average Bias Scores
                      </h2>
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        Averaged across {uniqueModels.length} AI models for more balanced analysis
                      </p>
                    </div>

                    <div className="space-y-4">
                      {averagedScores.map((score, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 capitalize">
                                {score.category}
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(score.avgScore)}`}
                              >
                                {score.avgScore > 0 ? '+' : ''}{score.avgScore.toFixed(2)}
                              </span>
                            </div>
                            <span className="text-sm text-stone-500 dark:text-stone-400">
                              {getBiasInterpretation(score.avgScore)}
                            </span>
                          </div>

                          {/* Score Bar - Gradient colored */}
                          <div className="mb-2">
                            <div
                              className="relative w-full h-4 rounded-lg overflow-hidden"
                              style={{ background: 'linear-gradient(to right, #ef4444 0%, #9ca3af 50%, #3b82f6 100%)' }}
                            >
                              {/* Center marker */}
                              <div className="absolute left-1/2 top-0 w-0.5 h-full bg-stone-900 dark:bg-stone-100 opacity-30"></div>
                              {/* Score indicator */}
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-stone-900 dark:bg-stone-100 border-2 border-white dark:border-stone-900"
                                style={{ left: `${((score.avgScore + 1) / 2) * 100}%`, transform: 'translate(-50%, -50%)' }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-stone-400 mt-1">
                              <span>-1.0</span>
                              <span>0 (Neutral)</span>
                              <span>+1.0</span>
                            </div>
                          </div>

                          <p className="text-xs text-stone-500 dark:text-stone-500">
                            Average of {score.modelCount} model{score.modelCount > 1 ? 's' : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Model Variance Section */}
                  <div className="mb-12 border-t border-stone-200 dark:border-stone-800 pt-12">
                    <div className="mb-6">
                      <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">
                        Model Variance
                      </h2>
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        How each AI model scored compared to the average
                      </p>
                    </div>

                    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
                      <div className="space-y-6">
                        {averagedScores.map((avgScore, idx) => {
                          // Calculate each model's deviation from the average for this category
                          const modelDeviations = uniqueModels.map(modelName => {
                            const modelScoreForCategory = article.ai_scores.find(
                              (s: any) => s.model_name === modelName && s.bias_categories?.name === avgScore.category
                            )
                            const score = modelScoreForCategory ? parseFloat(modelScoreForCategory.score) : 0
                            const deviation = score - avgScore.avgScore
                            return { modelName, score, deviation }
                          })

                          return (
                            <div key={idx} className="border-b border-stone-100 dark:border-stone-800 pb-6 last:border-b-0 last:pb-0">
                              <h4 className="text-md font-semibold text-stone-900 dark:text-stone-100 capitalize mb-4">
                                {avgScore.category}
                              </h4>
                              <div className="space-y-3">
                                {modelDeviations.map((item, i) => (
                                  <div key={i} className="flex items-center gap-4">
                                    <span className={`text-xs px-2 py-1 rounded w-28 text-center ${getModelBadgeColor(item.modelName)}`}>
                                      {getModelDisplayName(item.modelName).split(' ')[0]}
                                    </span>
                                    <div className="flex-1 flex items-center gap-2">
                                      {/* Deviation bar */}
                                      <div className="flex-1 h-3 bg-stone-100 dark:bg-stone-800 rounded-full relative overflow-hidden">
                                        {/* Center line */}
                                        <div className="absolute left-1/2 top-0 w-0.5 h-full bg-stone-400 dark:bg-stone-600"></div>
                                        {/* Deviation indicator */}
                                        <div
                                          className={`absolute top-0 h-full ${item.deviation >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                                          style={{
                                            left: item.deviation >= 0 ? '50%' : `${50 + (item.deviation * 50)}%`,
                                            width: `${Math.abs(item.deviation) * 50}%`
                                          }}
                                        />
                                      </div>
                                      <span className={`text-xs font-semibold w-20 text-right ${
                                        item.deviation > 0 ? 'text-blue-600 dark:text-blue-400' :
                                        item.deviation < 0 ? 'text-red-600 dark:text-red-400' :
                                        'text-stone-500'
                                      }`}>
                                        {item.deviation > 0 ? '+' : ''}{item.deviation.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-500 mt-6 italic text-center">
                        Positive values indicate the model scored higher than average, negative values indicate lower.
                      </p>
                    </div>
                  </div>

                  {/* Individual Model Breakdowns */}
                  <div className="border-t border-stone-200 dark:border-stone-800 pt-12">
                    <div className="mb-6">
                      <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">
                        Analysis by Model
                      </h2>
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        Individual scores and explanations from each AI model
                      </p>
                    </div>

                    <div className="space-y-8">
                      {Array.from(modelScores.entries()).map(([modelName, scores]) => (
                        <div key={modelName} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 transition-colors duration-300">
                          {/* Model Header */}
                          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-200 dark:border-stone-800">
                            <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100">
                              {getModelDisplayName(modelName)}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded ${getModelBadgeColor(modelName)}`}>
                              {modelName.split('/').pop()}
                            </span>
                          </div>

                          {/* Model Scores */}
                          <div className="space-y-6">
                            {scores.map((score: any, idx: number) => (
                              <div key={idx} className="border-b border-stone-100 dark:border-stone-800 pb-4 last:border-b-0 last:pb-0">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-stone-900 dark:text-stone-100 capitalize">
                                    {score.bias_categories?.name || 'Unknown'}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(parseFloat(score.score))}`}
                                  >
                                    {parseFloat(score.score) > 0 ? '+' : ''}{parseFloat(score.score).toFixed(2)}
                                  </span>
                                </div>
                                {score.explanation && (
                                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                                    {score.explanation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )
            })()}
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
