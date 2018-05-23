const bel = require('bel')

module.exports = function () {
    let fields

    if (this.model.isBrokenSite) {
        fields = bel`<div>
            <label class='frm__label'>Which website is broken?</label>
            <input class='js-feedback-url frm__input' type='text' placeholder='Please copy and paste your URL' value='${this.model.url}'/>
            <label class='frm__label'>Describe the issue</label>
            <textarea class='frm__text js-feedback-message'></textarea>
        </div>`
    } else {
        fields = bel`<div>
            <label class='frm__label'>Tell us which features or functionality your feedback refers to. What do you love? What isn't working? How could it be improved?</label>
            <textarea class='frm__text js-feedback-message'></textarea>
        </div>`
    }

    return bel`<form class='frm'>
        <p class='frm__label'>Help us improve by sharing a little info about the issue you've encountered.</p>
        <label class='frm__label'>
            <input type='checkbox' class='js-feedback-broken-site frm__label__chk'
                ${this.model.isBrokenSite ? 'checked' : ''}/>
            I want to report a broken site
        </label>
        ${fields}
        <input class='btn js-feedback-submit' type='submit' value='Submit'/>
    </form>`
}
