// create global $
window.$ = window.jQuery = require('./../../node_modules/jquery');

// local base app dependencies
const mixins = require('./mixins/index.es6.js');
const BaseModel = require('./model.es6.js');
const BasePage = require('./page.es6.js');
const BaseView = require('./view.es6.js');

// init base application
// TODO: make this a constructor and init from outside of here?
window.DDG = {
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
