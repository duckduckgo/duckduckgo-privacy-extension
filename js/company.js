class Company{
    constructor(name) {
        this.name = name;
        this.count = 1;
    };

    incrementCount(){
        this.count += 1;
    };

    getCount(){
        return this.count;
    };

    setCount(newCount){
        this.count = newCount;
    }
}
