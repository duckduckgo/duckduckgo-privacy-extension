function TopBlocked(sortFunc){
    this.data = [],
    this.sortFunc = sortFunc,
    this.sorted = false;
}

TopBlocked.prototype = {

   add: function(element){
       this.data.push(element);
       this.sorted = false
   },

   getTop: function(n){
       this.sort();
       n = n ? n : 10;
       return this.data.slice(0, n);
   },

   sort: function(){
       if(this.sorted){
           return;
       }
       this.data.sort(this.sortFunc);
       this.sorted = true;
   },

    clear: function(){
        this.data = [];
    },

    setData: function(data){
        this.data = data;
    }
}
