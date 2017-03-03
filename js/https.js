
var load = require('load');
var rules = require('rules').RuleSets;
rules.addFromXml(load.loadExtensionFile('rules/default.rulesets', 'xml'));

require.scopes.https = ( () => {
    var exports = {};
    exports.rules = rules;
    return exports;
})();
