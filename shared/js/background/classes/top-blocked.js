class TopBlocked {
    constructor () {
        this.data = []
    }

    add (el) {
        this.data.push(el)
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

module.exports = TopBlocked
