class Company {
    constructor(c) {
        this.name = c.name;
        this.count = 0;
        this.pagesSeenOn = 0;
        this.displayName = c.displayName || c.name;
    }

    incrementCount() {
        this.count += 1;
    }

    incrementPagesSeenOn() {
        this.pagesSeenOn += 1;
    }

    get(property) {
        return this[property];
    }

    set(property, val) {
        this[property] = val;
    }
}

module.exports = Company;
