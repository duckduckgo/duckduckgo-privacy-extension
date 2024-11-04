// create global $
window.$ = window.jQuery = require('jquery')

// base dependencies
const i18next = require('./localize.js')
const mixins = require('./mixins/index.js')
const BaseModel = require('./model.js')
const BasePage = require('./page.js')
const BaseView = require('./view.js')

// init base
window.DDG = window.DDG || {}
window.DDG.base = {
    mixins,
    Model: BaseModel,
    Page: BasePage,
    utils: {},
    View: BaseView,
    i18n: i18next,
}
