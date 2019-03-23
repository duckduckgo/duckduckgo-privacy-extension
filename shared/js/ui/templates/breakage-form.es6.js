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
    return bel`<nav class="breakage-form js-breakage-form is-hidden">
    <div class="breakage-form__bg"></div>
    <div class="breakage-form__content card">
        <nav class="pull-right breakage-form__close-container">
            <a href="javascript:void(0)" class="icon icon__close js-breakage-form-close" role="button" aria-label="Dismiss form"></a>
        </nav>
        <div class="breakage-form-element">
            <div class="form__label__select">What's broken?</div>
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
                <span class="form__label__checkbox">Help make DDG better by reporting the breakage</span>
            </div>
            <a href="javascript:void(0)" class="form__submit js-breakage-form-submit" role="button">Submit</a>
        </div>
    </div>
</nav>`
}
