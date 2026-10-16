// iconv-lite marks its Node stream helpers as unavailable in browser bundles.
// Wrangler's Worker bundle takes that browser alias, but the package also
// detects Workers' Node compatibility and calls the helper as a function.
// Remove only those false aliases so Wrangler can bundle the Node compatible
// stream implementation instead. Safe to run after every npm install.
const fs = require('node:fs')
const path = require('node:path')

const packagePath = path.join(__dirname, '..', 'node_modules', 'iconv-lite', 'package.json')
if (!fs.existsSync(packagePath)) process.exit(0)

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
if (packageJson.browser && typeof packageJson.browser === 'object') {
    delete packageJson.browser['./lib/streams']
    delete packageJson.browser['./lib/extend-node']
    fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)
}
