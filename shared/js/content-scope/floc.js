export function initFloc () {
    if ('interestCohort' in Document.prototype) {
        delete Document.prototype.interestCohort
    }
}
