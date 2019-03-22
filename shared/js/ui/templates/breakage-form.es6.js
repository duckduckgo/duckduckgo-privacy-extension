const bel = require('bel')

module.exports = function () {
    return bel`<nav class="breakage-form js-breakage-form is-hidden">
    <div class="breakage-form__bg"></div>
    <div class="breakage-form__content card padded">
        <nav class="pull-right breakage-form__close-container">
            <a href="javascript:void(0)" class="icon icon__close js-breakage-form-close" role="button" aria-label="Dismiss form"></a>
        </nav>
        <div class="breakage-form-element">
            <h3>Would you like to share some data with us?</h3>
            <div class="form__label">What's broken?</div>
            <div class="form__select breakage-form__input--dropdown">
                <select class="js-breakage-form-dropdown">
                    <option value>Pick a category</option>
                </select>
            </div>
            <div class="form__label">Help make DDG better by reporting the breakage</div>
            <a href="javascript:void(0)" class="breakage-form__submit js-breakage-form__submit">Submit</a>
        </div>
    </div>
</nav>`
}
