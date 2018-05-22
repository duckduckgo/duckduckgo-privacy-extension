const bel = require('bel')

module.exports = function () {
    let fields

    if (this.model.isBrokenSite) {
        fields = bel`<div>
            <p>Which website is broken?</p>
            <input class='frm__input' type='text' placeholder='Please copy and paste your URL'/>
            <p>Describe the issue</p>
            <textarea class='frm__text'></textarea>
        </div>`
    } else {
        fields = bel`<div>
            <p>Tell us which features or functionality your feedback refers to. What do you love? What isn't working? How could it be improved?</p>
            <textarea class='frm__text'></textarea>
        </div>`
    }

    return bel`<form class='frm'>
        <p>Help us improve by sharing a little info about the issue you've encountered.</p>
        ${fields}
        <input class='btn' type='submit' value='submit'/>
    </form>`
}
