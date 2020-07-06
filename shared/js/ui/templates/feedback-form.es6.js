const bel = require('bel')

module.exports = function () {
    let fields

    if (this.model.errored) {
        return showError()
    }

    if (this.model.submitted) {
        return showThankYou(this.model.isBrokenSite)
    }

    if (this.model.isBrokenSite) {
        fields = bel`<div>
            <label class='frm__label'>Which website is broken?</label>
            <input class='js-feedback-url frm__input' type='text' placeholder='Copy and paste your URL' value='${this.model.url}'/>
            <label class='frm__label'>Describe the issue you encountered:</label>
            <textarea class='frm__text js-feedback-message' placeholder='Which website content or functionality is broken? Please be as specific as possible.'></textarea>
        </div>`
    } else {
        fields = bel`<div>
            <label class='frm__label'>What do you love? What isn't working? How could the extension be improved?</label>
            <textarea class='frm__text js-feedback-message' placeholder='Which features or functionality does your feedback refer to? Please be as specific as possible.'></textarea>
        </div>`
    }

    return bel`<form class='frm'>
        <p>Anonymously share some feedback to help us improve DuckDuckGo Privacy Essentials.</p>
        <label class='frm__label'>
            <input type='checkbox' class='js-feedback-broken-site frm__label__chk'
                ${this.model.isBrokenSite ? 'checked' : ''}/>
            I want to report a broken site
        </label>
        ${fields}
        <input class='btn js-feedback-submit ${this.model.canSubmit ? '' : 'is-disabled'}'
            type='submit' value='Submit' ${this.model.canSubmit ? '' : 'disabled'}/>
    </form>`
}

function showThankYou (isBrokenSite) {
    if (isBrokenSite) {
        return bel`<div>
            <p>Thank you for your feedback!</p>
            <p>Your broken site reports help our development team fix these breakages.</p>
            <p>To fix the issue for the time being, you can disable "Privacy Protection" to add it to your list of unprotected sites.</p>
        </div>`
    } else {
        return bel`<p>Thank you for your feedback!</p>`
    }
}

function showError () {
    return bel`<p>Something went wrong when submitting feedback. Please try again later!</p>`
}
