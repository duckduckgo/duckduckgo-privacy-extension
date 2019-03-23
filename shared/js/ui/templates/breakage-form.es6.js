const bel = require('bel')
const categories = [
    'Broken Videos',
    'Broken Images',
    'Comment section is missing',
    'Page content is missing',
    'Broken buttons or links',
    'Broken Login',
    'Paywall or site is forcing me to whitelist'
]

function shuffle(arr) {
    let len = arr.length;
    let temp;
    let index;
    while (len > 0) {
        index = Math.floor(Math.random() * len);
        len--;
        temp = arr[len];
        arr[len] = arr[index];
        arr[index] = temp;
    }
    return arr;
}

module.exports = function () {
    return bel`<div class="breakage-form js-breakage-form">
    <div class="breakage-form__bg"></div>
    <div class="breakage-form__content card">
        <nav class="pull-right breakage-form__close-container">
            <a href="javascript:void(0)" class="icon icon__close js-breakage-form-close" role="button" aria-label="Dismiss form"></a>
        </nav>
        <div class="breakage-form__element js-breakage-form-element">
            <div class="breakage-form__explanation">Would you like to anonymously report this site as broken?</div>
            <div class="form__label__select">Help us categorize what's broken</div>
            <div class="form__select breakage-form__input--dropdown">
                <select class="js-breakage-form-dropdown">
                    <option value>Pick a category</option>
                    ${shuffle(categories).map(function (item) {
                        return bel`<option value=${item}>${item}</option>`
                    })}
                    <option value='Other'>Other</option>
                </select>
            </div>
            <div class="form__checkbox__container">
                <input class="form__checkbox js-breakage-form-checkbox" type="checkbox" checked="checked">
                <span class="form__label__checkbox">Include trackers and domain in breakage report</span>
            </div>
            <a href="javascript:void(0)" class="form__submit js-breakage-form-submit" role="button">Submit</a>
        </div>
        <div class="breakage-form__message js-breakage-form-message is-hidden">
            <h2 class="breakage-form__success">Feedback Sent</h2>
            Thank you! We use feedback like this to improve DuckDuckGo Privacy Essentials. It really helps.
        </div>
    </div>
</div>`
}
