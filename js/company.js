class Company{
    constructor(name) {
        this.name = name;
        this.count = 0;
        this.pagesSeenOn = 0;
    };

    incrementCount(){
        this.count += 1;
    };

    incrementPagesSeenOn(){
        this.pagesSeenOn += 1;
    };

    get(name){
        return this[name];
    };

    set(property, val){
        this[property] = val;
    }
}
