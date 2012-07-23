var HEADER_ICON_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAgCAYAAACRpmGNAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABM9JREFUeNq8WF1oHFUUPndnZid/7S5JmzVJk7V9sNJqVqOiaBof1NY+JEVIQZA8CBVfIn3yyfhkC4XogxgfJJY+VEFRKM2iJGjRrMQUSsLuNoFGmthSu+xust2Z/Z2fnb3eGZJ1dnd2fhLwwGHv3Dkz95t7znfOuYsAgIZ6QWAuVveNBDu1cf1PwOw+V2VDO3gBWrqzEXiy1xegadpfLBbnifJdXV2RXQDEFjZYD1BVxkTdql5bWh/NCXIa66RcLt8TRfGTubm5zh07m8pYKA12gal6dzMbTmQF/KggYQNJcxx3ltix27pnkGh7YCsGLs+vDu2Mn32889UnfN7xVpb26m1kWf4ikUh809vbG9ktEfRiuWN6zWazo6orsYWUSqXrRHwOdtIIg31g+Xz+HHYgKkAdOMcAbaeS2cWIn2Gbpp3kDoqiRsgHjdW823Yqou0aPtbd8zFDuSAvYfhuWQShIMCZZ1rgULu7zjaZA7j4qwAcn4G3A82TZOqqWbowm7d0p+qStURGi7PPQgr+eVXU3PYgJRq6M1szrYZDjXtZm+61B+52jNcW2kiVbcdcLMHjTE5Qc2HYABxrBc5lozpUzR9uR5DNi/DtzLKmjeS3m3fh5Htfw8yNVUAIBQhzvQ5KGmpUWw2FK0qVsbrgpcu/w9HDByFIxkYSS2a0350PGBwc7HdajGm7u1aUFTWpBtTx/lZWm3t34ge4cuGs4YPvjAxo4Ht8HsP7qT/pkWYWNMBFEeY7Xi6Fate2zdYkX4jugBt+7Th0de6HfQTk0SOdDZ95/uneyrip8H0ge4sJuBk4QbnwiN6OzE1sx+DuUomilKLJnAidbWzdwtWGGcCZWUDSA8D5BW2qLCwBq8Qm65cn5mUU4rNwwWmeq3K1JAoRriBVwBkKPwvKw/fJijHLEJZLOJhMUVP+N6SIGQCmQczVzd28lxJe9Lcbvym3CMrfQ6aISgoKSjLh06Ir+NZ5kbMq/rQT9mQEuUKKurZCWKm6Lorow30vyFPLP7L+Dg/2kB2KOuhSwFEq2SGFrJSNXeA5TYppd938wKh4XwdMk5XrjF9la2GJnrj2OevdTW3Fta5VSZEuysZxxxwCquerSsw1s3hSCjNjJLZCGAOvmTDohAthPyJaAX8MB9UY3FPhVyXLpUPJrK8xKTxvQkq8dYpe7/G0NOFhmoIR1g3jRmFFWDoT30QXtwmBnRLCkBR/rG8Kg0cONHZ9MnnK5/NVEur9X9z9ba1lP8tAwOUCnCug0MKyK1pDCMtO2LDg12ow+s+8WbEnJzI1ZzUZKGuihg2AFSHqvogvSpG8VGpcD2m63+GButE97IitWq4qydF0QTbrfquS3cFPn+uD6VemqamXhpyu5bLzBfqLrXgsxBHGpoV1+DI6DFfuXIJIKvxfkCLkIUfEYa0G/zT4kbevZY2i0ZjCUmNOdk1PCFsn/kqv9lcyfqwn5r26dh5u8xhWOAxu5IPRpwJwIxaG5WScO9NB8Vsy+KPk3kYeA1ZwqHxu4aQTcLRVbjNsd/JFNalWuSmhxGFu6yHEBQRlQN5HMnh3eVbFZhXC8qGiWApxJnGnlTppz/84gVNC4O0OhVSK6tVJwwLN0KaNXz8wAOPHP4Du5j59x8E5Ze6/AgwAHWTjLQ+v54oAAAAASUVORK5CYII=';

var options = [];
chrome.extension.sendRequest({options: "get"}, function(opt){
    options = opt;
});

function lastQuery()
{
    var regex = new RegExp('[\?\&]q=([^\&#]+)');
    if(regex.test(window.location.href)) {
        var q = window.location.href.split(regex);
        q = q[q.length - 2].replace(/\+/g," ");

        if(options.dev)
            console.log(q)

        return decodeURIComponent(q);
    }
}

search(lastQuery());

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
        return document.getElementsByName("q")[0].value;
    }
}

var lasttime;
function qsearch(direct) {
    var query =  getQuery(direct);
    lastquery = query;
    search(query);
}

var lastquery = document.getElementsByName("q")[0].value;
// instant search
document.getElementsByName("q")[0].onkeyup = function(e){

    if(lastquery !== getQuery())
        hideZeroClick();

    if(options.dev)
        console.log(e.keyCode);

    var fn = function(){qsearch();};
    if(e.keyCode == 40 || e.keyCode == 38)
        fn = function(){qsearch(true);};

    clearTimeout(lasttime);
    lasttime = setTimeout(fn, 700);

    // instant search suggestions box onclick
    document.getElementsByClassName("gssb_c")[0].onclick = function(){
        if(options.dev)
            console.log("clicked")

        hideZeroClick();
        qsearch(true);
    };
};

// click on search button
document.getElementsByName("btnG")[0].onclick = function(){
    qsearch();
};

function search(query)
{
  //document.getElementById('center_col').innerHTML = ' <div id="zeroclick_loader"> '+
  //    '<img src="http://duckduckgo.com/l.gif" /> Loading ...' +
  //    '</div>' + document.getElementById('center_col').innerHTML;

    var request = {query: query};
    chrome.extension.sendRequest(request, function(response){
        renderZeroClick(response, query);
    });
    if (options.dev)
        console.log("query:", query);
 
}

function renderZeroClick(res, query) 
{
    if (options.dev)
        console.log(res);
    
    // disable on images
    if (document.getElementById('isr_pps') !== null)
        return;

    if (res['AnswerType'] !== "") {
        displayAnswer(res['Answer']);
    } else if (res['Type'] == 'A' && res['Abstract'] !== "") {
        displaySummary(res, query);
    } else {     
        switch (res['Type']){
            case 'E':
                displayAnswer(res['Answer']);
                break;

            case 'A':
                displayAnswer(res['Answer']);
                break;

            case 'C':
                displayCategory(res, query);
                break;

            case 'D':
                displayDisambiguation(res, query);
                break;

            default:
                hideZeroClick();
                break;
                    
        } 
    }
}

function hideZeroClick()
{
    var ddg_result = document.getElementById("ddg_zeroclick");
    if (ddg_result !== null)
        ddg_result.style.display = 'none';
}

function showZeroClick()
{
    var ddg_result = document.getElementById("ddg_zeroclick");
    if (ddg_result !== null)
        ddg_result.style.display = 'block';
}

function createResultDiv()
{
    var result = document.getElementById("center_col");
    var ddg_result = document.getElementById("ddg_zeroclick");
    showZeroClick();
    if (ddg_result === null) {
        result.innerHTML = '<div id="ddg_zeroclick"></div>' + result.innerHTML;
        ddg_result = document.getElementById("ddg_zeroclick");
    }
    return ddg_result;
}

function resultsLoaded()
{
    if(options.dev)
        console.log(document.getElementById("center_col"), document.getElementById("center_col").style.visibility);
    
    if (document.getElementById("center_col") !== null){
        if (document.getElementById("center_col").style.visibility === "visible") {
            return true;
        }
    }
    
    return false;
}

function displayAnswer(answer)
{
    if (answer === '') {
        hideZeroClick();
        return;
    }
    if (resultsLoaded()) {
        var ddg_result = createResultDiv();
        ddg_result.className = "ddg_answer";
        ddg_result.innerHTML = answer;
        if(options.dev)
            console.log('showing answer');
    } else {
        if(options.dev)
            console.log('trying again');
        setTimeout('displayAnswer("'+answer+'");', 200);
    }
}

function displaySummary(res, query) {
    var result = ''

    var img_url = res['AbstractURL'];
    var official_site = '';
    var first_category = ''
    var hidden_categories = '';


    if (res['Results'].length !== 0) {
        if(res['Results'][0]['Text'] === "Official site") {
            var url = res['Results'][0]['FirstURL'].match(/https?:\/\/(?:www.)?(.*\.[a-z]+)(?:\/)?/);
            official_site = ' | Official site: <a href="' + res['Results'][0]['FirstURL']+'">' +
                url[1] + '</a>';
            img_url = res['Results'][0]['FirstURL'];
        }
    } 
    

    for (var i = 0; i < res['RelatedTopics'].length; i++){
        if (res['RelatedTopics'].length === 0)
            break;
        
        var link = res['RelatedTopics'][i]['Result'].
                    match(/<a href=".*">.*<\/a>/);

        var cls = (res['RelatedTopics'][i]['FirstURL'].match(/https?:\/\/[a-z0-9\-]+\.[a-z]+(?:\/\d+)?\/c\/.*/) !== null) ? "ddg_zeroclick_category" : "ddg_zeroclick_article";
        
        if (i < 2) {
            var first = (i === 0)? 'first_category': '';
            first_category += '<div class="' + cls + ' '+ first +'" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=this.className.replace(\' ddg_selected\',\'\')" onclick="window.location.href=this.firstChild.href">' + 
                                link +
                              '</div>';
        } else {
            hidden_categories += '<div class="' + cls + '" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=this.className.replace(\' ddg_selected\',\'\')" onclick="window.location.href=this.firstChild.href">' + 
                                link +
                              '</div>';
        }
    }

    if (hidden_categories !== '') {
        hidden_categories  = '<div class="ddg_zeroclick_more" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=\'ddg_zeroclick_more\'" onclick="this.firstChild.onclick();this.className=\'\';this.onmouseover=function(){}">' +
                                '<a href="javascript:;" onclick="' + 
                                    "this.parentElement.style.display='none';" +
                                    "this.parentElement.nextElementSibling.style.display='block'" +
                                '"> More related topics </a>' +
                             '</div>' + 
                                '<div style="display:none;padding-left:0px;margin-left:-1px;">' + 
                                    hidden_categories +
                                '</div>';
    }


    result += '<div id="ddg_zeroclick_header">' +
                '<a class="ddg_head" href="https://duckduckgo.com/?q='+ 
                    encodeURIComponent(query)
                +'">'+ 
                    (res['Heading'] === ''? "&nbsp;": res['Heading']) +
                '</a> <img alt="" src="' + HEADER_ICON_URL + '" />' + 
                '<a class="ddg_more" href="https://duckduckgo.com/?q='+ 
                    encodeURIComponent(query)
                +'"> See DuckDuckGo results </a>' +
                '</div>';
    
    if (res['Image']) {
        result += '<div id="ddg_zeroclick_image">' + 
                    '<a href="' + img_url +'">' + 
                        '<img class="ddg_zeroclick_img" src="' + res['Image']  +
                        '" />' +
                    '</a>' +
                  '</div>';
    }
    
    var source_base_url = res['AbstractURL'].match(/http.?:\/\/(.*?\.)?(.*\..*?)\/.*/)[2];
    var more_image = '<img src="https://duckduckgo.com/i/'+ source_base_url +'.ico" />';
    if (source_base_url === "wikipedia.org")
        more_image = '<img src="https://duckduckgo.com/assets/icon_wikipedia.v101.png" />';

    result += '<div id="ddg_zeroclick_abstract" style="'+ (res['Image'] ? 'max-width: 420px': '') +'">' +
                '<div onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=\'\'" onclick="window.location.href=\''+ res['AbstractURL'] +'\'">' +
                '<p>' + res['Abstract'] +
                '</p><div id="ddg_zeroclick_official_links">' + 
                    more_image + 
                    '<a class="ddg_more_link" href="' + res['AbstractURL'] + '"> More at ' +
                        res['AbstractSource'] +
                    '</a>' + official_site +
                '</div></div>' +
                 first_category + 
                 hidden_categories + 
              '</div><div class="clear"></div>';


    if(resultsLoaded()) {
        var ddg_result = createResultDiv();
        ddg_result.className = '';
        ddg_result.innerHTML = result;
        if(options.dev)
            console.log('loaded and showing');
    } else {
        setTimeout(function(){
            if(options.dev)
                console.log('trying again');
            displaySummary(res, query);
        }, 200);
    }

}

function displayDisambiguation(res, query){
    
    var result = '';
    result += '<div id="ddg_zeroclick_header"> <a class="ddg_head" href="https://duckduckgo.com/?q='+ 
                    encodeURIComponent(query)
                +'"> Meanings of ' +
                    res['Heading'] +
                '</a> <img alt="" src="' + HEADER_ICON_URL + '" />' + 
                '<a class="ddg_more" href="https://duckduckgo.com/?q='+ 
                    encodeURIComponent(query)
                +'"> See DuckDuckGo results </a>' +

              '</div>';

    var disambigs = '' 
    var hidden_disambigs = '';
    var others = '';
    var nhidden = 0;

   for (var i = 0; i < res['RelatedTopics'].length; i++){
        if (res['RelatedTopics'].length === 0)
            break;
        
        if (options.dev)
            console.log(res['RelatedTopics'][i]['Result']);
        
        // other topics
        if(res['RelatedTopics'][i]['Topics']) {
            var topics = res['RelatedTopics'][i]['Topics'];
            var output = '';
            for(var j = 0; j < topics.length; j++){
                output += '<div class="wrapper">' +
                            '<div class="icon_disambig">' + 
                                '<img src="' + topics[j]['Icon']['URL'] +'" />' +
                            '</div>' +
                            '<div class="ddg_zeroclick_disambig" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=this.className.replace(\' ddg_selected\',\'\')" onclick="window.location.href=this.firstChild.href">' +
                                topics[j]['Result'] +
                            '</div>' +
                          '</div>';
            }
            others += '<div class="disambig_more" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=\'disambig_more\'" onclick="this.firstChild.onclick();this.className=\'disambig_more\';this.onmouseover=function(){}">' +
                                '<a href="javascript:;" onclick="' + 
                                    "this.parentElement.nextElementSibling.style.display='block';this.onmouseover=null;" +
                                    "this.parentElement.innerHTML = '" + res['RelatedTopics'][i]['Name']  + "<hr>';" +
                                '"> ' + res['RelatedTopics'][i]['Name']  + ' ('+ topics.length + ')</a>' +
                             '</div>' + 
                                '<div style="display:none;padding-left:0px;margin-left:-1px;">' + 
                                    output +
                                '</div>';
            
            continue;
        }
            
 
        if (i <= 2) {
            disambigs += '<div class="wrapper">' +
                            '<div class="icon_disambig">' + 
                                '<img src="' + res['RelatedTopics'][i]['Icon']['URL'] +'" />' +
                            '</div>' +
                            '<div class="ddg_zeroclick_disambig" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=this.className.replace(\' ddg_selected\',\'\')" onclick="window.location.href=this.firstChild.href">' +
                                res['RelatedTopics'][i]['Result'] +
                            '</div>' +
                          '</div>';
        } else {
            hidden_disambigs += '<div class="wrapper">' +
                                    '<div class="icon_disambig">' + 
                                        '<img src="' + res['RelatedTopics'][i]['Icon']['URL'] +'" />' +
                                    '</div>' +
                                    '<div class="ddg_zeroclick_disambig" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=this.className.replace(\' ddg_selected\',\'\')" onclick="window.location.href=this.firstChild.href">' +
                                        res['RelatedTopics'][i]['Result'] +
                                    '</div>' +
                                  '</div>'; 
            nhidden++;
        }
    }
    
    if (hidden_disambigs!== '') {
        hidden_disambigs  = '<div class="disambig_more" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=this.className.replace(\' ddg_selected\',\'\')" onclick="this.firstChild.onclick();this.className=\'disambig_more\';this.onmouseover=function(){}">' +
                                '<a href="javascript:;" onclick="' + 
                                    "this.parentElement.style.display='none';" +
                                    "this.parentElement.nextElementSibling.style.display='block'" +
                                '"> More ('+ nhidden + ')</a>' +
                             '</div>' + 
                                '<div style="display:none;padding-left:0px;margin-left:-1px;">' + 
                                    hidden_disambigs+
                                '</div>';
    }


    result += '<div id="ddg_zeroclick_abstract">' + 
                  disambigs +
                  hidden_disambigs +
                  others +
              '</div><div class="clear"></div>';
              
    
    if (options.dev)
        console.log(result);

    if(resultsLoaded()) {
        var ddg_result = createResultDiv();
        ddg_result.className = '';
        ddg_result.innerHTML = result;
    } else {
        setTimeout(function(){
            displayDisambiguation(res, query);
        }, 200);
    }

}

function displayCategory(res, query){
    var result = '';
    result += '<div id="ddg_zeroclick_header"> <a class="ddg_head" href="https://duckduckgo.com/?q='+ 
                    encodeURIComponent(query)
                +'">' +
                    res['Heading'] +
                '</a> <img alt="" src="' + HEADER_ICON_URL + '" />' + 
                '<a class="ddg_more" href="https://duckduckgo.com/?q='+ 
                    encodeURIComponent(query)
                +'"> See DuckDuckGo results </a>' +
              '</div>';
    
    var categories = '';
    var hidden_categories = '';
    var nhidden = 0;
    for (var i = 0; i < res['RelatedTopics'].length; i++){
        if (res['RelatedTopics'].length === 0)
            break;
        
        if (options.dev)
            console.log(res['RelatedTopics'][i]['Result']);
 
        if (i <= 2) {
            categories += '<div class="wrapper" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=this.className.replace(\' ddg_selected\',\'\')" onclick="window.location.href=this.lastChild.firstChild.href;">' +
                            '<div class="icon_category">' + 
                                '<img src="' + res['RelatedTopics'][i]['Icon']['URL'] +'" />' +
                            '</div>' +
                            '<div class="ddg_zeroclick_category_item">' +
                                res['RelatedTopics'][i]['Result'] +
                            '</div>' +
                          '</div>';
        } else {
            hidden_categories += '<div class="wrapper" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=this.className.replace(\' ddg_selected\',\'\')" onclick="window.location.href=this.lastChild.firstChild.href;">' +
                                '<div class="icon_category">' + 
                                    '<img src="' + res['RelatedTopics'][i]['Icon']['URL'] +'" />' +
                                '</div>' +
                                '<div class="ddg_zeroclick_category_item">' +
                                    res['RelatedTopics'][i]['Result'] +
                                '</div>' +
                              '</div>';

            nhidden++;
        }

    }
    
    if (hidden_categories !== '') {
        hidden_categories = '<div class="category_more" onmouseover="this.className+=\' ddg_selected\'" onmouseout="this.className=this.className.replace(\' ddg_selected\',\'\')" onclick="this.firstChild.onclick();this.className=\'category_more\';this.onmouseover=function(){}">' +
                                '<a href="javascript:;" onclick="' + 
                                    "this.parentElement.style.display='none';" +
                                    "this.parentElement.nextElementSibling.style.display='block'" +
                                '"> More ('+ nhidden + ')</a>' +
                             '</div>' + 
                                '<div style="display:none;padding-left:0px;margin-left:-1px;">' + 
                                    hidden_categories+
                                '</div>';
 
    }

    result += '<div id="ddg_zeroclick_abstract">' + 
                    categories +
                    hidden_categories +
                '</div>';
                
    
    if (options.dev)
        console.log(result);

    if(resultsLoaded()) {
        var ddg_result = createResultDiv();
        ddg_result.className = '';
        ddg_result.innerHTML = result;
    } else {
        setTimeout(function(){
            displayCategory(res, query);
        }, 200);
    }

}

