export function init () {
    if ('interestCohort' in Document.prototype) {
        try {
            delete Document.prototype.interestCohort
        } catch {
            // Throw away this exception, it's likely a confict with another extension
        }
    }
}
