const bel = require('bel')

module.exports = function (model) {
  if (!model || !model.site) return

  return bel`<div>
      <h1>${model.site.domain}</h1>
  </div>`
}
