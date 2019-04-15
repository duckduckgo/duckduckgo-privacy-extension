const bel = require('bel')
const categories = [
    "Video didn't play",
    "Images didn't load",
    "Comments didn't load",
    "Content is missing",
    "Links or buttons don't work",
    "I can't login",
    "The site asked me to disable"
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
    <div class="breakage-form__content">
        <nav class="breakage-form__close-container">
            <a href="javascript:void(0)" class="icon icon__close js-breakage-form-close" role="button" aria-label="Dismiss form"></a>
        </nav>
        <div class="form__icon--wrapper">
            <div class="form__icon"></div>
        </div>
        <div class="breakage-form__element js-breakage-form-element">
            <h2 class="breakage-form__title">Something Broken?</h2>
            <div class="breakage-form__explanation">Submitting an anonymous broken site report helps us debug these issues and improve the extension.</div>
            <div class="form__label__select">Describe What Happened</div>
            <div class="form__select breakage-form__input--dropdown">
                <select class="js-breakage-form-dropdown">
                    <option value>Pick your issue from the list...</option>
                    ${shuffle(categories).map(function (item) {
                        return bel`<option value=${item}>${item}</option>`
                    })}
                    <option value='Other'>Something else</option>
                </select>
            </div>
            <a href="javascript:void(0)" class="form__submit js-breakage-form-submit btn-disabled" role="button">Send Report</a>
            <div class="breakage-form__footer">Reports sent to DuckDuckGo are 100% anonymous and only include your selection above, the URL, and a list of trackers we found on the site.</div>
        </div>
        <div class="breakage-form__message js-breakage-form-message is-hidden">
            <h2 class="breakage-form__success--title">Thank You!</h2>
            <div class="breakage-form__success--message">Your report will help improve the extension and make the experience better for other people.</div>
        </div>
    </div>
</div>`
}
