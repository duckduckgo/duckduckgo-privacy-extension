const bel = require('bel')

module.exports = function (ops) {
  return bel`<div class="hero border--bottom text--center">
    <a href="#" class="hero__close js-sliding-subview-close">
      <span class="icon icon__arrow icon__arrow--large icon__arrow--left">
      </span>
    </a>
    <div class="hero__icon hero__icon--${ops.status}">
    </div>
    <h1 class="hero__title">
      ${ops.title}
    </h1>
    <h2 class="hero__subtitle">
      ${ops.subtitle}
    </h2>
  </div>`
}
