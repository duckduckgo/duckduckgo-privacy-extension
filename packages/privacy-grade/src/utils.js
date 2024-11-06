const entityMap = require('../data/generated/entity-map');
const tldts = require('tldts');

// pull off subdomains and look for parent companies
const findParent = (url) => {
    if (!entityMap || url.length < 2) return;

    const joinURL = url.join('.');
    if (entityMap[joinURL]) {
        return entityMap[joinURL];
    } else {
        url.shift();
        return findParent(url);
    }
};

const getDomain = (url) => {
    if (!url) return '';
    return tldts.getDomain(url) || '';
};

const extractHostFromURL = (url) => {
    if (!url) return '';

    let hostname = tldts.parse(url).hostname || '';
    hostname = hostname.replace(/^www\./, '');

    return hostname;
};

module.exports = {
    findParent,
    extractHostFromURL,
    getDomain,
};
