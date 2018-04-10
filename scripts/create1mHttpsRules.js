const fs = require("fs");
const rules = require("../shared/data/contentblocking")

let newRules = [];

// million
while (newRules.length < 1000000) {
  newRules = newRules.concat(rules);
}

fs.writeFileSync(__dirname + "/../shared/data/contentblocking1m.json", JSON.stringify(newRules), 'utf8');

// 10 million
while (newRules.length < 10000000) {
  newRules = newRules.concat(rules);
}

fs.writeFileSync(__dirname + "/../shared/data/contentblocking10m.json", JSON.stringify(newRules), 'utf8');

// 20 million
while (newRules.length < 20000000) {
  newRules = newRules.concat(rules);
}

fs.writeFileSync(__dirname + "/../shared/data/contentblocking20m.json", JSON.stringify(newRules), 'utf8');
