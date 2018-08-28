const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')

async function launchChromeAndRunLighthouse(url) {
  const opts = {
    chromeFlags: ['--headless']
    // onlyCategories: ['performance']
  }
  const config = {
    audits: [
      'metrics/first-contentful-paint',
      'metrics/first-meaningful-paint',
      'metrics/interactive',
      'metrics/estimated-input-latency'
    ],
    passes: [
      {
        // recordTrace: true,
        // pauseBeforeTraceEndMs: 5000,
        // pauseAfterNetworkQuietMs: 2500,
        // pauseAfterLoadMs: 5250,
        // networkQuietThresholdMs: 5250,
        // cpuQuietThresholdMs: 5250,
        useThrottling: true,
        gatherers: []
      }
    ]
  }
  // const config = null
  const chrome = await chromeLauncher.launch({ chromeFlags: opts.chromeFlags })
  opts.port = chrome.port
  const results = await lighthouse(url, opts, config)
  await chrome.kill()
  return results
}

module.exports = launchChromeAndRunLighthouse
