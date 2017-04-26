// create global $
// TODO: is this necessary? maybe not.
window.$ = window.jQuery = require('./../../node_modules/jquery');

// local dependencies
const BaseModel = require('./model.es6.js');
const mixins = require('./mixins');
const BasePage = require('./page.es6.js');

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
  views: {},
  utils: {}
};
console.log(window.DDG);

// verify build transform to es5
const world = 'World';
console.log(`Hello ${world}`);
debugger;
