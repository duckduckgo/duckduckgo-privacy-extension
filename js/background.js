function Background()
{
    $this = this;
    chrome.extension.onRequest.addListener(function(request, sender, callback){
        console.log(request);
        if(request.query)
            $this.query(request.query, callback);
        if (request.options) {
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
    if (localStorage['zeroclickinfo'] === 'true') {
        if(localStorage['meanings'] === 'true')
            req.open('GET', 'https://chrome.duckduckgo.com?q=' + encodeURIComponent(query) + '&format=json', true);
        else
            req.open('GET', 'https://chrome.duckduckgo.com?q=' + encodeURIComponent(query) + '&format=json&d=1', true);
    } else {
        callback(null);
        return;
    }

    req.onreadystatechange = function(data) {
        if (req.readyState != 4)  { return; } 
        var res = JSON.parse(req.responseText);
        callback(res);
    }

    req.send(null);
}
