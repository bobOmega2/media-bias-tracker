import { archiveOldArticles } from '@/lib/archiveArticles'

async function main() {
  console.log('===================================')
  console.log('Article Archival Script')
  console.log('===================================')
  console.log('Starting archival process...\n')

  try {
    const result = await archiveOldArticles({
      batchSize: 50,
      dryRun: false // Set to true for testing without making changes
    })

    console.log('Archival Complete')
    console.log('Articles processed:', result.articlesProcessed)
    console.log('Articles archived:', result.articlesArchived)
    console.log('Articles failed:', result.articlesFailed)
    console.log('AI scores archived:', result.aiScoresArchived)

    if (result.errors.length > 0) {
      console.log('\nErrors')
      result.errors.forEach(err => {
        console.error(`Article ${err.articleId}: ${err.error}`)
      })
    }

    if (result.articlesFailed === 0) {
      console.log('\nAll articles archived successfully!')
    } else {
      console.log(`\n  ${result.articlesFailed} article(s) failed to archive`)
    }

  } catch (error) {
    console.error('\n Script failed with error:')
    console.error(error)
    process.exit(1)
  }
}

main()
  .then(() => {
    console.log('Script finished successfully')
    
    process.exit(0)
  })
  .catch(err => {
    console.error('Script failed')
    console.error(err)
    process.exit(1)
  })
