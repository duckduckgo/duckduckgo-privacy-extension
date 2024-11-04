const bel = require('nanohtml')
const t = window.DDG.base.i18n.t

module.exports = function () {
    let fields

    if (this.model.submitted || this.model.errored) {
        return showThankYou(this.model.isBrokenSite)
    }

    if (this.model.isBrokenSite) {
        fields = bel`<div>
            <label class='frm__label'>${t('feedback:brokenSiteLabel.title')}</label>
            <input class='js-feedback-url frm__input' type='text' placeholder='${t('feedback:brokenSitePlaceholder.title')}' value='${this.model.url}'/>
            <label class='frm__label'>${t('feedback:describeTheIssue.title')}</label>
            <textarea class='frm__text js-feedback-message' required placeholder='${t('feedback:describeBreakagePlaceholder.title')}'></textarea>
        </div>`
    } else {
        fields = bel`<div>
            <label class='frm__label'>${t('feedback:feedbackHeaderLabel.title')}</label>
            <textarea class='frm__text js-feedback-message' placeholder='${t('feedback:feedbackPlaceholder.title')}'></textarea>
        </div>`
    }

    return bel`<form class='frm'>
        <p>${t('feedback:submittingFeedbackHelps.title')}</p>
        <label class='frm__label'>
            <input type='checkbox' class='js-feedback-broken-site frm__label__chk'
                ${this.model.isBrokenSite ? 'checked' : ''}/>
            ${t('feedback:reportBrokenSite.title')}
        </label>
        ${fields}
        <input class='btn js-feedback-submit ${this.model.canSubmit ? '' : 'is-disabled'}'
            type='submit' value='${t('feedback:submit.title')}' ${this.model.canSubmit ? '' : 'disabled'}/>
    </form>`
}

function showThankYou(isBrokenSite) {
    if (isBrokenSite) {
        return bel`<div>
            <p>${t('feedback:thankYou.title')}</p>
            <p>${t('feedback:thankYouBrokenSite.title')}</p>
        </div>`
    } else {
        return bel`<p>${t('feedback:thankYou.title')}</p>`
    }
}
