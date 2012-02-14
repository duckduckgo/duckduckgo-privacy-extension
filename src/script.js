
var options = [];
chrome.extension.sendRequest({options: "get"}, function(opt){
    options = opt;
});

var regex = new RegExp('[\?\&]q=([^\&#]+)');
if(regex.test(window.location.href)) {
    var q = window.location.href.split(regex);
    q = q[q.length - 2].replace(/\+/g," ");
    search(decodeURIComponent(q));
}

var lasttime;

function qsearch() {
    search(document.getElementsByName("q")[0].value);
}

// instant search
document.getElementsByName("q")[0].onkeyup = function(){
    clearTimeout(lasttime);
    lasttime = setTimeout('qsearch()', 700);
};

// click on search button
document.getElementsByName("btnG")[0].onclick = function(){
    qsearch();
};

function search(query)
{
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
    return document.getElementById("center_col") !== null;
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
    } else {
        setTimeout('displayAnswer("'+answer+'");', 200);
    }
}

function displaySummary(res, query) {
    var result = ''

    var img_url = res['AbstractURL'];
    var official_site = '';
    var first_category = ''


    if (res['Results'].length !== 0) {
        if(res['Results'][0]['Text'] === "Official site") {
            official_site = ' | ' + res['Results'][0]['Result'];
            img_url = res['Results'][0]['FirstURL'];
        }
    } 
    

    for (var i = 0; i < res['RelatedTopics'].length; i++){
        if (i > 1 || res['RelatedTopics'].length === 0)
            break;
        
        var link = res['RelatedTopics'][i]['Result'].
                    match(/<a href=".*">.*<\/a>/);
        
        var first = (i === 0)? ' class="first_category"': '';
        first_category += '<div id="ddg_zeroclick_category"'+ first + '>' + 
                            link +
                          '</div>';
    }
    
    if (res['RelatedTopics'].length !== 0) {
        first_category += '<div id="ddg_zeroclick_more">' +
                        '<a href="https://duckduckgo.com/?q='+ 
                            encodeURIComponent(query)
                        +'"> More at DuckDuckGo </a>' +
                      '</div>';
    }

    result += '<div id="ddg_zeroclick_header">' +
                '<a href="' + res['AbstractURL'] + '">'+ 
                    res['Heading'] +
                '</a>' + 
              '</div>';
    
    if (res['Image']) {
        result += '<div id="ddg_zeroclick_image">' + 
                    '<a href="' + img_url +'">' + 
                        '<img class="ddg_zeroclick_img" src="' + res['Image']  +
                        '" />' +
                    '</a>' +
                  '</div>';
    }

    result += '<div id="ddg_zeroclick_abstract">' + res['Abstract'] +
                '<div id="ddg_zeroclick_official_links">' + 
                    '<a href="' + res['AbstractURL'] + '"> More at ' +
                        res['AbstractSource'] +
                    '</a>' + official_site +
                '</div>' +
                 first_category + 
              '</div>';


    if(resultsLoaded()) {
        var ddg_result = createResultDiv();
        ddg_result.className = '';
        ddg_result.innerHTML = result;
    } else {
        setTimeout(function(){
            displaySummary(res, query);
        }, 200);
    }

}

function displayDisambiguation(res, query){
    
    var result = '';
    result += '<div id="ddg_zeroclick_header"> Meanings of ' +
                    res['Heading'] +
              '</div>';

    var disambigs = '' 

   for (var i = 0; i < res['RelatedTopics'].length; i++){
        if (i > 1 || res['RelatedTopics'].length === 0)
            break;
        
        if (options.dev)
            console.log(res['RelatedTopics'][i]['Result']);
 
        disambigs += '<div>' +
                        '<div id="ddg_zeroclick_img" class="icon_disambig">' + 
                            '<img src="' + res['RelatedTopics'][i]['Icon']['URL'] +'" />' +
                        '</div>' +
                        '<div id="ddg_zeroclick_disambig">' +
                            res['RelatedTopics'][i]['Result'] +
                        '</div>' +
                      '</div>';
    }
    
    if (res['RelatedTopics'].length !== 0) {
        disambigs += '<div id="ddg_zeroclick_more" class="disambig_more">' +
                        '<a href="https://duckduckgo.com/?q='+ 
                            encodeURIComponent(query)
                        +'"> More at DuckDuckGo </a>' +
                      '</div>';
    }

    result += '<div id="ddg_zeroclick_abstract">' + 
                    disambigs +
                '</div>';
                
    
    if (options.dev)
        console.log(result);

    if(resultsLoaded()) {
        var ddg_result = createResultDiv();
        ddg_result.className = '';
        ddg_result.innerHTML = result;
    } else {
        setTimeout(function(){
            displaySummary(res, query);
        }, 200);
    }

}

function displayCategory(res, query){
    var result = '';
    result += '<div id="ddg_zeroclick_header">' +
                    res['Heading'] +
              '</div>';
    
    var categories = '';
    for (var i = 0; i < res['RelatedTopics'].length; i++){
        if (i > 1 || res['RelatedTopics'].length === 0)
            break;
        
        if (options.dev)
            console.log(res['RelatedTopics'][i]['Result']);
 
        categories += '<div>' +
                        '<div id="ddg_zeroclick_img" class="icon_category">' + 
                            '<img src="' + res['RelatedTopics'][i]['Icon']['URL'] +'" />' +
                        '</div>' +
                        '<div id="ddg_zeroclick_category_item">' +
                            res['RelatedTopics'][i]['Result'] +
                        '</div>' +
                      '</div>';
    }
    
    if (res['RelatedTopics'].length !== 0) {
        categories += '<div id="ddg_zeroclick_more" class="category_more">' +
                        '<a href="https://duckduckgo.com/?q='+ 
                            encodeURIComponent(query)
                        +'"> More at DuckDuckGo </a>' +
                      '</div>';
    }

    result += '<div id="ddg_zeroclick_abstract">' + 
                    categories +
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

