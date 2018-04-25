const responseIsOK = (response, siteToCheck) => {
    // we only care about main frame responses for the site we're opening
    if (response.request().resourceType() !== 'document' ||
            !response.url().match(new RegExp(`^https?://${siteToCheck}`))) {
        return true
    }

    let status = response.status()
    let firstStatusDigit = Math.floor(status / 100)

    return firstStatusDigit === 1 ||
        firstStatusDigit === 2 ||
        firstStatusDigit === 3
}

module.exports = {
    responseIsOK
}
