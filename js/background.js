function Background()
{
    $this = this;
    this.meanings = true;
    chrome.extension.onRequest.addListener(function(request, sender, callback){
        console.log(request);
        if(request.query)
            $this.query(request.query, callback);
        if (request.options) {
            $this.meanings = (localStorage['meanings'] !== "false");
            callback(localStorage);
        }

        if (request.selection) {
        
        }
    });

//  this.menuID = chrome.contextMenus.create({
//       "title" : "Ask the duck",
//       "type" : "normal",
//       "contexts" : ["selection"],
//       "onclick" : function() {
//          console.log('clicked!!!'); 
//       }
//  });
}

Background.prototype.query = function(query, callback) 
{
    var req = new XMLHttpRequest();
    if(this.meanings)
        req.open('GET', 'https://chrome.duckduckgo.com?q=' + encodeURIComponent(query) + '&format=json', true);
    else
        req.open('GET', 'https://chrome.duckduckgo.com?q=' + encodeURIComponent(query) + '&format=json&d=1', true);

    req.onreadystatechange = function(data) {
        if (req.readyState != 4)  { return; } 
        var res = JSON.parse(req.responseText);
        callback(res);
    }
    req.send(null);
}
