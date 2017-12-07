const bel = require('bel')

module.exports = function (companyListMap) {
    return companyListMap.map((data) => {

        return bel`<li class="top-blocked__li">
          <div class="top-blocked__pill">
	    <div class="top-blocked__li-site__icon ${data.name.replace('.', '').toLowerCase()}"></div>
	    <div class="top-blocked__li__blocker-pct js-top-blocked-pct">
	        ${data.percent}%
	    </div>
          </div>
        </li>`
    })
}
