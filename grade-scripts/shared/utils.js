const responseIsOK = (response) => {
    // we only care about main frame responses
    if (response.request().resourceType() !== 'document') {
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
