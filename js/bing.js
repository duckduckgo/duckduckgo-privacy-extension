var options = [];
chrome.extension.sendRequest({options: "get"}, function(opt){
    options = opt;
});

var ddgBox = new DuckDuckBox('q', [], 'results', false);

ddgBox.search = function(query) {
    var request = {query: query};
    chrome.extension.sendRequest(request, function(response){
        ddgBox.renderZeroClick(response, query);
    });

    if (options.dev)
        console.log("query:", query);
}

var ddg_timer;

function getQuery(direct) {
    var instant = document.getElementsByClassName("gssb_a");
    if (instant.length !== 0 && !direct){
        var selected_instant = instant[0];
        
        var query = selected_instant.childNodes[0].childNodes[0].childNodes[0].
                    childNodes[0].childNodes[0].childNodes[0].innerHTML;
        query = query.replace(/<\/?(?!\!)[^>]*>/gi, '');

        if(options.dev)
            console.log(query);

        return query;
    } else {
        return document.getElementsByName('q')[0].value;
    }
}

function qsearch(direct) {
    var query = getQuery(direct);
    ddgBox.lastQuery = query;
    ddgBox.search(query);
} 

// instant search
document.getElementsByName('q')[0].onkeyup = function(e){

    if(ddgBox.lastQuery !== getQuery())
        ddgBox.hideZeroClick();

    if(options.dev)
        console.log(e.keyCode);

    var fn = function(){ qsearch(); };

    if(e.keyCode == 40 || e.keyCode == 38)
        fn = function(){ qsearch(true); };

    clearTimeout(ddg_timer);
    ddg_timer = setTimeout(fn, 700);
};

document.getElementsByName("go")[0].onclick = function(){
    qsearch();
};

ddgBox.init();




