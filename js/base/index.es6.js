window.$ = window.jQuery = require('./../../node_modules/jquery');
window.EventEmitter2 = require('./../../node_modules/eventemitter2');

window.DDG = require('./ddg.es6.js').DDG;
console.log(window.DDG);

const world = 'World';
console.log(`Hello ${world}`);
debugger;
