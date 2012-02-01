
var regex = new RegExp('[\?\&]q=([^\&]+)');
if(regex.test(window.location.href)) {
    search(decodeURIComponent(RegExp.$1.replace(/\+/g," ")));
}

var lasttime;


function qsearch() {
    search(document.getElementsByName("q")[0].value);
}

document.getElementsByName("q")[0].onkeyup = function(){
    clearTimeout(lasttime);
    lasttime = setTimeout('qsearch()', 700);
};

function search(query)
{
    var request = {query: query};
    chrome.extension.sendRequest(request, function(response){
        renderZeroClick(response);
    });
}

function renderZeroClick(res) 
{
    //console.log(res);
    if(res['AnswerType'] !== "") {
        displayAnswer(res['Answer']);
    } else if (res['Type'] == 'A' && res['Abstract'] !== "") {
        displaySummary(res);
    } else {     
        switch (res['Type']){
            case 'E':
                displayAnswer(res['Answer']);
                break;

            case 'A':
                displayAnswer(res['Answer']);
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

function displaySummary(res) {
    var ddg_result = createResultDiv();
    var result = ''

    var img_url = res['AbstractURL'];
    var official_site = '';

    if (res['Results'].length !== 0) {
        if(res['Results'][0]['Text'] === "Official site") {
            official_site = ' | ' + res['Results'][0]['Result'];
            img_url = res['Results'][0]['FirstURL'];
        }
   } 

    result += '<div id="ddg_zeroclick_header">' +
                '<a href="' + res['AbstractURL'] + '">'+ 
                    res['Heading'] +
                '</a>' + 
              '</div>';

    result += '<div id="ddg_zeroclick_image">' + 
                '<a href="' + img_url +'">' + 
                    '<img src="' + res['Image']  + '" />' +
                '</a>' +
              '</div>';

    result += '<div id="ddg_zeroclick_abstract">' + res['Abstract'] +
                '<div id="ddg_zeroclick_official_links">' + 
                    '<a href="' + res['AbstractURL'] + '"> More at ' +
                        res['AbstractSource'] +
                    '</a>' + official_site +
                '</div>' +
              '</div>';


    if(resultsLoaded()) {
        ddg_result.innerHTML = result;
    } else {
        setTimeout(function(){
            displaySummary(res);
        }, 200);
    }

    //console.log(result);

}

