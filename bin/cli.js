#!/usr/bin/env node
const fs = require('fs')
const lib = require('../index.js')

if (process.argv.length < 3) {
  console.log(`🚫  Please provide a directory to be analyzed`)
  process.exit(1)
}

const baseDir = process.argv.pop()

try {
  fs.accessSync(baseDir, fs.constants.F_OK)
  lib({ baseDir })
} catch (_) {
  console.log(`🚫  Unable to access ${baseDir}`)
  process.exit(1)
}
