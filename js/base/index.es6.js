// create global $
// TODO: is this necessary? maybe not.
window.$ = window.jQuery = require('./../../node_modules/jquery');

// local dependencies
const mixins = require('./mixins/index.es6.js');
const BaseModel = require('./model.es6.js');
const BasePage = require('./page.es6.js');
const BaseView = require('./view.es6.js');

// init base application
// TODO: make this a constructor and init from outside of here
const NAMESPACE = 'DDG';
window[NAMESPACE] = {};
window[NAMESPACE].app = {
  mixins: mixins,
  models: {
    _Base: BaseModel
  },
  pages: {
    _Base: BasePage
  },
  views: {
    _Base: BaseView
  },
  utils: {}
};
console.log(window.DDG);

// verify build transform to es5
const world = 'World';
console.log(`Hello ${world}`);
debugger;
