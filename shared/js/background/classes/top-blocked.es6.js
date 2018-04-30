function TopBlocked () {
    this.data = []
}

TopBlocked.prototype = {

    add: function (element) {
        this.data.push(element)
    },

    getTop: function (n, sortFunc) {
        this.sort(sortFunc)
        n = n || 10
        return this.data.slice(0, n)
    },

    sort: function (sortFunc) {
        this.data.sort(sortFunc)
    },

    clear: function () {
        this.data = []
    },

    setData: function (data) {
        this.data = data
    }
}

module.exports = TopBlocked
