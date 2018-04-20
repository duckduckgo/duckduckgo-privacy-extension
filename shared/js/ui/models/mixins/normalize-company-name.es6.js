module.exports = {
    // Fixes cases like "Amazon.com", which break the company icon
    normalizeCompanyName (companyName) {
        companyName = companyName || ''
        const normalizedName = companyName.toLowerCase().replace(/\.[a-z]+$/, '')
        return normalizedName
    }
}
