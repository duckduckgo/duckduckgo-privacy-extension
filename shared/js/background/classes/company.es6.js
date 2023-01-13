class Company {
    constructor (c) {
        this.name = c.name
        this.count = 0
        this.displayName = c.displayName || c.name
    }

    get (property) {
        return this[property]
    }

    set (property, val) {
        this[property] = val
    }
}

module.exports = Company
