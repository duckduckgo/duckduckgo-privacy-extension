export function init () {
    if ('interestCohort' in Document.prototype) {
        delete Document.prototype.interestCohort
    }
}
