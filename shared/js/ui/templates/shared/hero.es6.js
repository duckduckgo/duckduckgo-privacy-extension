const bel = require('bel')

module.exports = function (ops) {
  return bel`<div class="hero border--bottom text--center js-hero">
    ${(ops.showClose) ? renderCloseButton() : ''}
    ${(ops.showOpen) ? renderOpenButton() : ''}
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

function renderCloseButton () {
  return bel`<a href="javascript:void(0)" class="hero__close js-sliding-subview-close">
    <span class="icon icon__arrow icon__arrow--large icon__arrow--left">
    </span>
  </a>`
}

function renderOpenButton () {
  return bel`<a href="javascript:void(0)" class="hero__open js-hero-open">
    <span class="icon icon__arrow icon__arrow--large">
    </span>
  </a>`
}
