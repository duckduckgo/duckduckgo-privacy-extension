const bel = require('bel');

module.exports = function (trackerListMap) {
    return trackerListMap.map((obj) => bel`
    <li class="top-blocked__li">
        <div class="top-blocked__li__blocker-count pull-right">${obj.count}</div>
        <span class="top-blocked__li__company-name">${obj.name}</span>
        <div class="top-blocked__li__blocker-bar" >
            <div class="top-blocked__li__blocker-bar top-blocked__li__blocker-bar--fg js-top-blocked-graph-bar-fg"
            style="width: 0px" data-width="${obj.px}px">
            </div>
        </div>
    </li>`)
}
