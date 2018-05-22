const bel = require('bel')

module.exports = function () {
    let fields

    if (this.model.isBrokenSite) {
        fields = bel`<div>
            <label class='frm__label'>Which website is broken?</label>
            <input class='frm__input' type='text' placeholder='Please copy and paste your URL'/>
            <label class='frm__label'>Describe the issue</label>
            <textarea class='frm__text'></textarea>
        </div>`
    } else {
        fields = bel`<div>
            <label class='frm__label'>Tell us which features or functionality your feedback refers to. What do you love? What isn't working? How could it be improved?</label>
            <textarea class='frm__text'></textarea>
        </div>`
    }

    return bel`<form class='frm'>
        <p class='frm__label'>Help us improve by sharing a little info about the issue you've encountered.</p>
        <label class='frm__label'>
            <input type='checkbox' class='frm__label__chk' checked='checked'/>
            I want to report a broken site
        </label>
        ${fields}
        <input class='btn' type='submit' value='Submit'/>
    </form>`
}
