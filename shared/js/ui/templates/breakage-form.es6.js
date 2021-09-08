const bel = require('bel')
const categories = [
    { category: 'Video or images didn\'t load', value: 'images' },
    { category: 'Content is missing', value: 'content' },
    { category: 'Links or buttons don\'t work', value: 'links' },
    { category: 'Can\'t sign in', value: 'login' },
    { category: 'Site asked me to disable the extension', value: 'paywall' }
]

function shuffle (arr) {
    let len = arr.length
    let temp
    let index
    while (len > 0) {
        index = Math.floor(Math.random() * len)
        len--
        temp = arr[len]
        arr[len] = arr[index]
        arr[index] = temp
    }
    return arr
}

module.exports = function () {
    return bel`<div class="breakage-form js-breakage-form">
    <div class="breakage-form__content">
        <nav class="breakage-form__close-container">
            <a href="javascript:void(0)" class="icon icon__close js-breakage-form-close" role="button" aria-label="Dismiss form"></a>
        </nav>
        <div class="form__icon--wrapper">
            <div class="form__icon"></div>
        </div>
        <div class="breakage-form__element js-breakage-form-element">
            <div class="form__select breakage-form__input--dropdown">
                <select class="js-breakage-form-dropdown">
                    <option value='unspecified' disabled selected>Select a category (optional)</option>
                    ${shuffle(categories).map(function (item) { return bel`<option value=${item.value}>${item.category}</option>` })}
                    <option value='other'>Something else</option>
                </select>
            </div>
            <textarea class="breakage-form-text-area" placeholder="If you'd like, tell us about the problem you experienced"></textarea>
            <btn class="form__submit js-breakage-form-submit" role="button">Send report</btn>
            <div class="breakage-form__footer">
                Reports sent to DuckDuckGo include non-identifiable information to help us diagnose and resolve problems.
                <span class="breakage-form-show-more"> Show more</span>
            </div>
            <div class="breakage-form-separator"></div>
            <div class="breakage-form-disable-container">
                <a href="#" class="link-secondary bold">
                    <span class="disable-protection-text-line">
                        Disable Privacy Protection
                    </span>
                </a>
            </div>
        </div>
        <div class="breakage-form__message js-breakage-form-message is-transparent">
            <h2 class="breakage-form__success--title">Thank you!</h2>
            <div class="breakage-form__success--message">Your report will help improve the extension and make the experience better for other people.</div>
        </div>
    </div>
</div>`
}
