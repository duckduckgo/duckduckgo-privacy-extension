const fs = require("fs");
const rules = require("../shared/data/contentblocking")

let newRules = [];

while (newRules.length < 1000000) {
  newRules = newRules.concat(rules);
}

fs.writeFileSync(__dirname + "/../shared/data/contentblocking1m.json", JSON.stringify(newRules), 'utf8');
