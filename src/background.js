function Background()
{
    $this = this;
    chrome.extension.onRequest.addListener(function(request, sender, callback){
        if(request.query)
            $this.query(request.query, callback);
    });
}

Background.prototype.query = function(query, callback) 
{
    var req = new XMLHttpRequest();
    req.open('GET', 'https://api.duckduckgo.com?q=' + encodeURIComponent(query) + '&format=json', true);
    req.onreadystatechange = function(data) {
        if (req.readyState != 4)  { return; } 
        var res = JSON.parse(req.responseText);
        callback(res);
    }
    req.send(null);
}
