const bel = require('bel')

module.exports = function (companyListMap) {
    return companyListMap.map((data) => {
        return bel`<li class="top-blocked__li">
    <div class="top-blocked__li__company-name">${data.name}</div>
    <div class="top-blocked__li__blocker-bar">
        <div class="top-blocked__li__blocker-bar__fg
            js-top-blocked-graph-bar-fg"
            style="width: 0px" data-width="${data.percent}">
        </div>
    </div>
    <div class="top-blocked__li__blocker-pct js-top-blocked-pct">
        ${data.percent}%
    </div>
</li>`
    })
}
