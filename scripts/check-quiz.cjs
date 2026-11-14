const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { stripTypeScriptTypes } = require('node:module')
const cache = new Map()
function load(filename) {
  filename = path.resolve(__dirname, '..', filename)
  if (cache.has(filename)) return cache.get(filename)
  const module = { exports: {} }
  let code = stripTypeScriptTypes(fs.readFileSync(filename, 'utf8'))
  const names = [...code.matchAll(/export (?:const|function) (\w+)/g)].map(match => match[1])
  code = code.replace(/import \{([^}]+)\} from '([^']+)'/g, 'const {$1} = require("$2")').replace(/export /g, '')
  code += '\n' + names.map(name => `exports.${name} = ${name};`).join('\n')
  new Function('require', 'module', 'exports', code)(specifier => load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), specifier + '.ts'))), module, module.exports)
  cache.set(filename, module.exports)
  return module.exports
}
const { quizQuestions, gifts } = load('src/data/gifts.ts')
const { matchGifts } = load('src/data/quiz.ts')
for (const gift of gifts) {
  assert.ok(gift.image.startsWith('/gifts/'), 'Product photos must use local assets')
  const file = path.resolve(__dirname, '..', 'public', gift.image.slice(1))
  assert.ok(fs.statSync(file).size > 1000, `Missing or empty image: ${gift.id}`)
}
let count = 0
for (const budget of quizQuestions[0].options) {
  for (const vibe of quizQuestions[1].options) {
    for (const moment of quizQuestions[2].options) {
      const results = matchGifts([budget.id, vibe.id, moment.id])
      assert.ok(results.length, 'Every current answer combination needs a result')
      assert.equal(new Set(results.map(result => result.gift.id)).size, results.length)
      results.forEach((result, index) => {
        assert.ok(result.gift.cost <= (budget.maxCost ?? Infinity), 'Never exceed budget')
        assert.ok(gifts.includes(result.gift), 'Only recommend actual wish-list gifts')
        if (index) assert.ok(results[index - 1].score >= result.score, 'Best matches first')
      })
      count++
    }
  }
}
assert.equal(matchGifts(['any', 'useful', 'road'])[0].score, 2)
assert.equal(matchGifts(['25', 'fun', 'discover'])[0].gift.theme, 'Books')
console.log(`Quiz checks passed for all ${count} answer combinations.`)
