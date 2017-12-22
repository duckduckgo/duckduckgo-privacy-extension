const bel = require('bel')

module.exports = function (domain, tosdr) {
  let knownPractices = tosdr && tosdr.message && tosdr.message !== 'Unknown',
    subtitle,
    status

  if (knownPractices) {
    subtitle = `Privacy Practices`
    status = tosdr.message.toLowerCase()
  } else {
    subtitle = `Unknown Privacy Practices`
    status = `unknown`
  }

    // TODO can this reuse the template that the main view uses?

  return bel`<div>
        <div class="privacy-practices__overview__icon
            privacy-practices__overview__icon--${status}">
        </div>
        <h1 class="privacy-practices__overview__domain">
            ${domain}
        </h1>
        <h2 class="privacy-practices__overview__subtitle">
            ${subtitle}
        </h2>
    </div>`
}
