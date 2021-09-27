export default class TopBlocked {
    constructor () {
        this.data = []
    }

    /**
     * @param {string} element
     */
    add (element) {
        this.data.push(element)
    }

    getTop (n, sortFunc) {
        this.sort(sortFunc)
        n = n || 10
        return this.data.slice(0, n)
    }

    sort (sortFunc) {
        this.data.sort(sortFunc)
    }

    clear () {
        this.data = []
    }

    setData (data) {
        this.data = data
    }
}
