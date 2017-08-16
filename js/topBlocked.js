function TopBlocked(sortFunc){
    this.data = [],
    this.sortFunc = sortFunc;
}

TopBlocked.prototype = {

   add: function(element){
       this.data.push(element);
   },

   getTop: function(n){
       this.sort();
       n = n ? n : 10;
       return this.data.slice(0, n);
   },

   sort: function(){
       this.data.sort(this.sortFunc);
   },

    clear: function(){
        this.data = [];
    },

    setData: function(data){
        this.data = data;
    }
}

