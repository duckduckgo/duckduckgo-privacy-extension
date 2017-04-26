// global dependencies
window.$ = window.jQuery = require('./../../node_modules/jquery');

// local dependencies
const BaseModel = require('./model.es6.js').BaseModel;

// init base application
// TODO: make this a constructor and init from outside of here
const NAMESPACE = 'DDG';
window[NAMESPACE] = {};
window[NAMESPACE].app = {
  mixins: {},
  models: {
    _Base: BaseModel
  },
  pages: {},
  views: {},
  utils: {}
};
console.log(window.DDG);

// verify build transform to es5
const world = 'World';
console.log(`Hello ${world}`);
debugger;
