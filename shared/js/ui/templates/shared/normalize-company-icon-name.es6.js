
const bel = require('bel')

module.exports = function (companyName) {
  companyName = companyName || ''
  const normalizedName = companyName.toLowerCase().replace(/\.[a-z]+$/, '')
  return `${normalizedName}`
}
