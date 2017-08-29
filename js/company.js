class Company{
    constructor(name) {
        this.name = name;
        this.count = 0;
        this.pagesSeenOn = 0;
    };

    increment(name){
        this[name] += 1;
    };

    get(name){
        return this[name];
    };

    set(name, val){
        this[name] = val;
    }
}
