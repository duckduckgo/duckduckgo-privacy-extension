
var regex = new RegExp('[\?\&]q=([^\&]+)');
if(regex.test(window.location.href)) {
    search(decodeURIComponent(RegExp.$1.replace(/\+/g," ")));
}

document.getElementsByName("q")[0].onkeyup = function(){
    search(document.getElementsByName("q")[0].value);
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
    if(res['AnswerType'] !== "") {
        displayAnswer(res['Answer']);
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
        ddg_result.className += " ddg_answer";
        ddg_result.innerHTML = answer;
    } else {
        setTimeout('displayAnswer("'+answer+'");', 200);
    }
}

