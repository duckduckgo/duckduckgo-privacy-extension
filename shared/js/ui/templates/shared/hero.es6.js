const bel = require('bel')

module.exports = function (ops) {
  const slidingSubviewClass = ops.showClose ? 'js-sliding-subview-close' : ''
  return bel`<div class="hero border--bottom text--center ${slidingSubviewClass} silver-bg">
    ${renderOpenOrCloseButton(ops.showClose)}
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

function renderOpenOrCloseButton (isCloseButton) {
  const openOrClose = isCloseButton ? 'close' : 'open'
  const arrowIconClass = isCloseButton ? 'icon__arrow--left' : ''
  return bel`<a href="javascript:void(0)" class="hero__${openOrClose}">
    <span class="icon icon__arrow icon__arrow--large ${arrowIconClass}">
    </span>
  </a>`
}
