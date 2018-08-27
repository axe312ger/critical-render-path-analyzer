const { join, basename, dirname, extname } = require('path')

const chalk = require('chalk')
const cheerio = require('cheerio')
const Table = require('cli-table3')
const fs = require('fs-extra')
const gzipSize = require('gzip-size')
const prettyBytes = require('pretty-bytes')
const ora = require('ora')
const recursive = require('recursive-readdir')

const DEFAULT_ROUND_TRIP_SIZE = (1500 - 100) * 10
const DEFAULT_HEADER_SIZE = 4000

// Detect how many theoretical network round trips need to be done to actually download the payload.
function findRoundTripCount(size, cnt = 1) {
  const budget = DEFAULT_ROUND_TRIP_SIZE * cnt - DEFAULT_HEADER_SIZE
  if (size < budget) {
    return cnt
  }
  return findRoundTripCount(size, cnt + 1)
}

async function analyzeFile(file, { baseDir }) {
  const name = join(dirname(file).replace(baseDir, ''), basename(file))
  const size = await gzipSize.file(file)
  const roundTrips = findRoundTripCount(size, 1)

  const content = await fs.readFile(file)
  const $ = cheerio.load(content)

  const analysis = []

  // html payload fits into one round trip
  if (size <= 10000) {
    analysis.push('✅ html is loaded in one round trip')
  } else {
    analysis.push('⚠️ html needs to long to load')
  }

  // js async
  const asyncScripts = $('script[async]')
  if (asyncScripts.length > 0) {
    analysis.push('✅ js async ')
  } else {
    analysis.push('⚠️ js not async')
  }

  // css inlined
  const styles = $('style')
  if (styles.length > 0) {
    analysis.push('✅ css inlined')
  } else {
    analysis.push('⚠️ css not inlined')
  }

  // no blocking js
  const blockingScripts = $('script[src]:not([async])')
  if (blockingScripts.length > 0) {
    analysis.push(`⚠️ ${blockingScripts} blocking scripts found`)
  } else {
    analysis.push('✅ no blocking js')
  }

  // no blocking css
  const blockingStylesheets = $('link[rel="stylesheet"][href]')
  if (blockingStylesheets.length > 0) {
    analysis.push(`⚠️ ${blockingStylesheets} blocking stylesheets found`)
  } else {
    analysis.push('✅ no blocking css')
  }

  return {
    name,
    size,
    roundTrips,
    analysis
  }
}

function getRank(roundTrips) {
  if (roundTrips > 3) {
    return chalk.red('4+ (Bad!)')
  }
  if (roundTrips === 1) {
    return chalk.green('1 (Perfect)')
  }
  if (roundTrips === 2) {
    return chalk.blue('2 (Good)')
  }
  if (roundTrips === 3) {
    return chalk.yellow('3 (Take care)')
  }
}

async function analyzePath({ baseDir, basePath }) {
  // Find all html files
  const files = await recursive(baseDir)

  const htmlFiles = files
    .filter(file => extname(file) === '.html')
    .sort((a, b) => {
      const dirnameA = dirname(a)
      const dirnameB = dirname(b)
      const nameA = basename(a)
      const nameB = basename(b)

      if (dirnameA === dirnameB) {
        return nameA.localeCompare(nameB)
      }

      return dirnameA.localeCompare(dirnameB)
    })

  if (!htmlFiles.length) {
    console.log(`⚠️  No HTML files found in ${baseDir}`)
    return
  }

  const spinner = ora(`Analysing ${htmlFiles.length} files...`)

  // Analyze
  const results = {}
  for await (const file of htmlFiles) {
    results[file] = await analyzeFile(file, { baseDir })
  }

  spinner.succeed()

  // Print result table
  const table = new Table({
    head: ['File', 'File Size', 'TCP round trips', 'Analysis']
  })

  for (const file in results) {
    const { name, size, roundTrips, analysis } = results[file]
    const prettySize = prettyBytes(size)
    const rank = getRank(roundTrips)
    table.push([name, prettySize, rank, analysis.join('\n')])
  }

  console.log(chalk.bold('\nHTML payload analysis:'))
  console.log(table.toString())
}

module.exports = analyzePath
